import type { Binding, Profile } from "./profile";

const short = (control: Binding["control"], label: string, action: Binding["action"]): Binding => ({ control, trigger: "short", label, action });

export const defaultProfile: Profile = {
  version: 1, id: "default", name: "Command Deck", accent: "#00e5b0",
  bindings: [
    short("button-1", "Mic", { type: "audio.mic-mute" }),
    short("button-2", "Media", { type: "media.play-pause" }),
    short("button-3", "Previous", { type: "media.previous" }),
    short("button-4", "Next", { type: "media.next" }),
    short("button-5", "Shortcut", { type: "keyboard.shortcut", keys: "Ctrl+Shift+M" }),
    short("button-6", "Mute", { type: "audio.output-mute" }),
    short("rotary-press", "Mute", { type: "audio.output-mute" }),
    { control: "rotary-turn", trigger: "rotate-left", label: "Volume down", action: { type: "audio.volume-down" } },
    { control: "rotary-turn", trigger: "rotate-right", label: "Volume up", action: { type: "audio.volume-up" } },
  ],
  virtualButtons: [
    { id: "virtual-1", label: "Mute mic", action: { type: "audio.mic-mute" } },
    { id: "virtual-2", label: "Play / pause", action: { type: "media.play-pause" } },
    { id: "virtual-3", label: "Previous", action: { type: "media.previous" } },
    { id: "virtual-4", label: "Next", action: { type: "media.next" } },
    { id: "virtual-5", label: "Volume up", action: { type: "audio.volume-up" } },
    { id: "virtual-6", label: "Speaker mute", action: { type: "audio.output-mute" } },
  ],
  oled: { mode: "status", customText: "HELLO FROM MACROPAD", brightness: 159, inverted: false, enabled: true },
  lighting: {
    mode: "wave",
    enabled: true,
    brightness: 220,
    speed: 128,
    zones: ["#00E5B0", "#08A4FF", "#665CFF", "#C44DFF", "#FF4B9B", "#FF9F43"],
  },
};
