from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import re
import sys
import unicodedata
from pathlib import Path, PurePosixPath

from scripts.source_audit.catalog import source_items_by_id, stable_visual_id
from scripts.source_audit.decisions import (
    upgrade_editorial_decisions,
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    load_json,
    sha256_file,
)
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    freeze_batch,
    frozen_manifest_artifact_paths,
    frozen_manifest_evidence_roots,
    validate_frozen_batch,
)
from scripts.source_audit.review_ledger import (
    build_discovery_ledger_entry,
    validate_review_ledger,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_json_transaction,
)


STABLE_VISUAL_ID = re.compile(r"visual-p([0-9]{3})-([0-9]{2})")
DISCOVERY_EVIDENCE_VALUE = re.compile(r"(.+?)[；;]\s*PDF 第([0-9]+)页(?:.+)?")


def _pending(name):
    raise NotImplementedError(name)


def _validated_page(pdf_page, index):
    if type(pdf_page) is not int or pdf_page < 1:
        raise AuditValidationError(f"pdfPage must be a positive integer: {pdf_page!r}")
    matches = [
        page for page in index.get("pages", [])
        if page.get("pdfPage") == pdf_page
    ]
    if len(matches) != 1:
        raise AuditValidationError(f"expected one catalog page for PDF page {pdf_page}")
    page = matches[0]
    if page.get("kind") != "page" or page.get("sourceId") != f"page-{pdf_page:03d}":
        raise AuditValidationError(f"invalid page identity for PDF page {pdf_page}")
    return page


def _validate_numbered_visual_ids(page, numbered_visual_ids, index):
    if not isinstance(numbered_visual_ids, list):
        raise AuditValidationError("numberedVisualIds must be a list")
    if (
        numbered_visual_ids != sorted(set(numbered_visual_ids))
        or any(not isinstance(source_id, str) or not source_id.strip() for source_id in numbered_visual_ids)
    ):
        raise AuditValidationError("numberedVisualIds must be sorted and unique")
    expected = sorted(
        item["sourceId"]
        for item in index.get("numberedItems", [])
        if item.get("pdfPage") == page["pdfPage"] and item.get("kind") in {"figure", "table"}
    )
    if numbered_visual_ids != expected:
        raise AuditValidationError(f"numberedVisualIds mismatch on page {page['pdfPage']}")


def _validated_discovery_region(label, region):
    if not isinstance(region, dict) or set(region) != {"x", "y", "width", "height"}:
        raise AuditValidationError(f"discovery region fields mismatch: {label}")
    for field in ("x", "y", "width", "height"):
        value = region[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise AuditValidationError(f"discovery region.{field} is invalid: {label}")
    if (
        region["x"] < 0 or region["y"] < 0
        or region["width"] <= 0 or region["height"] <= 0
        or region["x"] + region["width"] > 1
        or region["y"] + region["height"] > 1
    ):
        raise AuditValidationError(f"discovery region is outside the page: {label}")


def _validated_discovery_payload(item, pdf_page):
    if not isinstance(item, dict):
        raise AuditValidationError("discovery visual must be an object")
    identity_fields = set(item) & {"localId", "sourceId"}
    if identity_fields == {"localId"}:
        expected_fields = {"localId", "region", "semanticBrief", "discoveryEvidence"}
        identity = item["localId"]
    elif identity_fields == {"sourceId"}:
        expected_fields = {"sourceId", "region", "semanticBrief", "discoveryEvidence"}
        identity = item["sourceId"]
    else:
        raise AuditValidationError("discovery visual requires exactly one of localId/sourceId")
    if set(item) != expected_fields:
        raise AuditValidationError(f"discovery visual fields mismatch: {identity!r}")
    if not isinstance(identity, str) or not identity.strip():
        raise AuditValidationError("discovery visual identity is blank")
    _validated_discovery_region(identity, item["region"])
    if not isinstance(item["semanticBrief"], str) or not item["semanticBrief"].strip():
        raise AuditValidationError(f"semanticBrief must be non-blank: {identity}")
    evidence = item["discoveryEvidence"]
    match = DISCOVERY_EVIDENCE_VALUE.fullmatch(evidence) if isinstance(evidence, str) else None
    if match is None or not match.group(1).strip() or int(match.group(2)) != pdf_page:
        raise AuditValidationError(f"discoveryEvidence page/method mismatch: {identity}")
    return identity


def _current_visuals_on_page(page, candidate_visuals):
    if not isinstance(candidate_visuals, list):
        raise AuditValidationError("visual catalog must be a list")
    pdf_page = page["pdfPage"]
    current_on_page = {
        item["sourceId"]: item for item in candidate_visuals
        if isinstance(item, dict) and item.get("pdfPage") == pdf_page and "sourceId" in item
    }
    if len(current_on_page) != sum(
        isinstance(item, dict) and item.get("pdfPage") == pdf_page
        for item in candidate_visuals
    ):
        raise AuditValidationError(f"duplicate catalog visual on page {pdf_page}")
    catalog_ids = {
        item.get("sourceId") for item in candidate_visuals if isinstance(item, dict)
    }
    if None in catalog_ids:
        raise AuditValidationError("visual catalog sourceId is missing")
    return current_on_page, catalog_ids


def _partition_discovery_visuals(page, patch_visuals, current_on_page, catalog_ids):
    if not isinstance(patch_visuals, list):
        raise AuditValidationError("visuals must be a list")
    pdf_page = page["pdfPage"]
    seen_local_ids = set()
    seen_source_ids = set()
    reading_positions = []
    new_items = []
    for item in patch_visuals:
        identity = _validated_discovery_payload(item, pdf_page)
        reading_positions.append((item["region"]["y"], item["region"]["x"]))
        if "sourceId" in item:
            if identity in seen_source_ids:
                raise AuditValidationError(f"duplicate confirmed visual: {identity}")
            seen_source_ids.add(identity)
            formal = current_on_page.get(identity)
            expected = ({
                "sourceId": formal["sourceId"], "region": formal["region"],
                "semanticBrief": formal["semanticBrief"], "discoveryEvidence": formal["discoveryEvidence"],
            } if formal is not None else None)
            if expected is None or item != expected:
                raise AuditValidationError(f"existing visual confirmation mismatch: {identity}")
        else:
            if identity in seen_local_ids or identity in catalog_ids:
                raise AuditValidationError(f"duplicate or colliding localId: {identity}")
            seen_local_ids.add(identity)
            new_items.append(item)
    if reading_positions != sorted(reading_positions):
        raise AuditValidationError("visuals must use top-to-bottom, left-to-right order")
    if seen_source_ids != set(current_on_page):
        missing = sorted(set(current_on_page) - seen_source_ids)
        extra = sorted(seen_source_ids - set(current_on_page))
        raise AuditValidationError(f"full-page visual confirmation mismatch: missing={missing}, extra={extra}")
    return seen_source_ids, new_items


def _append_discovered_visuals(page, current_on_page, candidate_visuals, catalog_ids, new_items):
    pdf_page = page["pdfPage"]
    ordinals = []
    for source_id in current_on_page:
        match = STABLE_VISUAL_ID.fullmatch(source_id)
        if match is None or int(match.group(1)) != pdf_page:
            raise AuditValidationError(f"invalid stable visual ID: {source_id}")
        ordinals.append(int(match.group(2)))
    next_ordinal = max(ordinals, default=0) + 1
    local_to_stable = {}
    for item in new_items:
        stable_id = stable_visual_id(pdf_page, next_ordinal)
        if stable_id in catalog_ids:
            raise AuditValidationError(f"stable visual ID collision: {stable_id}")
        local_to_stable[item["localId"]] = stable_id
        candidate_visuals.append({
            "sourceId": stable_id, "kind": "visual", "pdfPage": pdf_page,
            "region": copy.deepcopy(item["region"]), "semanticBrief": item["semanticBrief"],
            "discoveryEvidence": item["discoveryEvidence"],
        })
        catalog_ids.add(stable_id)
        next_ordinal += 1
    candidate_visuals.sort(key=lambda item: item["sourceId"])
    return local_to_stable


def _merge_full_page_visual_inventory(page, patch_visuals, candidate_visuals):
    current_on_page, catalog_ids = _current_visuals_on_page(page, candidate_visuals)
    seen_source_ids, new_items = _partition_discovery_visuals(
        page, patch_visuals, current_on_page, catalog_ids
    )
    local_to_stable = _append_discovered_visuals(
        page, current_on_page, candidate_visuals, catalog_ids, new_items
    )
    return sorted([*seen_source_ids, *local_to_stable.values()]), local_to_stable


def _resolved_discovery_assignment(assignment, local_to_stable, seen_assignments):
    if not isinstance(assignment, dict) or set(assignment) != {"targetRef", "count", "meaning"}:
        raise AuditValidationError("semantic assignment fields mismatch")
    target_ref, count, meaning = assignment["targetRef"], assignment["count"], assignment["meaning"]
    if not isinstance(target_ref, str) or not target_ref.strip():
        raise AuditValidationError("targetRef must be non-blank")
    if type(count) is not int or count < 1:
        raise AuditValidationError("semantic assignment count must be positive")
    if not isinstance(meaning, str) or not meaning.strip():
        raise AuditValidationError("semantic assignment meaning must be non-blank")
    source_id = local_to_stable.get(target_ref, target_ref)
    key = (source_id, meaning)
    if key in seen_assignments:
        raise AuditValidationError(f"duplicate semantic assignment: {source_id}")
    seen_assignments.add(key)
    return {"sourceId": source_id, "count": count, "meaning": meaning}


def _resolved_symbol_review_row(row, local_to_stable, seen_symbols):
    if not isinstance(row, dict) or set(row) != {
        "symbol", "observedCount", "semanticAssignments", "nonSemanticCount", "note",
    }:
        raise AuditValidationError("symbolReview fields mismatch")
    glyph_order = {"✓": 0, "✗": 1, "△": 2, "★": 3}
    symbol = row["symbol"]
    if symbol not in glyph_order or symbol in seen_symbols:
        raise AuditValidationError(f"invalid or duplicate symbolReview symbol: {symbol!r}")
    seen_symbols.add(symbol)
    observed, non_semantic = row["observedCount"], row["nonSemanticCount"]
    if type(observed) is not int or observed < 0:
        raise AuditValidationError("observedCount must be non-negative")
    if type(non_semantic) is not int or non_semantic < 0:
        raise AuditValidationError("nonSemanticCount must be non-negative")
    if not isinstance(row["note"], str):
        raise AuditValidationError("symbolReview note must be a string")
    raw_assignments = row["semanticAssignments"]
    if not isinstance(raw_assignments, list):
        raise AuditValidationError("semanticAssignments must be a list")
    seen_assignments = set()
    assignments = [
        _resolved_discovery_assignment(assignment, local_to_stable, seen_assignments)
        for assignment in raw_assignments
    ]
    if sum(item["count"] for item in assignments) + non_semantic != observed:
        raise AuditValidationError(f"symbolReview count mismatch: {symbol}")
    assignments.sort(key=lambda item: (item["sourceId"], item["meaning"], item["count"]))
    return {
        "symbol": symbol, "observedCount": observed, "semanticAssignments": assignments,
        "nonSemanticCount": non_semantic, "note": row["note"],
    }


def _resolve_symbol_target_refs(symbol_review, local_to_stable):
    if not isinstance(symbol_review, list):
        raise AuditValidationError("symbolReview must be a list")
    glyph_order = {"✓": 0, "✗": 1, "△": 2, "★": 3}
    seen_symbols = set()
    resolved_rows = [
        _resolved_symbol_review_row(row, local_to_stable, seen_symbols)
        for row in symbol_review
    ]
    return sorted(resolved_rows, key=lambda row: glyph_order[row["symbol"]])


def _update_page_scan_decision(page, patch, assigned, resolved_symbol_review, decisions):
    reviewer, attempt = patch.get("reviewer"), patch.get("attempt")
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise AuditValidationError("discovery reviewer must be non-blank")
    if type(attempt) is not int or attempt < 1 or attempt > 99:
        raise AuditValidationError("discovery attempt must be an integer from 1 to 99")
    if assigned != sorted(set(assigned)) or any(
        not isinstance(source_id, str) or not source_id.strip() for source_id in assigned
    ):
        raise AuditValidationError("assigned visual IDs must be sorted and unique")
    decisions_by_id = {}
    for decision in decisions:
        source_id = decision.get("sourceId")
        if source_id in decisions_by_id:
            raise AuditValidationError(f"duplicate decision sourceId: {source_id}")
        decisions_by_id[source_id] = decision
    page_decision = decisions_by_id.get(page["sourceId"])
    if page_decision is None:
        raise AuditValidationError(f"missing page decision: {page['sourceId']}")
    page_decision["visualReviewState"] = "reviewed"
    page_decision["visualReviewer"] = reviewer
    page_decision["discoveredVisualIds"] = list(assigned)
    page_decision["symbolReview"] = copy.deepcopy(resolved_symbol_review)


def apply_discovery_patch(index, visuals, decisions, patch, policy):
    _assert_discovery_targets_unreviewed(patch, decisions)
    candidate_visuals = copy.deepcopy(visuals)
    candidate_decisions = copy.deepcopy(decisions)
    page = _validated_page(patch["pdfPage"], index)
    _validate_numbered_visual_ids(page, patch["numberedVisualIds"], index)
    assigned, local_to_stable = _merge_full_page_visual_inventory(
        page, patch["visuals"], candidate_visuals
    )
    candidate_decisions = upgrade_editorial_decisions(
        index, candidate_visuals, candidate_decisions
    )
    resolved_symbol_review = _resolve_symbol_target_refs(
        patch["symbolReview"], local_to_stable
    )
    _update_page_scan_decision(
        page, patch, assigned, resolved_symbol_review, candidate_decisions
    )
    _update_target_symbol_alternatives(
        page, patch["symbolReview"], candidate_decisions, local_to_stable
    )
    validate_editorial_decisions(
        index, candidate_visuals, candidate_decisions, policy
    )
    return candidate_visuals, candidate_decisions, local_to_stable


def persist_discovery_candidates(
    visuals_path,
    decisions_path,
    ledger_path,
    candidate_visuals,
    candidate_decisions,
    candidate_ledger,
):
    write_json_transaction({
        Path(visuals_path): candidate_visuals,
        Path(decisions_path): candidate_decisions,
        Path(ledger_path): candidate_ledger,
    })


def _update_target_symbol_alternatives(page, symbol_review, decisions, local_to_stable):
    decisions_by_id = {decision["sourceId"]: decision for decision in decisions}
    for observed in symbol_review:
        for target in decisions_by_id.values():
            target["symbolTextAlternatives"] = [
                entry for entry in target["symbolTextAlternatives"]
                if not (
                    entry["pdfPage"] == page["pdfPage"]
                    and entry["symbol"] == observed["symbol"]
                )
            ]
        for assignment in observed["semanticAssignments"]:
            entry = {
                "symbol": observed["symbol"],
                "pdfPage": page["pdfPage"],
                "meaning": assignment["meaning"],
            }
            target_id = local_to_stable.get(assignment["targetRef"], assignment["targetRef"])
            if target_id not in decisions_by_id:
                raise AuditValidationError(f"unknown semantic assignment target: {target_id}")
            target = decisions_by_id[target_id]
            target["symbolTextAlternatives"].append(entry)
            target["symbolTextAlternatives"].sort(
                key=lambda value: (value["pdfPage"], value["symbol"], value["meaning"])
            )


def _assert_discovery_targets_unreviewed(patch, decisions):
    if not isinstance(patch, dict) or set(patch) != {
        "pdfPage", "attempt", "reviewer", "numberedVisualIds", "visuals", "symbolReview",
    }:
        raise AuditValidationError("discovery patch fields mismatch")
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    decisions_by_id = {}
    for decision in decisions:
        if not isinstance(decision, dict) or not isinstance(decision.get("sourceId"), str):
            raise AuditValidationError("invalid decision sourceId")
        source_id = decision["sourceId"]
        if source_id in decisions_by_id:
            raise AuditValidationError(f"duplicate decision sourceId: {source_id}")
        decisions_by_id[source_id] = decision
    if not isinstance(patch["visuals"], list) or not isinstance(patch["symbolReview"], list):
        raise AuditValidationError("discovery visuals and symbolReview must be lists")
    local_ids = {
        item["localId"] for item in patch["visuals"]
        if isinstance(item, dict) and "localId" in item
    }
    protected_ids = {f"page-{patch['pdfPage']:03d}"} if type(patch["pdfPage"]) is int else set()
    protected_ids.update(
        item["sourceId"] for item in patch["visuals"]
        if isinstance(item, dict) and "sourceId" in item
    )
    for observed in patch["symbolReview"]:
        if not isinstance(observed, dict) or not isinstance(observed.get("semanticAssignments"), list):
            raise AuditValidationError("invalid symbolReview semanticAssignments")
        for assignment in observed["semanticAssignments"]:
            if not isinstance(assignment, dict) or "targetRef" not in assignment:
                raise AuditValidationError("invalid semantic assignment targetRef")
            if assignment["targetRef"] not in local_ids:
                protected_ids.add(assignment["targetRef"])
    unknown = sorted(source_id for source_id in protected_ids if source_id not in decisions_by_id)
    if unknown:
        raise AuditValidationError(f"discovery references unknown IDs: {unknown}")
    already_reviewed = sorted(
        source_id for source_id in protected_ids
        if decisions_by_id[source_id].get("reviewState") != "unreviewed"
    )
    if already_reviewed:
        raise AuditValidationError(f"discovery cannot modify reviewed IDs: {already_reviewed}")


def _confined_review_evidence_files(root, label):
    if root.is_symlink():
        raise AuditValidationError(
            f"review evidence {label} root must not be a symlink"
        )
    try:
        resolved_root = root.resolve(strict=True)
    except OSError as error:
        raise AuditValidationError(
            f"review evidence {label} root is missing"
        ) from error
    if not resolved_root.is_dir():
        raise AuditValidationError(
            f"review evidence {label} root must be a directory"
        )
    files = []
    pending = [resolved_root]
    while pending:
        directory = pending.pop()
        try:
            children = sorted(
                directory.iterdir(),
                key=lambda path: path.name,
            )
        except OSError as error:
            raise AuditValidationError(
                f"cannot read review evidence {label} root"
            ) from error
        for child in children:
            if child.is_symlink():
                raise AuditValidationError(
                    f"review evidence {label} path must not be a symlink"
                )
            if child.is_dir():
                pending.append(child)
            elif child.is_file() and child.suffix == ".json":
                files.append(child.resolve(strict=True))
    return sorted(files, key=lambda path: path.as_posix())


def _load_review_evidence_json(path):
    try:
        value = load_json(path)
    except (OSError, ValueError) as error:
        raise AuditValidationError(
            f"invalid review evidence JSON: {path}"
        ) from error
    return value


def _one_review_evidence_candidate(
    candidates,
    batch_id,
    label,
):
    if len(candidates) != 1:
        qualifier = "missing" if not candidates else "ambiguous"
        raise AuditValidationError(
            f"{qualifier} trusted review evidence: "
            f"{batch_id}.{label}"
        )
    return candidates[0]


def _validate_review_evidence_root_boundaries(
    roots,
    protected_paths,
):
    for root_name, root in roots.items():
        for protected_name, protected in protected_paths.items():
            if (
                _path_is_within(protected, root)
                or _path_is_within(root, protected)
            ):
                raise AuditValidationError(
                    "path conflict: review evidence "
                    f"{root_name} and {protected_name} overlap"
                )


def _load_existing_review_batch_evidence(
    ledger,
    evidence_root,
    protected_paths,
):
    review_entries = [
        entry
        for entry in ledger
        if isinstance(entry, dict)
        and entry.get("entryType") == "review"
    ]
    if not review_entries:
        return {}
    if evidence_root is None:
        raise AuditValidationError(
            "review evidence root is required after an accepted review"
        )
    root = Path(evidence_root)
    if root.is_symlink():
        raise AuditValidationError(
            "review evidence root must not be a symlink"
        )
    try:
        resolved_root = root.resolve(strict=True)
    except OSError as error:
        raise AuditValidationError(
            "review evidence root is missing"
        ) from error
    if not resolved_root.is_dir():
        raise AuditValidationError(
            "review evidence root must be a directory"
        )
    roots = {
        "freezes": resolved_root / "review-freezes",
        "patches": resolved_root / "review-patches",
    }
    _validate_review_evidence_root_boundaries(
        roots,
        protected_paths,
    )
    freeze_paths = _confined_review_evidence_files(
        roots["freezes"],
        "freezes",
    )
    patch_paths = _confined_review_evidence_files(
        roots["patches"],
        "patches",
    )
    assert_distinct_paths({
        **protected_paths,
        **{
            f"review-evidence-{position:04d}": path
            for position, path in enumerate(
                [*freeze_paths, *patch_paths],
                start=1,
            )
        },
    })
    freeze_values = [
        (path, _load_review_evidence_json(path))
        for path in freeze_paths
    ]
    patch_values = [
        (path, _load_review_evidence_json(path))
        for path in patch_paths
    ]
    batch_evidence = {}
    for entry in review_entries:
        batch_id = entry.get("batchId")
        if (
            not isinstance(batch_id, str)
            or re.fullmatch(
                r"[a-z0-9][a-z0-9._-]{2,63}",
                batch_id,
            ) is None
            or batch_id in batch_evidence
        ):
            raise AuditValidationError(
                "invalid review entry for evidence lookup"
            )
        _, freeze = _one_review_evidence_candidate(
            [
                (path, value)
                for path, value in freeze_values
                if isinstance(value, dict)
                and value.get("batchId") == batch_id
                and "freezeSha256" in value
            ],
            batch_id,
            "freeze",
        )
        patch_candidates = [
            (path, value)
            for path, value in patch_values
            if isinstance(value, dict)
            and value.get("batchId") == batch_id
            and set(value) == {
                "batchId",
                "reviewer",
                "reviewerTaskId",
                "evidenceHashes",
                "changes",
            }
        ]
        _, primary_patch = _one_review_evidence_candidate(
            [
                (path, value)
                for path, value in patch_candidates
                if value["reviewer"] == entry.get("primaryReviewer")
                and value["reviewerTaskId"]
                == entry.get("primaryTaskId")
            ],
            batch_id,
            "primaryPatch",
        )
        _, secondary_patch = (
            _one_review_evidence_candidate(
                [
                    (path, value)
                    for path, value in patch_candidates
                    if value["reviewer"]
                    == entry.get("secondaryReviewer")
                    and value["reviewerTaskId"]
                    == entry.get("secondaryTaskId")
                ],
                batch_id,
                "secondaryPatch",
            )
        )
        _, resolutions = (
            _one_review_evidence_candidate(
                [
                    (path, value)
                    for path, value in patch_values
                    if isinstance(value, dict)
                    and value.get("batchId") == batch_id
                    and set(value) == {
                        "batchId",
                        "resolutions",
                        "criticalOmissions",
                    }
                ],
                batch_id,
                "resolutions",
            )
        )
        batch_evidence[batch_id] = {
            "freeze": freeze,
            "primaryPatch": primary_patch,
            "secondaryPatch": secondary_patch,
            "resolutions": resolutions,
        }
    return batch_evidence


def discovery_command(args) -> dict:
    paths = {
        "patch": Path(args.patch).resolve(),
        "index": Path(args.index).resolve(),
        "policy": Path(args.policy).resolve(),
        "visuals-target": Path(args.visuals).resolve(),
        "decisions-target": Path(args.decisions).resolve(),
        "ledger-target": Path(args.ledger).resolve(),
    }
    assert_distinct_paths(paths)
    patch = load_json(paths["patch"])
    index = load_json(paths["index"])
    policy = load_json(paths["policy"])
    visuals = load_json(paths["visuals-target"])
    decisions = load_json(paths["decisions-target"])
    ledger = load_json(paths["ledger-target"])
    batch_evidence = _load_existing_review_batch_evidence(
        ledger,
        getattr(args, "review_evidence_root", None),
        paths,
    )
    base_decisions_sha256 = sha256_json(decisions)
    candidate_visuals, candidate_decisions, local_to_stable = (
        apply_discovery_patch(
            index,
            visuals,
            decisions,
            patch,
            policy,
        )
    )
    accepted_decisions_sha256 = sha256_json(
        candidate_decisions
    )
    previous_visual_ids = {
        item["sourceId"] for item in visuals
    }
    accepted_visual_ids = {
        item["sourceId"] for item in candidate_visuals
    }
    added_visual_ids = sorted(
        accepted_visual_ids - previous_visual_ids
    )
    entry = build_discovery_ledger_entry(
        pdf_page=patch["pdfPage"],
        attempt=patch["attempt"],
        reviewer=patch["reviewer"],
        added_visual_ids=added_visual_ids,
        base_decisions_sha256=base_decisions_sha256,
        accepted_decisions_sha256=(
            accepted_decisions_sha256
        ),
    )
    candidate_ledger = [
        *copy.deepcopy(ledger),
        entry,
    ]
    validate_review_ledger(
        index,
        candidate_visuals,
        candidate_decisions,
        candidate_ledger,
        policy,
        accepted_decisions_sha256,
        require_complete=False,
        batch_evidence=batch_evidence,
    )
    write_json_transaction({
        paths["visuals-target"]: candidate_visuals,
        paths["decisions-target"]: candidate_decisions,
        paths["ledger-target"]: candidate_ledger,
    })
    return {
        "pdfPage": patch["pdfPage"],
        "attempt": patch["attempt"],
        "addedVisualIds": added_visual_ids,
        "localToStable": {
            key: local_to_stable[key]
            for key in sorted(local_to_stable)
        },
        "baseDecisionsSha256": base_decisions_sha256,
        "acceptedDecisionsSha256": (
            accepted_decisions_sha256
        ),
    }


def _normalized_resolved_parts(path):
    resolved = Path(path).resolve(strict=False)
    normalized = unicodedata.normalize(
        "NFC",
        str(resolved),
    ).casefold()
    return PurePosixPath(normalized).parts


def _path_is_within(path, directory):
    candidate_parts = _normalized_resolved_parts(path)
    directory_parts = _normalized_resolved_parts(directory)
    return (
        len(candidate_parts) >= len(directory_parts)
        and candidate_parts[:len(directory_parts)] == directory_parts
    )


def _validate_output_outside_evidence_roots(output, roots):
    for name, root in roots.items():
        if _path_is_within(output, root):
            raise AuditValidationError(
                f"path conflict: output is inside {name}"
            )
        if _path_is_within(root, output):
            raise AuditValidationError(
                f"path conflict: {name} is inside output"
            )


def freeze_command(args) -> dict:
    manifest_path = Path(args.manifest)
    manifest = load_json(manifest_path)
    output = Path(args.output)
    artifact_paths = frozen_manifest_artifact_paths(
        manifest,
        Path.cwd(),
    )
    evidence_roots = frozen_manifest_evidence_roots(
        artifact_paths
    )
    protected_paths = {
        "manifest": manifest_path,
        "pdf": Path(args.pdf),
        "index": Path(args.index),
        "visuals": Path(args.visuals),
        "decisions": Path(args.decisions),
        "ledger": Path(args.ledger),
        "policy": Path(args.policy),
        "analysis": Path(args.analysis),
        "course-outline": Path(args.course_outline),
        "output": output,
    }
    protected_paths.update({
        f"artifact-{name}": path
        for name, path in artifact_paths.items()
    })
    assert_distinct_paths(protected_paths)
    _validate_output_outside_evidence_roots(
        output,
        evidence_roots,
    )
    freeze = freeze_batch(
        manifest,
        Path(args.pdf),
        Path(args.index),
        Path(args.visuals),
        Path(args.decisions),
        Path(args.ledger),
        Path(args.policy),
        Path(args.analysis),
        Path(args.course_outline),
    )
    write_json_transaction({output: freeze})
    return freeze


def verify_command(args) -> dict:
    freeze = load_json(Path(args.freeze))
    current_evidence = build_current_batch_evidence(
        freeze=freeze,
        pdf_path=Path(args.pdf),
        index_path=Path(args.index),
        visuals_path=Path(args.visuals),
        decisions_path=Path(args.decisions),
        ledger_path=Path(args.ledger),
        policy_path=Path(args.policy),
        analysis_path=Path(args.analysis),
        course_outline_path=Path(args.course_outline),
        image_dir=Path(args.image_dir),
        package_dir=Path(args.package_dir),
    )
    validate_frozen_batch(freeze, current_evidence)
    return {
        "batchId": freeze["batchId"],
        "pageCount": len(freeze["pages"]),
        "sourceCount": len(freeze["sourceIds"]),
        "freezeSha256": freeze["freezeSha256"],
    }


def build_parser():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)

    discover = commands.add_parser("discover")
    for name in ("patch", "index", "visuals", "decisions", "ledger", "policy"):
        discover.add_argument(f"--{name.replace('_', '-')}", required=True)
    discover.add_argument(
        "--review-evidence-root",
        help=(
            "root containing review-freezes/ and review-patches/ "
            "for already accepted batches"
        ),
    )
    discover.set_defaults(handler=discovery_command)

    freeze = commands.add_parser("freeze")
    for name in (
        "manifest", "pdf", "index", "visuals", "decisions", "ledger",
        "policy", "analysis", "course_outline", "output",
    ):
        freeze.add_argument(f"--{name.replace('_', '-')}", required=True)
    freeze.set_defaults(handler=freeze_command)

    verify = commands.add_parser("verify")
    for name in (
        "freeze", "pdf", "index", "visuals", "decisions", "ledger",
        "policy", "analysis", "course_outline", "image_dir", "package_dir",
    ):
        verify.add_argument(f"--{name.replace('_', '-')}", required=True)
    verify.set_defaults(handler=verify_command)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        result = args.handler(args)
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2
    sys.stdout.write(deterministic_json_bytes(result).decode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
