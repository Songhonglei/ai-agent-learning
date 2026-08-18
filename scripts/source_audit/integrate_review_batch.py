from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import unicodedata
from pathlib import Path

from scripts.source_audit.build_reports import (
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.build_review_packages import parse_markdown_sections
from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import validate_editorial_decisions
from scripts.source_audit.models import AuditValidationError, load_json
from scripts.source_audit.must_keep import (
    build_must_keep_inventory,
    validate_must_keep_coverage,
)
from scripts.source_audit.prepare_review_batch import (
    _load_existing_review_batch_evidence,
)
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    compare_review_patches,
    validate_frozen_batch,
    validate_frozen_immutable_evidence,
    validate_review_patch,
)
from scripts.source_audit.review_ledger import (
    build_review_ledger_entry,
    required_after_escalation,
    required_secondary_source_ids,
    validate_review_ledger,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
    write_json_transaction,
)


def _pending(name):
    raise NotImplementedError(name)


def _records_by_source_id(patch):
    records = {}
    for record in patch["changes"]:
        source_id = record["sourceId"]
        if source_id in records:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        records[source_id] = record
    return records


def review_input_fingerprint(freeze, primary_patch, secondary_patch, resolution):
    return sha256_json({
        "freezeSha256": freeze["freezeSha256"],
        "primaryPatchSha256": sha256_json(primary_patch),
        "secondaryPatchSha256": sha256_json(secondary_patch),
        "resolutionSha256": sha256_json(resolution),
    })


def _canonical_path_text(path):
    return unicodedata.normalize(
        "NFC", str(Path(path).resolve(strict=False))
    ).casefold()


def canonical_path_identity(path):
    candidate = Path(path)
    tokens = {("path", _canonical_path_text(candidate))}
    if candidate.exists():
        result = candidate.stat()
        tokens.add(("inode", result.st_dev, result.st_ino))
    return frozenset(tokens)


def _path_is_within(candidate, root):
    candidate_text = _canonical_path_text(candidate)
    root_text = _canonical_path_text(root).rstrip(os.sep)
    return candidate_text != root_text and candidate_text.startswith(root_text + os.sep)


def _require_resolution_batch_id(freeze, resolution):
    if not isinstance(resolution, dict):
        raise AuditValidationError("resolution must be an object")
    if resolution.get("batchId") != freeze["batchId"]:
        raise AuditValidationError("resolution batchId mismatch")


def _require_unique_resolution_ids(resolution):
    seen = set()
    for row in resolution.get("resolutions", []):
        source_id = row.get("sourceId")
        if source_id in seen:
            raise AuditValidationError(
                f"duplicate resolution sourceId: {source_id}"
            )
        seen.add(source_id)


def _require_resolution_final_records(resolution):
    for row in resolution.get("resolutions", []):
        final_record = row.get("finalRecord")
        if not isinstance(final_record, dict):
            raise AuditValidationError("resolution finalRecord must be an object")
        if final_record.get("sourceId") != row.get("sourceId"):
            raise AuditValidationError("resolution finalRecord sourceId mismatch")


def _require_resolution_notes(resolution):
    for row in resolution.get("resolutions", []):
        note = row.get("resolutionNote")
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError(
                f"resolution requires note: {row.get('sourceId')}"
            )


def _require_agreed_fields_unchanged(row, primary_record, secondary_record):
    all_fields = set(primary_record) | set(secondary_record)
    actual_changes = {
        field for field in all_fields
        if primary_record.get(field) != secondary_record.get(field)
    }
    allowed_changes = set(row["fields"])
    if row["fields"] != sorted(allowed_changes) or allowed_changes != actual_changes:
        raise AuditValidationError(
            "resolution fields do not match disagreement: "
            f"{row['sourceId']}"
        )
    final_record = row["finalRecord"]
    all_fields |= set(final_record)
    for field in all_fields - allowed_changes:
        agreed = primary_record.get(field)
        if secondary_record.get(field) != agreed or final_record.get(field) != agreed:
            raise AuditValidationError(
                "resolution changed agreed field: "
                f"{row['sourceId']}.{field}"
            )


def _require_secondary_coverage(required_ids, secondary_ids):
    missing = sorted(set(required_ids) - set(secondary_ids))
    if missing:
        raise AuditValidationError(f"secondary patch missing required IDs: {missing}")


def _require_exact_secondary_expansion(expected_ids, actual_ids):
    expected = set(expected_ids)
    actual = set(actual_ids)
    if actual != expected:
        raise AuditValidationError(
            "secondary expansion mismatch: "
            f"missing={sorted(expected - actual)}, extra={sorted(actual - expected)}"
        )


def _assert_unreviewed_delta(before, after, replacements):
    before_by_id = {item["sourceId"]: item for item in before}
    reviewed_ids = sorted(
        source_id for source_id in replacements
        if before_by_id[source_id]["reviewState"] != "unreviewed"
    )
    if reviewed_ids:
        raise AuditValidationError(
            f"batch cannot overwrite reviewed IDs: {reviewed_ids}"
        )
    before_unreviewed = {
        item["sourceId"] for item in before
        if item["reviewState"] == "unreviewed"
    }
    after_unreviewed = {
        item["sourceId"] for item in after
        if item["reviewState"] == "unreviewed"
    }
    expected_removed = before_unreviewed & set(replacements)
    if before_unreviewed - after_unreviewed != expected_removed:
        raise AuditValidationError("unreviewed delta mismatch")


def _replace_records_preserving_order(decisions, replacements):
    return [
        copy.deepcopy(replacements.get(item["sourceId"], item))
        for item in decisions
    ]


def _validate_current_evidence(freeze, current_evidence):
    validate_frozen_immutable_evidence(freeze, current_evidence)


def _review_batch_evidence(freeze, primary_patch, secondary_patch, resolution):
    return {
        freeze["batchId"]: {
            "freeze": freeze,
            "primaryPatch": primary_patch,
            "secondaryPatch": secondary_patch,
            "resolutions": resolution,
        }
    }


def _validate_candidate_state(
    index, visuals, decisions, ledger, policy, must_keep_inventory,
    batch_evidence=None,
):
    source_map = source_items_by_id(index, visuals)
    validate_editorial_decisions(index, visuals, decisions, policy)
    validate_must_keep_coverage(
        must_keep_inventory, decisions, source_map, index["outline"], policy,
        require_complete=False,
    )
    validate_review_ledger(
        index, visuals, decisions, ledger, policy, sha256_json(decisions),
        batch_evidence=batch_evidence,
    )


def _accepted_retry(ledger, batch_id, input_fingerprint):
    matches = [
        entry for entry in ledger
        if entry.get("entryType") == "review"
        and entry.get("batchId") == batch_id
    ]
    if not matches:
        return None
    if len(matches) != 1:
        raise AuditValidationError(f"duplicate accepted batchId: {batch_id}")
    entry = matches[0]
    if entry.get("inputFingerprint") != input_fingerprint:
        raise AuditValidationError("inputFingerprint mismatch")
    return entry


def _validate_accepted_retry(
    freeze, current_evidence, index, visuals, decisions, ledger, policy,
    batch_evidence=None,
):
    validate_frozen_immutable_evidence(freeze, current_evidence)
    validate_review_ledger(
        index, visuals, decisions, ledger, policy, sha256_json(decisions),
        batch_evidence=batch_evidence,
    )


def _disagreement_ledger_rows(resolution_rows):
    return [
        {
            "sourceId": row["sourceId"],
            "fields": list(row["fields"]),
            "resolutionNote": row["resolutionNote"],
        }
        for row in resolution_rows
    ]


def _validate_disagreement_ledger_rows(rows):
    for row in rows:
        if set(row) != {"sourceId", "fields", "resolutionNote"}:
            raise AuditValidationError("disagreement fields mismatch")
        note = row["resolutionNote"]
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError("blank resolutionNote")


def _resolve_complete_records(
    freeze, primary_patch, secondary_patch, resolution, disagreements,
    required_secondary_ids,
):
    primary = _records_by_source_id(primary_patch)
    secondary = _records_by_source_id(secondary_patch)
    disagreement_fields = {row["sourceId"]: row["fields"] for row in disagreements}
    resolution_map = {row["sourceId"]: row for row in resolution["resolutions"]}
    final_records = {}
    for source_id in freeze["sourceIds"]:
        if source_id not in required_secondary_ids:
            final_records[source_id] = copy.deepcopy(primary[source_id])
        elif primary[source_id] == secondary[source_id]:
            final_records[source_id] = copy.deepcopy(primary[source_id])
        else:
            if source_id not in disagreement_fields:
                raise AuditValidationError(f"unresolved disagreement: {source_id}")
            row = resolution_map.get(source_id)
            if row is None:
                raise AuditValidationError(f"unresolved disagreement: {source_id}")
            if row["fields"] != disagreement_fields[source_id]:
                raise AuditValidationError(
                    "resolution fields do not match disagreement: "
                    f"{source_id}"
                )
            _require_agreed_fields_unchanged(row, primary[source_id], secondary[source_id])
            final_records[source_id] = copy.deepcopy(row["finalRecord"])
    return final_records


def build_comparison_artifacts(
    freeze, primary_patch, secondary_patch, source_map, policy,
):
    validate_review_patch(freeze, primary_patch, source_map, set(freeze["sourceIds"]), policy)
    secondary_ids = set(_records_by_source_id(secondary_patch))
    required_ids = required_secondary_source_ids(freeze, primary_patch, source_map, policy)
    _require_secondary_coverage(required_ids, secondary_ids)
    validate_review_patch(freeze, secondary_patch, source_map, secondary_ids, policy)
    disagreements = compare_review_patches(primary_patch, secondary_patch)
    return (
        {"batchId": freeze["batchId"], "disagreements": disagreements},
        {
            "batchId": freeze["batchId"],
            "resolutions": [
                {
                    "sourceId": row["sourceId"], "fields": row["fields"],
                    "finalRecord": None, "resolutionNote": "",
                }
                for row in disagreements
            ],
            "criticalOmissions": [],
        },
    )


def _write_comparison_outputs(report_path, template_path, report, template):
    write_json_transaction({Path(report_path): report, Path(template_path): template})


def _write_apply_outputs(paths, decisions, ledger, coverage, visual):
    payloads = [
        deterministic_json_bytes(decisions), deterministic_json_bytes(ledger),
        coverage.encode("utf-8"), visual.encode("utf-8"),
    ]
    write_files_transaction({
        Path(path): payload
        for path, payload in zip(paths, payloads, strict=True)
    })


def _validate_integration_paths(mode, role_paths):
    allowed_pairs = set()
    if mode == "apply":
        allowed_pairs = {
            frozenset({"decisionsInput", "decisionsOutput"}),
            frozenset({"ledgerInput", "ledgerOutput"}),
        }
    roles = sorted(role_paths)
    identities = {
        role: canonical_path_identity(path)
        for role, path in role_paths.items()
    }
    for offset, left in enumerate(roles):
        for right in roles[offset + 1:]:
            if identities[left].isdisjoint(identities[right]):
                continue
            if frozenset({left, right}) in allowed_pairs:
                continue
            raise AuditValidationError(f"path alias: {left} and {right}")
    evidence_roots = {
        role: path for role, path in role_paths.items()
        if role in {"image_dir", "package_dir"}
    }
    outputs = {
        role: path for role, path in role_paths.items()
        if role.endswith("Output")
    }
    for output_role, output_path in outputs.items():
        for root_role, root_path in evidence_roots.items():
            if _path_is_within(output_path, root_path):
                raise AuditValidationError(
                    f"{output_role} is inside frozen evidence root {root_role}"
                )


def _validate_critical_omissions(freeze, resolution, double_reviewed_ids):
    if set(resolution) != {"batchId", "resolutions", "criticalOmissions"}:
        raise AuditValidationError("resolution fields mismatch")
    rows = resolution["criticalOmissions"]
    if not isinstance(rows, list):
        raise AuditValidationError("criticalOmissions must be a list")
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"sourceId", "note"}:
            raise AuditValidationError("critical omission fields mismatch")
        source_id = row["sourceId"]
        note = row["note"]
        if source_id in seen:
            raise AuditValidationError(f"duplicate critical omission: {source_id}")
        if source_id not in freeze["sourceIds"]:
            raise AuditValidationError(f"critical omission outside batch: {source_id}")
        if source_id not in double_reviewed_ids:
            raise AuditValidationError(f"critical omission not double reviewed: {source_id}")
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError(f"critical omission note is blank: {source_id}")
        seen.add(source_id)


def _validate_retry_reports(coverage_path, visual_path, expected_coverage, expected_visual):
    expected = {
        "coverage report bytes": expected_coverage.encode("utf-8"),
        "visual report bytes": expected_visual.encode("utf-8"),
    }
    actual = {
        "coverage report bytes": Path(coverage_path).read_bytes(),
        "visual report bytes": Path(visual_path).read_bytes(),
    }
    for label in expected:
        if actual[label] != expected[label]:
            raise AuditValidationError(f"{label} mismatch")


def _validate_new_review_inputs(
    freeze, current_evidence, primary_patch, secondary_patch, resolution,
    source_map, policy,
):
    validate_frozen_batch(freeze, current_evidence)
    validate_review_patch(freeze, primary_patch, source_map, set(freeze["sourceIds"]), policy)
    required_secondary = required_secondary_source_ids(freeze, primary_patch, source_map, policy)
    secondary_ids = set(_records_by_source_id(secondary_patch))
    _require_secondary_coverage(required_secondary, secondary_ids)
    validate_review_patch(freeze, secondary_patch, source_map, secondary_ids, policy)
    _require_resolution_batch_id(freeze, resolution)
    _require_unique_resolution_ids(resolution)
    _require_resolution_final_records(resolution)
    _require_resolution_notes(resolution)
    _validate_critical_omissions(
        freeze, resolution, set(_records_by_source_id(primary_patch)) & secondary_ids,
    )
    disagreements = compare_review_patches(primary_patch, secondary_patch)
    sampled = [row for row in disagreements if row["sourceId"] in required_secondary]
    expanded = required_after_escalation(
        freeze, required_secondary, sampled, resolution["criticalOmissions"], source_map,
    )
    _require_exact_secondary_expansion(expanded, secondary_ids)
    return disagreements, expanded


def _candidate_decisions(
    decisions, freeze, primary_patch, secondary_patch, resolution,
    disagreements, expanded,
):
    final_records = _resolve_complete_records(
        freeze, primary_patch, secondary_patch, resolution, disagreements, expanded,
    )
    candidate = _replace_records_preserving_order(decisions, final_records)
    _assert_unreviewed_delta(decisions, candidate, final_records)
    return candidate


def _render_accepted_reports(index, decisions, visuals, ledger, policy, must_keep_inventory, pdf_sha256):
    return {
        "coverage": render_coverage_matrix(
            index, decisions, visuals, ledger, policy,
            must_keep_inventory, pdf_sha256,
        ),
        "visual": render_visual_asset_index(
            index, decisions, visuals, ledger, policy,
            must_keep_inventory,
        ),
    }


def _acceptance_result(
    index, visuals, candidate_decisions, ledger, policy, must_keep_inventory,
    freeze, primary_patch, secondary_patch, resolution, source_map,
    input_fingerprint,
    batch_evidence=None,
):
    accepted_hash = sha256_json(candidate_decisions)
    entry = build_review_ledger_entry(
        freeze, primary_patch, secondary_patch, resolution, source_map,
        candidate_decisions, policy, accepted_hash, input_fingerprint,
    )
    entry["disagreements"] = _disagreement_ledger_rows(resolution["resolutions"])
    _validate_disagreement_ledger_rows(entry["disagreements"])
    candidate_ledger = [*ledger, entry]
    _validate_candidate_state(
        index, visuals, candidate_decisions, candidate_ledger, policy,
        must_keep_inventory,
        {
            **(batch_evidence or {}),
            **_review_batch_evidence(freeze, primary_patch, secondary_patch, resolution),
        },
    )
    reports = _render_accepted_reports(
        index, candidate_decisions, visuals, candidate_ledger, policy,
        must_keep_inventory, freeze["pdfSha256"],
    )
    return {
        "status": "accepted", "decisions": candidate_decisions,
        "ledger": candidate_ledger, **reports,
    }


def integrate_review_batch(
    index, visuals, decisions, ledger, policy, must_keep_inventory, freeze,
    current_evidence_hashes, primary_patch, secondary_patch, resolution,
    batch_evidence=None,
):
    source_map = source_items_by_id(index, visuals)
    input_fingerprint = review_input_fingerprint(freeze, primary_patch, secondary_patch, resolution)
    accepted = _accepted_retry(ledger, freeze["batchId"], input_fingerprint)
    evidence = _review_batch_evidence(freeze, primary_patch, secondary_patch, resolution)
    if accepted is not None:
        _validate_accepted_retry(
            freeze, current_evidence_hashes, index, visuals, decisions, ledger,
            policy, {**(batch_evidence or {}), **evidence},
        )
        return {"status": "already-accepted", "entry": accepted}
    disagreements, expanded = _validate_new_review_inputs(
        freeze, current_evidence_hashes, primary_patch, secondary_patch,
        resolution, source_map, policy,
    )
    candidate_decisions = _candidate_decisions(
        decisions, freeze, primary_patch, secondary_patch, resolution,
        disagreements, expanded,
    )
    return _acceptance_result(
        index, visuals, candidate_decisions, ledger, policy, must_keep_inventory,
        freeze, primary_patch, secondary_patch, resolution, source_map,
        input_fingerprint,
        batch_evidence=batch_evidence,
    )


def _add_common_arguments(parser):
    for name in (
        "freeze", "primary-patch", "secondary-patch", "pdf", "index", "visuals",
        "decisions", "ledger", "policy", "analysis", "course-outline", "image-dir",
        "package-dir",
    ):
        parser.add_argument(f"--{name}", required=True, type=Path)
    parser.add_argument("--review-evidence-root", type=Path)


def _role_paths(args):
    roles = {
        name: Path(getattr(args, name))
        for name in (
            "freeze", "primary_patch", "secondary_patch", "pdf", "index", "visuals",
            "decisions", "ledger", "policy", "analysis", "course_outline", "image_dir",
            "package_dir",
        )
    }
    if hasattr(args, "resolution"):
        roles["resolution"] = Path(args.resolution)
    if getattr(args, "review_evidence_root", None) is not None:
        roles["reviewEvidenceRoot"] = Path(args.review_evidence_root)
    if args.command == "compare":
        roles["disagreementsOutput"] = Path(args.disagreements_output)
        roles["resolutionOutput"] = Path(args.resolution_output)
    if args.command == "apply":
        roles["decisionsInput"] = roles.pop("decisions")
        roles["decisionsOutput"] = Path(args.decisions)
        roles["ledgerInput"] = roles.pop("ledger")
        roles["ledgerOutput"] = Path(args.ledger)
        roles["coverageOutput"] = Path(args.coverage_report)
        roles["visualOutput"] = Path(args.visual_report)
    return roles


def _load_common_inputs(args):
    freeze = load_json(args.freeze)
    index = load_json(args.index)
    visuals = load_json(args.visuals)
    decisions = load_json(args.decisions)
    ledger = load_json(args.ledger)
    policy = load_json(args.policy)
    analysis_sections = parse_markdown_sections(Path(args.analysis), args.analysis)
    outline_sections = parse_markdown_sections(Path(args.course_outline), args.course_outline)
    must_keep_inventory = build_must_keep_inventory(policy, analysis_sections, outline_sections)
    protected_paths = {
        "freeze": args.freeze,
        "primaryPatch": args.primary_patch,
        "secondaryPatch": args.secondary_patch,
        "pdf": args.pdf,
        "index": args.index,
        "visuals": args.visuals,
        "decisions": args.decisions,
        "ledger": args.ledger,
        "policy": args.policy,
        "analysis": args.analysis,
        "courseOutline": args.course_outline,
        "imageDir": args.image_dir,
        "packageDir": args.package_dir,
    }
    existing_batch_evidence = _load_existing_review_batch_evidence(
        ledger,
        getattr(args, "review_evidence_root", None),
        protected_paths,
    )
    current_evidence = build_current_batch_evidence(
        freeze, args.pdf, args.index, args.visuals, args.decisions, args.ledger,
        args.policy, args.analysis, args.course_outline, args.image_dir, args.package_dir,
    )
    context = {
        "index": index, "visuals": visuals, "decisions": decisions,
        "ledger": ledger, "policy": policy, "must_keep_inventory": must_keep_inventory,
        "freeze": freeze, "current_evidence_hashes": current_evidence,
        "primary_patch": load_json(args.primary_patch),
        "secondary_patch": load_json(args.secondary_patch),
        "batch_evidence": existing_batch_evidence,
    }
    if hasattr(args, "resolution"):
        context["resolution"] = load_json(args.resolution)
    return context


def _compare_command(args, context):
    validate_frozen_batch(
        context["freeze"], context["current_evidence_hashes"]
    )
    source_map = source_items_by_id(context["index"], context["visuals"])
    report, template = build_comparison_artifacts(
        context["freeze"], context["primary_patch"], context["secondary_patch"],
        source_map, context["policy"],
    )
    _write_comparison_outputs(args.disagreements_output, args.resolution_output, report, template)
    return {
        "status": "compared", "batchId": context["freeze"]["batchId"],
        "disagreementCount": len(report["disagreements"]),
    }


def _validate_resolution_command(args, context):
    result = integrate_review_batch(**context)
    return {
        "status": "valid", "integrationStatus": result["status"],
        "batchId": context["freeze"]["batchId"],
        "disagreementCount": len(compare_review_patches(context["primary_patch"], context["secondary_patch"])),
        "criticalOmissionCount": len(context["resolution"]["criticalOmissions"]),
    }


def _apply_command(args, context):
    result = integrate_review_batch(**context)
    if result["status"] == "accepted":
        _write_apply_outputs(
            [args.decisions, args.ledger, args.coverage_report, args.visual_report],
            result["decisions"], result["ledger"], result["coverage"], result["visual"],
        )
    else:
        expected = _render_accepted_reports(
            context["index"], context["decisions"], context["visuals"], context["ledger"],
            context["policy"], context["must_keep_inventory"], context["freeze"]["pdfSha256"],
        )
        _validate_retry_reports(args.coverage_report, args.visual_report, expected["coverage"], expected["visual"])
    return {"status": result["status"], "batchId": context["freeze"]["batchId"]}


def _build_parser():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    compare = subparsers.add_parser("compare")
    _add_common_arguments(compare)
    compare.add_argument("--disagreements-output", required=True, type=Path)
    compare.add_argument("--resolution-output", required=True, type=Path)
    validate = subparsers.add_parser("validate-resolution")
    _add_common_arguments(validate)
    validate.add_argument("--resolution", required=True, type=Path)
    validate.add_argument("--json", action="store_true")
    apply = subparsers.add_parser("apply")
    _add_common_arguments(apply)
    apply.add_argument("--resolution", required=True, type=Path)
    apply.add_argument("--coverage-report", required=True, type=Path)
    apply.add_argument("--visual-report", required=True, type=Path)
    return parser


def main(argv=None):
    args = _build_parser().parse_args(argv)
    handlers = {
        "compare": _compare_command,
        "validate-resolution": _validate_resolution_command,
        "apply": _apply_command,
    }
    try:
        _validate_integration_paths(args.command, _role_paths(args))
        context = _load_common_inputs(args)
        result = handlers[args.command](args, context)
        if getattr(args, "json", False):
            print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
