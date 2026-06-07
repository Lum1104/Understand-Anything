#!/usr/bin/env python3
"""
Convert an EPUB into a deterministic Karpathy-style wiki scaffold.

Usage:
    python epub-to-wiki.py book.epub --output .understand-book --language zh

Outputs:
    <output>/raw/<book.epub>
    <output>/wiki/index.md
    <output>/wiki/chapters/chNN.md
    <output>/.understand-anything/intermediate/book-manifest.json
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import posixpath
import re
import shutil
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


_CONTAINER = "META-INF/container.xml"
_OPF_NS = "{http://www.idpf.org/2007/opf}"
_DC_NS = "{http://purl.org/dc/elements/1.1/}"
_CONTAINER_NS = "{urn:oasis:names:tc:opendocument:xmlns:container}"
_XHTML_NS = "{http://www.w3.org/1999/xhtml}"
_IMAGE_MEDIA_PREFIX = "image/"


class EpubError(RuntimeError):
    """Human-readable EPUB ingestion error."""


@dataclass(frozen=True)
class ManifestItem:
    id: str
    href: str
    media_type: str
    properties: str
    abs_path: str


class TextExtractor(HTMLParser):
    """Small HTML-to-text extractor good enough for EPUB XHTML chapters."""

    block_tags = {
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "li",
        "main",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tr",
        "ul",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0
        self.title = ""
        self._heading_capture: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in {"script", "style"}:
            self._skip_depth += 1
            return
        if tag in self.block_tags:
            self.parts.append("\n")
        if tag == "h1" and self._heading_capture is None:
            self._heading_capture = []

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"script", "style"} and self._skip_depth:
            self._skip_depth -= 1
            return
        if tag in self.block_tags:
            self.parts.append("\n")
        if tag == "h1" and self._heading_capture is not None:
            title = "".join(self._heading_capture).strip()
            if title and not self.title:
                self.title = title
            self._heading_capture = None

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        if self._heading_capture is not None:
            self._heading_capture.append(data)
        self.parts.append(data)

    def text(self) -> str:
        raw = html.unescape("".join(self.parts))
        raw = raw.replace("\xa0", " ")
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in raw.splitlines()]
        collapsed: list[str] = []
        previous_blank = True
        for line in lines:
            if not line:
                if not previous_blank:
                    collapsed.append("")
                previous_blank = True
                continue
            collapsed.append(line)
            previous_blank = False
        return "\n\n".join([line for line in collapsed if line]).strip()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def xml_text(root: ET.Element, tag: str) -> str:
    el = root.find(f".//{tag}")
    return (el.text or "").strip() if el is not None else ""


def xml_texts(root: ET.Element, tag: str) -> list[str]:
    return [(el.text or "").strip() for el in root.findall(f".//{tag}") if (el.text or "").strip()]


def read_rootfile_path(zf: zipfile.ZipFile) -> str:
    try:
        data = zf.read(_CONTAINER)
    except KeyError as exc:
        raise EpubError("ERR_EPUB_PARSE_FAILED: META-INF/container.xml not found") from exc
    root = ET.fromstring(data)
    rootfile = root.find(f".//{_CONTAINER_NS}rootfile")
    if rootfile is None:
        rootfile = root.find(".//rootfile")
    if rootfile is None or not rootfile.attrib.get("full-path"):
        raise EpubError("ERR_EPUB_PARSE_FAILED: package rootfile not found")
    return rootfile.attrib["full-path"]


def parse_opf(zf: zipfile.ZipFile, opf_path: str) -> tuple[ET.Element, dict[str, ManifestItem], list[str]]:
    try:
        opf_data = zf.read(opf_path)
    except KeyError as exc:
        raise EpubError(f"ERR_EPUB_PARSE_FAILED: OPF not found: {opf_path}") from exc
    root = ET.fromstring(opf_data)
    base = posixpath.dirname(opf_path)

    items: dict[str, ManifestItem] = {}
    for item in root.findall(f".//{_OPF_NS}manifest/{_OPF_NS}item") or root.findall(".//manifest/item"):
        item_id = item.attrib.get("id", "")
        href = item.attrib.get("href", "")
        if not item_id or not href:
            continue
        abs_path = posixpath.normpath(posixpath.join(base, href))
        items[item_id] = ManifestItem(
            id=item_id,
            href=href,
            media_type=item.attrib.get("media-type", ""),
            properties=item.attrib.get("properties", ""),
            abs_path=abs_path,
        )

    spine: list[str] = []
    for itemref in root.findall(f".//{_OPF_NS}spine/{_OPF_NS}itemref") or root.findall(".//spine/itemref"):
        idref = itemref.attrib.get("idref")
        if idref:
            spine.append(idref)

    return root, items, spine


def parse_nav_toc(zf: zipfile.ZipFile, items: dict[str, ManifestItem]) -> list[dict[str, Any]]:
    nav_item = next((i for i in items.values() if "nav" in i.properties.split()), None)
    if not nav_item:
        return []
    try:
        text = zf.read(nav_item.abs_path).decode("utf-8", errors="replace")
        root = ET.fromstring(text)
    except Exception:
        return []

    toc: list[dict[str, Any]] = []
    for a in root.findall(f".//{_XHTML_NS}a") or root.findall(".//a"):
        label = "".join(a.itertext()).strip()
        href = a.attrib.get("href", "")
        if label or href:
            toc.append({"title": label, "href": href})
    return toc


def extract_html_text(html_text: str) -> tuple[str, str]:
    parser = TextExtractor()
    parser.feed(html_text)
    return parser.text(), parser.title


def safe_title(value: str, fallback: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    return value or fallback


def write_markdown(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def ingest_epub(input_path: Path, output_dir: Path, language: str) -> dict[str, Any]:
    if not input_path.is_file():
        raise EpubError(f"ERR_INPUT_NOT_FOUND: {input_path}")
    if input_path.suffix.lower() != ".epub":
        raise EpubError(f"ERR_INPUT_NOT_EPUB: {input_path}")

    raw_dir = output_dir / "raw"
    wiki_dir = output_dir / "wiki"
    chapter_wiki_dir = wiki_dir / "chapters"
    intermediate_dir = output_dir / ".understand-anything" / "intermediate"
    chapter_text_dir = intermediate_dir / "chapters"
    chapter_html_dir = intermediate_dir / "html"
    asset_dir = raw_dir / "assets"

    for directory in [raw_dir, chapter_wiki_dir, intermediate_dir, chapter_text_dir, chapter_html_dir, asset_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    raw_copy = raw_dir / input_path.name
    shutil.copy2(input_path, raw_copy)

    with zipfile.ZipFile(input_path) as zf:
        opf_path = read_rootfile_path(zf)
        opf_root, items, spine = parse_opf(zf, opf_path)
        toc = parse_nav_toc(zf, items)

        title = xml_text(opf_root, f"{_DC_NS}title") or xml_text(opf_root, "title") or input_path.stem
        authors = xml_texts(opf_root, f"{_DC_NS}creator") or xml_texts(opf_root, "creator")
        language = language or xml_text(opf_root, f"{_DC_NS}language") or xml_text(opf_root, "language") or "unknown"
        publisher = xml_text(opf_root, f"{_DC_NS}publisher") or xml_text(opf_root, "publisher")
        published_at = xml_text(opf_root, f"{_DC_NS}date") or xml_text(opf_root, "date")
        identifier = xml_text(opf_root, f"{_DC_NS}identifier") or xml_text(opf_root, "identifier")

        chapters: list[dict[str, Any]] = []
        toc_by_href = {t["href"].split("#", 1)[0]: t["title"] for t in toc if t.get("href")}

        for index, idref in enumerate(spine, start=1):
            item = items.get(idref)
            if not item or "html" not in item.media_type:
                continue
            try:
                html_text = zf.read(item.abs_path).decode("utf-8", errors="replace")
            except KeyError:
                continue

            text, h1 = extract_html_text(html_text)
            if not text:
                continue

            chapter_id = f"ch{len(chapters) + 1:02d}"
            title_from_toc = toc_by_href.get(item.href) or toc_by_href.get(item.abs_path)
            chapter_title = safe_title(h1 or title_from_toc or f"Chapter {len(chapters) + 1}", f"Chapter {len(chapters) + 1}")

            text_path = chapter_text_dir / f"{chapter_id}.txt"
            html_path = chapter_html_dir / f"{chapter_id}.html"
            wiki_path = chapter_wiki_dir / f"{chapter_id}.md"
            text_path.write_text(text, encoding="utf-8")
            html_path.write_text(html_text, encoding="utf-8")
            write_markdown(
                wiki_path,
                f"# {chapter_title}\n\n"
                f"## Source\n\n"
                f"- Chapter ID: `{chapter_id}`\n"
                f"- EPUB href: `{item.href}`\n\n"
                f"## Text\n\n{text}",
            )

            chapters.append(
                {
                    "id": chapter_id,
                    "order": len(chapters) + 1,
                    "title": chapter_title,
                    "href": item.href,
                    "text_path": str(text_path),
                    "html_path": str(html_path),
                    "wiki_path": str(wiki_path),
                    "word_count": len(re.findall(r"\w+", text)),
                    "char_count": len(text),
                }
            )

        if not chapters:
            raise EpubError("ERR_NO_CHAPTERS_FOUND: no readable spine XHTML chapters found")

        assets: list[dict[str, Any]] = []
        for item in items.values():
            if not item.media_type.startswith(_IMAGE_MEDIA_PREFIX):
                continue
            try:
                data = zf.read(item.abs_path)
            except KeyError:
                continue
            out_name = posixpath.basename(item.href) or f"asset-{len(assets) + 1}"
            out_path = asset_dir / out_name
            out_path.write_bytes(data)
            assets.append(
                {
                    "type": "image",
                    "href": item.href,
                    "media_type": item.media_type,
                    "output_path": str(out_path),
                }
            )

    index_lines = [
        f"# {title}",
        "",
        "## Chapters",
        "",
    ]
    for chapter in chapters:
        index_lines.append(f"- [[chapters/{chapter['id']}|{chapter['title']}]]")
    index_lines.extend(
        [
            "",
            "## Source",
            "",
            f"- EPUB: `../raw/{input_path.name}`",
            f"- Language: `{language}`",
        ]
    )
    write_markdown(wiki_dir / "index.md", "\n".join(index_lines))

    manifest = {
        "version": 1,
        "source": {
            "type": "epub",
            "input_path": str(input_path),
            "copied_path": str(raw_copy),
            "file_name": input_path.name,
            "file_size": input_path.stat().st_size,
            "hash": sha256_file(input_path),
        },
        "book": {
            "title": title,
            "authors": authors,
            "language": language,
            "publisher": publisher,
            "published_at": published_at,
            "identifier": identifier,
        },
        "toc": toc,
        "chapters": chapters,
        "assets": assets,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    (intermediate_dir / "book-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert EPUB to an Understand Anything book wiki scaffold")
    parser.add_argument("input", help="Path to .epub file")
    parser.add_argument("--output", default=".understand-book", help="Output directory")
    parser.add_argument("--language", default="", help="Output language override")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        manifest = ingest_epub(Path(args.input).resolve(), Path(args.output).resolve(), args.language)
    except EpubError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(
        f"[understand-book] Manifest ready: {len(manifest['chapters'])} chapters, "
        f"{len(manifest['assets'])} assets"
    )
    print(f"[understand-book] Wiki: {Path(args.output).resolve() / 'wiki'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
