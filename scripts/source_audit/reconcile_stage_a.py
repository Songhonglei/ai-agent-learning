from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

from scripts.source_audit.build_reports import (
    _load_report_case,
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.decisions import validate_editorial_decisions
from scripts.source_audit.models import AuditValidationError, load_json, sha256_file
from scripts.source_audit.must_keep import validate_must_keep_coverage
from scripts.source_audit.review_ledger import (
    build_stage_a_amendment_entry,
    validate_review_ledger,
)
from scripts.source_audit.transactions import sha256_json, write_files_transaction


_UPDATE_FIELDS = {
    "lessonIds",
    "mustKeepIds",
    "riskFlags",
    "reason",
    "visualTextAlternative",
    "visualHandlingNote",
}


def apply_stage_a_amendments(
    decisions,
    ledger,
    *,
    reviewer,
    reviewer_task_id,
    amendments,
):
    if not isinstance(amendments, list) or not amendments:
        raise AuditValidationError("stage-a amendments must be non-empty")
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise AuditValidationError("stage-a reviewer must be non-blank")
    if not isinstance(reviewer_task_id, str) or not reviewer_task_id.strip():
        raise AuditValidationError("stage-a reviewerTaskId must be non-blank")
    if not isinstance(ledger, list) or not ledger:
        raise AuditValidationError("stage-a reconciliation requires a ledger")
    by_id = {
        row["sourceId"]: copy.deepcopy(row)
        for row in decisions
    }
    source_ids = []
    amendment_ids = set()
    for amendment in amendments:
        if not isinstance(amendment, dict) or set(amendment) != {
            "amendmentId", "sourceId", "updates", "reason",
        }:
            raise AuditValidationError("stage-a amendment payload fields mismatch")
        source_id = amendment["sourceId"]
        if source_id not in by_id or source_id in source_ids:
            raise AuditValidationError("duplicate or unknown stage-a amendment source")
        if amendment["amendmentId"] in amendment_ids:
            raise AuditValidationError("duplicate stage-a amendment ID")
        if (
            by_id[source_id].get("reviewState") != "reviewed"
            or not isinstance(amendment["reason"], str)
            or not amendment["reason"].strip()
            or not isinstance(amendment["updates"], dict)
            or not amendment["updates"]
            or not set(amendment["updates"]) <= _UPDATE_FIELDS
        ):
            raise AuditValidationError("invalid stage-a amendment payload")
        source_ids.append(source_id)
        amendment_ids.add(amendment["amendmentId"])
    if source_ids != sorted(source_ids):
        raise AuditValidationError("stage-a amendment sources must be sorted")

    candidate = copy.deepcopy(decisions)
    candidate_positions = {
        row["sourceId"]: position for position, row in enumerate(candidate)
    }
    candidate_ledger = copy.deepcopy(ledger)
    entries = []
    for amendment in amendments:
        source_id = amendment["sourceId"]
        position = candidate_positions[source_id]
        before = copy.deepcopy(candidate[position])
        after = copy.deepcopy(before)
        after.update(copy.deepcopy(amendment["updates"]))
        candidate[position] = after
        entry = build_stage_a_amendment_entry(
            amendment_id=amendment["amendmentId"],
            reviewer=reviewer,
            reviewer_task_id=reviewer_task_id,
            before_record=before,
            after_record=after,
            reason=amendment["reason"],
            base_decisions_sha256=candidate_ledger[-1]["acceptedDecisionsSha256"],
            accepted_decisions_sha256=sha256_json(candidate),
        )
        candidate_ledger.append(entry)
        entries.append(entry)
    return candidate, entries


def _parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--amendment", required=True, type=Path)
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--visuals", required=True, type=Path)
    parser.add_argument("--decisions", required=True, type=Path)
    parser.add_argument("--ledger", required=True, type=Path)
    parser.add_argument("--policy", required=True, type=Path)
    parser.add_argument("--analysis", required=True, type=Path)
    parser.add_argument("--course-outline", required=True, type=Path)
    parser.add_argument("--review-evidence-root", required=True, type=Path)
    parser.add_argument("--coverage-report", required=True, type=Path)
    parser.add_argument("--visual-report", required=True, type=Path)
    return parser


def reconcile_command(args):
    payload = load_json(args.amendment)
    if not isinstance(payload, dict) or set(payload) != {
        "reviewer", "reviewerTaskId", "amendments",
    }:
        raise AuditValidationError("stage-a amendment file fields mismatch")
    report_args = argparse.Namespace(
        pdf=args.pdf,
        index=args.index,
        unnumbered_visuals=args.visuals,
        decisions=args.decisions,
        review_ledger=args.ledger,
        policy=args.policy,
        analysis=args.analysis,
        course_outline=args.course_outline,
        review_evidence_root=args.review_evidence_root,
        coverage_report=args.coverage_report,
        visual_report=args.visual_report,
    )
    case = _load_report_case(report_args)
    candidate, entries = apply_stage_a_amendments(
        case["decisions"],
        case["ledger"],
        reviewer=payload["reviewer"],
        reviewer_task_id=payload["reviewerTaskId"],
        amendments=payload["amendments"],
    )
    candidate_ledger = [*case["ledger"], *entries]
    validate_editorial_decisions(
        case["index"], case["visuals"], candidate, case["policy"],
        require_complete=True,
    )
    validate_must_keep_coverage(
        case["mustKeepInventory"], candidate,
        {item["sourceId"]: item for item in [
            *case["index"]["pages"], *case["index"]["outline"],
            *case["index"]["numberedItems"], *case["visuals"],
        ]},
        case["index"]["outline"], case["policy"], require_complete=False,
    )
    validate_review_ledger(
        case["index"], case["visuals"], candidate, candidate_ledger,
        case["policy"], sha256_json(candidate),
        batch_evidence=case["batchEvidence"],
    )
    pdf_sha256 = sha256_file(args.pdf)
    coverage = render_coverage_matrix(
        case["index"], candidate, case["visuals"], candidate_ledger,
        case["policy"], case["mustKeepInventory"], pdf_sha256,
    )
    visual = render_visual_asset_index(
        case["index"], candidate, case["visuals"], candidate_ledger,
        case["policy"], case["mustKeepInventory"],
    )
    write_files_transaction({
        args.decisions: json.dumps(candidate, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n",
        args.ledger: json.dumps(candidate_ledger, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n",
        args.coverage_report: coverage.encode("utf-8"),
        args.visual_report: visual.encode("utf-8"),
    })
    return {"status": "amended", "amendmentIds": [entry["amendmentId"] for entry in entries]}


def main(argv=None):
    args = _parser().parse_args(argv)
    try:
        print(json.dumps(reconcile_command(args), ensure_ascii=False, sort_keys=True))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
