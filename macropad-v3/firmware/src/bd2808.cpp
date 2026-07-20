#include "bd2808.h"

namespace
{
constexpr uint8_t kStartClockCount = 16;
constexpr uint8_t kSleepClockCount = 8;
constexpr uint8_t kBitsPerByte = 8;
constexpr uint8_t kWriteAddressPrefix = 0x40;
constexpr uint16_t kPowerOnDelayMicroseconds = 1000;
} // namespace

Bd2808::Bd2808(uint8_t clockPin, uint8_t dataPin, uint8_t deviceAddress)
    : clockPin_(clockPin), dataPin_(dataPin),
      deviceAddress_(kWriteAddressPrefix | (deviceAddress & 0x3F))
{
}

void Bd2808::begin()
{
  pinMode(clockPin_, OUTPUT);
  pinMode(dataPin_, OUTPUT);
  digitalWrite(clockPin_, LOW);
  digitalWrite(dataPin_, HIGH);

  // Communication is permitted 0.1 ms after VCC exceeds 3 V. One
  // millisecond also gives boards with a slow local supply time to settle.
  delayMicroseconds(kPowerOnDelayMicroseconds);
}

void Bd2808::initializeSixRgb(uint8_t brightness, uint8_t current)
{
  writeRegister(kModeRegister, kImmediateUpdateMode);
  writeRegister(kRedCurrentRegister, current & 0x3F);
  writeRegister(kGreenCurrentRegister, current & 0x3F);
  writeRegister(kBlueCurrentRegister, current & 0x3F);

  for (uint8_t channel = 0; channel < kTotalChannelCount; ++channel)
  {
    const bool isUsedChannel = channel < (kRgbLedCount * 3);
    writeRegister(kFirstBrightnessRegister + channel,
                  isUsedChannel ? brightness : 0x00);
  }
}

void Bd2808::setRgb(uint8_t ledIndex, uint8_t red, uint8_t green, uint8_t blue)
{
  if (ledIndex >= kRgbLedCount)
  {
    return;
  }

  const uint8_t firstRegister = kFirstBrightnessRegister + (ledIndex * 3);
  writeRegister(firstRegister, red);
  writeRegister(firstRegister + 1, green);
  writeRegister(firstRegister + 2, blue);
}

void Bd2808::setAllRgb(uint8_t red, uint8_t green, uint8_t blue)
{
  for (uint8_t ledIndex = 0; ledIndex < kRgbLedCount; ++ledIndex)
  {
    setRgb(ledIndex, red, green, blue);
  }
}

void Bd2808::clockBit(bool value)
{
  digitalWrite(dataPin_, value ? HIGH : LOW);
  delayMicroseconds(1);
  digitalWrite(clockPin_, HIGH);
  delayMicroseconds(1);
  digitalWrite(clockPin_, LOW);
}

void Bd2808::writeByte(uint8_t value)
{
  for (uint8_t bit = 0; bit < kBitsPerByte; ++bit)
  {
    clockBit((value & 0x80) != 0);
    value <<= 1;
  }
}

void Bd2808::writeRegister(uint8_t registerAddress, uint8_t value)
{
  for (uint8_t clock = 0; clock < kStartClockCount; ++clock)
  {
    clockBit(true);
  }

  writeByte(deviceAddress_);
  writeByte(registerAddress);
  writeByte(value);

  for (uint8_t clock = 0; clock < kSleepClockCount; ++clock)
  {
    clockBit(true);
  }
}

