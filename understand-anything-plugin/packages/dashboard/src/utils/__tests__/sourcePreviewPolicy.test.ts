import { describe, expect, it } from "vitest";
import {
  hasControlCharacters,
  isDeniedSourcePreviewPath,
  isRealPathInsideRoot,
  normalizeSourcePreviewPath,
} from "../sourcePreviewPolicy";

describe("source preview policy", () => {
  it("normalizes safe project-relative paths", () => {
    expect(normalizeSourcePreviewPath("src/app.ts")).toBe("src/app.ts");
    expect(normalizeSourcePreviewPath("src\\app.ts")).toBe("src/app.ts");
  });

  it("rejects traversal, absolute paths, and control characters", () => {
    expect(normalizeSourcePreviewPath("../.env")).toBeNull();
    expect(normalizeSourcePreviewPath("/tmp/secret.txt")).toBeNull();
    expect(normalizeSourcePreviewPath("C:/Users/alice/.ssh/id_rsa")).toBeNull();
    expect(normalizeSourcePreviewPath("src/evil\nname.ts")).toBeNull();
    expect(hasControlCharacters("bad\rpath")).toBe(true);
  });

  it("denies sensitive file previews even when graph-listed", () => {
    for (const path of [
      ".env",
      ".env.local",
      "config/private.key",
      "certs/site.pem",
      "credentials.json",
      "secrets/api-token.txt",
      "data/prod.sqlite",
      "backups/prod-dump.sql",
    ]) {
      expect(isDeniedSourcePreviewPath(path), path).toBe(true);
    }
  });

  it("allows ordinary source files", () => {
    expect(isDeniedSourcePreviewPath("src/app.ts")).toBe(false);
    expect(isDeniedSourcePreviewPath("README.md")).toBe(false);
  });

  it("rejects realpaths outside the project root", () => {
    expect(isRealPathInsideRoot("/tmp/project", "/tmp/project/src/app.ts")).toBe(true);
    expect(isRealPathInsideRoot("/tmp/project", "/tmp/project2/src/app.ts")).toBe(false);
    expect(isRealPathInsideRoot("/tmp/project", "/etc/passwd")).toBe(false);
  });
});
