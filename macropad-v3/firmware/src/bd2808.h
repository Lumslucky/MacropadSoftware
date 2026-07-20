#pragma once

#include <Arduino.h>

class Bd2808
{
public:
  Bd2808(uint8_t clockPin, uint8_t dataPin, uint8_t deviceAddress);

  void begin();
  void initializeSixRgb(uint8_t brightness = 0xFE, uint8_t current = 0x18);
  void setRgb(uint8_t ledIndex, uint8_t red, uint8_t green, uint8_t blue);
  void setAllRgb(uint8_t red, uint8_t green, uint8_t blue);

private:
  static constexpr uint8_t kRgbLedCount = 6;
  static constexpr uint8_t kTotalChannelCount = 24;
  static constexpr uint8_t kModeRegister = 0x02;
  static constexpr uint8_t kRedCurrentRegister = 0x03;
  static constexpr uint8_t kGreenCurrentRegister = 0x04;
  static constexpr uint8_t kBlueCurrentRegister = 0x05;
  static constexpr uint8_t kFirstBrightnessRegister = 0x06;
  static constexpr uint8_t kImmediateUpdateMode = 0x04;

  void clockBit(bool value);
  void writeByte(uint8_t value);
  void writeRegister(uint8_t registerAddress, uint8_t value);

  const uint8_t clockPin_;
  const uint8_t dataPin_;
  const uint8_t deviceAddress_;
};

