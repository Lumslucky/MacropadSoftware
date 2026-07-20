import type { Action } from "./profile";

export type ActionCategory = "Audio" | "Media" | "Shortcuts" | "System";
export type ActionDefinition = { type: Action["type"]; name: string; description: string; category: ActionCategory; defaults: Action };

export const actionDefinitions: ActionDefinition[] = [
  { type: "audio.mic-mute", name: "Mute microphone", description: "Toggle the active input device", category: "Audio", defaults: { type: "audio.mic-mute" } },
  { type: "audio.output-mute", name: "Mute speakers", description: "Toggle system output", category: "Audio", defaults: { type: "audio.output-mute" } },
  { type: "audio.volume-up", name: "Volume up", description: "Raise system volume", category: "Audio", defaults: { type: "audio.volume-up" } },
  { type: "audio.volume-down", name: "Volume down", description: "Lower system volume", category: "Audio", defaults: { type: "audio.volume-down" } },
  { type: "media.play-pause", name: "Play / pause", description: "Control active media", category: "Media", defaults: { type: "media.play-pause" } },
  { type: "media.next", name: "Next track", description: "Skip forward", category: "Media", defaults: { type: "media.next" } },
  { type: "media.previous", name: "Previous track", description: "Skip backward", category: "Media", defaults: { type: "media.previous" } },
  { type: "keyboard.shortcut", name: "Keyboard shortcut", description: "Send a key combination", category: "Shortcuts", defaults: { type: "keyboard.shortcut", keys: "Ctrl+Shift+M" } },
  { type: "text.type", name: "Type text", description: "Insert a reusable snippet", category: "Shortcuts", defaults: { type: "text.type", text: "" } },
  { type: "system.launch", name: "Launch application", description: "Start an installed app", category: "System", defaults: { type: "system.launch", target: "" } },
  { type: "system.open", name: "Open URL or file", description: "Open a trusted destination", category: "System", defaults: { type: "system.open", target: "https://" } },
];
