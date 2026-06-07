#!/usr/bin/env python3
"""Tests for /understand-book LLM analysis adapters."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


_HERE = Path(__file__).resolve().parent
_REPO_ROOT = _HERE.parent.parent.parent
_SKILL_DIR = _REPO_ROOT / "understand-anything-plugin" / "skills" / "understand-book"
_ADAPTER_SCRIPT = _SKILL_DIR / "llm-adapters" / "run-analysis-batches.py"


def _write_batch_fixture(tmp_path: Path) -> Path:
    batches_dir = tmp_path / "analysis-batches"
    batches_dir.mkdir(parents=True)
    batch_path = batches_dir / "analysis-batch-001.json"
    batch = {
        "version": 1,
        "kind": "understand-book-analysis-batch",
        "task": "chapter_analysis",
        "language": "zh",
        "book": {"title": "Tiny Test Book"},
        "instructions": ["只基于 evidence 输出 JSON。"],
        "chunks": [
            {
                "id": "ch01-c001",
                "order": 1,
                "chapter_id": "ch01",
                "chapter_title": "第一章 开端",
                "evidence_anchor": "ch01:0-8",
                "evidence": "人工智能改变阅读方式。",
            }
        ],
    }
    batch_path.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path = tmp_path / "analysis-batches-manifest.json"
    manifest = {
        "version": 1,
        "batch_size": 1,
        "source_hash": "abc123",
        "chunk_ids": ["ch01-c001"],
        "book": {"title": "Tiny Test Book"},
        "batches": [
            {
                "id": "analysis-batch-001",
                "path": str(batch_path),
                "chunk_count": 1,
                "chunk_ids": ["ch01-c001"],
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest_path


class UnderstandBookLLMAdapterTests(unittest.TestCase):
    def test_local_command_adapter_writes_analysis_results(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            manifest_path = _write_batch_fixture(tmp_path)
            fake_llm = tmp_path / "fake_llm.py"
            fake_llm.write_text(
                """
import json
import sys
batch = json.load(sys.stdin)
print(json.dumps({
    "summary": "本批次说明人工智能改变阅读。",
    "chunk_insights": [
        {"chunk_id": chunk["id"], "claim": "阅读方式变化", "evidence_anchor": chunk["evidence_anchor"]}
        for chunk in batch["chunks"]
    ]
}, ensure_ascii=False))
""".lstrip(),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "python3",
                    str(_ADAPTER_SCRIPT),
                    str(manifest_path),
                    "--provider",
                    "local-command",
                    "--command",
                    f"{sys.executable} {fake_llm}",
                    "--model",
                    "fake-llm",
                ],
                cwd=_REPO_ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            self.assertIn("[llm-adapter] result:", result.stdout)
            result_path = tmp_path / "analysis-results" / "analysis-batch-001.result.json"
            self.assertTrue(result_path.is_file())
            payload = json.loads(result_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["version"], 1)
            self.assertEqual(payload["kind"], "understand-book-analysis-result")
            self.assertEqual(payload["provider"], "local-command")
            self.assertEqual(payload["model"], "fake-llm")
            self.assertEqual(payload["batch_id"], "analysis-batch-001")
            self.assertEqual(payload["analysis"]["summary"], "本批次说明人工智能改变阅读。")
            self.assertEqual(payload["analysis"]["chunk_insights"][0]["chunk_id"], "ch01-c001")

            results_manifest = tmp_path / "analysis-results-manifest.json"
            self.assertTrue(results_manifest.is_file())
            manifest = json.loads(results_manifest.read_text(encoding="utf-8"))
            self.assertEqual(manifest["provider"], "local-command")
            self.assertEqual(manifest["model"], "fake-llm")
            self.assertEqual(manifest["results"][0]["batch_id"], "analysis-batch-001")

    def test_deepseek_adapter_requires_api_key_without_network_call(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            manifest_path = _write_batch_fixture(tmp_path)
            env = {"PATH": os.environ.get("PATH", ""), "PYTHONPATH": os.environ.get("PYTHONPATH", "")}

            result = subprocess.run(
                [
                    "python3",
                    str(_ADAPTER_SCRIPT),
                    str(manifest_path),
                    "--provider",
                    "deepseek",
                    "--model",
                    "deepseek-v4-flash",
                ],
                cwd=_REPO_ROOT,
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("ERR_DEEPSEEK_API_KEY_MISSING", result.stderr + result.stdout)


if __name__ == "__main__":
    unittest.main()
