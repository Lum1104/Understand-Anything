/**
 * Shared safety policy for graph identifiers, paths, and sensitive files.
 */

export const SENSITIVE_FILE_PATTERNS = Object.freeze([
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.crt",
  "*.cer",
  "*.cert",
  "*.p12",
  "*.pfx",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  "credentials",
  "credentials.*",
  "*.credentials",
  "*.secret",
  "*.secrets",
  "secrets/",
  ".secrets/",
  "*.kubeconfig",
  "kubeconfig",
  "*.db",
  "*.sqlite",
  "*.sqlite3",
  "*.dump",
  "*.sql.gz",
  "*dump*.sql",
  "*backup*.sql",
]);

export function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function isSafeGraphId(value: string): boolean {
  return value.length > 0 && !hasControlCharacters(value);
}

function normalizePathText(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function isSafeRelativePath(value: string): boolean {
  if (!value || hasControlCharacters(value)) return false;
  const normalized = normalizePathText(value);
  if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return false;
  const parts = normalized.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function basename(filePath: string): string {
  const normalized = normalizePathText(filePath).replace(/\/+$/g, "");
  const idx = normalized.lastIndexOf("/");
  return (idx >= 0 ? normalized.slice(idx + 1) : normalized).toLowerCase();
}

export function isSensitiveFilePath(filePath: string): boolean {
  if (!filePath || hasControlCharacters(filePath)) return true;
  const normalized = normalizePathText(filePath).toLowerCase();
  const base = basename(normalized);
  const segments = normalized.split("/").filter(Boolean);

  if (base === ".env" || base.startsWith(".env.")) return true;
  if (["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "kubeconfig"].includes(base)) return true;
  if (base === "credentials" || base.startsWith("credentials.") || base.endsWith(".credentials")) return true;
  if (base === "secrets" || base.startsWith("secrets.") || base.endsWith(".secret") || base.endsWith(".secrets")) return true;
  if (segments.includes("secrets") || segments.includes(".secrets") || segments.includes("credentials")) return true;
  if (/\.(pem|key|crt|cer|cert|p12|pfx|kubeconfig|db|sqlite|sqlite3|dump)$/u.test(base)) return true;
  if (/\.sql\.gz$/u.test(base)) return true;
  if (/.*(dump|backup).*\.sql$/u.test(base)) return true;
  return false;
}
