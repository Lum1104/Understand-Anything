#!/usr/bin/env python3
"""Synthesize /understand-book LLM analysis results into report + enriched graph."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class SynthesisError(RuntimeError):
    """Human-readable synthesis error."""


def read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SynthesisError(f"ERR_JSON_INVALID: {path}") from exc
    if not isinstance(data, dict):
        raise SynthesisError(f"ERR_JSON_INVALID: {path}")
    return data


def validate_results_manifest(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    if manifest.get("version") != 1:
        raise SynthesisError("ERR_RESULTS_MANIFEST_INVALID: version must be 1")
    results = manifest.get("results")
    if not isinstance(results, list) or not results:
        raise SynthesisError("ERR_RESULTS_MANIFEST_INVALID: results must be a non-empty list")
    valid: list[dict[str, Any]] = []
    for record in results:
        if not isinstance(record, dict):
            raise SynthesisError("ERR_RESULTS_MANIFEST_INVALID: result record must be an object")
        if not isinstance(record.get("batch_id"), str) or not record["batch_id"]:
            raise SynthesisError("ERR_RESULTS_MANIFEST_INVALID: batch_id missing")
        result_path = Path(record.get("path", ""))
        if not result_path.is_file():
            raise SynthesisError(f"ERR_RESULT_NOT_FOUND: {result_path}")
        valid.append(record)
    return valid


def validate_result_payload(payload: dict[str, Any], path: Path) -> None:
    if payload.get("kind") != "understand-book-analysis-result":
        raise SynthesisError(f"ERR_RESULT_INVALID: {path}")
    if not isinstance(payload.get("batch_id"), str) or not payload["batch_id"]:
        raise SynthesisError(f"ERR_RESULT_INVALID: {path} batch_id missing")
    if not isinstance(payload.get("analysis"), dict):
        raise SynthesisError(f"ERR_RESULT_INVALID: {path} analysis missing")


def normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def collect_results(manifest_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest = read_json(manifest_path)
    records = validate_results_manifest(manifest)
    payloads: list[dict[str, Any]] = []
    for record in records:
        result_path = Path(record["path"])
        payload = read_json(result_path)
        validate_result_payload(payload, result_path)
        payloads.append(payload)
    return manifest, payloads


def extract_claims(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    claims: list[dict[str, Any]] = []
    per_chunk_counts: dict[str, int] = {}
    for payload in payloads:
        analysis = payload["analysis"]
        insights = analysis.get("chunk_insights")
        if not isinstance(insights, list):
            continue
        for insight in insights:
            if not isinstance(insight, dict):
                continue
            chunk_id = insight.get("chunk_id")
            claim = insight.get("claim")
            evidence_anchor = insight.get("evidence_anchor")
            if not isinstance(chunk_id, str) or not chunk_id.strip():
                continue
            if not isinstance(claim, str) or not claim.strip():
                continue
            if not isinstance(evidence_anchor, str) or not evidence_anchor.strip():
                evidence_anchor = ""
            count = per_chunk_counts.get(chunk_id, 0) + 1
            per_chunk_counts[chunk_id] = count
            claims.append(
                {
                    "id": f"book-claim:{chunk_id}:{count:03d}",
                    "chunk_node_id": f"book-chunk:{chunk_id}",
                    "chunk_id": chunk_id,
                    "claim": claim.strip(),
                    "evidence_anchor": evidence_anchor.strip(),
                    "batch_id": payload["batch_id"],
                    "provider": payload.get("provider", ""),
                    "model": payload.get("model", ""),
                }
            )
    return claims


def write_markdown(output_dir: Path, payloads: list[dict[str, Any]], claims: list[dict[str, Any]]) -> Path:
    lines = [
        "# LLM 书籍分析",
        "",
        f"生成时间：{datetime.now(timezone.utc).isoformat()}",
        "",
        "## 批次摘要",
        "",
    ]
    for payload in payloads:
        analysis = payload["analysis"]
        summary = analysis.get("summary")
        if isinstance(summary, str) and summary.strip():
            lines.append(f"### {payload['batch_id']}")
            lines.append("")
            lines.append(summary.strip())
            lines.append("")
        key_points = normalize_string_list(analysis.get("key_points"))
        if key_points:
            lines.append("关键点：")
            lines.append("")
            for point in key_points:
                lines.append(f"- {point}")
            lines.append("")

    lines.extend(["## 证据化观点", ""])
    for claim in claims:
        anchor = f"，证据：`{claim['evidence_anchor']}`" if claim["evidence_anchor"] else ""
        lines.append(f"- `{claim['chunk_id']}`：{claim['claim']}{anchor}")
    if not claims:
        lines.append("- 暂无可用观点。")
    lines.append("")

    open_questions: list[str] = []
    for payload in payloads:
        open_questions.extend(normalize_string_list(payload["analysis"].get("open_questions")))
    if open_questions:
        lines.extend(["## 待确认问题", ""])
        for question in open_questions:
            lines.append(f"- {question}")
        lines.append("")

    markdown_path = output_dir / "book-analysis.md"
    markdown_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return markdown_path


def write_synthesis_json(output_dir: Path, manifest: dict[str, Any], payloads: list[dict[str, Any]], claims: list[dict[str, Any]]) -> Path:
    intermediate_dir = output_dir / ".understand-anything" / "intermediate"
    intermediate_dir.mkdir(parents=True, exist_ok=True)
    path = intermediate_dir / "analysis-synthesis.json"
    path.write_text(
        json.dumps(
            {
                "version": 1,
                "provider": manifest.get("provider", ""),
                "model": manifest.get("model", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "result_count": len(payloads),
                "claim_count": len(claims),
                "claims": claims,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return path


def add_unique_node(nodes: list[dict[str, Any]], node: dict[str, Any], seen: set[str]) -> None:
    node_id = node.get("id")
    if isinstance(node_id, str) and node_id not in seen:
        nodes.append(node)
        seen.add(node_id)


def edge_key(edge: dict[str, Any]) -> tuple[Any, Any, Any]:
    return edge.get("source"), edge.get("target"), edge.get("type")


def write_enriched_graph(output_dir: Path, graph_path: Path, claims: list[dict[str, Any]]) -> Path:
    graph = read_json(graph_path)
    nodes = graph.get("nodes")
    edges = graph.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise SynthesisError(f"ERR_GRAPH_INVALID: {graph_path}")

    node_ids: set[str] = set()
    for node in nodes:
        if isinstance(node, dict) and isinstance(node.get("id"), str):
            node_ids.add(node["id"])
    edge_keys = {edge_key(edge) for edge in edges if isinstance(edge, dict)}

    for claim in claims:
        chunk_node = {
            "id": claim["chunk_node_id"],
            "type": "chunk",
            "name": claim["chunk_id"],
            "summary": f"Book analysis chunk {claim['chunk_id']}",
            "tags": ["understand-book", "analysis-chunk"],
        }
        add_unique_node(nodes, chunk_node, node_ids)
        claim_node = {
            "id": claim["id"],
            "type": "claim",
            "name": claim["claim"][:60],
            "summary": claim["claim"],
            "evidence_anchor": claim["evidence_anchor"],
            "source_batch_id": claim["batch_id"],
            "tags": ["understand-book", "llm-analysis"],
        }
        add_unique_node(nodes, claim_node, node_ids)
        edge = {"source": claim["chunk_node_id"], "target": claim["id"], "type": "supports"}
        key = edge_key(edge)
        if key not in edge_keys:
            edges.append(edge)
            edge_keys.add(key)

    enriched = dict(graph)
    enriched["nodes"] = nodes
    enriched["edges"] = edges
    output_path = output_dir / ".understand-anything" / "knowledge-graph.enriched.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(enriched, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return output_path


def synthesize(manifest_path: Path, graph_path: Path, output_dir: Path) -> dict[str, Path]:
    manifest, payloads = collect_results(manifest_path)
    claims = extract_claims(payloads)
    markdown_path = write_markdown(output_dir, payloads, claims)
    synthesis_path = write_synthesis_json(output_dir, manifest, payloads, claims)
    enriched_graph_path = write_enriched_graph(output_dir, graph_path, claims)
    print(f"[analysis-synthesis] markdown: {markdown_path}")
    print(f"[analysis-synthesis] synthesis: {synthesis_path}")
    print(f"[analysis-synthesis] graph: {enriched_graph_path}")
    return {
        "markdown": markdown_path,
        "synthesis": synthesis_path,
        "graph": enriched_graph_path,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthesize understand-book LLM analysis results")
    parser.add_argument("manifest", help="Path to analysis-results-manifest.json")
    parser.add_argument("--graph", required=True, help="Path to base knowledge-graph.json")
    parser.add_argument("--output-dir", default="", help="Book output directory; defaults to manifest ../../../")
    return parser.parse_args(argv)


def default_output_dir(manifest_path: Path) -> Path:
    # <output>/.understand-anything/intermediate/analysis-results-manifest.json
    try:
        return manifest_path.parent.parent.parent
    except IndexError:
        return manifest_path.parent


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    manifest_path = Path(args.manifest)
    output_dir = Path(args.output_dir) if args.output_dir else default_output_dir(manifest_path)
    try:
        synthesize(manifest_path, Path(args.graph), output_dir)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
