import {
  CircleDashed,
  CirclePlay,
  ExternalLink,
  Keyboard,
  MicOff,
  Rocket,
  SkipBack,
  SkipForward,
  Type,
  Volume1,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import type { Action } from "../domain/profile";

const actionIcons: Record<Action["type"], LucideIcon> = {
  "none": CircleDashed,
  "audio.mic-mute": MicOff,
  "audio.output-mute": VolumeX,
  "audio.volume-up": Volume2,
  "audio.volume-down": Volume1,
  "media.play-pause": CirclePlay,
  "media.next": SkipForward,
  "media.previous": SkipBack,
  "keyboard.shortcut": Keyboard,
  "text.type": Type,
  "system.launch": Rocket,
  "system.open": ExternalLink,
};

export const iconForAction = (action?: Action): LucideIcon => actionIcons[action?.type ?? "none"];
