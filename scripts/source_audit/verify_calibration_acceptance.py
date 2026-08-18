from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

from scripts.source_audit.build_reports import (
    _caption_conflict_is_resolved,
    _decision_by_source_id,
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.build_review_packages import parse_markdown_sections
from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import validate_editorial_decisions
from scripts.source_audit.models import AuditValidationError, assert_distinct_paths, load_json
from scripts.source_audit.must_keep import build_must_keep_inventory, validate_must_keep_coverage
from scripts.source_audit.prepare_review_batch import _load_existing_review_batch_evidence
from scripts.source_audit.review_batches import build_current_batch_evidence, validate_frozen_immutable_evidence
from scripts.source_audit.review_ledger import validate_review_ledger
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.transactions import sha256_json, write_files_transaction


APPROVED_PDF_SHA256 = "27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac"


def _pending(name):
    raise NotImplementedError(name)


def _build_parser(*args, **kwargs):
    parser = argparse.ArgumentParser(*args, **kwargs)
    for name in ("freeze", "pdf", "index", "visuals", "decisions", "ledger", "policy", "analysis", "course-outline", "image-dir", "package-dir"):
        parser.add_argument(f"--{name}", required=True, type=Path)
    parser.add_argument("--review-evidence-root", required=True, type=Path)
    parser.add_argument("--json", action="store_true")
    return parser


def _gate_pdf_hash(pdf_sha256):
    if pdf_sha256 != APPROVED_PDF_SHA256:
        raise AuditValidationError("approved PDF SHA-256 mismatch")


def _gate_complete_decisions(case):
    validate_editorial_decisions(case["index"], case["visuals"], case["decisions"], case["policy"], require_complete=True)


def _gate_page_scans(case):
    decisions = _decision_by_source_id(case["decisions"])
    for page in case["index"]["pages"]:
        decision = decisions[page["sourceId"]]
        if decision.get("visualReviewState") != "reviewed" or not decision.get("visualReviewer"):
            raise AuditValidationError(f"page scan incomplete: {page['sourceId']}")


def _gate_visual_metadata(case):
    source_map = source_items_by_id(case["index"], case["visuals"])
    decisions = _decision_by_source_id(case["decisions"])
    for source_id, item in source_map.items():
        if item["kind"] not in {"figure", "table", "visual"}:
            continue
        decision = decisions[source_id]
        visual_class = decision.get("visualClass")
        if not visual_class or not decision.get("visualHandling"):
            raise AuditValidationError(f"visual metadata incomplete: {source_id}")
        if visual_class in {"semantic-core", "evidence"} and not decision.get("visualTextAlternative"):
            raise AuditValidationError(f"visual metadata incomplete: {source_id}")
        if decision.get("disposition") in {"included", "compressed", "missing"} and not decision.get("lessonIds"):
            raise AuditValidationError(f"visual destination incomplete: {source_id}")


def _gate_caption_conflicts(case):
    decisions = _decision_by_source_id(case["decisions"])
    for source_id in case["policy"]["captionConflictSourceIds"]:
        if not _caption_conflict_is_resolved(decisions.get(source_id, {})):
            raise AuditValidationError(f"caption conflict unresolved: {source_id}")


def _gate_must_keep(case):
    validate_must_keep_coverage(case["mustKeepInventory"], case["decisions"], source_items_by_id(case["index"], case["visuals"]), case["index"]["outline"], case["policy"], require_complete=True)


def _gate_missing_item_lessons(case):
    for decision in case["decisions"]:
        if decision.get("disposition") == "missing" and not decision.get("lessonIds"):
            raise AuditValidationError(f"missing item has no lesson: {decision['sourceId']}")


def _gate_lesson_1_1_semantic_core_source(case):
    source_map = source_items_by_id(case["index"], case["visuals"])
    for decision in case["decisions"]:
        item = source_map.get(decision["sourceId"])
        if (
            item is not None
            and item["kind"] in {"figure", "table", "visual"}
            and "1-1" in decision.get("lessonIds", [])
            and decision.get("visualClass") == "semantic-core"
            and decision.get("visualHandling") == "redraw"
            and decision.get("visualTextAlternative")
        ):
            return
    raise AuditValidationError("1-1 semantic-core source is required")


def _gate_course_placement(case):
    validate_editorial_decisions(case["index"], case["visuals"], case["decisions"], case["policy"], require_complete=True)


def _gate_review_ledger(case, require_complete=True):
    evidence = case.get("batchEvidence")
    if evidence is None:
        raise AuditValidationError("trusted review evidence is required")
    validate_review_ledger(case["index"], case["visuals"], case["decisions"], case["ledger"], case["policy"], sha256_json(case["decisions"]), require_complete=require_complete, batch_evidence=evidence)


def _gate_report_determinism(first_outputs, second_outputs):
    persisted = []
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for number, outputs in enumerate((first_outputs, second_outputs), start=1):
            pass_root = root / f"pass-{number}"
            pass_root.mkdir()
            paths = (pass_root / "coverage.md", pass_root / "visual.md")
            write_files_transaction({path: payload for path, payload in zip(paths, outputs, strict=True)})
            persisted.append(tuple(path.read_bytes() for path in paths))
    if persisted[0] != persisted[1]:
        raise AuditValidationError("report determinism mismatch")


def _gate_boundary_matrix(case):
    _gate_visual_metadata(case)
    _gate_course_placement(case)
    _gate_must_keep(case)


def run_stage_a_gate(pdf_sha256, index, visuals, decisions, ledger, policy, must_keep_inventory, batch_evidence):
    case = {"pdfSha256": pdf_sha256, "index": index, "visuals": visuals, "decisions": decisions, "ledger": ledger, "policy": policy, "mustKeepInventory": must_keep_inventory, "batchEvidence": batch_evidence}
    _gate_pdf_hash(pdf_sha256)
    _gate_complete_decisions(case)
    _gate_page_scans(case)
    _gate_visual_metadata(case)
    _gate_caption_conflicts(case)
    _gate_must_keep(case)
    _gate_missing_item_lessons(case)
    _gate_course_placement(case)
    _gate_lesson_1_1_semantic_core_source(case)
    _gate_review_ledger(case)
    first = (render_coverage_matrix(index, decisions, visuals, ledger, policy, must_keep_inventory, pdf_sha256).encode("utf-8"), render_visual_asset_index(index, decisions, visuals, ledger, policy, must_keep_inventory).encode("utf-8"))
    second = (render_coverage_matrix(index, decisions, visuals, ledger, policy, must_keep_inventory, pdf_sha256).encode("utf-8"), render_visual_asset_index(index, decisions, visuals, ledger, policy, must_keep_inventory).encode("utf-8"))
    _gate_report_determinism(first, second)


def _require_calibration_source_count(freeze):
    count = len(freeze["sourceIds"])
    if count < 30 or count > 40:
        raise AuditValidationError("calibration source count outside 30..40")


def _require_calibration_pages(freeze, index, policy):
    required = set(policy["calibration"]["requiredPages"])
    pages = set(freeze["pages"])
    if not required <= pages:
        raise AuditValidationError("calibration freeze omits a required page")
    if len(pages - set(review_page_numbers(index))) < 3:
        raise AuditValidationError("calibration freeze has fewer than three external pages")


def _require_frozen_page_snapshot(freeze):
    expected = {f"page-{page:03d}" for page in freeze["pages"]}
    actual = {row["sourceId"] for row in freeze["frozenPageDecisions"]}
    if actual != expected:
        raise AuditValidationError("frozen page decisions do not match calibration pages")


def _require_unreviewed_calibration_base(freeze):
    if set(freeze["baseReviewStates"]) != set(freeze["catalogSourceIds"]):
        raise AuditValidationError("calibration baseReviewStates do not cover catalog")
    invalid = sorted(source_id for source_id in freeze["sourceIds"] if freeze["baseReviewStates"].get(source_id) != "unreviewed")
    if invalid:
        raise AuditValidationError(f"calibration assigned non-unreviewed IDs: {invalid}")


def _require_complete_double_review(freeze, entry):
    if set(entry["doubleReviewedSourceIds"]) != set(freeze["sourceIds"]):
        raise AuditValidationError("calibration is not 100% double reviewed")


def _require_independent_reviewers(entry):
    if entry["primaryReviewer"].strip().casefold() == entry["secondaryReviewer"].strip().casefold() or entry["primaryTaskId"] == entry["secondaryTaskId"]:
        raise AuditValidationError("calibration reviewers are not independent")


def _require_complete_resolutions(entry):
    if set(entry["resolvedSourceIds"]) != {row["sourceId"] for row in entry["disagreements"]}:
        raise AuditValidationError("calibration resolutions are incomplete")


def _require_review_tail(ledger, review_entry):
    if not ledger or ledger[-1] is not review_entry:
        raise AuditValidationError("calibration review entry must be ledger tail")


def _require_frozen_discovery_unchanged(freeze, decisions):
    current = _decision_by_source_id(decisions)
    for frozen in freeze["frozenPageDecisions"]:
        for field in ("visualReviewState", "visualReviewer", "discoveredVisualIds", "symbolReview"):
            if current[frozen["sourceId"]][field] != frozen[field]:
                raise AuditValidationError(f"page discovery changed after freeze: {frozen['sourceId']}")


def _validate_calibration_base(freeze, current_evidence, index, visuals, decisions, policy, must_keep_inventory):
    validate_frozen_immutable_evidence(freeze, current_evidence)
    _gate_pdf_hash(current_evidence["pdfSha256"])
    if freeze["mode"] != "calibration":
        raise AuditValidationError("freeze mode is not calibration")
    _require_calibration_source_count(freeze)
    _require_calibration_pages(freeze, index, policy)
    _require_frozen_page_snapshot(freeze)
    _require_unreviewed_calibration_base(freeze)
    source_map = source_items_by_id(index, visuals)
    validate_editorial_decisions(index, visuals, decisions, policy, require_complete=False)
    validate_must_keep_coverage(must_keep_inventory, decisions, source_map, index["outline"], policy, require_complete=False)
    if sorted(source_map) != freeze["catalogSourceIds"]:
        raise AuditValidationError("catalog changed after freeze")


def _one_calibration_entry(freeze, ledger):
    entries = [row for row in ledger if row.get("entryType") == "review" and row.get("batchId") == freeze["batchId"]]
    if len(entries) != 1:
        raise AuditValidationError("expected one calibration review entry")
    entry = entries[0]
    _require_review_tail(ledger, entry)
    position = ledger.index(entry)
    if sha256_json(ledger[:position]) != freeze["baseLedgerSha256"]:
        raise AuditValidationError("frozen baseLedgerSha256 mismatch")
    if entry["mode"] != "calibration" or entry["sourceIds"] != freeze["sourceIds"] or entry["baseDecisionsSha256"] != freeze["baseDecisionsSha256"]:
        raise AuditValidationError("calibration review entry mismatch")
    return entry


def _validate_calibration_result(freeze, index, visuals, decisions, ledger, policy, entry, batch_evidence=None):
    _require_frozen_discovery_unchanged(freeze, decisions)
    _require_complete_double_review(freeze, entry)
    _require_independent_reviewers(entry)
    _require_complete_resolutions(entry)
    current = _decision_by_source_id(decisions)
    changed = {source_id for source_id, before in freeze["baseReviewStates"].items() if current[source_id]["reviewState"] != before}
    expected = set(freeze["sourceIds"])
    if changed != expected:
        raise AuditValidationError("calibration review-state delta mismatch")
    case = {"index": index, "visuals": visuals, "decisions": decisions, "ledger": ledger, "policy": policy, "batchEvidence": batch_evidence}
    _gate_review_ledger(case, require_complete=False)
    if entry["acceptedDecisionsSha256"] != sha256_json(decisions):
        raise AuditValidationError("ledger tail does not match decisions")
    return expected


def _gate_acceptance_integrity(case):
    validate_frozen_immutable_evidence(case["freeze"], case["current_immutable_evidence_hashes"])
    _gate_pdf_hash(case["current_immutable_evidence_hashes"]["pdfSha256"])
    _one_calibration_entry(case["freeze"], case["ledger"])
    _gate_review_ledger(case)


def verify_calibration_acceptance(freeze, current_immutable_evidence_hashes, index, visuals, decisions, ledger, policy, must_keep_inventory, batch_evidence):
    _validate_calibration_base(freeze, current_immutable_evidence_hashes, index, visuals, decisions, policy, must_keep_inventory)
    entry = _one_calibration_entry(freeze, ledger)
    changed = _validate_calibration_result(freeze, index, visuals, decisions, ledger, policy, entry, batch_evidence)
    return {"sourceCount": len(freeze["sourceIds"]), "doubleReviewedCount": len(entry["doubleReviewedSourceIds"]), "reviewedDelta": len(changed), "sourceDisagreementRate": entry["sourceDisagreementRate"], "reviewEntryCount": 1, "discoveryEntryCount": sum(row.get("entryType") == "discovery" for row in ledger)}


def _verifier_role_paths(args):
    return {name: Path(getattr(args, name)) for name in ("freeze", "pdf", "index", "visuals", "decisions", "ledger", "policy", "analysis", "course_outline", "image_dir", "package_dir", "review_evidence_root")}


def _review_evidence_protected_paths(args):
    paths = _verifier_role_paths(args)
    for evidence_role in ("freeze", "package_dir", "review_evidence_root"):
        paths.pop(evidence_role)
    return paths


def _load_verifier_case(args):
    freeze = load_json(args.freeze)
    index = load_json(args.index)
    visuals = load_json(args.visuals)
    decisions = load_json(args.decisions)
    ledger = load_json(args.ledger)
    policy = load_json(args.policy)
    inventory = build_must_keep_inventory(policy, parse_markdown_sections(Path(args.analysis), args.analysis), parse_markdown_sections(Path(args.course_outline), args.course_outline))
    protected = _review_evidence_protected_paths(args)
    batch_evidence = _load_existing_review_batch_evidence(
        ledger, args.review_evidence_root, protected,
    )
    current = build_current_batch_evidence(freeze, args.pdf, args.index, args.visuals, args.decisions, args.ledger, args.policy, args.analysis, args.course_outline, args.image_dir, args.package_dir)
    return {"freeze": freeze, "current_immutable_evidence_hashes": current, "index": index, "visuals": visuals, "decisions": decisions, "ledger": ledger, "policy": policy, "must_keep_inventory": inventory, "batch_evidence": batch_evidence}


def main(argv=None):
    args = _build_parser().parse_args(argv)
    try:
        assert_distinct_paths(_verifier_role_paths(args))
        summary = verify_calibration_acceptance(**_load_verifier_case(args))
        if args.json:
            print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
