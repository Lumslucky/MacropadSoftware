#include <Arduino.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_TinyUSB.h>
#include <AiEsp32RotaryEncoder.h>
#include <Wire.h>
#include <cstring>

#include "bd2808.h"

namespace
{
constexpr uint8_t kButtonPins[] = {41, 42, 2, 40, 39, 38, 48};
constexpr uint8_t kRotaryPinA = 11;
constexpr uint8_t kRotaryPinB = 12;
constexpr uint8_t kRotarySteps = 4;
constexpr uint8_t kRgbClockPin = 21;
constexpr uint8_t kRgbDataPin = 47;
constexpr uint8_t kRgbDriverAddress = 0x00; // A0-A5 must be LOW.
constexpr uint8_t kRgbStartupBrightness = 0x00;
constexpr uint8_t kRgbStartupCurrent = 0x18;
constexpr uint8_t kRgbLedCount = 6;
constexpr uint8_t kRgbMaximumBrightness = 0xFE;
constexpr uint8_t kRgbMinimumBreathingBrightness = 96;
constexpr uint8_t kHueSpacing = 43;
constexpr uint8_t kDisplayWidth = 128;
constexpr uint8_t kDisplayHeight = 32;
constexpr int8_t kDisplayResetPin = -1;
constexpr uint8_t kDisplayAddress = 0x3C;
constexpr uint8_t kI2cDataPin = 17;
constexpr uint8_t kI2cClockPin = 18;
constexpr uint16_t kLongPressDurationMs = 500;
constexpr uint16_t kDisplayActivityDurationMs = 1400;
constexpr size_t kDisplayTextCapacity = 25;
constexpr uint8_t kFirmwareVersionMajor = 0;
constexpr uint8_t kFirmwareVersionMinor = 2;
constexpr uint8_t kFirmwareVersionPatch = 0;

constexpr uint8_t kCommandSetDisplayMode = 0xA0;
constexpr uint8_t kCommandSetDisplayOptions = 0xA1;
constexpr uint8_t kCommandSetCustomText = 0xA2;
constexpr uint8_t kCommandSetProfileText = 0xA3;
constexpr uint8_t kCommandSetClock = 0xA4;
constexpr uint8_t kCommandClearText = 0xA6;
constexpr uint8_t kCommandGetFirmwareVersion = 0xAF;
constexpr uint8_t kCommandSetLightingOptions = 0xB0;
constexpr uint8_t kCommandSetLightingSpeed = 0xB1;
constexpr uint8_t kCommandSetLightingZoneFirst = 0xB2;
constexpr uint8_t kCommandSetLightingZoneLast = 0xB7;
constexpr uint16_t kReactiveLightingDurationMs = 500;

const uint8_t kHidReportDescriptor[] = {
    TUD_HID_REPORT_DESC_GENERIC_INOUT(4)};

Adafruit_USBD_HID usbHid;
Adafruit_SSD1306 display(kDisplayWidth, kDisplayHeight, &Wire,
                         kDisplayResetPin);
AiEsp32RotaryEncoder rotaryEncoder(kRotaryPinA, kRotaryPinB, -1, -1,
                                   kRotarySteps);
Bd2808 rgbDriver(kRgbClockPin, kRgbDataPin, kRgbDriverAddress);

enum class DisplayMode : uint8_t
{
  Status = 0,
  Clock = 1,
  Profile = 2,
  Custom = 3,
  Activity = 4
};

enum class LightingMode : uint8_t
{
  Static = 0,
  Breathing = 1,
  Spectrum = 2,
  Wave = 3,
  Reactive = 4
};

struct RgbColor
{
  uint8_t red;
  uint8_t green;
  uint8_t blue;
};

DisplayMode displayMode = DisplayMode::Status;
bool displayReady = false;
bool displayEnabled = true;
bool displayInverted = false;
bool displayDirty = true;
volatile bool displayOptionsDirty = true;
bool activityWasVisible = false;
uint8_t displayContrast = 0x9F;
uint8_t lastActivityControl = 0;
uint8_t lastActivityValue = 0;
uint32_t lastActivityMs = 0;
uint8_t clockHour = 0;
uint8_t clockMinute = 0;
uint8_t clockSecond = 0;
uint32_t clockSynchronizedAtMs = 0;
uint32_t lastRenderedClockSecond = UINT32_MAX;
char customDisplayText[kDisplayTextCapacity] = "HELLO FROM MACROPAD";
char profileDisplayText[kDisplayTextCapacity] = "COMMAND DECK";
LightingMode lightingMode = LightingMode::Wave;
bool lightingEnabled = true;
bool lightingDirty = true;
uint8_t lightingBrightness = 220;
uint8_t lightingSpeed = 128;
RgbColor lightingZoneColors[kRgbLedCount] = {
    {0, 0xE5, 0xB0}, {8, 0xA4, 0xFE}, {0x66, 0x5C, 0xFE},
    {0xC4, 0x4D, 0xFE}, {0xFE, 0x4B, 0x9B}, {0xFE, 0x9F, 0x43}};
uint32_t lightingActivityMs[kRgbLedCount] = {};
volatile bool firmwareVersionRequested = false;

void recordLightingActivity(uint8_t controlId)
{
  const uint32_t now = millis();
  if (controlId < kRgbLedCount)
  {
    lightingActivityMs[controlId] = now;
    return;
  }

  for (uint32_t &activityMs : lightingActivityMs)
  {
    activityMs = now;
  }
}

void recordDisplayActivity(uint8_t controlId, uint8_t value)
{
  lastActivityControl = controlId;
  lastActivityValue = value;
  lastActivityMs = millis();
  displayDirty = true;
}

void sendHidEvent(uint8_t controlId, uint8_t value)
{
  const uint8_t report[] = {controlId, value, 0, 0};
  usbHid.sendReport(0, report, sizeof(report));
  recordDisplayActivity(controlId, value);
  recordLightingActivity(controlId);
}

void sendFirmwareVersionIfRequested()
{
  if (!firmwareVersionRequested)
  {
    return;
  }

  firmwareVersionRequested = false;
  const uint8_t report[] = {0xF0, kFirmwareVersionMajor, kFirmwareVersionMinor,
                            kFirmwareVersionPatch};
  usbHid.sendReport(0, report, sizeof(report));
}

class ButtonHandler
{
public:
  ButtonHandler(uint8_t pin, uint8_t reportId)
      : pin_(pin), reportId_(reportId)
  {
  }

  void begin()
  {
    pinMode(pin_, INPUT_PULLUP);
    wasPressed_ = digitalRead(pin_) == LOW;
  }

  void update()
  {
    const bool isPressed = digitalRead(pin_) == LOW;

    switch (state_)
    {
    case State::Idle:
      if (isPressed && !wasPressed_)
      {
        pressedAtMs_ = millis();
        state_ = State::Pressed;
      }
      break;

    case State::Pressed:
      if (!isPressed && wasPressed_)
      {
        sendHidEvent(reportId_, 0);
        state_ = State::Idle;
      }
      else if (millis() - pressedAtMs_ > kLongPressDurationMs)
      {
        sendHidEvent(reportId_, 1);
        state_ = State::LongPressSent;
      }
      break;

    case State::LongPressSent:
      if (!isPressed && wasPressed_)
      {
        state_ = State::Idle;
      }
      break;
    }

    wasPressed_ = isPressed;
  }

private:
  enum class State : uint8_t
  {
    Idle,
    Pressed,
    LongPressSent
  };

  const uint8_t pin_;
  const uint8_t reportId_;
  State state_ = State::Idle;
  bool wasPressed_ = false;
  uint32_t pressedAtMs_ = 0;
};

ButtonHandler buttons[] = {
    {kButtonPins[0], 0}, {kButtonPins[1], 1}, {kButtonPins[2], 2},
    {kButtonPins[3], 3}, {kButtonPins[4], 4}, {kButtonPins[5], 5},
    {kButtonPins[6], 6}};

uint16_t onGetHidReport(uint8_t reportId, hid_report_type_t reportType,
                        uint8_t *buffer, uint16_t requestedLength)
{
  (void)reportId;
  (void)reportType;
  (void)buffer;
  (void)requestedLength;
  return 0;
}

void onSetHidReport(uint8_t reportId, hid_report_type_t reportType,
                    const uint8_t *buffer, uint16_t bufferSize)
{
  (void)reportId;
  (void)reportType;
  if (buffer == nullptr || bufferSize == 0)
  {
    return;
  }

  switch (buffer[0])
  {
  case kCommandGetFirmwareVersion:
    firmwareVersionRequested = true;
    break;

  case kCommandSetDisplayMode:
    if (bufferSize >= 2 && buffer[1] <= static_cast<uint8_t>(DisplayMode::Activity))
    {
      displayMode = static_cast<DisplayMode>(buffer[1]);
      displayDirty = true;
    }
    break;

  case kCommandSetDisplayOptions:
    if (bufferSize >= 4)
    {
      displayEnabled = buffer[1] != 0;
      displayInverted = buffer[2] != 0;
      displayContrast = buffer[3];
      // HID callbacks run outside the render loop. Defer all I2C access to
      // updateDisplay() so command writes cannot corrupt a framebuffer transfer.
      displayOptionsDirty = true;
      displayDirty = true;
    }
    break;

  case kCommandSetCustomText:
  case kCommandSetProfileText:
    if (bufferSize >= 4 && buffer[1] < kDisplayTextCapacity - 1)
    {
      char *target = buffer[0] == kCommandSetCustomText ? customDisplayText : profileDisplayText;
      const size_t offset = buffer[1];
      target[offset] = static_cast<char>(buffer[2]);
      if (offset + 1 < kDisplayTextCapacity - 1)
      {
        target[offset + 1] = static_cast<char>(buffer[3]);
      }
      target[kDisplayTextCapacity - 1] = '\0';
      displayDirty = true;
    }
    break;

  case kCommandSetClock:
    if (bufferSize >= 4 && buffer[1] < 24 && buffer[2] < 60 && buffer[3] < 60)
    {
      clockHour = buffer[1];
      clockMinute = buffer[2];
      clockSecond = buffer[3];
      clockSynchronizedAtMs = millis();
      lastRenderedClockSecond = UINT32_MAX;
      displayDirty = true;
    }
    break;

  case kCommandClearText:
    if (bufferSize >= 2)
    {
      char *target = buffer[1] == 0 ? customDisplayText : profileDisplayText;
      std::memset(target, 0, kDisplayTextCapacity);
      displayDirty = true;
    }
    break;

  case kCommandSetLightingOptions:
    if (bufferSize >= 4 && buffer[1] <= static_cast<uint8_t>(LightingMode::Reactive))
    {
      lightingMode = static_cast<LightingMode>(buffer[1]);
      lightingEnabled = buffer[2] != 0;
      lightingBrightness = buffer[3] > kRgbMaximumBrightness
                                   ? kRgbMaximumBrightness
                                   : buffer[3];
      lightingDirty = true;
    }
    break;

  case kCommandSetLightingSpeed:
    if (bufferSize >= 2)
    {
      lightingSpeed = buffer[1] == 0 ? 1 : buffer[1];
      lightingDirty = true;
    }
    break;

  case kCommandSetLightingZoneFirst:
  case kCommandSetLightingZoneFirst + 1:
  case kCommandSetLightingZoneFirst + 2:
  case kCommandSetLightingZoneFirst + 3:
  case kCommandSetLightingZoneFirst + 4:
  case kCommandSetLightingZoneLast:
    if (bufferSize >= 4)
    {
      const uint8_t zone = buffer[0] - kCommandSetLightingZoneFirst;
      lightingZoneColors[zone] = {
          buffer[1] > kRgbMaximumBrightness ? kRgbMaximumBrightness : buffer[1],
          buffer[2] > kRgbMaximumBrightness ? kRgbMaximumBrightness : buffer[2],
          buffer[3] > kRgbMaximumBrightness ? kRgbMaximumBrightness : buffer[3]};
      lightingDirty = true;
    }
    break;
  }
}

void initializeUsbHid()
{
  usbHid.enableOutEndpoint(true);
  usbHid.setPollInterval(2);
  usbHid.setReportDescriptor(kHidReportDescriptor,
                             sizeof(kHidReportDescriptor));
  usbHid.setStringDescriptor("ESP32-S3 MacroPad");
  usbHid.setReportCallback(onGetHidReport, onSetHidReport);
  usbHid.begin();
}

void initializeDisplay()
{
  if (!display.begin(SSD1306_SWITCHCAPVCC, kDisplayAddress))
  {
    Serial.println(F("SSD1306 initialization failed"));
    return;
  }

  display.setRotation(2);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);
  display.clearDisplay();
  display.display();
  displayReady = true;
  displayOptionsDirty = true;
  displayDirty = true;
}

void applyDisplayOptions()
{
  if (!displayOptionsDirty)
  {
    return;
  }

  display.ssd1306_command(displayEnabled ? SSD1306_DISPLAYON : SSD1306_DISPLAYOFF);
  display.invertDisplay(displayInverted);
  display.ssd1306_command(SSD1306_SETCONTRAST);
  display.ssd1306_command(displayContrast);
  displayOptionsDirty = false;
}

void drawHeader(const __FlashStringHelper *header)
{
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(header);
  display.drawFastHLine(0, 9, kDisplayWidth, SSD1306_WHITE);
}

void drawTextLines(const char *text)
{
  constexpr size_t kLineLength = 21;
  display.setCursor(0, 13);
  for (size_t index = 0; index < kDisplayTextCapacity - 1 && text[index] != '\0'; ++index)
  {
    if (index == kLineLength)
    {
      display.setCursor(0, 23);
    }
    display.write(static_cast<uint8_t>(text[index]));
  }
}

void renderConfiguredDisplay(uint32_t elapsedClockSeconds)
{
  display.clearDisplay();
  switch (displayMode)
  {
  case DisplayMode::Status:
    drawHeader(F("MACROPAD STATUS"));
    display.setCursor(0, 15);
    display.print(F("USB HID ONLINE"));
    display.setCursor(0, 25);
    display.print(F("6 KEYS + ENCODER"));
    break;

  case DisplayMode::Clock:
  {
    const uint32_t totalSeconds =
        (static_cast<uint32_t>(clockHour) * 3600 +
         static_cast<uint32_t>(clockMinute) * 60 + clockSecond + elapsedClockSeconds) %
        86400;
    const uint8_t hour = totalSeconds / 3600;
    const uint8_t minute = (totalSeconds / 60) % 60;
    char clockText[6]{};
    snprintf(clockText, sizeof(clockText), "%02u:%02u", hour, minute);
    display.setTextSize(2);
    display.setCursor(34, 8);
    display.print(clockText);
    break;
  }

  case DisplayMode::Profile:
    drawHeader(F("ACTIVE PROFILE"));
    drawTextLines(profileDisplayText);
    break;

  case DisplayMode::Custom:
    drawHeader(F("CUSTOM DISPLAY"));
    drawTextLines(customDisplayText);
    break;

  case DisplayMode::Activity:
    drawHeader(F("LAST INPUT"));
    display.setCursor(0, 15);
    if (lastActivityControl < 6)
    {
      display.print(F("BUTTON "));
      display.print(lastActivityControl + 1);
    }
    else if (lastActivityControl == 6)
    {
      display.print(F("ENCODER PRESS"));
    }
    else
    {
      display.print(lastActivityValue == 0 ? F("ENCODER LEFT") : F("ENCODER RIGHT"));
    }
    display.setCursor(0, 25);
    display.print(lastActivityValue == 1 && lastActivityControl < 7 ? F("LONG") : F("SHORT / TURN"));
    break;
  }
  display.display();
}

void renderActivityOverlay()
{
  display.clearDisplay();
  drawHeader(F("INPUT RECEIVED"));
  display.setCursor(0, 15);
  display.print(F("CONTROL "));
  display.print(lastActivityControl);
  display.setCursor(0, 25);
  display.print(F("VALUE "));
  display.print(lastActivityValue);
  display.display();
}

void updateDisplay()
{
  if (!displayReady)
  {
    return;
  }

  applyDisplayOptions();
  if (!displayEnabled)
  {
    return;
  }

  const uint32_t now = millis();
  const bool activityVisible = lastActivityMs != 0 && now - lastActivityMs < kDisplayActivityDurationMs;
  if (activityVisible)
  {
    if (displayDirty || !activityWasVisible)
    {
      renderActivityOverlay();
      displayDirty = false;
    }
    activityWasVisible = true;
    return;
  }

  if (activityWasVisible)
  {
    activityWasVisible = false;
    displayDirty = true;
  }

  const uint32_t elapsedClockSeconds = (now - clockSynchronizedAtMs) / 1000;
  if (displayMode == DisplayMode::Clock && elapsedClockSeconds != lastRenderedClockSecond)
  {
    displayDirty = true;
    lastRenderedClockSecond = elapsedClockSeconds;
  }

  if (displayDirty)
  {
    renderConfiguredDisplay(elapsedClockSeconds);
    displayDirty = false;
  }
}

void IRAM_ATTR handleRotaryInterrupt()
{
  rotaryEncoder.readEncoder_ISR();
}

void processRotaryEncoder()
{
  static int32_t previousPosition = 0;

  if (!rotaryEncoder.encoderChanged())
  {
    return;
  }

  const int32_t currentPosition = rotaryEncoder.readEncoder();
  sendHidEvent(7, currentPosition > previousPosition ? 1 : 0);
  previousPosition = currentPosition;
}

uint8_t scaleChannel(uint8_t value, uint8_t brightness)
{
  return static_cast<uint16_t>(value) * brightness /
         kRgbMaximumBrightness;
}

uint8_t smoothBreathingBrightness(uint8_t phase)
{
  const uint8_t triangle = phase < 128
                               ? static_cast<uint8_t>(phase * 2)
                               : static_cast<uint8_t>((255 - phase) * 2);
  const uint32_t x = triangle;
  const uint8_t eased = x * x * (765 - (2 * x)) / (255UL * 255UL);
  const uint8_t range =
      kRgbMaximumBrightness - kRgbMinimumBreathingBrightness;
  return kRgbMinimumBreathingBrightness +
         (static_cast<uint16_t>(eased) * range / 255);
}

RgbColor colorWheel(uint8_t position)
{
  if (position < 85)
  {
    const uint8_t rising = position * 3;
    return {static_cast<uint8_t>(kRgbMaximumBrightness - rising), rising, 0};
  }

  if (position < 170)
  {
    const uint8_t rising = (position - 85) * 3;
    return {0, static_cast<uint8_t>(kRgbMaximumBrightness - rising), rising};
  }

  const uint16_t rawRising = static_cast<uint16_t>(position - 170) * 3;
  const uint8_t rising = rawRising > kRgbMaximumBrightness
                             ? kRgbMaximumBrightness
                             : static_cast<uint8_t>(rawRising);
  return {rising, 0, static_cast<uint8_t>(kRgbMaximumBrightness - rising)};
}

void updateRgbAnimation(bool forceUpdate = false)
{
  static uint32_t previousFrameMs = 0;
  static uint8_t hue = 0;
  static uint8_t breathingPhase = 0;

  const uint32_t now = millis();
  const uint16_t frameIntervalMs = 10 +
                                   (static_cast<uint16_t>(255 - lightingSpeed) * 70 / 254);
  if (!forceUpdate && !lightingDirty &&
      (!lightingEnabled || lightingMode == LightingMode::Static ||
       now - previousFrameMs < frameIntervalMs))
  {
    return;
  }

  previousFrameMs = now;
  lightingDirty = false;

  if (!lightingEnabled)
  {
    for (uint8_t led = 0; led < kRgbLedCount; ++led)
    {
      rgbDriver.setRgb(led, 0, 0, 0);
    }
    return;
  }

  const uint8_t breathingBrightness =
      scaleChannel(lightingBrightness, smoothBreathingBrightness(breathingPhase));

  for (uint8_t led = 0; led < kRgbLedCount; ++led)
  {
    RgbColor color = lightingZoneColors[led];
    uint8_t effectBrightness = lightingBrightness;

    switch (lightingMode)
    {
    case LightingMode::Static:
      break;
    case LightingMode::Breathing:
      effectBrightness = breathingBrightness;
      break;
    case LightingMode::Spectrum:
      color = colorWheel(hue);
      break;
    case LightingMode::Wave:
      color = colorWheel(hue + (led * kHueSpacing));
      effectBrightness = breathingBrightness;
      break;
    case LightingMode::Reactive:
    {
      constexpr uint8_t kIdleBrightness = 48;
      const uint32_t elapsed = now - lightingActivityMs[led];
      const uint8_t activityBrightness = elapsed < kReactiveLightingDurationMs
                                             ? static_cast<uint8_t>(kIdleBrightness +
                                                                    (static_cast<uint32_t>(kRgbMaximumBrightness - kIdleBrightness) *
                                                                     (kReactiveLightingDurationMs - elapsed) /
                                                                     kReactiveLightingDurationMs))
                                             : kIdleBrightness;
      effectBrightness = scaleChannel(lightingBrightness, activityBrightness);
      break;
    }
    }

    rgbDriver.setRgb(led, scaleChannel(color.red, effectBrightness),
                     scaleChannel(color.green, effectBrightness),
                     scaleChannel(color.blue, effectBrightness));
  }

  const uint8_t animationStep = 1 + (lightingSpeed / 64);
  hue += animationStep;
  breathingPhase += animationStep;
}
} // namespace

void setup()
{
  Serial.begin(115200);

  Wire.setPins(kI2cDataPin, kI2cClockPin);
  Wire.begin();

  for (ButtonHandler &button : buttons)
  {
    button.begin();
  }

  rotaryEncoder.begin();
  rotaryEncoder.setup(handleRotaryInterrupt);

  rgbDriver.begin();
  rgbDriver.initializeSixRgb(kRgbStartupBrightness, kRgbStartupCurrent);
  updateRgbAnimation(true);

  initializeDisplay();
  initializeUsbHid();
}

void loop()
{
  sendFirmwareVersionIfRequested();

  for (ButtonHandler &button : buttons)
  {
    button.update();
  }

  processRotaryEncoder();
  updateDisplay();
  updateRgbAnimation();
}

