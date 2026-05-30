export function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

export function normalizeSourcePreviewPath(requestedPath: string): string | null {
  if (!requestedPath || hasControlCharacters(requestedPath)) return null;
  const posixPath = toPosix(requestedPath);
  if (posixPath.startsWith("/") || /^[a-zA-Z]:\//.test(posixPath)) return null;
  const parts = posixPath.split("/");
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) return null;
  return parts.join("/");
}

export function isDeniedSourcePreviewPath(filePath: string): boolean {
  if (!filePath || hasControlCharacters(filePath)) return true;
  const normalized = toPosix(filePath).toLowerCase();
  const parts = normalized.split("/").filter(Boolean);
  const base = parts.at(-1) ?? "";

  if (base === ".env" || base.startsWith(".env.")) return true;
  if (["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "kubeconfig"].includes(base)) return true;
  if (base === "credentials" || base.startsWith("credentials.") || base.endsWith(".credentials")) return true;
  if (base === "secrets" || base.startsWith("secrets.") || base.endsWith(".secret") || base.endsWith(".secrets")) return true;
  if (parts.includes("secrets") || parts.includes(".secrets") || parts.includes("credentials")) return true;
  if (/\.(pem|key|crt|cer|cert|p12|pfx|kubeconfig|db|sqlite|sqlite3|dump)$/u.test(base)) return true;
  if (/\.sql\.gz$/u.test(base)) return true;
  if (/.*(dump|backup).*\.sql$/u.test(base)) return true;
  return false;
}

export function isRealPathInsideRoot(projectRootRealPath: string, fileRealPath: string): boolean {
  if (!projectRootRealPath || !fileRealPath) return false;
  if (hasControlCharacters(projectRootRealPath) || hasControlCharacters(fileRealPath)) return false;
  const root = toPosix(projectRootRealPath).replace(/\/+$/u, "");
  const file = toPosix(fileRealPath);
  return file === root || file.startsWith(`${root}/`);
}
