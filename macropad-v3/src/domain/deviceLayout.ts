import type { ControlId } from "./profile";

export type PhysicalButton = {
  position: number;
  location: string;
  control: Extract<ControlId, `button-${number}`>;
  buttonNumber: number;
  lightingZone: number;
};

/** The physical row-major arrangement used by every device-shaped interface. */
export const physicalButtonLayout = [
  { position: 1, location: "Top left", control: "button-6", buttonNumber: 6, lightingZone: 5 },
  { position: 2, location: "Top right", control: "button-3", buttonNumber: 3, lightingZone: 2 },
  { position: 3, location: "Middle left", control: "button-5", buttonNumber: 5, lightingZone: 4 },
  { position: 4, location: "Middle right", control: "button-2", buttonNumber: 2, lightingZone: 1 },
  { position: 5, location: "Bottom left", control: "button-4", buttonNumber: 4, lightingZone: 3 },
  { position: 6, location: "Bottom right", control: "button-1", buttonNumber: 1, lightingZone: 0 },
] as const satisfies readonly PhysicalButton[];

export function controlFromDeviceButtonId(controlId: number): PhysicalButton["control"] | null {
  return physicalButtonLayout.find((button) => button.buttonNumber === controlId + 1)?.control ?? null;
}

/** Convert a displayed physical palette to the firmware's logical zone order. */
export function lightingZonesFromPhysicalOrder(colors: readonly string[]): string[] {
  const zones = Array.from({ length: physicalButtonLayout.length }, () => "#000000");
  physicalButtonLayout.forEach((button, physicalIndex) => {
    zones[button.lightingZone] = colors[physicalIndex] ?? "#000000";
  });
  return zones;
}
