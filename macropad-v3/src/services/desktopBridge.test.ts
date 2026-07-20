import { describe, expect, it } from "vitest";
import { defaultProfile } from "../domain/defaultProfile";
import { buildLightingCommands } from "./desktopBridge";

describe("lighting HID protocol", () => {
  it("encodes six RGB zones followed by speed and options", () => {
    const commands = buildLightingCommands({
      ...defaultProfile.lighting,
      mode: "reactive",
      enabled: true,
      brightness: 200,
      speed: 96,
      zones: ["#112233", "#445566", "#778899", "#AABBCC", "#DDEEFF", "#010203"],
    });
    expect(commands).toHaveLength(8);
    expect(commands[0]).toEqual([0xB2, 0x11, 0x22, 0x33]);
    expect(commands[5]).toEqual([0xB7, 0x01, 0x02, 0x03]);
    expect(commands[6]).toEqual([0xB1, 96, 0, 0]);
    expect(commands[7]).toEqual([0xB0, 4, 1, 200]);
  });
});
