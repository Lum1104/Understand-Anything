#!/usr/bin/env python3
"""Tests for synthesizing /understand-book LLM analysis results."""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path


_HERE = Path(__file__).resolve().parent
_REPO_ROOT = _HERE.parent.parent.parent
_SKILL_DIR = _REPO_ROOT / "understand-anything-plugin" / "skills" / "understand-book"
_SYNTH_SCRIPT = _SKILL_DIR / "llm-adapters" / "synthesize-analysis-results.py"


def _write_analysis_result_fixture(tmp_path: Path) -> tuple[Path, Path]:
    intermediate_dir = tmp_path / ".understand-anything" / "intermediate"
    results_dir = intermediate_dir / "analysis-results"
    results_dir.mkdir(parents=True)
    result_path = results_dir / "analysis-batch-001.result.json"
    result_payload = {
        "version": 1,
        "kind": "understand-book-analysis-result",
        "provider": "local-command",
        "model": "fake-llm",
        "batch_id": "analysis-batch-001",
        "source_batch_path": str(intermediate_dir / "analysis-batches" / "analysis-batch-001.json"),
        "analysis": {
            "summary": "本章说明人工智能改变阅读方式。",
            "key_points": ["阅读方式变化", "证据需要回链"],
            "chunk_insights": [
                {
                    "chunk_id": "ch01-c001",
                    "claim": "人工智能改变阅读方式",
                    "evidence_anchor": "ch01:0-12",
                },
                {
                    "chunk_id": "ch02-c001",
                    "claim": "证据必须绑定原文",
                    "evidence_anchor": "ch02:0-10",
                },
            ],
            "open_questions": ["作者没有说明评估方法。"],
        },
    }
    result_path.write_text(json.dumps(result_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest_path = intermediate_dir / "analysis-results-manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "version": 1,
                "provider": "local-command",
                "model": "fake-llm",
                "results": [
                    {
                        "batch_id": "analysis-batch-001",
                        "path": str(result_path),
                        "source_batch_path": str(result_payload["source_batch_path"]),
                    }
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    graph_path = tmp_path / ".understand-anything" / "knowledge-graph.json"
    graph_path.parent.mkdir(parents=True, exist_ok=True)
    graph_path.write_text(
        json.dumps(
            {
                "kind": "knowledge",
                "nodes": [
                    {"id": "file:wiki/index.md", "type": "file", "name": "index.md", "filePath": "wiki/index.md"}
                ],
                "edges": [],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return manifest_path, graph_path


class AnalysisSynthesisTests(unittest.TestCase):
    def test_synthesizes_markdown_summary_and_enriched_graph(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            manifest_path, graph_path = _write_analysis_result_fixture(tmp_path)

            result = subprocess.run(
                [
                    "python3",
                    str(_SYNTH_SCRIPT),
                    str(manifest_path),
                    "--graph",
                    str(graph_path),
                    "--output-dir",
                    str(tmp_path),
                ],
                cwd=_REPO_ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            self.assertIn("[analysis-synthesis] markdown:", result.stdout)

            markdown_path = tmp_path / "book-analysis.md"
            self.assertTrue(markdown_path.is_file())
            markdown = markdown_path.read_text(encoding="utf-8")
            self.assertIn("# LLM 书籍分析", markdown)
            self.assertIn("本章说明人工智能改变阅读方式。", markdown)
            self.assertIn("人工智能改变阅读方式", markdown)
            self.assertIn("`ch01:0-12`", markdown)
            self.assertIn("作者没有说明评估方法。", markdown)

            synthesis_path = tmp_path / ".understand-anything" / "intermediate" / "analysis-synthesis.json"
            self.assertTrue(synthesis_path.is_file())
            synthesis = json.loads(synthesis_path.read_text(encoding="utf-8"))
            self.assertEqual(synthesis["version"], 1)
            self.assertEqual(synthesis["result_count"], 1)
            self.assertEqual(synthesis["claim_count"], 2)
            self.assertEqual(synthesis["claims"][0]["chunk_id"], "ch01-c001")

            enriched_graph_path = tmp_path / ".understand-anything" / "knowledge-graph.enriched.json"
            self.assertTrue(enriched_graph_path.is_file())
            graph = json.loads(enriched_graph_path.read_text(encoding="utf-8"))
            node_ids = {node["id"] for node in graph["nodes"]}
            self.assertIn("book-chunk:ch01-c001", node_ids)
            self.assertIn("book-claim:ch01-c001:001", node_ids)
            self.assertTrue(
                any(
                    edge["source"] == "book-chunk:ch01-c001"
                    and edge["target"] == "book-claim:ch01-c001:001"
                    and edge["type"] == "supports"
                    for edge in graph["edges"]
                )
            )


if __name__ == "__main__":
    unittest.main()
