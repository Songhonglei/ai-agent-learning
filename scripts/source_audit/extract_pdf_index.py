import argparse
import re
from collections import defaultdict
from pathlib import Path

from pypdf import PdfReader

from scripts.source_audit.models import (
    APPROVED_PDF_SHA256,
    AuditValidationError,
    assert_distinct_paths,
    assert_expected_sha256,
    sha256_file,
    stable_source_id,
    validate_index,
    write_json_deterministic,
)


NUMBERED_LINE = re.compile(
    r"(?m)^(图|表|实验)\s*([0-9]+-[0-9]+)\s*[:：—-]?\s*([^\n]*)$"
)
PRINTED_PAGE_LINE = re.compile(r"^\s*([0-9]+)\s*$")
SYMBOL_KEYS = {"✓": "check", "✗": "cross", "△": "triangle", "★": "star"}
KIND_MAP = {"图": "figure", "表": "table", "实验": "experiment"}
CHAPTER_TITLE = re.compile(r"^第\s*([0-9]+)\s*章")
NARRATIVE_PREFIXES = (
    "展示了",
    "给出了",
    "汇总了",
    "呈现了",
    "对比了",
    "总结了",
    "所示",
)
SENTENCE_ENDINGS = ("。", "！", "？", ".", "!", "?", "；", ";")


def extract_printed_page(text: str) -> int | None:
    printed_page = None
    for line in text.splitlines():
        match = PRINTED_PAGE_LINE.fullmatch(line)
        if match:
            printed_page = int(match.group(1))
    return printed_page


def extract_numbered_occurrences(text: str, pdf_page: int) -> list[dict]:
    symbol_counts = {
        semantic_name: text.count(symbol)
        for symbol, semantic_name in SYMBOL_KEYS.items()
    }
    return [
        {
            "kind": KIND_MAP[match.group(1)],
            "number": match.group(2),
            "pdfPage": pdf_page,
            "title": match.group(3).strip(),
            "symbolCounts": symbol_counts.copy(),
        }
        for match in NUMBERED_LINE.finditer(text)
    ]


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def flatten_outline(reader) -> list[dict]:
    flattened = []

    def visit(items, depth):
        for item in items:
            if isinstance(item, list):
                visit(item, depth + 1)
                continue
            pdf_page = reader.get_destination_page_number(item) + 1
            ordinal = len(flattened) + 1
            flattened.append(
                {
                    "sourceId": stable_source_id(
                        "outline", pdf_page=pdf_page, ordinal=ordinal
                    ),
                    "kind": "outline",
                    "depth": depth,
                    "ordinal": ordinal,
                    "pdfPage": pdf_page,
                    "title": _normalize_text(getattr(item, "title", str(item))),
                }
            )

    visit(reader.outline, 0)
    return flattened


def _chapter_by_page(outline: list[dict], page_count: int) -> dict[int, int | None]:
    chapter_starts = []
    for item in outline:
        match = CHAPTER_TITLE.match(item["title"])
        if match:
            chapter_starts.append((item["pdfPage"], int(match.group(1))))

    result = {}
    chapter = None
    start_index = 0
    for pdf_page in range(1, page_count + 1):
        while (
            start_index < len(chapter_starts)
            and chapter_starts[start_index][0] <= pdf_page
        ):
            chapter = chapter_starts[start_index][1]
            start_index += 1
        result[pdf_page] = chapter
    return result


def _is_caption_like(title: str) -> bool:
    normalized_title = title.strip()
    return (
        bool(normalized_title)
        and ". . ." not in normalized_title
        and not normalized_title.startswith(NARRATIVE_PREFIXES)
        and not normalized_title.endswith(SENTENCE_ENDINGS)
    )


def _merge_numbered_items(
    occurrences: list[dict], printed_pages: dict[int, int | None]
) -> list[dict]:
    grouped = defaultdict(list)
    for occurrence in occurrences:
        candidate = {
            "pdfPage": occurrence["pdfPage"],
            "printedPage": printed_pages[occurrence["pdfPage"]],
            "title": occurrence["title"],
        }
        grouped[(occurrence["kind"], occurrence["number"])].append(
            (occurrence, candidate)
        )

    items = []
    for (kind, number), candidates in grouped.items():
        selected_pool = [
            pair for pair in candidates if _is_caption_like(pair[0]["title"])
        ]
        selected_occurrence = (selected_pool or candidates)[0][0]
        selected_page = selected_occurrence["pdfPage"]
        page_titles = [
            pair[0]["title"]
            for pair in (selected_pool or candidates)
            if pair[0]["pdfPage"] == selected_page and pair[0]["title"]
        ]
        title = min(page_titles, key=len) if page_titles else ""
        distinct_titles = {
            pair[0]["title"] for pair in candidates if pair[0]["title"]
        }
        items.append(
            {
                "sourceId": stable_source_id(kind, number=number),
                "kind": kind,
                "number": number,
                "chapter": int(number.split("-", 1)[0]),
                "pdfPage": selected_page,
                "printedPage": printed_pages[selected_page],
                "title": title,
                "occurrences": [candidate for _, candidate in candidates],
                "symbolCounts": selected_occurrence["symbolCounts"],
                "captionConflict": len(distinct_titles) > 1,
            }
        )
    return items


def build_source_index(
    pdf_path: Path, relative_pdf_path: str
) -> tuple[dict, dict]:
    reader = PdfReader(pdf_path)
    outline = flatten_outline(reader)
    chapters = _chapter_by_page(outline, len(reader.pages))
    pages = []
    all_occurrences = []
    printed_pages = {}

    for pdf_page, pdf_page_object in enumerate(reader.pages, start=1):
        text = pdf_page_object.extract_text() or ""
        normalized_text = _normalize_text(text)
        printed_page = extract_printed_page(text)
        printed_pages[pdf_page] = printed_page
        occurrences = extract_numbered_occurrences(text, pdf_page)
        all_occurrences.extend(occurrences)
        symbol_counts = {
            semantic_name: text.count(symbol)
            for symbol, semantic_name in SYMBOL_KEYS.items()
        }
        pages.append(
            {
                "sourceId": stable_source_id("page", pdf_page=pdf_page),
                "kind": "page",
                "pdfPage": pdf_page,
                "printedPage": printed_page,
                "chapter": chapters[pdf_page],
                "charCount": len(normalized_text),
                "textPreview": normalized_text[:160],
                "symbolCounts": symbol_counts,
            }
        )

    numbered_items = _merge_numbered_items(all_occurrences, printed_pages)
    kind_counts = {
        kind: sum(item["kind"] == kind for item in numbered_items)
        for kind in ("figure", "table", "experiment")
    }
    metadata = reader.metadata
    manifest = {
        "schemaVersion": 1,
        "pdfPath": relative_pdf_path,
        "sha256": sha256_file(pdf_path),
        "title": metadata.title or "",
        "author": metadata.author or "",
        "pageCount": len(reader.pages),
        "counts": {
            "figures": kind_counts["figure"],
            "tables": kind_counts["table"],
            "experiments": kind_counts["experiment"],
            "outlineItems": len(outline),
        },
    }
    index = {
        "schemaVersion": 1,
        "pdfPath": relative_pdf_path,
        "pages": pages,
        "outline": outline,
        "numberedItems": numbered_items,
    }
    return manifest, index


def _project_path(project_root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else project_root / path


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Extract a deterministic PDF index")
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--index", required=True)
    parser.add_argument("--expected-sha256", default=APPROVED_PDF_SHA256)
    args = parser.parse_args(argv)

    project_root = Path(__file__).resolve().parents[2]
    pdf_path = _project_path(project_root, args.pdf)
    manifest_path = _project_path(project_root, args.manifest)
    index_path = _project_path(project_root, args.index)
    if not pdf_path.is_file():
        raise SystemExit(f"PDF not found: {pdf_path}")
    try:
        assert_distinct_paths(
            {
                "pdf": pdf_path,
                "manifest": manifest_path,
                "index": index_path,
            }
        )
        assert_expected_sha256(pdf_path, args.expected_sha256)
    except AuditValidationError as error:
        parser.error(str(error))

    manifest, index = build_source_index(pdf_path, args.pdf)
    validate_index(index)
    write_json_deterministic(manifest_path, manifest)
    write_json_deterministic(index_path, index)

    print(manifest_path)
    print(index_path)
    counts = manifest["counts"]
    print(
        "pages={pages} figures={figures} tables={tables} "
        "experiments={experiments} outlineItems={outlineItems}".format(
            pages=manifest["pageCount"], **counts
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
