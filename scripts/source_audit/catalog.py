from __future__ import annotations

import copy
import math
import re

from scripts.source_audit.models import (
    ALL_KINDS,
    AuditValidationError,
    all_source_items,
    validate_index,
)
EDITORIAL_KINDS = ALL_KINDS | {"visual"}
VISUAL_ID = re.compile(r"visual-p([0-9]{3})-([0-9]{2})")
DISCOVERY_EVIDENCE = re.compile(r"(.+?)[；;]\s*PDF 第([0-9]+)页(?:.+)?")


def _pending(name):
    raise NotImplementedError(name)


def stable_visual_id(pdf_page: int, ordinal: int) -> str:
    if type(pdf_page) is not int or pdf_page < 1:
        raise AuditValidationError(f"pdfPage must be a positive integer: {pdf_page!r}")
    if type(ordinal) is not int or ordinal < 1 or ordinal > 99:
        raise AuditValidationError(f"ordinal must be an integer from 1 to 99: {ordinal!r}")
    return f"visual-p{pdf_page:03d}-{ordinal:02d}"


def _validate_region(source_id: str, region: object) -> None:
    if not isinstance(region, dict):
        raise AuditValidationError(f"region must be an object: {source_id}")
    if set(region) != {"x", "y", "width", "height"}:
        raise AuditValidationError(f"region fields mismatch: {source_id}")
    for field in ("x", "y", "width", "height"):
        value = region[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise AuditValidationError(
                f"region.{field} must be numeric: {source_id}"
            )
        if not math.isfinite(value):
            raise AuditValidationError(
                f"region.{field} must be finite: {source_id}"
            )
    if region["x"] < 0 or region["y"] < 0:
        raise AuditValidationError(f"region origin is negative: {source_id}")
    if region["width"] <= 0 or region["height"] <= 0:
        raise AuditValidationError(f"region size must be positive: {source_id}")
    if region["x"] + region["width"] > 1:
        raise AuditValidationError(f"region exceeds page width: {source_id}")
    if region["y"] + region["height"] > 1:
        raise AuditValidationError(f"region exceeds page height: {source_id}")


def _validated_visual_identity(
    item,
    position,
    generated_ids,
    known_pages,
):
    if not isinstance(item, dict):
        raise AuditValidationError(
            f"visual at position {position} must be an object"
        )
    required = {
        "sourceId", "kind", "pdfPage", "region",
        "semanticBrief", "discoveryEvidence",
    }
    if set(item) != required:
        raise AuditValidationError(
            f"visual fields mismatch at position {position}"
        )
    source_id = item["sourceId"]
    if not isinstance(source_id, str) or not source_id.strip():
        raise AuditValidationError("visual sourceId must be non-blank")
    if source_id in generated_ids:
        raise AuditValidationError(
            f"visual ID collides with generated index: {source_id}"
        )
    if item["kind"] != "visual":
        raise AuditValidationError(f"invalid visual kind: {source_id}")
    pdf_page = item["pdfPage"]
    if type(pdf_page) is not int or pdf_page not in known_pages:
        raise AuditValidationError(
            f"visual references unknown pdfPage: {source_id}"
        )
    match = VISUAL_ID.fullmatch(source_id)
    if match is None or int(match.group(1)) != pdf_page:
        raise AuditValidationError(
            f"visual ID/page mismatch: {source_id}"
        )
    _validate_region(source_id, item["region"])
    brief = item["semanticBrief"]
    if not isinstance(brief, str) or not brief.strip():
        raise AuditValidationError(
            f"semanticBrief must be non-blank: {source_id}"
        )
    evidence = item["discoveryEvidence"]
    evidence_match = (
        DISCOVERY_EVIDENCE.fullmatch(evidence)
        if isinstance(evidence, str)
        else None
    )
    if (
        evidence_match is None
        or not evidence_match.group(1).strip()
        or int(evidence_match.group(2)) != pdf_page
    ):
        raise AuditValidationError(
            f"discoveryEvidence page/method mismatch: {source_id}"
        )
    return source_id, pdf_page, int(match.group(2))


def validate_unnumbered_visuals(index: dict, visuals: list[dict]) -> None:
    validate_index(index)
    if not isinstance(visuals, list):
        raise AuditValidationError("unnumbered visuals must be a list")
    generated_ids = {
        item["sourceId"] for item in all_source_items(index)
    }
    known_pages = {item["pdfPage"] for item in index["pages"]}
    seen_ids = set()
    ordinals_by_page = {}
    for position, item in enumerate(visuals):
        source_id, pdf_page, ordinal = _validated_visual_identity(
            item, position, generated_ids, known_pages,
        )
        if source_id in seen_ids:
            raise AuditValidationError(f"duplicate visual ID: {source_id}")
        seen_ids.add(source_id)
        ordinals_by_page.setdefault(pdf_page, []).append(ordinal)
    for pdf_page, ordinals in ordinals_by_page.items():
        expected = list(range(1, len(ordinals) + 1))
        if sorted(ordinals) != expected:
            raise AuditValidationError(
                f"visual ordinals must be contiguous on page {pdf_page}"
            )
    if [item["sourceId"] for item in visuals] != sorted(seen_ids):
        raise AuditValidationError(
            "unnumbered visuals must use sourceId order"
        )


def chapter_for_item(index: dict, item: dict) -> int | None:
    if item.get("chapter") is not None:
        return item["chapter"]
    page_chapters = {
        page["pdfPage"]: page.get("chapter")
        for page in index["pages"]
    }
    return page_chapters[item["pdfPage"]]


def all_editorial_source_items(index: dict, visuals: list[dict]) -> list[dict]:
    validate_index(index)
    validate_unnumbered_visuals(index, visuals)
    expanded = [
        {**item, "chapter": chapter_for_item(index, item)}
        for item in [*all_source_items(index), *visuals]
    ]
    return sorted(
        expanded,
        key=lambda item: item["sourceId"],
    )


def source_items_by_id(index: dict, visuals: list[dict]) -> dict[str, dict]:
    return {
        item["sourceId"]: item
        for item in all_editorial_source_items(index, visuals)
    }
