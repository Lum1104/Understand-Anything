#!/usr/bin/env python3
"""Run optional LLM analysis over /understand-book analysis batches.

Core EPUB pipeline remains deterministic. This adapter consumes
analysis-batches-manifest.json and writes analysis-results/*.result.json.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class AdapterError(RuntimeError):
    """Human-readable adapter error."""


_SAFE_BATCH_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AdapterError(f"ERR_JSON_INVALID: {path}") from exc
    if not isinstance(data, dict):
        raise AdapterError(f"ERR_JSON_INVALID: {path}")
    return data


def validate_batches_manifest(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    if manifest.get("version") != 1:
        raise AdapterError("ERR_BATCHES_MANIFEST_INVALID: version must be 1")
    batches = manifest.get("batches")
    if not isinstance(batches, list) or not batches:
        raise AdapterError("ERR_BATCHES_MANIFEST_INVALID: batches must be a non-empty list")
    valid: list[dict[str, Any]] = []
    for batch in batches:
        if not isinstance(batch, dict):
            raise AdapterError("ERR_BATCHES_MANIFEST_INVALID: batch must be an object")
        batch_id = batch.get("id")
        if not isinstance(batch_id, str) or not batch_id:
            raise AdapterError("ERR_BATCHES_MANIFEST_INVALID: batch id missing")
        if not _SAFE_BATCH_ID.fullmatch(batch_id):
            raise AdapterError(f"ERR_BATCH_ID_INVALID: {batch_id}")
        batch_path = Path(batch.get("path", ""))
        if not batch_path.is_file():
            raise AdapterError(f"ERR_BATCH_NOT_FOUND: {batch_path}")
        valid.append(batch)
    return valid


def validate_batch_payload(batch: dict[str, Any], batch_path: Path) -> None:
    if batch.get("kind") != "understand-book-analysis-batch":
        raise AdapterError(f"ERR_BATCH_INVALID: {batch_path}")
    chunks = batch.get("chunks")
    if not isinstance(chunks, list) or not chunks:
        raise AdapterError(f"ERR_BATCH_INVALID: {batch_path} has no chunks")
    for chunk in chunks:
        if not isinstance(chunk, dict) or not isinstance(chunk.get("id"), str):
            raise AdapterError(f"ERR_BATCH_INVALID: {batch_path} chunk id missing")
        if not isinstance(chunk.get("evidence_anchor"), str):
            raise AdapterError(f"ERR_BATCH_INVALID: {batch_path} evidence anchor missing")
        if not isinstance(chunk.get("evidence"), str) or not chunk["evidence"].strip():
            raise AdapterError(f"ERR_BATCH_INVALID: {batch_path} evidence missing")


def build_result(
    *,
    batch_record: dict[str, Any],
    batch_path: Path,
    provider: str,
    model: str,
    analysis: dict[str, Any],
) -> dict[str, Any]:
    return {
        "version": 1,
        "kind": "understand-book-analysis-result",
        "provider": provider,
        "model": model,
        "batch_id": batch_record["id"],
        "source_batch_path": str(batch_path),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analysis": analysis,
    }


def run_local_command(batch: dict[str, Any], command: str) -> dict[str, Any]:
    if not command.strip():
        raise AdapterError("ERR_LOCAL_COMMAND_MISSING: --command is required for local-command")
    args = shlex.split(command)
    result = subprocess.run(
        args,
        input=json.dumps(batch, ensure_ascii=False),
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AdapterError(f"ERR_LOCAL_COMMAND_FAILED: exit {result.returncode}: {result.stderr.strip()}")
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise AdapterError("ERR_LOCAL_COMMAND_INVALID_JSON: stdout must be a JSON object") from exc
    if not isinstance(payload, dict):
        raise AdapterError("ERR_LOCAL_COMMAND_INVALID_JSON: stdout must be a JSON object")
    return payload


def build_deepseek_messages(batch: dict[str, Any]) -> list[dict[str, str]]:
    system = (
        "你是严谨的书籍理解分析器。只基于用户提供的 JSON batch 中的 evidence 分析。"
        "不要编造。必须输出合法 JSON，不要 Markdown。"
    )
    user = {
        "task": "chapter_analysis",
        "output_schema": {
            "summary": "string，全批次摘要",
            "key_points": ["string，关键观点"],
            "chunk_insights": [
                {
                    "chunk_id": "string",
                    "claim": "string",
                    "evidence_anchor": "string",
                }
            ],
            "open_questions": ["string，无法从证据确定的问题"],
        },
        "batch": batch,
    }
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
    ]


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    try:
        payload = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise AdapterError("ERR_LLM_RESPONSE_INVALID_JSON: model response must be JSON") from exc
    if not isinstance(payload, dict):
        raise AdapterError("ERR_LLM_RESPONSE_INVALID_JSON: model response must be a JSON object")
    return payload


def run_deepseek(batch: dict[str, Any], model: str, timeout_seconds: int) -> dict[str, Any]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise AdapterError("ERR_DEEPSEEK_API_KEY_MISSING: set DEEPSEEK_API_KEY in the environment")
    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    url = base_url.rstrip("/") + "/chat/completions"
    body = {
        "model": model,
        "messages": build_deepseek_messages(batch),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise AdapterError(f"ERR_DEEPSEEK_HTTP_FAILED: {exc.code} {detail}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AdapterError(f"ERR_DEEPSEEK_REQUEST_FAILED: {exc}") from exc

    try:
        content = response_payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AdapterError("ERR_DEEPSEEK_RESPONSE_INVALID: missing choices[0].message.content") from exc
    if not isinstance(content, str):
        raise AdapterError("ERR_DEEPSEEK_RESPONSE_INVALID: content must be string")
    return extract_json_object(content)


def run_adapter(
    manifest_path: Path,
    provider: str,
    model: str,
    command: str,
    output_dir: Path | None,
    timeout_seconds: int,
) -> Path:
    manifest = read_json(manifest_path)
    batches = validate_batches_manifest(manifest)
    results_dir = output_dir or (manifest_path.parent / "analysis-results")
    results_dir.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    for batch_record in batches:
        batch_path = Path(batch_record["path"])
        batch = read_json(batch_path)
        validate_batch_payload(batch, batch_path)
        if provider == "local-command":
            analysis = run_local_command(batch, command)
        elif provider == "deepseek":
            analysis = run_deepseek(batch, model, timeout_seconds)
        else:
            raise AdapterError(f"ERR_PROVIDER_UNSUPPORTED: {provider}")

        result_payload = build_result(
            batch_record=batch_record,
            batch_path=batch_path,
            provider=provider,
            model=model,
            analysis=analysis,
        )
        result_path = results_dir / f"{batch_record['id']}.result.json"
        result_path.write_text(json.dumps(result_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"[llm-adapter] result: {result_path}")
        records.append(
            {
                "batch_id": batch_record["id"],
                "path": str(result_path),
                "source_batch_path": str(batch_path),
            }
        )

    results_manifest = results_dir.parent / "analysis-results-manifest.json"
    results_manifest.write_text(
        json.dumps(
            {
                "version": 1,
                "provider": provider,
                "model": model,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "results": records,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"[llm-adapter] manifest: {results_manifest}")
    return results_manifest


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run LLM analysis over understand-book batches")
    parser.add_argument("manifest", help="Path to analysis-batches-manifest.json")
    parser.add_argument("--provider", choices=["local-command", "deepseek"], required=True)
    parser.add_argument("--model", default="deepseek-v4-flash", help="LLM model name")
    parser.add_argument("--command", default="", help="Command for local-command provider; reads batch JSON stdin, writes JSON stdout")
    parser.add_argument("--output-dir", default="", help="Output directory for *.result.json files")
    parser.add_argument("--timeout-seconds", type=int, default=120)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        output_dir = Path(args.output_dir) if args.output_dir else None
        run_adapter(Path(args.manifest), args.provider, args.model, args.command, output_dir, args.timeout_seconds)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
