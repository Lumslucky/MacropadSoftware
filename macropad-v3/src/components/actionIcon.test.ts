import { CircleDashed, CirclePlay, ExternalLink, Keyboard, MicOff, Rocket, SkipBack, SkipForward, Type, Volume1, Volume2, VolumeX } from "lucide-react";
import { describe, expect, it } from "vitest";
import { iconForAction } from "./actionIcon";

describe("action icons", () => {
  it.each([
    [{ type: "none" } as const, CircleDashed],
    [{ type: "audio.mic-mute" } as const, MicOff],
    [{ type: "audio.output-mute" } as const, VolumeX],
    [{ type: "audio.volume-up" } as const, Volume2],
    [{ type: "audio.volume-down" } as const, Volume1],
    [{ type: "media.play-pause" } as const, CirclePlay],
    [{ type: "media.next" } as const, SkipForward],
    [{ type: "media.previous" } as const, SkipBack],
    [{ type: "keyboard.shortcut", keys: "Ctrl+K" } as const, Keyboard],
    [{ type: "text.type", text: "Hello" } as const, Type],
    [{ type: "system.launch", target: "app.exe" } as const, Rocket],
    [{ type: "system.open", target: "https://example.com" } as const, ExternalLink],
  ])("maps %o to a distinct action icon", (action, expected) => {
    expect(iconForAction(action)).toBe(expected);
  });
});
