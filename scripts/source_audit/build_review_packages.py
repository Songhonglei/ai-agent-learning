from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path, PurePosixPath

from pypdf import PdfReader

from scripts.source_audit.catalog import (
    source_items_by_id,
    validate_unnumbered_visuals,
)
from scripts.source_audit.decisions import validate_editorial_decisions
from scripts.source_audit.must_keep import build_must_keep_inventory
from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    load_json,
    sha256_file,
    validate_index,
)
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
)


def _pending(name):
    raise NotImplementedError(name)


def extract_full_page_text(pdf_path: Path) -> dict[int, str]:
    pdf_path = Path(pdf_path)
    if not pdf_path.is_file():
        raise AuditValidationError(f"PDF is missing: {pdf_path}")
    executable = shutil.which("pdftotext")
    if executable is None:
        raise AuditValidationError("pdftotext is not available")
    try:
        completed = subprocess.run(
            [
                executable,
                "-layout",
                "-enc",
                "UTF-8",
                str(pdf_path),
                "-",
            ],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as error:
        detail = error.stderr.decode("utf-8", errors="replace").strip()
        raise AuditValidationError(
            f"pdftotext failed: {detail or error.returncode}"
        ) from error
    try:
        text = completed.stdout.decode("utf-8")
    except UnicodeDecodeError as error:
        raise AuditValidationError(
            "pdftotext output is not valid UTF-8"
        ) from error
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    pages = text.split("\f")
    if pages and pages[-1] == "":
        pages.pop()
    if not pages:
        raise AuditValidationError("pdftotext returned no pages")
    return {
        pdf_page: page_text.rstrip("\n")
        for pdf_page, page_text in enumerate(pages, start=1)
    }
def parse_markdown_sections(
    path: Path,
    project_relative_label: str,
) -> list[dict]:
    label = PurePosixPath(project_relative_label)
    if label.is_absolute() or ".." in label.parts or not label.parts:
        raise AuditValidationError(
            "Markdown evidence label must be project-relative"
        )
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    heading_line = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
    headings = []
    for position, line in enumerate(lines, start=1):
        match = heading_line.match(line)
        if match:
            headings.append({
                "path": label.as_posix(),
                "heading": match.group(2),
                "headingLevel": len(match.group(1)),
                "startLine": position,
            })
    for index, section in enumerate(headings):
        end_line = len(lines)
        for candidate in headings[index + 1:]:
            if candidate["headingLevel"] <= section["headingLevel"]:
                end_line = candidate["startLine"] - 1
                break
        section["endLine"] = end_line
        section["text"] = "\n".join(
            lines[section["startLine"] - 1:end_line]
        )
    return headings
def _validate_page_bundle_inputs(
    pdf_page,
    full_text,
    index,
    visuals,
    decisions,
    page_image,
    page_image_label,
    page_image_sha256,
    evidence_hashes,
):
    validate_index(index)
    validate_unnumbered_visuals(index, visuals)
    required_hashes = {
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "decisionsSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
    }
    if set(evidence_hashes) != required_hashes:
        raise AuditValidationError(
            "page-bundle evidence hash fields mismatch"
        )
    if any(
        not isinstance(value, str)
        or re.fullmatch(r"[0-9a-f]{64}", value) is None
        for value in evidence_hashes.values()
    ):
        raise AuditValidationError("invalid page-bundle evidence hash")
    if pdf_page not in full_text:
        raise AuditValidationError(
            f"missing full text for page {pdf_page}"
        )
    if "\\" in page_image_label:
        raise AuditValidationError(
            "serialized path must use forward slashes"
        )
    image_label = PurePosixPath(page_image_label)
    if (
        image_label.is_absolute()
        or ".." in image_label.parts
        or not image_label.parts
        or image_label.name != Path(page_image).name
    ):
        raise AuditValidationError("invalid page image label")
    if (
        re.fullmatch(r"[0-9a-f]{64}", page_image_sha256) is None
        or sha256_file(page_image) != page_image_sha256
    ):
        raise AuditValidationError("page image SHA-256 mismatch")
    source_map = source_items_by_id(index, visuals)
    decision_map = {
        decision["sourceId"]: decision for decision in decisions
    }
    if set(decision_map) != set(source_map):
        raise AuditValidationError(
            "page bundle requires complete decisions"
        )
    page_rows = [
        item for item in index["pages"]
        if item["pdfPage"] == pdf_page
    ]
    if len(page_rows) != 1:
        raise AuditValidationError(
            f"expected one page record for page {pdf_page}"
        )
    return image_label, source_map, decision_map, page_rows[0]


def _lesson_candidates_for_item(item, index, policy):
    candidates = copy.deepcopy(
        policy["chapterLessonCandidates"].get(
            str(item.get("chapter")),
            [],
        )
    )
    boundaries = []
    outline_positions = {
        row["sourceId"]: position
        for position, row in enumerate(index["outline"])
    }
    for title, routed in policy[
        "sectionLessonCandidates"
    ].items():
        matches = [
            (position, row)
            for position, row in enumerate(index["outline"])
            if row["title"] == title
        ]
        if len(matches) != 1:
            raise AuditValidationError(
                f"expected one source outline anchor: {title}"
            )
        position, start = matches[0]
        following = [
            (candidate_position, row)
            for candidate_position, row in enumerate(
                index["outline"][position + 1:],
                start=position + 1,
            )
            if row["depth"] <= start["depth"]
        ]
        next_position, next_start = (
            following[0]
            if following
            else (len(index["outline"]), None)
        )
        if item["kind"] == "outline":
            current = outline_positions[item["sourceId"]]
            if position <= current < next_position:
                candidates.extend(copy.deepcopy(routed))
            continue
        end_page = (
            next_start["pdfPage"]
            if next_start is not None
            else max(row["pdfPage"] for row in index["outline"]) + 1
        )
        if start["pdfPage"] <= item["pdfPage"] < end_page:
            candidates.extend(copy.deepcopy(routed))
        elif (
            next_start is not None
            and item["pdfPage"] == next_start["pdfPage"]
        ):
            boundaries.append({
                "riskFlag": "section-boundary",
                "previousSection": title,
                "nextSection": next_start["title"],
                "pdfPage": item["pdfPage"],
                "lessonCandidates": copy.deepcopy(routed),
            })
    role_order = {"primary": 0, "secondary": 1}
    by_lesson = {}
    for candidate in candidates:
        lesson_id = candidate["lessonId"]
        current = by_lesson.get(lesson_id)
        if (
            current is None
            or role_order[candidate["role"]]
            < role_order[current["role"]]
        ):
            by_lesson[lesson_id] = candidate
    return [by_lesson[key] for key in sorted(by_lesson)], boundaries


def _markdown_evidence_rows(sections):
    rows = {}
    for section in sections:
        reference = (
            f"{section['path']}:{section['startLine']}-"
            f"{section['endLine']}"
        )
        rows[reference] = {
            "ref": reference,
            "heading": section["heading"],
            "text": section["text"],
        }
    return rows


def _item_markdown_evidence(
    item,
    routes,
    analysis_sections,
    outline_sections,
    policy,
):
    chapter = item.get("chapter")
    if chapter == 0:
        chapter_rows = [
            section for section in analysis_sections
            if section["heading"] == "统一公式（全书锚点）"
        ]
    else:
        chapter_rows = [
            section for section in analysis_sections
            if section["heading"].startswith(f"第{chapter}章 ")
        ] if chapter is not None else []
    if chapter is not None and len(chapter_rows) != 1:
        raise AuditValidationError(
            f"expected one analysis section for chapter {chapter}"
        )
    high_risk_headings = set(
        policy["analysisHeadingAnchors"].values()
    )
    high_risk_rows = [
        section for section in analysis_sections
        if section["heading"] in high_risk_headings
    ]
    if {
        section["heading"] for section in high_risk_rows
    } != high_risk_headings:
        raise AuditValidationError(
            "analysis heading anchor mismatch"
        )
    outline_rows = []
    for route in routes:
        matches = [
            section for section in outline_sections
            if section["heading"].startswith(
                route["lessonId"] + " "
            )
        ]
        if len(matches) != 1:
            raise AuditValidationError(
                "expected one outline heading for "
                + route["lessonId"]
            )
        outline_rows.append(matches[0])
    analysis = _markdown_evidence_rows([
        *chapter_rows,
        *high_risk_rows,
    ])
    outline = _markdown_evidence_rows(outline_rows)
    return analysis, outline


def _page_source_evidence(
    pdf_page,
    source_map,
    decision_map,
    index,
    policy,
    analysis_sections,
    outline_sections,
):
    source_items = []
    all_routes = []
    analysis_rows = {}
    outline_rows = {}
    boundary_rows = []
    risk_flags = set()
    conflict_ids = set(policy["captionConflictSourceIds"])
    for item in sorted(
        source_map.values(),
        key=lambda value: value["sourceId"],
    ):
        occurs = item["pdfPage"] == pdf_page or any(
            row["pdfPage"] == pdf_page
            for row in item.get("occurrences", [])
        )
        if not occurs:
            continue
        routes, boundaries = _lesson_candidates_for_item(
            item,
            index,
            policy,
        )
        analysis, outline = _item_markdown_evidence(
            item,
            routes,
            analysis_sections,
            outline_sections,
            policy,
        )
        decision = copy.deepcopy(decision_map[item["sourceId"]])
        source_items.append({
            **copy.deepcopy(item),
            "currentDecision": decision,
            "lessonCandidates": routes,
            "analysisRefs": sorted(analysis),
            "outlineRefs": sorted(outline),
            "sectionBoundaryEvidence": boundaries,
        })
        all_routes.extend(routes)
        analysis_rows.update(analysis)
        outline_rows.update(outline)
        boundary_rows.extend(boundaries)
        risk_flags.update(decision["riskFlags"])
        if item["sourceId"] in conflict_ids:
            risk_flags.add("caption-conflict")
    if pdf_page not in set(review_page_numbers(index)):
        risk_flags.add("queue-external")
    if boundary_rows:
        risk_flags.add("section-boundary")
    return (
        source_items,
        all_routes,
        analysis_rows,
        outline_rows,
        boundary_rows,
        risk_flags,
    )


def _deduplicated_lesson_routes(routes):
    role_order = {"primary": 0, "secondary": 1}
    by_lesson = {}
    for route in routes:
        lesson_id = route["lessonId"]
        current = by_lesson.get(lesson_id)
        if (
            current is None
            or role_order[route["role"]]
            < role_order[current["role"]]
        ):
            by_lesson[lesson_id] = copy.deepcopy(route)
    return [by_lesson[key] for key in sorted(by_lesson)]


def _page_bundle_payload(
    pdf_page,
    full_text,
    visuals,
    image_label,
    page_image_sha256,
    evidence_hashes,
    must_keep_inventory,
    page_row,
    source_items,
    all_routes,
    analysis_rows,
    outline_rows,
    boundary_rows,
    risk_flags,
):
    return {
        "pdfPage": pdf_page,
        **{key: evidence_hashes[key] for key in sorted(evidence_hashes)},
        "pageImage": image_label.as_posix(),
        "pageImageSha256": page_image_sha256,
        "text": full_text[pdf_page],
        "sourceItems": source_items,
        "unnumberedVisuals": [
            copy.deepcopy(item)
            for item in visuals
            if item["pdfPage"] == pdf_page
        ],
        "symbolCounts": copy.deepcopy(page_row["symbolCounts"]),
        "lessonCandidates": _deduplicated_lesson_routes(all_routes),
        "analysisRefs": sorted(analysis_rows),
        "outlineRefs": sorted(outline_rows),
        "analysisEvidence": [
            analysis_rows[key] for key in sorted(analysis_rows)
        ],
        "courseObjectiveEvidence": [
            outline_rows[key] for key in sorted(outline_rows)
        ],
        "mustKeepInventory": sorted(
            copy.deepcopy(must_keep_inventory),
            key=lambda item: item["mustKeepId"],
        ),
        "sectionBoundaryEvidence": sorted(
            boundary_rows,
            key=lambda item: (
                item["pdfPage"],
                item["previousSection"],
                item["nextSection"],
            ),
        ),
        "riskFlags": sorted(risk_flags),
    }


def build_page_bundle(
    pdf_page, full_text, index, visuals, decisions, policy,
    page_image, page_image_label, page_image_sha256, evidence_hashes,
    analysis_sections, outline_sections, must_keep_inventory,
):
    image_label, source_map, decision_map, page_row = (
        _validate_page_bundle_inputs(
            pdf_page, full_text, index, visuals, decisions,
            page_image, page_image_label, page_image_sha256,
            evidence_hashes,
        )
    )
    evidence = _page_source_evidence(
        pdf_page,
        source_map,
        decision_map,
        index,
        policy,
        analysis_sections,
        outline_sections,
    )
    return _page_bundle_payload(
        pdf_page,
        full_text,
        visuals,
        image_label,
        page_image_sha256,
        evidence_hashes,
        must_keep_inventory,
        page_row,
        *evidence,
    )
def _unreviewed_source_ids_for_pages(
    source_map,
    decisions_by_id,
    selected_pages,
    excluded_source_ids=(),
):
    excluded = set(excluded_source_ids)
    return sorted(
        source_id
        for source_id, item in source_map.items()
        if decisions_by_id[source_id]["reviewState"] == "unreviewed"
        and source_id not in excluded
        and any(
            item["pdfPage"] == pdf_page
            or any(
                occurrence["pdfPage"] == pdf_page
                for occurrence in item.get("occurrences", [])
            )
            for pdf_page in selected_pages
        )
    )


def _normal_source_pages(item):
    return sorted({
        item["pdfPage"],
        *(occurrence["pdfPage"] for occurrence in item.get("occurrences", [])),
    })


def _normal_mandatory_source_ids(source_map, decisions_by_id, policy):
    manual_risks = {
        "critical-number",
        "experiment-conclusion",
        "scope-boundary",
    }
    return {
        source_id
        for source_id, item in source_map.items()
        if (
            source_id in set(policy["captionConflictSourceIds"])
            or item["kind"] == "visual"
            or bool(set(decisions_by_id[source_id]["riskFlags"]) & manual_risks)
            or any(
                value.startswith("analysis-high-risk-")
                for value in decisions_by_id[source_id]["mustKeepIds"]
            )
        )
    }


def _normal_sampled_source_ids(source_map, source_ids, batch_id):
    strata = {}
    for source_id in source_ids:
        item = source_map[source_id]
        chapter = item.get("chapter")
        key = ("none" if chapter is None else str(chapter), item["kind"])
        strata.setdefault(key, []).append(source_id)
    ranked = []
    for key in sorted(strata):
        ranked.extend(sorted(
            strata[key],
            key=lambda source_id: hashlib.sha256(
                f"{batch_id}\0{source_id}".encode("utf-8")
            ).hexdigest(),
        ))
    return ranked


def _select_normal_batch_pages(
    index,
    visuals,
    decisions_by_id,
    policy,
    batch_id,
    excluded_source_ids,
):
    source_map = source_items_by_id(index, visuals)
    excluded = set(excluded_source_ids)
    unreviewed_ids = {
        source_id
        for source_id, decision in decisions_by_id.items()
        if decision["reviewState"] == "unreviewed"
        and source_id not in excluded
    }
    minimum_sources, maximum_sources = 20, 40
    minimum_pages, maximum_pages = 5, 15
    selected_pages = set()

    def add_source(source_id):
        for pdf_page in _normal_source_pages(source_map[source_id]):
            if pdf_page in selected_pages:
                return True
            if len(selected_pages) == maximum_pages:
                continue
            candidate_pages = selected_pages | {pdf_page}
            candidate_ids = _unreviewed_source_ids_for_pages(
                source_map,
                decisions_by_id,
                candidate_pages,
                excluded,
            )
            if len(candidate_ids) <= maximum_sources:
                selected_pages.add(pdf_page)
                return True
        return False

    pending_scan_ids = sorted(
        source_id
        for source_id in unreviewed_ids
        if source_map[source_id]["kind"] == "page"
        and (
            decisions_by_id[source_id]["visualReviewState"] != "reviewed"
            or not decisions_by_id[source_id]["visualReviewer"].strip()
        )
    )
    for source_id in pending_scan_ids:
        add_source(source_id)

    mandatory_ids = _normal_mandatory_source_ids(
        source_map,
        decisions_by_id,
        policy,
    ) & unreviewed_ids
    for source_id in sorted(mandatory_ids):
        add_source(source_id)

    sampled_ids = _normal_sampled_source_ids(
        source_map,
        unreviewed_ids - mandatory_ids,
        batch_id,
    )
    for source_id in sampled_ids:
        current_ids = _unreviewed_source_ids_for_pages(
            source_map,
            decisions_by_id,
            selected_pages,
            excluded,
        )
        if (
            len(current_ids) >= minimum_sources
            and len(selected_pages) >= minimum_pages
        ):
            break
        add_source(source_id)

    source_ids = _unreviewed_source_ids_for_pages(
        source_map,
        decisions_by_id,
        selected_pages,
        excluded,
    )
    if not (
        minimum_sources <= len(source_ids) <= maximum_sources
        and minimum_pages <= len(selected_pages) <= maximum_pages
    ):
        raise AuditValidationError(
            "normal selection cannot satisfy 20-40 sources and 5-15 pages"
        )
    return sorted(selected_pages), source_ids


def _initial_calibration_pages(
    calibration,
    decisions_by_id,
    risk_queue,
):
    required_pages = set(calibration["requiredPages"])
    missing_required = sorted(
        pdf_page
        for pdf_page in required_pages
        if (
            decisions_by_id[f"page-{pdf_page:03d}"][
                "visualReviewState"
            ] != "reviewed"
            or not decisions_by_id[f"page-{pdf_page:03d}"][
                "visualReviewer"
            ].strip()
        )
    )
    if missing_required:
        raise AuditValidationError(
            "required calibration pages are not scan-complete: "
            + str(missing_required)
        )
    selected_pages = set(required_pages)
    external_added = 0
    for pdf_page in calibration["queueExternalCandidates"]:
        if pdf_page in risk_queue:
            raise AuditValidationError(
                f"calibration external page is in risk queue: {pdf_page}"
            )
        decision = decisions_by_id[f"page-{pdf_page:03d}"]
        if (
            decision["visualReviewState"] == "reviewed"
            and decision["visualReviewer"].strip()
        ):
            selected_pages.add(pdf_page)
            external_added += 1
        if external_added == 3:
            break
    if external_added < 3:
        raise AuditValidationError(
            "fewer than three queue-external pages are scan-complete"
        )
    return selected_pages


def _source_count_bounds(mode, policy):
    if mode == "normal":
        return 20, 40
    calibration = policy["calibration"]
    return (
        calibration["minimumSourceItems"],
        calibration["maximumSourceItems"],
    )


def _normal_pinned_selection(selection, source_map, decisions_by_id, batch_id):
    if not isinstance(selection, dict) or set(selection) != {
        "batchId", "mode", "pages", "sourceCount", "sourceIds",
    }:
        raise AuditValidationError("normal selection fields mismatch")
    if selection["batchId"] != batch_id or selection["mode"] != "normal":
        raise AuditValidationError("normal selection batch identity mismatch")
    pages = selection["pages"]
    source_ids = selection["sourceIds"]
    if selection["sourceCount"] != len(source_ids):
        raise AuditValidationError("normal selection sourceCount mismatch")
    if (
        not isinstance(pages, list)
        or pages != sorted(set(pages))
        or any(type(page) is not int or page < 1 for page in pages)
    ):
        raise AuditValidationError("normal selection pages must be sorted and unique")
    if (
        not isinstance(source_ids, list)
        or source_ids != sorted(set(source_ids))
        or any(not isinstance(source_id, str) or not source_id.strip() for source_id in source_ids)
    ):
        raise AuditValidationError("normal selection sourceIds must be sorted and unique")
    all_unreviewed_ids = {
        source_id
        for source_id, decision in decisions_by_id.items()
        if decision["reviewState"] == "unreviewed"
    }
    is_final_tail = len(source_ids) < 20 and set(source_ids) == all_unreviewed_ids
    if not (
        5 <= len(pages) <= 15
        and ((20 <= len(source_ids) <= 40) or is_final_tail)
    ):
        raise AuditValidationError("normal selection is outside page or source bounds")
    unknown_pages = sorted(
        set(pages) - {
            page["pdfPage"] for page in source_map.values()
            if page["kind"] == "page"
        }
    )
    if unknown_pages:
        raise AuditValidationError(
            f"normal selection pages are outside catalog: {unknown_pages}"
        )
    unknown_sources = sorted(set(source_ids) - set(source_map))
    if unknown_sources:
        raise AuditValidationError(
            f"normal selection sources are outside catalog: {unknown_sources}"
        )
    reviewed_sources = sorted(
        source_id for source_id in source_ids
        if decisions_by_id[source_id]["reviewState"] != "unreviewed"
    )
    if reviewed_sources:
        raise AuditValidationError(
            f"normal selection assigns reviewed IDs: {reviewed_sources}"
        )
    outside_pages = sorted(
        source_id for source_id in source_ids
        if not set(_normal_source_pages(source_map[source_id])) & set(pages)
    )
    if outside_pages:
        raise AuditValidationError(
            f"normal selection sources are outside selected pages: {outside_pages}"
        )
    return pages, source_ids


def select_batch_pages(
    mode,
    index,
    visuals,
    decisions,
    policy,
    *,
    batch_id="normal-001",
    excluded_source_ids=(),
):
    validate_editorial_decisions(
        index,
        visuals,
        decisions,
        policy,
        require_complete=False,
    )
    if mode not in {"calibration", "normal"}:
        raise AuditValidationError(
            "invalid review batch mode"
        )
    decisions_by_id = {
        decision["sourceId"]: decision for decision in decisions
    }
    if mode == "normal":
        if (
            not isinstance(batch_id, str)
            or re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,63}", batch_id) is None
        ):
            raise AuditValidationError("invalid normal batchId")
        if any(
            not isinstance(source_id, str) or not source_id.strip()
            for source_id in excluded_source_ids
        ):
            raise AuditValidationError("invalid excluded sourceId")
        return _select_normal_batch_pages(
            index,
            visuals,
            decisions_by_id,
            policy,
            batch_id,
            excluded_source_ids,
        )
    calibration = policy["calibration"]
    selected_pages = _initial_calibration_pages(
        calibration,
        decisions_by_id,
        set(review_page_numbers(index)),
    )
    source_map = source_items_by_id(index, visuals)
    source_ids = _unreviewed_source_ids_for_pages(
        source_map,
        decisions_by_id,
        selected_pages,
    )
    for pdf_page in calibration["queueExternalCandidates"]:
        if len(source_ids) >= calibration["minimumSourceItems"]:
            break
        if pdf_page in selected_pages:
            continue
        decision = decisions_by_id[f"page-{pdf_page:03d}"]
        if (
            decision["visualReviewState"] != "reviewed"
            or not decision["visualReviewer"].strip()
        ):
            continue
        selected_pages.add(pdf_page)
        source_ids = _unreviewed_source_ids_for_pages(
            source_map,
            decisions_by_id,
            selected_pages,
        )
    if len(source_ids) > calibration["maximumSourceItems"]:
        raise AuditValidationError(
            "calibration source count exceeds maximum"
        )
    return sorted(selected_pages), source_ids
def _project_relative_manifest_path(label):
    if "\\" in label:
        raise AuditValidationError(
            "manifest path must use forward slashes"
        )
    path = PurePosixPath(label)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise AuditValidationError(
            "manifest path must be project-relative"
        )
    return path


def _manifest_package_rows(pages, package_hashes):
    if set(package_hashes) != set(pages):
        raise AuditValidationError(
            "package pages do not match selection"
        )
    evidence_fields = {
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "decisionsSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
    }
    page_bundles = []
    page_images = []
    shared_hashes = None
    for pdf_page in pages:
        record = package_hashes[pdf_page]
        if set(record) != {
            "bundlePath",
            "bundleSha256",
            "pageImage",
            "pageImageSha256",
            "evidenceHashes",
        }:
            raise AuditValidationError(
                f"package hash fields mismatch: page {pdf_page}"
            )
        current_hashes = record["evidenceHashes"]
        if set(current_hashes) != evidence_fields:
            raise AuditValidationError(
                f"package evidence mismatch: page {pdf_page}"
            )
        if shared_hashes is None:
            shared_hashes = current_hashes
        elif current_hashes != shared_hashes:
            raise AuditValidationError(
                f"package evidence drift: page {pdf_page}"
            )
        bundle_path = _project_relative_manifest_path(
            record["bundlePath"]
        )
        image_path = _project_relative_manifest_path(
            record["pageImage"]
        )
        page_bundles.append({
            "pdfPage": pdf_page,
            "path": bundle_path.as_posix(),
            "sha256": record["bundleSha256"],
        })
        page_images.append({
            "pdfPage": pdf_page,
            "path": image_path.as_posix(),
            "sha256": record["pageImageSha256"],
        })
    return page_bundles, page_images, dict(shared_hashes or {})


def build_batch_manifest(
    batch_id,
    mode,
    index,
    visuals,
    decisions,
    policy,
    package_hashes,
    policy_snapshot_label,
    policy_snapshot_sha256=None,
    selection=None,
):
    if (
        not isinstance(batch_id, str)
        or re.fullmatch(
            r"[a-z0-9][a-z0-9._-]{2,63}",
            batch_id,
        ) is None
    ):
        raise AuditValidationError("invalid batchId")
    decisions_by_id = {
        decision["sourceId"]: decision for decision in decisions
    }
    if selection is None:
        pages, source_ids = select_batch_pages(
            mode,
            index,
            visuals,
            decisions,
            policy,
            batch_id=batch_id,
        )
    else:
        if mode != "normal":
            raise AuditValidationError(
                "pinned selection is only supported for normal batches"
            )
        source_map = source_items_by_id(index, visuals)
        pages, source_ids = _normal_pinned_selection(
            selection,
            source_map,
            decisions_by_id,
            batch_id,
        )
    minimum_sources, maximum_sources = _source_count_bounds(
        mode,
        policy,
    )
    all_unreviewed_ids = {
        source_id
        for source_id, decision in decisions_by_id.items()
        if decision["reviewState"] == "unreviewed"
    }
    is_final_tail = len(source_ids) < minimum_sources and set(source_ids) == all_unreviewed_ids
    if not ((minimum_sources <= len(source_ids) <= maximum_sources) or is_final_tail):
        raise AuditValidationError(
            "review batch source count outside configured bounds"
        )
    page_bundles, page_images, shared_hashes = (
        _manifest_package_rows(pages, package_hashes)
    )
    snapshot_path = _project_relative_manifest_path(
        policy_snapshot_label
    )
    if policy_snapshot_sha256 is not None and (
        not isinstance(policy_snapshot_sha256, str)
        or re.fullmatch(r"[0-9a-f]{64}", policy_snapshot_sha256) is None
    ):
        raise AuditValidationError("invalid policy snapshot SHA-256")
    return {
        "schemaVersion": 1,
        "batchId": batch_id,
        "mode": mode,
        "pages": pages,
        "sourceIds": source_ids,
        "pageBundles": page_bundles,
        "pageImages": page_images,
        "policySnapshotPath": snapshot_path.as_posix(),
        "policySnapshotSha256": (
            policy_snapshot_sha256 or sha256_json(policy)
        ),
        **shared_hashes,
    }
def selection_only_command(args) -> int:
    index = load_json(Path(args.index))
    visuals = load_json(Path(args.visuals))
    decisions = load_json(Path(args.decisions))
    policy = load_json(Path(args.policy))
    selection_args = (
        args.mode,
        index,
        visuals,
        decisions,
        policy,
    )
    if args.mode == "normal":
        pages, source_ids = select_batch_pages(
            *selection_args,
            batch_id=args.batch_id,
        )
    else:
        pages, source_ids = select_batch_pages(*selection_args)
    payload = (
        {
            "batchId": args.batch_id,
            "mode": "normal",
            "pages": pages,
            "sourceCount": len(source_ids),
            "sourceIds": source_ids,
        }
        if args.mode == "normal"
        else {
            "pages": pages,
            "sourceCount": len(source_ids),
        }
    )
    sys.stdout.write(deterministic_json_bytes(payload).decode("utf-8"))
    minimum, _ = _source_count_bounds(args.mode, policy)
    return 0 if len(source_ids) >= minimum else 3
def _load_build_inputs(args):
    index = load_json(Path(args.index))
    visuals = load_json(Path(args.visuals))
    decisions = load_json(Path(args.decisions))
    policy = load_json(Path(args.policy))
    validate_index(index)
    validate_unnumbered_visuals(index, visuals)
    validate_editorial_decisions(index, visuals, decisions, policy)
    return {
        "index": index,
        "visuals": visuals,
        "decisions": decisions,
        "policy": policy,
        "fullText": extract_full_page_text(Path(args.pdf)),
        "analysisSections": parse_markdown_sections(
            Path(args.analysis), args.analysis,
        ),
        "outlineSections": parse_markdown_sections(
            Path(args.course_outline), args.course_outline,
        ),
    }


def _package_evidence_hashes(args):
    return {
        "pdfSha256": sha256_file(Path(args.pdf)),
        "sourceIndexSha256": sha256_file(Path(args.index)),
        "unnumberedVisualsSha256": sha256_file(Path(args.visuals)),
        "decisionsSha256": sha256_file(Path(args.decisions)),
        "editorialPolicySha256": sha256_file(Path(args.policy)),
        "analysisSha256": sha256_file(Path(args.analysis)),
        "courseOutlineSha256": sha256_file(Path(args.course_outline)),
    }


def _build_package_outputs(args):
    _validate_build_paths(args)
    inputs = _load_build_inputs(args)
    output_dir = Path(args.output_dir)
    image_dir = Path(args.image_dir)
    selection = None
    if getattr(args, "selection", None):
        if args.mode != "normal":
            raise AuditValidationError(
                "pinned selection is only supported for normal batches"
            )
        selection = load_json(Path(args.selection))
        source_map = source_items_by_id(inputs["index"], inputs["visuals"])
        decisions_by_id = {
            decision["sourceId"]: decision
            for decision in inputs["decisions"]
        }
        pages, source_ids = _normal_pinned_selection(
            selection,
            source_map,
            decisions_by_id,
            args.batch_id,
        )
    else:
        pages, source_ids = select_batch_pages(
            args.mode,
            inputs["index"],
            inputs["visuals"],
            inputs["decisions"],
            inputs["policy"],
            batch_id=args.batch_id,
        )
    evidence_hashes = _package_evidence_hashes(args)
    policy_bytes = Path(args.policy).read_bytes()
    policy_snapshot_sha256 = hashlib.sha256(policy_bytes).hexdigest()
    inventory = build_must_keep_inventory(
        inputs["policy"],
        inputs["analysisSections"],
        inputs["outlineSections"],
    )
    outputs = {}
    package_hashes = {}
    for pdf_page in pages:
        image = image_dir / f"page-{pdf_page:03d}.png"
        bundle_path = output_dir / f"page-{pdf_page:03d}.json"
        bundle = build_page_bundle(
            pdf_page=pdf_page,
            full_text=inputs["fullText"],
            index=inputs["index"],
            visuals=inputs["visuals"],
            decisions=inputs["decisions"],
            policy=inputs["policy"],
            page_image=image,
            page_image_label=image.as_posix(),
            page_image_sha256=sha256_file(image),
            evidence_hashes=evidence_hashes,
            analysis_sections=inputs["analysisSections"],
            outline_sections=inputs["outlineSections"],
            must_keep_inventory=inventory,
        )
        bundle_bytes = deterministic_json_bytes(bundle)
        outputs[bundle_path] = bundle_bytes
        package_hashes[pdf_page] = {
            "bundlePath": bundle_path.as_posix(),
            "bundleSha256": hashlib.sha256(bundle_bytes).hexdigest(),
            "pageImage": image.as_posix(),
            "pageImageSha256": sha256_file(image),
            "evidenceHashes": evidence_hashes,
        }
    snapshot = output_dir / "editorial-policy.snapshot.json"
    outputs[snapshot] = policy_bytes
    manifest = build_batch_manifest(
        args.batch_id, args.mode, inputs["index"], inputs["visuals"],
        inputs["decisions"], inputs["policy"], package_hashes,
        snapshot.as_posix(), policy_snapshot_sha256, selection,
    )
    outputs[output_dir / "manifest.json"] = deterministic_json_bytes(manifest)
    return outputs, {
        "batchId": args.batch_id,
        "pageCount": len(pages),
        "sourceCount": len(source_ids),
    }


def full_build_command(args) -> int:
    outputs, summary = _build_package_outputs(args)
    write_files_transaction(outputs)
    sys.stdout.write(
        deterministic_json_bytes(summary).decode("utf-8")
    )
    return 0
def _normalized_resolved_parts(path):
    resolved = Path(path).resolve(strict=False)
    normalized = unicodedata.normalize("NFC", str(resolved)).casefold()
    return PurePosixPath(normalized).parts


def _path_is_within(path, directory):
    candidate_parts = _normalized_resolved_parts(path)
    directory_parts = _normalized_resolved_parts(directory)
    return (
        len(candidate_parts) >= len(directory_parts)
        and candidate_parts[:len(directory_parts)] == directory_parts
    )


def _validate_build_paths(args):
    paths = {
        "pdf": Path(args.pdf),
        "index": Path(args.index),
        "visuals": Path(args.visuals),
        "decisions": Path(args.decisions),
        "policy": Path(args.policy),
        "analysis": Path(args.analysis),
        "course-outline": Path(args.course_outline),
        "image-dir": Path(args.image_dir),
        "output-dir": Path(args.output_dir),
    }
    if getattr(args, "selection", None):
        paths["selection"] = Path(args.selection)
    assert_distinct_paths(paths)
    output_root = paths["output-dir"]
    for name, path in paths.items():
        if name == "output-dir":
            continue
        if _path_is_within(path, output_root):
            raise AuditValidationError(
                f"path conflict: {name} is inside output-dir"
            )
        if _path_is_within(output_root, path):
            raise AuditValidationError(
                f"path conflict: output-dir is inside {name}"
            )
def build_parser():
    parser = argparse.ArgumentParser()
    for name in (
        "batch_id", "index", "visuals", "decisions", "policy", "mode",
    ):
        parser.add_argument(f"--{name.replace('_', '-')}", required=True)
    parser.add_argument("--selection-only", action="store_true")
    parser.add_argument("--selection")
    parser.add_argument("--pdf")
    parser.add_argument("--analysis")
    parser.add_argument("--course-outline", dest="course_outline")
    parser.add_argument("--image-dir", dest="image_dir")
    parser.add_argument("--output-dir", dest="output_dir")
    return parser


def _select_cli_handler(parser, args):
    if args.selection_only:
        return selection_only_command
    missing = [
        name for name in (
            "pdf", "analysis", "course_outline", "image_dir", "output_dir",
        )
        if not getattr(args, name)
    ]
    if missing:
        parser.error(
            "full build requires " + ", ".join(
                f"--{name.replace('_', '-')}" for name in missing
            )
        )
    return full_build_command


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    args.handler = _select_cli_handler(parser, args)
    try:
        return args.handler(args)
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
