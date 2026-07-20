export const firmwareContract = {
  protocol: "USB HID generic IN/OUT", reportBytes: 4, usb: { vendorId: 0x303a, productId: 0x1001, hidInterface: 2 },
  controls: { buttons: 6, rotaryPress: true, rotaryTurn: true }, longPressMilliseconds: 500,
  reportIds: { firstButton: 0, lastButton: 5, rotaryPress: 6, rotaryTurn: 7 }, rotaryValues: { left: 0, right: 1 },
  display: { type: "SSD1306", width: 128, height: 32, hostControlAvailable: true, protocolVersion: 1 }, lighting: { leds: 6, individuallyAddressable: true, hostControlAvailable: true, protocolVersion: 1 },
  update: { transport: "USB serial bootloader", manualBootMode: true, offsets: { bootloader: "0x0000", partitions: "0x8000", bootApp: "0xE000", application: "0x10000" } },
} as const;
