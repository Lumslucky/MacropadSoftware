import { Channel, invoke } from "@tauri-apps/api/core";
import type { Action, LightingSettings, OledSettings } from "../domain/profile";
export type DeviceSnapshot = { state: "connected" | "disconnected"; name: string; firmwareVersion: string | null; protocol: string; lightingControlAvailable: boolean; vendorId: number; productId: number };
export type DeviceEvent = { controlId: number; value: number; raw: [number, number, number, number] };
export type UpdateProgress =
  | { event: "started"; data: { contentLength: number | null } }
  | { event: "progress"; data: { progress: number } }
  | { event: "verifying" }
  | { event: "finished" };
export type AppUpdateStatus = { configured: boolean; currentVersion: string; available: boolean; version: string | null; notes: string | null };
export type FirmwareUpdateStatus = { configured: boolean; available: boolean; version: string | null; notes: string | null; publishedAt: string | null; board: string | null; size: number | null; downloaded: boolean };
export type FirmwarePort = { name: string; label: string; isMacropad: boolean };
const browserSnapshot: DeviceSnapshot = { state: "disconnected", name: "MacroPad", firmwareVersion: null, protocol: "4-byte generic USB HID", lightingControlAvailable: false, vendorId: 0x303a, productId: 0x1001 };
export async function getDeviceSnapshot(): Promise<DeviceSnapshot> {
  if (!("__TAURI_INTERNALS__" in window)) return browserSnapshot;
  return invoke<DeviceSnapshot>("get_device_snapshot");
}

export async function drainDeviceEvents(): Promise<DeviceEvent[]> {
  if (!("__TAURI_INTERNALS__" in window)) return [];
  return invoke<DeviceEvent[]>("drain_device_events");
}

export async function executeAction(action: Action): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window)) return;
  return invoke<void>("run_action", { action });
}

async function sendDeviceCommand(command: [number, number, number, number]): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window)) return;
  return invoke<void>("send_device_command", { command });
}

const displayModes: Record<OledSettings["mode"], number> = { status: 0, clock: 1, profile: 2, custom: 3, activity: 4 };

const textCommands = (command: number, clearTarget: number, value: string): [number, number, number, number][] => {
  const text = value.toUpperCase().replace(/[^\x20-\x7E]/g, "?").slice(0, 24);
  const commands: [number, number, number, number][] = [[0xA6, clearTarget, 0, 0]];
  for (let offset = 0; offset < text.length; offset += 2) {
    commands.push([command, offset, text.charCodeAt(offset), text.charCodeAt(offset + 1) || 0]);
  }
  return commands;
};

export async function syncOledDisplay(settings: OledSettings, profileName: string): Promise<void> {
  const now = new Date();
  const commands: [number, number, number, number][] = [
    [0xA1, settings.enabled ? 1 : 0, settings.inverted ? 1 : 0, settings.brightness],
    ...textCommands(0xA2, 0, settings.customText),
    ...textCommands(0xA3, 1, profileName),
    [0xA4, now.getHours(), now.getMinutes(), now.getSeconds()],
    [0xA0, displayModes[settings.mode], 0, 0],
  ];
  for (const command of commands) await sendDeviceCommand(command);
}

const lightingModes: Record<LightingSettings["mode"], number> = { static: 0, breathing: 1, spectrum: 2, wave: 3, reactive: 4 };

const colorChannels = (color: string): [number, number, number] => {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF];
};

export function buildLightingCommands(settings: LightingSettings): [number, number, number, number][] {
  const zoneCommands = settings.zones.map((color, index) => {
    const [red, green, blue] = colorChannels(color);
    return [0xB2 + index, red, green, blue] as [number, number, number, number];
  });
  return [
    ...zoneCommands,
    [0xB1, settings.speed, 0, 0],
    [0xB0, lightingModes[settings.mode], settings.enabled ? 1 : 0, settings.brightness],
  ];
}

export async function syncLighting(settings: LightingSettings): Promise<void> {
  for (const command of buildLightingCommands(settings)) await sendDeviceCommand(command);
}

const isTauri = () => "__TAURI_INTERNALS__" in window;

export async function checkAppUpdate(): Promise<AppUpdateStatus> {
  if (!isTauri()) return { configured: false, currentVersion: "0.1.0", available: false, version: null, notes: null };
  return invoke<AppUpdateStatus>("check_app_update");
}

function progressChannel(onProgress: (event: UpdateProgress) => void): Channel<UpdateProgress> {
  const channel = new Channel<UpdateProgress>();
  channel.onmessage = onProgress;
  return channel;
}

export async function installAppUpdate(onProgress: (event: UpdateProgress) => void): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("install_app_update", { onEvent: progressChannel(onProgress) });
}

export async function checkFirmwareUpdate(): Promise<FirmwareUpdateStatus> {
  if (!isTauri()) return { configured: false, available: false, version: null, notes: null, publishedAt: null, board: null, size: null, downloaded: false };
  return invoke<FirmwareUpdateStatus>("check_firmware_update");
}

export async function downloadFirmwareUpdate(onProgress: (event: UpdateProgress) => void): Promise<FirmwareUpdateStatus> {
  if (!isTauri()) return checkFirmwareUpdate();
  return invoke<FirmwareUpdateStatus>("download_firmware_update", { onEvent: progressChannel(onProgress) });
}

export async function listFirmwarePorts(): Promise<FirmwarePort[]> {
  if (!isTauri()) return [];
  return invoke<FirmwarePort[]>("list_firmware_ports");
}

export async function flashFirmwareUpdate(portName: string, confirmed: boolean, onProgress: (event: UpdateProgress) => void): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("flash_firmware_update", { portName, confirmed, onEvent: progressChannel(onProgress) });
}
