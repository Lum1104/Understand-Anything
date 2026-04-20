import { describe, it, expect, vi } from "vitest";
import { applyTheme, onThemeChange } from "../theme-engine.js";

describe("theme-engine change subscribers", () => {
  it("calls registered listener after applyTheme", () => {
    const listener = vi.fn();
    const unsubscribe = onThemeChange(listener);
    applyTheme({ presetId: "dark-gold", accentId: "gold" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    applyTheme({ presetId: "dark-gold", accentId: "gold" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
