import { describe, it, expect, beforeEach } from "vitest";
import { getMermaidTheme } from "../mermaid-theme.js";

describe("getMermaidTheme", () => {
  beforeEach(() => {
    const s = document.documentElement.style;
    s.setProperty("--color-elevated", "#121212");
    s.setProperty("--color-accent", "#d4a574");
    s.setProperty("--color-accent-dim", "#a88554");
    s.setProperty("--color-text-primary", "#f0e6d2");
    s.setProperty("--color-surface", "#161616");
    s.setProperty("--color-root", "#0a0a0a");
    s.setProperty("--font-sans", "'Inter', system-ui, sans-serif");
  });

  it("reads CSS variables into Mermaid themeVariables", () => {
    const theme = getMermaidTheme();
    expect(theme.background).toBe("#121212");
    expect(theme.primaryBorderColor).toBe("#d4a574");
    expect(theme.primaryColor).toBe("#a88554");
    expect(theme.fontFamily).toContain("Inter");
  });
});
