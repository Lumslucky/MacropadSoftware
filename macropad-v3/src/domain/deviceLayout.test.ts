import { describe, expect, it } from "vitest";
import { controlFromDeviceButtonId, lightingZonesFromPhysicalOrder, physicalButtonLayout } from "./deviceLayout";

describe("physical device layout", () => {
  it("uses the discovered button permutation for device events", () => {
    expect(physicalButtonLayout.map((button) => button.buttonNumber)).toEqual([6, 3, 5, 2, 4, 1]);
    expect(Array.from({ length: 6 }, (_, id) => controlFromDeviceButtonId(id))).toEqual([
      "button-1", "button-2", "button-3", "button-4", "button-5", "button-6",
    ]);
  });

  it("routes physical palette colors to their matching firmware zones", () => {
    expect(lightingZonesFromPhysicalOrder(["A", "B", "C", "D", "E", "F"])).toEqual([
      "F", "D", "B", "E", "C", "A",
    ]);
  });
});
