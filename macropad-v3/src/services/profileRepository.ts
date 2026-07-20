import { defaultProfile } from "../domain/defaultProfile";
import { profileSchema, type Profile } from "../domain/profile";

const storageKey = "macropad-v3.profile";
export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultProfile;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const parsed = profileSchema.parse(stored);
    return {
      ...parsed,
      virtualButtons: "virtualButtons" in stored ? parsed.virtualButtons : defaultProfile.virtualButtons,
      oled: "oled" in stored ? parsed.oled : defaultProfile.oled,
      lighting: "lighting" in stored ? parsed.lighting : defaultProfile.lighting,
    };
  }
  catch { return defaultProfile; }
}
export function saveProfile(profile: Profile) { profileSchema.parse(profile); localStorage.setItem(storageKey, JSON.stringify(profile)); }
