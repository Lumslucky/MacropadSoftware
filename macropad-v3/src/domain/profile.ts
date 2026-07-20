import { z } from "zod";

export const triggerSchema = z.enum(["short", "long", "rotate-left", "rotate-right"]);
export const controlSchema = z.enum(["button-1", "button-2", "button-3", "button-4", "button-5", "button-6", "rotary-press", "rotary-turn"]);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.enum(["audio.volume-up", "audio.volume-down", "audio.output-mute", "audio.mic-mute", "media.play-pause", "media.next", "media.previous"]) }),
  z.object({ type: z.literal("keyboard.shortcut"), keys: z.string().max(200) }),
  z.object({ type: z.literal("system.open"), target: z.string().max(2048) }),
  z.object({ type: z.literal("system.launch"), target: z.string().max(2048) }),
  z.object({ type: z.literal("text.type"), text: z.string() }),
]);

export const bindingSchema = z.object({ control: controlSchema, trigger: triggerSchema, label: z.string().max(40), action: actionSchema });
export const virtualButtonSchema = z.object({ id: z.string(), label: z.string().max(40), action: actionSchema });
export const oledSettingsSchema = z.object({
  mode: z.enum(["status", "clock", "profile", "custom", "activity"]),
  customText: z.string().max(24),
  brightness: z.number().int().min(1).max(255),
  inverted: z.boolean(),
  enabled: z.boolean(),
});
export const lightingSettingsSchema = z.object({
  mode: z.enum(["static", "breathing", "spectrum", "wave", "reactive"]),
  enabled: z.boolean(),
  brightness: z.number().int().min(1).max(254),
  speed: z.number().int().min(1).max(255),
  zones: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).length(6),
});
export const profileSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string().min(1).max(40),
  accent: z.string(),
  bindings: z.array(bindingSchema),
  virtualButtons: z.array(virtualButtonSchema).max(32).default([]),
  oled: oledSettingsSchema.default({ mode: "status", customText: "HELLO FROM MACROPAD", brightness: 159, inverted: false, enabled: true }),
  lighting: lightingSettingsSchema.default({
    mode: "wave",
    enabled: true,
    brightness: 220,
    speed: 128,
    zones: ["#00E5B0", "#08A4FF", "#665CFF", "#C44DFF", "#FF4B9B", "#FF9F43"],
  }),
});

export type Trigger = z.infer<typeof triggerSchema>;
export type ControlId = z.infer<typeof controlSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Binding = z.infer<typeof bindingSchema>;
export type VirtualButton = z.infer<typeof virtualButtonSchema>;
export type OledSettings = z.infer<typeof oledSettingsSchema>;
export type LightingSettings = z.infer<typeof lightingSettingsSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type SelectedControl = Pick<Binding, "control" | "trigger">;

export function actionConfigurationError(action: Action): string | null {
  if (action.type === "system.launch" && !action.target.trim()) return "Enter an application path before running this action.";
  if (action.type === "system.open" && !action.target.trim()) return "Enter a URL or file path before running this action.";
  if (action.type === "keyboard.shortcut" && !action.keys.trim()) return "Enter at least one shortcut key before running this action.";
  return null;
}

export const bindingKey = ({ control, trigger }: SelectedControl) => `${control}:${trigger}`;
export const getBinding = (profile: Profile, selected: SelectedControl) => profile.bindings.find((item) => bindingKey(item) === bindingKey(selected));

export function setBinding(profile: Profile, binding: Binding): Profile {
  const key = bindingKey(binding);
  const exists = profile.bindings.some((item) => bindingKey(item) === key);
  return { ...profile, bindings: exists ? profile.bindings.map((item) => bindingKey(item) === key ? binding : item) : [...profile.bindings, binding] };
}

export function setVirtualButton(profile: Profile, button: VirtualButton): Profile {
  return { ...profile, virtualButtons: profile.virtualButtons.map((item) => item.id === button.id ? button : item) };
}

export function addVirtualButton(profile: Profile, button: VirtualButton): Profile {
  if (profile.virtualButtons.length >= 32) return profile;
  return { ...profile, virtualButtons: [...profile.virtualButtons, button] };
}

export function removeVirtualButton(profile: Profile, id: string): Profile {
  return { ...profile, virtualButtons: profile.virtualButtons.filter((button) => button.id !== id) };
}
