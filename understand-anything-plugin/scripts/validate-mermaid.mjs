#!/usr/bin/env node
// Reads JSONL on stdin: { "id": string, "source": string } per line.
// Writes JSONL on stdout: { "id": string, "ok": boolean, "error"?: string } per line.
// Exit code 0 regardless of parse failures — the caller inspects the output lines.

import { createInterface } from "node:readline";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ id: null, ok: false, error: `invalid-json: ${err.message}` }) + "\n",
    );
    continue;
  }
  const { id, source } = payload;
  try {
    await mermaid.parse(source);
    process.stdout.write(JSON.stringify({ id, ok: true }) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ id, ok: false, error: String(err?.message ?? err) }) + "\n",
    );
  }
}
