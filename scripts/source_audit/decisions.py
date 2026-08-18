from __future__ import annotations

import re
from copy import deepcopy
from pathlib import PurePosixPath

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.models import AuditValidationError


DISPOSITIONS = {"included", "compressed", "excluded", "missing", "unreviewed"}
VISUAL_KINDS = {"figure", "table", "visual"}
MANUAL_RISK_FLAGS = {"critical-number", "experiment-conclusion", "scope-boundary"}
SYMBOL_KEYS = {"✓": "check", "✗": "cross", "△": "triangle", "★": "star"}
REFERENCE_ONLY_VISUAL_TEXT = re.compile(
    r"(?:请)?(?:(?:见|参见|参考)(?:原图|上图|图[0-9A-Za-z._-]+)|同原图)[。.]?"
)
MARKDOWN_LINES = re.compile(r"[1-9][0-9]*(?:-[1-9][0-9]*)?")
APPROVED_CAPTION_CONFLICT_SOURCE_IDS = (
    "experiment-1-1",
    "experiment-2-7",
    "experiment-2-8",
    "experiment-4-4",
    "experiment-9-1",
    "experiment-10-4",
    "figure-1-4",
    "figure-2-6",
    "figure-3-5",
    "figure-4-9",
    "figure-8-2",
    "figure-8-3",
    "figure-8-4",
    "figure-10-3",
    "table-2-1",
    "table-7-3",
    "table-7-4",
    "table-8-2",
    "table-10-1",
    "table-10-2",
    "table-10-4",
)
BASE_RECORD_FIELDS = {
    "sourceId",
    "disposition",
    "reason",
    "lessonIds",
    "markdownRefs",
    "visualClass",
    "visualHandling",
    "reviewState",
    "riskFlags",
    "mustKeepIds",
    "symbolTextAlternatives",
}


def initial_editorial_decision(item: dict) -> dict:
    value = {
        "sourceId": item["sourceId"],
        "disposition": "unreviewed",
        "reason": "",
        "lessonIds": [],
        "markdownRefs": [],
        "visualClass": None,
        "visualHandling": None,
        "reviewState": "unreviewed",
        "riskFlags": [],
        "mustKeepIds": [],
        "symbolTextAlternatives": [],
    }
    if item["kind"] in VISUAL_KINDS:
        value["visualTextAlternative"] = ""
        value["visualHandlingNote"] = ""
    if item["kind"] == "page":
        value.update(
            {
                "visualReviewState": "unreviewed",
                "visualReviewer": "",
                "discoveredVisualIds": [],
                "symbolReview": [],
            }
        )
    if item["sourceId"] in APPROVED_CAPTION_CONFLICT_SOURCE_IDS:
        value.update({"captionConflictResolved": False, "captionConflictNote": ""})
    return value


def _is_reference_only_visual_text(value: str) -> bool:
    return REFERENCE_ONLY_VISUAL_TEXT.fullmatch(re.sub(r"\s+", "", value)) is not None


def _validate_markdown_refs(decision):
    for value in decision["markdownRefs"]:
        if ":" not in value or "\\" in value:
            raise AuditValidationError("invalid markdownRef")
        path_text, lines = value.rsplit(":", 1)
        path = PurePosixPath(path_text)
        if (
            path.is_absolute()
            or ".." in path.parts
            or path.suffix != ".md"
            or MARKDOWN_LINES.fullmatch(lines) is None
        ):
            raise AuditValidationError(f"invalid markdownRef: {value}")


def _validate_course_placement(item, decision, policy):
    disposition = decision["disposition"]
    lesson_ids = decision["lessonIds"]
    invalid = sorted(set(lesson_ids) - set(policy["lessonIds"]))
    if invalid:
        raise AuditValidationError(f"invalid lessonId: {invalid[0]}")
    if disposition in {"included", "compressed", "missing"} and not lesson_ids:
        raise AuditValidationError(
            f"{disposition} requires at least one lessonId: {item['sourceId']}"
        )
    if disposition == "excluded" and lesson_ids:
        raise AuditValidationError(
            f"excluded requires empty lessonIds: {item['sourceId']}"
        )


def _validate_version_boundary(item, decision, policy):
    if decision["reviewState"] != "reviewed" or item.get("chapter") not in set(
        policy["excludedChapters"]
    ):
        return
    if (
        decision["disposition"] != "excluded"
        or decision["lessonIds"]
        or decision["reason"] != policy["versionBoundaryReason"]
    ):
        raise AuditValidationError(f"version boundary mismatch: {item['sourceId']}")


def _validate_visual_decision(item, decision):
    if item["kind"] not in VISUAL_KINDS or decision["reviewState"] != "reviewed":
        return
    visual_class = decision["visualClass"]
    handling = decision["visualHandling"]
    text = decision["visualTextAlternative"]
    handling_note = decision["visualHandlingNote"]
    if visual_class not in {"semantic-core", "evidence", "decorative"}:
        raise AuditValidationError(
            f"reviewed visual requires visualClass: {item['sourceId']}"
        )
    if handling not in {"redraw", "text-alt", "reuse", "omit"}:
        raise AuditValidationError(
            f"reviewed visual requires visualHandling: {item['sourceId']}"
        )
    if visual_class in {"semantic-core", "evidence"} and (
        not text.strip() or _is_reference_only_visual_text(text)
    ):
        raise AuditValidationError(
            f"visualTextAlternative is required: {item['sourceId']}"
        )
    if visual_class == "semantic-core" and handling not in {"redraw", "reuse"}:
        raise AuditValidationError(
            f"semantic-core handling mismatch: {item['sourceId']}"
        )
    if visual_class == "evidence" and handling not in {"text-alt", "reuse"}:
        raise AuditValidationError(f"evidence handling mismatch: {item['sourceId']}")
    if visual_class == "decorative" and (
        handling != "omit"
        or decision["disposition"] != "excluded"
        or text != ""
        or not handling_note.startswith("[装饰说明]")
        or not handling_note[len("[装饰说明]") :].strip()
    ):
        raise AuditValidationError(
            f"decorative visual contract mismatch: {item['sourceId']}"
        )
    if handling == "reuse" and (
        not handling_note.startswith("[复用依据]")
        or not handling_note[len("[复用依据]") :].strip()
    ):
        raise AuditValidationError(
            f"reuse requires visualHandlingNote [复用依据]: {item['sourceId']}"
        )


def derived_risk_flags(item, decision, policy):
    flags = set()
    if item["sourceId"] in set(policy["captionConflictSourceIds"]):
        flags.add("caption-conflict")
    if decision["disposition"] == "missing":
        flags.add("missing")
    if item["kind"] in VISUAL_KINDS:
        flags.add("visual")
    if "1-1" in decision["lessonIds"]:
        flags.add("lesson-1-1")
    if any(
        value.startswith("analysis-high-risk-") for value in decision["mustKeepIds"]
    ):
        flags.add("analysis-high-risk")
    return flags


def _validate_risk_flags(item, decision, policy):
    if decision["reviewState"] != "reviewed":
        return
    actual = set(decision["riskFlags"])
    manual = actual & MANUAL_RISK_FLAGS
    if actual != derived_risk_flags(item, decision, policy) | manual:
        raise AuditValidationError(f"riskFlags mismatch: {item['sourceId']}")


def _record_fields_for(item, policy):
    expected_fields = set(BASE_RECORD_FIELDS)
    if item["kind"] in VISUAL_KINDS:
        expected_fields.update({"visualTextAlternative", "visualHandlingNote"})
    if item["kind"] == "page":
        expected_fields.update(
            {
                "visualReviewState",
                "visualReviewer",
                "discoveredVisualIds",
                "symbolReview",
            }
        )
    if item["sourceId"] in set(policy["captionConflictSourceIds"]):
        expected_fields.update({"captionConflictResolved", "captionConflictNote"})
    return expected_fields


def _validate_record_shape(item, decision, policy):
    if set(decision) != _record_fields_for(item, policy):
        raise AuditValidationError(f"decision fields mismatch: {item['sourceId']}")
    if decision["sourceId"] != item["sourceId"]:
        raise AuditValidationError("decision sourceId mismatch")
    if decision["disposition"] not in DISPOSITIONS:
        raise AuditValidationError(f"invalid disposition: {decision['disposition']}")
    if decision["reviewState"] not in {"reviewed", "unreviewed"}:
        raise AuditValidationError(f"invalid reviewState: {decision['reviewState']}")
    if (
        decision["reviewState"] == "reviewed"
        and decision["disposition"] == "unreviewed"
    ):
        raise AuditValidationError("reviewed record requires final disposition")
    if not isinstance(decision["reason"], str):
        raise AuditValidationError("reason must be a string")


def _validate_record_lists(decision):
    for field in (
        "lessonIds",
        "markdownRefs",
        "riskFlags",
        "mustKeepIds",
        "symbolTextAlternatives",
    ):
        if not isinstance(decision[field], list):
            raise AuditValidationError(f"{field} must be a list")
    for field in ("lessonIds", "markdownRefs", "riskFlags", "mustKeepIds"):
        if decision[field] != sorted(set(decision[field])) or any(
            not isinstance(value, str) or not value.strip() for value in decision[field]
        ):
            raise AuditValidationError(
                f"{field} must be sorted unique non-blank strings"
            )
    _validate_markdown_refs(decision)


def _validate_record_kind_fields(item, decision, policy):
    if (
        item["sourceId"] in set(policy["captionConflictSourceIds"])
        and decision["reviewState"] == "reviewed"
        and (
            decision["captionConflictResolved"] is not True
            or not isinstance(decision["captionConflictNote"], str)
            or not decision["captionConflictNote"].strip()
        )
    ):
        raise AuditValidationError(f"caption conflict unresolved: {item['sourceId']}")
    if item["kind"] == "page":
        if decision["visualReviewState"] not in {"reviewed", "unreviewed"}:
            raise AuditValidationError("invalid visualReviewState")
        if not isinstance(decision["visualReviewer"], str):
            raise AuditValidationError("visualReviewer must be a string")
        for field in ("discoveredVisualIds", "symbolReview"):
            if not isinstance(decision[field], list):
                raise AuditValidationError(f"{field} must be a list")


def validate_editorial_record(item, decision, policy):
    _validate_record_shape(item, decision, policy)
    _validate_record_lists(decision)
    _validate_course_placement(item, decision, policy)
    _validate_version_boundary(item, decision, policy)
    _validate_visual_decision(item, decision)
    _validate_risk_flags(item, decision, policy)
    _validate_record_kind_fields(item, decision, policy)


def upgrade_editorial_decisions(
    index: dict, visuals: list[dict], decisions: list[dict]
) -> list[dict]:
    source_map = source_items_by_id(index, visuals)
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    existing = {}
    for position, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            raise AuditValidationError(
                f"decision at position {position} must be an object"
            )
        source_id = decision.get("sourceId")
        if not isinstance(source_id, str) or not source_id.strip():
            raise AuditValidationError("decision sourceId must be non-blank")
        if source_id in existing:
            raise AuditValidationError(f"duplicate decision sourceId: {source_id}")
        if source_id not in source_map:
            raise AuditValidationError(
                f"decision references unknown sourceId: {source_id}"
            )
        existing[source_id] = decision
    upgraded = []
    for source_id in sorted(source_map):
        defaults = initial_editorial_decision(source_map[source_id])
        if source_id not in existing:
            upgraded.append(defaults)
            continue
        preserved = deepcopy(existing[source_id])
        for field, default in defaults.items():
            if field not in preserved:
                preserved[field] = deepcopy(default)
        upgraded.append(preserved)
    return upgraded


def _validate_symbol_text_alternatives(item, decision):
    validated = []
    for position, entry in enumerate(decision["symbolTextAlternatives"]):
        if not isinstance(entry, dict):
            raise AuditValidationError(
                f"symbolTextAlternatives[{position}] must be an object"
            )
        if set(entry) != {"symbol", "pdfPage", "meaning"}:
            raise AuditValidationError(
                f"symbolTextAlternatives fields mismatch: {item['sourceId']}"
            )
        symbol = entry["symbol"]
        pdf_page = entry["pdfPage"]
        meaning = entry["meaning"]
        if symbol not in SYMBOL_KEYS:
            raise AuditValidationError(
                f"invalid symbolTextAlternative symbol: {symbol!r}"
            )
        if type(pdf_page) is not int or pdf_page < 1:
            raise AuditValidationError(
                f"invalid symbolTextAlternative pdfPage: {item['sourceId']}"
            )
        if pdf_page != item.get("pdfPage"):
            raise AuditValidationError(
                f"symbolTextAlternative page mismatch: {item['sourceId']}"
            )
        if not isinstance(meaning, str) or not meaning.strip():
            raise AuditValidationError(
                f"symbolTextAlternative meaning is blank: {item['sourceId']}"
            )
        validated.append((pdf_page, symbol, meaning))
    if validated != sorted(set(validated)):
        raise AuditValidationError(
            f"symbolTextAlternatives must be sorted and unique: {item['sourceId']}"
        )


def _validated_symbol_assignment(page, assignment, position):
    if not isinstance(assignment, dict):
        raise AuditValidationError(f"semanticAssignments[{position}] must be an object")
    if set(assignment) != {"sourceId", "count", "meaning"}:
        raise AuditValidationError(
            f"semanticAssignments fields mismatch: {page['sourceId']}"
        )
    target_id = assignment["sourceId"]
    count = assignment["count"]
    meaning = assignment["meaning"]
    if not isinstance(target_id, str) or not target_id.strip():
        raise AuditValidationError("symbol assignment sourceId is blank")
    if type(count) is not int or count < 1:
        raise AuditValidationError(
            f"symbol assignment count must be positive: {target_id}"
        )
    if not isinstance(meaning, str) or not meaning.strip():
        raise AuditValidationError(f"symbol assignment meaning is blank: {target_id}")
    return target_id, count, meaning


def _validated_symbol_review_row(page, row, position, seen_symbols):
    if not isinstance(row, dict):
        raise AuditValidationError(f"symbolReview[{position}] must be an object")
    if set(row) != {
        "symbol",
        "observedCount",
        "semanticAssignments",
        "nonSemanticCount",
        "note",
    }:
        raise AuditValidationError(f"symbolReview fields mismatch: {page['sourceId']}")
    symbol = row["symbol"]
    if symbol not in SYMBOL_KEYS or symbol in seen_symbols:
        raise AuditValidationError(
            f"invalid or duplicate symbolReview symbol: {symbol!r}"
        )
    seen_symbols.add(symbol)
    observed = row["observedCount"]
    non_semantic = row["nonSemanticCount"]
    if type(observed) is not int or observed < 0:
        raise AuditValidationError(
            f"invalid observedCount: {page['sourceId']} {symbol}"
        )
    if type(non_semantic) is not int or non_semantic < 0:
        raise AuditValidationError(
            f"invalid nonSemanticCount: {page['sourceId']} {symbol}"
        )
    if not isinstance(row["note"], str):
        raise AuditValidationError(
            f"symbolReview note must be a string: {page['sourceId']}"
        )
    assignments = row["semanticAssignments"]
    if not isinstance(assignments, list):
        raise AuditValidationError(
            f"semanticAssignments must be a list: {page['sourceId']}"
        )
    seen_assignments = set()
    semantic_total = 0
    for assignment_position, assignment in enumerate(assignments):
        target_id, count, meaning = _validated_symbol_assignment(
            page, assignment, assignment_position
        )
        key = (target_id, meaning)
        if key in seen_assignments:
            raise AuditValidationError(f"duplicate symbol assignment: {target_id}")
        seen_assignments.add(key)
        semantic_total += count
    return symbol, assignments, semantic_total


def _validate_symbol_arithmetic(page, decision, row, semantic_total, require_complete):
    if decision["visualReviewState"] != "reviewed" and not require_complete:
        return
    symbol = row["symbol"]
    observed = row["observedCount"]
    if semantic_total + row["nonSemanticCount"] != observed:
        raise AuditValidationError(
            f"symbolReview count mismatch: {page['sourceId']} {symbol}"
        )
    extracted = page.get("symbolCounts", {}).get(SYMBOL_KEYS[symbol], 0)
    if observed != extracted and (
        not row["note"].startswith("[计数更正]")
        or not row["note"][len("[计数更正]") :].strip()
    ):
        raise AuditValidationError(
            f"symbol count correction requires [计数更正]: {page['sourceId']} {symbol}"
        )


def _validate_symbol_assignment_target(
    page, symbol, assignment, source_map, decisions_by_id
):
    target_id = assignment["sourceId"]
    target = source_map.get(target_id)
    target_decision = decisions_by_id.get(target_id)
    if (
        target is None
        or target_decision is None
        or target.get("pdfPage") != page["pdfPage"]
    ):
        raise AuditValidationError(
            f"symbol assignment target page mismatch: {target_id}"
        )
    expected = {
        "symbol": symbol,
        "pdfPage": page["pdfPage"],
        "meaning": assignment["meaning"],
    }
    if target_decision["symbolTextAlternatives"].count(expected) != 1:
        raise AuditValidationError(
            f"missing matching symbolTextAlternatives: {target_id}"
        )


def _validate_symbol_review_coverage(
    page, decision, rows_by_symbol, seen_symbols, require_complete
):
    if decision["visualReviewState"] != "reviewed" and not require_complete:
        return
    extracted_symbols = {
        glyph
        for glyph, key in SYMBOL_KEYS.items()
        if page.get("symbolCounts", {}).get(key, 0) > 0
    }
    observed_symbols = {
        symbol for symbol, row in rows_by_symbol.items() if row["observedCount"] > 0
    }
    if seen_symbols != extracted_symbols | observed_symbols:
        raise AuditValidationError(
            f"symbolReview coverage mismatch: {page['sourceId']}"
        )


def _validate_symbol_review(
    page, decision, source_map, decisions_by_id, require_complete=False
):
    review = decision["symbolReview"]
    glyph_order = {glyph: position for position, glyph in enumerate(SYMBOL_KEYS)}
    seen_symbols = set()
    rows_by_symbol = {}
    check_targets = decision["visualReviewState"] == "reviewed" or require_complete
    for position, row in enumerate(review):
        symbol, assignments, semantic_total = _validated_symbol_review_row(
            page, row, position, seen_symbols
        )
        rows_by_symbol[symbol] = row
        _validate_symbol_arithmetic(
            page, decision, row, semantic_total, require_complete
        )
        if check_targets:
            for assignment in assignments:
                _validate_symbol_assignment_target(
                    page, symbol, assignment, source_map, decisions_by_id
                )
    if review != sorted(
        review, key=lambda row: glyph_order.get(row.get("symbol"), len(glyph_order))
    ):
        raise AuditValidationError(
            f"symbolReview must use canonical glyph order: {page['sourceId']}"
        )
    _validate_symbol_review_coverage(
        page, decision, rows_by_symbol, seen_symbols, require_complete
    )


def _validate_page_scan(
    page, decision, source_map, decisions_by_id, require_complete=False
):
    discovered = decision["discoveredVisualIds"]
    if discovered != sorted(set(discovered)) or any(
        not isinstance(source_id, str) or not source_id.strip()
        for source_id in discovered
    ):
        raise AuditValidationError(
            f"discoveredVisualIds must be sorted and unique: {page['sourceId']}"
        )
    scan_is_reviewed = decision["visualReviewState"] == "reviewed"
    if require_complete and not scan_is_reviewed:
        raise AuditValidationError(f"page scan incomplete: {page['sourceId']}")
    if scan_is_reviewed:
        if not decision["visualReviewer"].strip():
            raise AuditValidationError(
                f"reviewed page requires visualReviewer: {page['sourceId']}"
            )
        expected = sorted(
            source_id
            for source_id, item in source_map.items()
            if item["kind"] == "visual" and item["pdfPage"] == page["pdfPage"]
        )
        if discovered != expected:
            raise AuditValidationError(
                f"page visual inventory mismatch: {page['sourceId']}"
            )
        for source_id in discovered:
            item = source_map.get(source_id)
            if (
                item is None
                or item["kind"] != "visual"
                or item["pdfPage"] != page["pdfPage"]
            ):
                raise AuditValidationError(f"wrong-page discovered visual: {source_id}")
    _validate_symbol_review(
        page, decision, source_map, decisions_by_id, require_complete=require_complete
    )


def _known_must_keep_ids(policy):
    rules = policy["mustKeepRules"]
    result = {
        f"course-objective-{lesson_id}"
        for lesson_id in rules["courseObjectives"]["lessonIds"]
    }
    result.update(rules["highPriority"]["routing"])
    result.update(rules["highRisk"]["routing"])
    return result


def _validate_frozen_conflict_policy(policy, source_map):
    values = policy.get("captionConflictSourceIds")
    if not isinstance(values, list) or values != list(
        APPROVED_CAPTION_CONFLICT_SOURCE_IDS
    ):
        raise AuditValidationError(
            "caption conflict source IDs differ from approved 21-ID baseline"
        )
    missing = sorted(set(values) - set(source_map))
    if missing:
        raise AuditValidationError(
            f"caption conflict IDs missing from catalog: {missing}"
        )


def _indexed_decisions(decisions, source_map):
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    decisions_by_id = {}
    ordered_ids = []
    for position, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            raise AuditValidationError(
                f"decision at position {position} must be an object"
            )
        source_id = decision.get("sourceId")
        if not isinstance(source_id, str) or not source_id.strip():
            raise AuditValidationError("decision sourceId must be non-blank")
        if source_id in decisions_by_id:
            raise AuditValidationError(f"duplicate decision sourceId: {source_id}")
        if source_id not in source_map:
            raise AuditValidationError(
                f"decision references unknown sourceId: {source_id}"
            )
        decisions_by_id[source_id] = decision
        ordered_ids.append(source_id)
    if ordered_ids != sorted(ordered_ids):
        raise AuditValidationError("decisions must use sourceId order")
    return decisions_by_id, ordered_ids


def _validate_catalog_page_chapters(source_map):
    page_by_number = {
        item["pdfPage"]: item for item in source_map.values() if item["kind"] == "page"
    }
    chapter_pages = [
        item["pdfPage"]
        for item in page_by_number.values()
        if item.get("chapter") is not None
    ]
    first_chapter_page = min(chapter_pages) if chapter_pages else None
    for source_id, item in source_map.items():
        if item["kind"] in {"page", "outline"}:
            continue
        page = page_by_number.get(item.get("pdfPage"))
        if page is None:
            raise AuditValidationError(f"catalog chapter/page mismatch: {source_id}")
        number = item.get("number")
        is_preface_figure = (
            item["kind"] == "figure"
            and isinstance(number, str)
            and re.fullmatch(r"0-[1-9][0-9]*", number) is not None
            and source_id == f"figure-{number}"
            and first_chapter_page is not None
            and item.get("pdfPage") < first_chapter_page
        )
        if (
            page.get("chapter") is None
            and item.get("chapter") == 0
            and is_preface_figure
        ):
            continue
        if item.get("chapter") != page.get("chapter"):
            raise AuditValidationError(f"catalog chapter/page mismatch: {source_id}")


def _validate_decision_members(
    source_map, decisions_by_id, ordered_ids, policy, require_complete
):
    known_must_keep_ids = _known_must_keep_ids(policy)
    for source_id in ordered_ids:
        item = source_map[source_id]
        decision = decisions_by_id[source_id]
        validate_editorial_record(item, decision, policy)
        unknown_must_keep = sorted(set(decision["mustKeepIds"]) - known_must_keep_ids)
        if unknown_must_keep:
            raise AuditValidationError(f"unknown mustKeepId: {unknown_must_keep[0]}")
        _validate_symbol_text_alternatives(item, decision)
        if item["kind"] == "page":
            _validate_page_scan(
                item,
                decision,
                source_map,
                decisions_by_id,
                require_complete=require_complete,
            )


def validate_editorial_decisions(
    index: dict,
    visuals: list[dict],
    decisions: list[dict],
    policy: dict,
    require_complete: bool = False,
) -> None:
    if type(require_complete) is not bool:
        raise TypeError("require_complete must be a bool")
    source_map = source_items_by_id(index, visuals)
    _validate_frozen_conflict_policy(policy, source_map)
    decisions_by_id, ordered_ids = _indexed_decisions(decisions, source_map)
    if require_complete and set(decisions_by_id) != set(source_map):
        missing = sorted(set(source_map) - set(decisions_by_id))
        extra = sorted(set(decisions_by_id) - set(source_map))
        raise AuditValidationError(
            f"decision source set mismatch: missing={missing}, extra={extra}"
        )
    _validate_catalog_page_chapters(source_map)
    _validate_decision_members(
        source_map, decisions_by_id, ordered_ids, policy, require_complete
    )
    if require_complete:
        incomplete = sorted(
            source_id
            for source_id, decision in decisions_by_id.items()
            if decision["reviewState"] != "reviewed"
            or decision["disposition"] == "unreviewed"
        )
        if incomplete:
            raise AuditValidationError(f"unreviewed decisions remain: {incomplete}")
