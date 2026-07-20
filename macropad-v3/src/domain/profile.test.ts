import { describe, expect, it } from "vitest";
import { defaultProfile } from "./defaultProfile";
import { addVirtualButton, getBinding, profileSchema, removeVirtualButton, setBinding } from "./profile";

describe("profile model", () => {
  it("validates the built-in profile", () => expect(profileSchema.safeParse(defaultProfile).success).toBe(true));
  it("updates one binding without mutating the profile", () => {
    const original = getBinding(defaultProfile, { control: "button-1", trigger: "short" })!;
    const updated = setBinding(defaultProfile, { ...original, label: "Studio mic" });
    expect(getBinding(updated, original)?.label).toBe("Studio mic");
    expect(getBinding(defaultProfile, original)?.label).toBe("Mic");
  });
  it("adds and removes persistent virtual controls immutably", () => {
    const added = addVirtualButton(defaultProfile, { id: "virtual-test", label: "Test", action: { type: "media.next" } });
    expect(added.virtualButtons).toHaveLength(defaultProfile.virtualButtons.length + 1);
    expect(defaultProfile.virtualButtons.some((button) => button.id === "virtual-test")).toBe(false);
    expect(removeVirtualButton(added, "virtual-test").virtualButtons).toHaveLength(defaultProfile.virtualButtons.length);
  });
});
