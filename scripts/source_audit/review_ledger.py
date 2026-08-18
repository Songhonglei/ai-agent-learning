from __future__ import annotations

import copy
import hashlib
import math
import re
import unicodedata

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import derived_risk_flags
from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.review_batches import validate_review_patch
from scripts.source_audit.transactions import sha256_json


MIGRATED_BASELINE_DECISIONS_SHA256 = (
    "c2e59acccb8c77a89103b9e698a5f82d"
    "60ec5803930551e132976484934294ca"
)


GENESIS_FIELDS = {
    "entryType",
    "genesisId",
    "sourceCount",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
DISCOVERY_FIELDS = {
    "entryType",
    "discoveryId",
    "pdfPage",
    "attempt",
    "reviewer",
    "addedVisualIds",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
REVIEW_FIELDS = {
    "entryType",
    "batchId",
    "mode",
    "sourceIds",
    "primaryReviewer",
    "primaryTaskId",
    "secondaryReviewer",
    "secondaryTaskId",
    "doubleReviewedSourceIds",
    "mandatoryReviews",
    "strata",
    "disagreements",
    "resolvedSourceIds",
    "sourceDisagreementRate",
    "escalations",
    "inputFingerprint",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
STAGE_A_AMENDMENT_FIELDS = {
    "entryType",
    "amendmentId",
    "reviewer",
    "reviewerTaskId",
    "sourceId",
    "beforeRecord",
    "afterRecord",
    "reason",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
STRATUM_FIELDS = {
    "key",
    "populationSourceIds",
    "mandatorySourceIds",
    "sampledSourceIds",
    "doubleReviewedSourceIds",
    "disagreementSourceIds",
    "sourceDisagreementRate",
    "expanded",
}


def required_second_review_reasons(item, decision, policy):
    manual_risk_flags = {
        "critical-number",
        "experiment-conclusion",
        "scope-boundary",
    }
    manual = set(decision["riskFlags"]) & manual_risk_flags
    derived = set(derived_risk_flags(item, decision, policy))
    if any(
        must_keep_id.startswith("analysis-high-risk-")
        for must_keep_id in decision["mustKeepIds"]
    ):
        derived.add("analysis-high-risk")
    return sorted(derived | manual)


def required_secondary_source_ids(freeze, primary_patch, source_map, policy):
    primary = {}
    for record in primary_patch["changes"]:
        source_id = record["sourceId"]
        if source_id in primary:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        primary[source_id] = record
    if set(primary) != set(freeze["sourceIds"]):
        raise AuditValidationError(
            "primary patch does not cover frozen sources"
        )
    if freeze["mode"] == "calibration":
        return set(freeze["sourceIds"])
    mandatory = {
        source_id
        for source_id, decision in primary.items()
        if required_second_review_reasons(
            source_map[source_id],
            decision,
            policy,
        )
    }
    strata = {}
    for source_id in sorted(freeze["sourceIds"]):
        item = source_map[source_id]
        chapter = (
            str(item["chapter"])
            if item.get("chapter") is not None
            else "none"
        )
        key = f"chapter-{chapter}|kind-{item['kind']}"
        strata.setdefault(key, []).append(source_id)
    sampled = set()
    for key in sorted(strata):
        eligible = sorted(set(strata[key]) - mandatory)
        count = min(
            len(eligible),
            max(5, math.ceil(len(eligible) * 0.2)),
        )
        sampled.update(
            sorted(
                eligible,
                key=lambda source_id: hashlib.sha256(
                    (
                        freeze["batchId"]
                        + "\0"
                        + source_id
                    ).encode("utf-8")
                ).hexdigest(),
            )[:count]
        )
    return mandatory | sampled


def build_genesis_ledger_entry(decisions_sha256, source_count):
    if re.fullmatch(
        r"[0-9a-f]{64}",
        decisions_sha256,
    ) is None:
        raise AuditValidationError(
            "invalid genesis decisions SHA-256"
        )
    if type(source_count) is not int or source_count < 1:
        raise AuditValidationError(
            "invalid genesis source count"
        )
    return {
        "entryType": "genesis",
        "genesisId": f"editorial-baseline-{source_count}",
        "sourceCount": source_count,
        "baseDecisionsSha256": decisions_sha256,
        "acceptedDecisionsSha256": decisions_sha256,
    }


def build_discovery_ledger_entry(pdf_page, attempt, reviewer, added_visual_ids, base_decisions_sha256, accepted_decisions_sha256):
    if type(pdf_page) is not int or pdf_page < 1:
        raise AuditValidationError(
            "invalid discovery pdfPage"
        )
    if type(attempt) is not int or not 1 <= attempt <= 99:
        raise AuditValidationError(
            "invalid discovery attempt"
        )
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise AuditValidationError(
            "discovery reviewer must be non-blank"
        )
    if added_visual_ids != sorted(set(added_visual_ids)):
        raise AuditValidationError(
            "addedVisualIds must be sorted and unique"
        )
    for field, value in (
        ("baseDecisionsSha256", base_decisions_sha256),
        ("acceptedDecisionsSha256", accepted_decisions_sha256),
    ):
        if re.fullmatch(r"[0-9a-f]{64}", value) is None:
            raise AuditValidationError(f"invalid {field}")
    return {
        "entryType": "discovery",
        "discoveryId": (
            f"discovery-p{pdf_page:03d}-{attempt:02d}"
        ),
        "pdfPage": pdf_page,
        "attempt": attempt,
        "reviewer": reviewer,
        "addedVisualIds": added_visual_ids,
        "baseDecisionsSha256": base_decisions_sha256,
        "acceptedDecisionsSha256": accepted_decisions_sha256,
    }


def _stage_a_amendment_changed_fields(before_record, after_record):
    if (
        not isinstance(before_record, dict)
        or not isinstance(after_record, dict)
        or before_record.get("sourceId") != after_record.get("sourceId")
        or before_record.get("reviewState") != "reviewed"
        or after_record.get("reviewState") != "reviewed"
        or set(before_record) != set(after_record)
    ):
        raise AuditValidationError("invalid stage-a amendment records")
    changed = {
        field
        for field in before_record
        if before_record[field] != after_record[field]
    }
    allowed = {
        "lessonIds",
        "mustKeepIds",
        "riskFlags",
        "reason",
        "visualTextAlternative",
        "visualHandlingNote",
    }
    if not changed or not changed <= allowed:
        raise AuditValidationError("invalid stage-a amendment fields")
    return changed


def _validate_stage_a_amendment_entry(entry, decisions_by_id):
    if set(entry) != STAGE_A_AMENDMENT_FIELDS:
        raise AuditValidationError("stage-a amendment fields mismatch")
    if (
        entry["entryType"] != "stage-a-amendment"
        or re.fullmatch(r"stage-a-[a-z0-9][a-z0-9._-]{2,63}", entry["amendmentId"]) is None
        or not isinstance(entry["reviewer"], str)
        or not entry["reviewer"].strip()
        or not isinstance(entry["reviewerTaskId"], str)
        or not entry["reviewerTaskId"].strip()
        or not isinstance(entry["reason"], str)
        or not entry["reason"].strip()
    ):
        raise AuditValidationError("invalid stage-a amendment identity")
    source_id = entry["sourceId"]
    before_record = entry["beforeRecord"]
    after_record = entry["afterRecord"]
    if source_id != before_record.get("sourceId") or source_id != after_record.get("sourceId"):
        raise AuditValidationError("stage-a amendment source mismatch")
    _stage_a_amendment_changed_fields(before_record, after_record)
    if decisions_by_id.get(source_id) != after_record:
        raise AuditValidationError("stage-a amendment accepted decision mismatch")
    for field in ("baseDecisionsSha256", "acceptedDecisionsSha256"):
        if re.fullmatch(r"[0-9a-f]{64}", entry[field]) is None:
            raise AuditValidationError(f"invalid {field}")


def build_stage_a_amendment_entry(
    amendment_id,
    reviewer,
    reviewer_task_id,
    before_record,
    after_record,
    reason,
    base_decisions_sha256,
    accepted_decisions_sha256,
):
    entry = {
        "entryType": "stage-a-amendment",
        "amendmentId": amendment_id,
        "reviewer": reviewer,
        "reviewerTaskId": reviewer_task_id,
        "sourceId": after_record.get("sourceId") if isinstance(after_record, dict) else None,
        "beforeRecord": before_record,
        "afterRecord": after_record,
        "reason": reason,
        "baseDecisionsSha256": base_decisions_sha256,
        "acceptedDecisionsSha256": accepted_decisions_sha256,
    }
    _validate_stage_a_amendment_entry(
        entry,
        {entry["sourceId"]: after_record},
    )
    return entry


def required_after_escalation(freeze, required_secondary_ids, disagreements, critical_omissions, source_map):
    required = set(required_secondary_ids)
    disagreement_ids = {
        item["sourceId"] for item in disagreements
    }
    critical_ids = {
        item["sourceId"] for item in critical_omissions
    }
    strata = {}
    for source_id in sorted(freeze["sourceIds"]):
        item = source_map[source_id]
        chapter = (
            str(item["chapter"])
            if item.get("chapter") is not None
            else "none"
        )
        key = f"chapter-{chapter}|kind-{item['kind']}"
        strata.setdefault(key, []).append(source_id)
    for key in sorted(strata):
        population = strata[key]
        population_set = set(population)
        reviewed = population_set & set(
            required_secondary_ids
        )
        rate = (
            len(disagreement_ids & reviewed) / len(reviewed)
            if reviewed
            else 0.0
        )
        if critical_ids & population_set or rate > 0.02:
            required.update(population)
    return required


def _records_by_source_id(records, label):
    by_id = {}
    for record in records:
        source_id = record["sourceId"]
        if source_id in by_id:
            raise AuditValidationError(
                f"duplicate {label} sourceId: {source_id}"
            )
        by_id[source_id] = record
    return by_id


def _resolved_disagreements(
    primary_records,
    secondary_records,
    resolution_rows,
):
    primary = _records_by_source_id(primary_records, "primary")
    secondary = _records_by_source_id(
        secondary_records,
        "secondary",
    )
    raw = []
    for source_id in sorted(primary.keys() & secondary.keys()):
        fields = sorted(
            field
            for field in set(primary[source_id]) | set(secondary[source_id])
            if primary[source_id].get(field)
            != secondary[source_id].get(field)
        )
        if fields:
            raw.append({
                "sourceId": source_id,
                "fields": fields,
            })
    resolution_by_id = _records_by_source_id(
        resolution_rows,
        "resolution",
    )
    disagreement_ids = {
        item["sourceId"] for item in raw
    }
    if set(resolution_by_id) != disagreement_ids:
        raise AuditValidationError(
            "resolution set does not match disagreements"
        )
    durable = []
    for disagreement in raw:
        source_id = disagreement["sourceId"]
        note = resolution_by_id[source_id]["resolutionNote"]
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError(
                "resolutionNote must be non-blank"
            )
        durable.append({
            **disagreement,
            "resolutionNote": note,
        })
    return secondary, raw, durable, disagreement_ids


def _mandatory_review_rows(
    source_ids,
    source_map,
    decisions_by_id,
    policy,
):
    rows = []
    mandatory_ids = set()
    for source_id in source_ids:
        reasons = required_second_review_reasons(
            source_map[source_id],
            decisions_by_id[source_id],
            policy,
        )
        if reasons:
            mandatory_ids.add(source_id)
            rows.append({
                "sourceId": source_id,
                "reasons": reasons,
            })
    return rows, mandatory_ids


def _review_populations(source_ids, source_map):
    populations = {}
    for source_id in sorted(source_ids):
        item = source_map[source_id]
        chapter = (
            str(item["chapter"])
            if item.get("chapter") is not None
            else "none"
        )
        key = f"chapter-{chapter}|kind-{item['kind']}"
        populations.setdefault(key, []).append(source_id)
    return populations


def _review_stratum_summary(
    key,
    population,
    initial_required,
    double_reviewed,
    mandatory_ids,
    disagreement_ids,
    critical_ids,
):
    population_set = set(population)
    initial = population_set & initial_required
    disagreements = sorted(
        disagreement_ids
        & set(double_reviewed)
        & population_set
    )
    trigger_rate = (
        len(disagreement_ids & initial) / len(initial)
        if initial
        else 0.0
    )
    reasons = []
    if critical_ids & population_set:
        reasons.append("critical-omission")
    if trigger_rate > 0.02:
        reasons.append("disagreement-rate-over-0.02")
    final_reviewed = set(double_reviewed) & population_set
    final_rate = (
        len(disagreements) / len(final_reviewed)
        if final_reviewed
        else 0.0
    )
    row = {
        "key": key,
        "populationSourceIds": population,
        "mandatorySourceIds": sorted(
            mandatory_ids & population_set
        ),
        "sampledSourceIds": sorted(
            (initial_required - mandatory_ids) & population_set
        ),
        "doubleReviewedSourceIds": sorted(final_reviewed),
        "disagreementSourceIds": disagreements,
        "sourceDisagreementRate": final_rate,
        "expanded": bool(reasons),
    }
    escalation = None
    if reasons:
        escalation = {
            "stratumKey": key,
            "reasons": reasons,
            "expandedSourceIds": population,
        }
    return row, escalation


def _review_strata_and_escalations(
    populations,
    initial_required,
    double_reviewed,
    mandatory_ids,
    disagreement_ids,
    critical_ids,
):
    strata = []
    escalations = []
    for key in sorted(populations):
        row, escalation = _review_stratum_summary(
            key,
            populations[key],
            initial_required,
            double_reviewed,
            mandatory_ids,
            disagreement_ids,
            critical_ids,
        )
        strata.append(row)
        if escalation is not None:
            escalations.append(escalation)
    return strata, escalations


def _review_ledger_entry_payload(
    freeze,
    primary_patch,
    secondary_patch,
    double_reviewed,
    mandatory_reviews,
    strata,
    durable_disagreements,
    disagreement_ids,
    overall_rate,
    escalations,
    input_fingerprint,
    accepted_decisions_sha256,
):
    return {
        "entryType": "review",
        "batchId": freeze["batchId"],
        "mode": freeze["mode"],
        "sourceIds": freeze["sourceIds"],
        "primaryReviewer": primary_patch["reviewer"],
        "primaryTaskId": primary_patch["reviewerTaskId"],
        "secondaryReviewer": secondary_patch["reviewer"],
        "secondaryTaskId": secondary_patch["reviewerTaskId"],
        "doubleReviewedSourceIds": double_reviewed,
        "mandatoryReviews": mandatory_reviews,
        "strata": strata,
        "disagreements": durable_disagreements,
        "resolvedSourceIds": sorted(disagreement_ids),
        "sourceDisagreementRate": overall_rate,
        "escalations": escalations,
        "inputFingerprint": input_fingerprint,
        "baseDecisionsSha256": freeze["baseDecisionsSha256"],
        "acceptedDecisionsSha256": accepted_decisions_sha256,
    }


def _validated_candidate_decisions(freeze, candidate_decisions):
    by_id = _records_by_source_id(
        candidate_decisions,
        "candidate",
    )
    if not set(freeze["sourceIds"]) <= set(by_id):
        raise AuditValidationError(
            "candidate decisions omit frozen source IDs"
        )
    return by_id


def _validate_review_entry_hashes(
    accepted_decisions_sha256,
    input_fingerprint,
):
    for field, value in (
        ("inputFingerprint", input_fingerprint),
        ("acceptedDecisionsSha256", accepted_decisions_sha256),
    ):
        if re.fullmatch(r"[0-9a-f]{64}", value) is None:
            raise AuditValidationError(f"invalid {field}")


def build_review_ledger_entry(
    freeze,
    primary_patch,
    secondary_patch,
    resolutions,
    source_map,
    candidate_decisions,
    policy,
    accepted_decisions_sha256,
    input_fingerprint,
):
    candidate_by_id = _validated_candidate_decisions(
        freeze,
        candidate_decisions,
    )
    secondary, raw, durable, disagreement_ids = (
        _resolved_disagreements(
            primary_patch["changes"],
            secondary_patch["changes"],
            resolutions["resolutions"],
        )
    )
    double_reviewed = sorted(secondary)
    initial_required = required_secondary_source_ids(
        freeze,
        primary_patch,
        source_map,
        policy,
    )
    mandatory_reviews, mandatory_ids = _mandatory_review_rows(
        freeze["sourceIds"],
        source_map,
        candidate_by_id,
        policy,
    )
    critical_ids = {
        row["sourceId"] for row in resolutions["criticalOmissions"]
    }
    strata, escalations = _review_strata_and_escalations(
        _review_populations(freeze["sourceIds"], source_map),
        initial_required,
        double_reviewed,
        mandatory_ids,
        disagreement_ids,
        critical_ids,
    )
    required_final = required_after_escalation(
        freeze,
        initial_required,
        raw,
        resolutions["criticalOmissions"],
        source_map,
    )
    if set(double_reviewed) != required_final:
        raise AuditValidationError(
            "secondary patch does not match final review requirement"
        )
    _validate_review_entry_hashes(
        accepted_decisions_sha256,
        input_fingerprint,
    )
    overall_rate = (
        len(disagreement_ids) / len(double_reviewed)
        if double_reviewed
        else 0.0
    )
    return _review_ledger_entry_payload(
        freeze,
        primary_patch,
        secondary_patch,
        double_reviewed,
        mandatory_reviews,
        strata,
        durable,
        disagreement_ids,
        overall_rate,
        escalations,
        input_fingerprint,
        accepted_decisions_sha256,
    )


def _validate_ledger_genesis(genesis):
    if set(genesis) != GENESIS_FIELDS:
        raise AuditValidationError(
            "genesis fields mismatch"
        )
    if (
        genesis["entryType"] != "genesis"
        or genesis["genesisId"] != "editorial-baseline-834"
        or genesis["sourceCount"] != 834
        or genesis["baseDecisionsSha256"]
        != MIGRATED_BASELINE_DECISIONS_SHA256
        or genesis["acceptedDecisionsSha256"]
        != MIGRATED_BASELINE_DECISIONS_SHA256
    ):
        raise AuditValidationError(
            "genesis baseline mismatch"
        )
    accepted = genesis["acceptedDecisionsSha256"]
    if re.fullmatch(r"[0-9a-f]{64}", accepted) is None:
        raise AuditValidationError(
            "invalid genesis acceptedDecisionsSha256"
        )
    return accepted


def _validate_discovery_ledger_entry(
    entry,
    source_map,
    attempts,
    discovered_visual_ids,
):
    if set(entry) != DISCOVERY_FIELDS:
        raise AuditValidationError(
            "discovery ledger fields mismatch"
        )
    pdf_page = entry["pdfPage"]
    attempt = entry["attempt"]
    expected_attempt = attempts.get(pdf_page, 0) + 1
    if attempt != expected_attempt:
        raise AuditValidationError(
            f"discovery attempt gap on page {pdf_page}"
        )
    attempts[pdf_page] = attempt
    expected_id = f"discovery-p{pdf_page:03d}-{attempt:02d}"
    if entry["discoveryId"] != expected_id:
        raise AuditValidationError("discoveryId mismatch")
    if (
        not isinstance(entry["reviewer"], str)
        or not entry["reviewer"].strip()
    ):
        raise AuditValidationError(
            "discovery reviewer must be non-blank"
        )
    added = entry["addedVisualIds"]
    if added != sorted(set(added)):
        raise AuditValidationError(
            "addedVisualIds must be sorted unique"
        )
    for source_id in added:
        if (
            source_id in discovered_visual_ids
            or source_id not in source_map
            or source_map[source_id]["kind"] != "visual"
            or source_map[source_id]["pdfPage"] != pdf_page
        ):
            raise AuditValidationError(
                f"invalid discovered visual: {source_id}"
            )
        discovered_visual_ids.add(source_id)


def _validate_reviewer_identity(entry):
    identity_fields = (
        "primaryReviewer",
        "primaryTaskId",
        "secondaryReviewer",
        "secondaryTaskId",
    )
    for field in identity_fields:
        if not isinstance(entry[field], str) or not entry[field].strip():
            raise AuditValidationError(f"{field} must be non-blank")
    normalized = {
        field: unicodedata.normalize("NFKC", entry[field])
        .strip()
        .casefold()
        for field in identity_fields
    }
    if (
        normalized["primaryReviewer"]
        == normalized["secondaryReviewer"]
        or normalized["primaryTaskId"]
        == normalized["secondaryTaskId"]
    ):
        raise AuditValidationError(
            "double review requires distinct reviewers and tasks"
        )


def _validate_review_source_ids(
    entry,
    source_map,
    decisions_by_id,
    reviewed_source_ids,
):
    source_ids = entry["sourceIds"]
    double_reviewed = entry["doubleReviewedSourceIds"]
    for name, values in (
        ("sourceIds", source_ids),
        ("doubleReviewedSourceIds", double_reviewed),
    ):
        if values != sorted(set(values)):
            raise AuditValidationError(f"{name} must be sorted unique")
    if not set(double_reviewed) <= set(source_ids):
        raise AuditValidationError(
            "double-reviewed IDs are outside review batch"
        )
    if entry["mode"] == "calibration" and double_reviewed != source_ids:
        raise AuditValidationError(
            "calibration must be 100% double reviewed"
        )
    overlap = reviewed_source_ids & set(source_ids)
    if overlap:
        raise AuditValidationError(
            "source reviewed by multiple batches: " + str(sorted(overlap))
        )
    for source_id in source_ids:
        if source_id not in source_map:
            raise AuditValidationError(
                "review source is outside catalog: " + source_id
            )
        if decisions_by_id[source_id]["reviewState"] != "reviewed":
            raise AuditValidationError(
                "ledgered source is not reviewed: " + source_id
            )
    return source_ids, double_reviewed


def _validate_review_entry_identity(
    entry,
    source_map,
    decisions_by_id,
    batch_ids,
    reviewed_source_ids,
):
    if set(entry) != REVIEW_FIELDS:
        raise AuditValidationError("review ledger fields mismatch")
    batch_id = entry["batchId"]
    if re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,63}", batch_id) is None:
        raise AuditValidationError("invalid review batchId")
    if batch_id in batch_ids:
        raise AuditValidationError(
            f"duplicate reviewed batchId: {batch_id}"
        )
    if entry["mode"] not in {"calibration", "normal"}:
        raise AuditValidationError("invalid review mode")
    _validate_reviewer_identity(entry)
    source_ids, double_reviewed = _validate_review_source_ids(
        entry,
        source_map,
        decisions_by_id,
        reviewed_source_ids,
    )
    batch_ids.add(batch_id)
    return source_ids, double_reviewed


def _expected_initial_secondary(
    entry,
    source_map,
    decisions_by_id,
    policy,
):
    source_ids = entry["sourceIds"]
    mandatory_reviews, mandatory_ids = _mandatory_review_rows(
        source_ids,
        source_map,
        decisions_by_id,
        policy,
    )
    populations = _review_populations(source_ids, source_map)
    if entry["mode"] == "calibration":
        return (
            mandatory_reviews,
            mandatory_ids,
            populations,
            set(source_ids),
        )
    initial_secondary = set(mandatory_ids)
    for key in sorted(populations):
        eligible = sorted(
            set(populations[key]) - mandatory_ids
        )
        count = min(
            len(eligible),
            max(5, math.ceil(len(eligible) * 0.2)),
        )
        ranked = sorted(
            eligible,
            key=lambda source_id: hashlib.sha256(
                (
                    entry["batchId"]
                    + "\0"
                    + source_id
                ).encode("utf-8")
            ).hexdigest(),
        )
        initial_secondary.update(ranked[:count])
    return (
        mandatory_reviews,
        mandatory_ids,
        populations,
        initial_secondary,
    )


def _validated_disagreement_ids(entry, double_reviewed):
    by_id = {}
    for row in entry["disagreements"]:
        if set(row) != {
            "sourceId",
            "fields",
            "resolutionNote",
        }:
            raise AuditValidationError(
                "ledger disagreement fields mismatch"
            )
        source_id = row["sourceId"]
        if source_id in by_id:
            raise AuditValidationError(
                "duplicate ledger disagreement: " + source_id
            )
        if source_id not in set(double_reviewed):
            raise AuditValidationError(
                "disagreement source was not double reviewed"
            )
        if (
            row["fields"] != sorted(set(row["fields"]))
            or not row["fields"]
        ):
            raise AuditValidationError(
                "invalid disagreement fields: " + source_id
            )
        if (
            not isinstance(row["resolutionNote"], str)
            or not row["resolutionNote"].strip()
        ):
            raise AuditValidationError(
                "blank resolutionNote: " + source_id
            )
        by_id[source_id] = row
    disagreement_ids = set(by_id)
    if entry["resolvedSourceIds"] != sorted(disagreement_ids):
        raise AuditValidationError(
            "resolvedSourceIds mismatch"
        )
    expected_rate = (
        len(disagreement_ids) / len(double_reviewed)
        if double_reviewed
        else 0.0
    )
    if entry["sourceDisagreementRate"] != expected_rate:
        raise AuditValidationError(
            "sourceDisagreementRate mismatch"
        )
    return disagreement_ids


def _validated_escalations(entry, populations):
    by_key = {}
    for row in entry["escalations"]:
        if set(row) != {
            "stratumKey",
            "reasons",
            "expandedSourceIds",
        }:
            raise AuditValidationError(
                "escalation fields mismatch"
            )
        key = row["stratumKey"]
        if key in by_key or key not in populations:
            raise AuditValidationError(
                f"invalid escalation stratum: {key}"
            )
        reasons = row["reasons"]
        if (
            reasons != sorted(set(reasons))
            or not reasons
            or not set(reasons) <= {
                "critical-omission",
                "disagreement-rate-over-0.02",
            }
        ):
            raise AuditValidationError(
                f"invalid escalation reasons: {key}"
            )
        if row["expandedSourceIds"] != populations[key]:
            raise AuditValidationError(
                f"escalation expansion mismatch: {key}"
            )
        by_key[key] = row
    return by_key


def _expected_validated_stratum(
    key,
    population,
    mandatory_ids,
    initial_secondary,
    disagreement_ids,
    double_reviewed,
    escalation,
):
    population_set = set(population)
    initial = population_set & initial_secondary
    disagreements = sorted(
        disagreement_ids & population_set
    )
    trigger_rate = (
        len(set(disagreements) & initial) / len(initial)
        if initial
        else 0.0
    )
    disagreement_reason = "disagreement-rate-over-0.02"
    if trigger_rate > 0.02 and (
        escalation is None
        or disagreement_reason not in escalation["reasons"]
    ):
        raise AuditValidationError(
            "missing disagreement escalation: " + key
        )
    if (
        escalation is not None
        and disagreement_reason in escalation["reasons"]
        and trigger_rate <= 0.02
    ):
        raise AuditValidationError(
            "spurious disagreement escalation: " + key
        )
    final_reviewed = set(double_reviewed) & population_set
    final_rate = (
        len(disagreements) / len(final_reviewed)
        if final_reviewed
        else 0.0
    )
    return {
        "key": key,
        "populationSourceIds": population,
        "mandatorySourceIds": sorted(
            mandatory_ids & population_set
        ),
        "sampledSourceIds": sorted(
            (initial_secondary - mandatory_ids) & population_set
        ),
        "doubleReviewedSourceIds": sorted(final_reviewed),
        "disagreementSourceIds": disagreements,
        "sourceDisagreementRate": final_rate,
        "expanded": escalation is not None,
    }


def _validate_review_strata(
    entry,
    populations,
    mandatory_ids,
    initial_secondary,
    disagreement_ids,
    escalations,
):
    strata = {}
    for row in entry["strata"]:
        if set(row) != STRATUM_FIELDS:
            raise AuditValidationError(
                "stratum fields mismatch"
            )
        key = row["key"]
        if key in strata:
            raise AuditValidationError(
                f"duplicate stratum: {key}"
            )
        strata[key] = row
    if set(strata) != set(populations):
        raise AuditValidationError(
            "strata coverage mismatch"
        )
    double_reviewed = entry["doubleReviewedSourceIds"]
    expected_double = set(initial_secondary)
    for key in sorted(populations):
        escalation = escalations.get(key)
        expected = _expected_validated_stratum(
            key,
            populations[key],
            mandatory_ids,
            initial_secondary,
            disagreement_ids,
            double_reviewed,
            escalation,
        )
        if strata[key] != expected:
            raise AuditValidationError(
                f"stratum mismatch: {key}"
            )
        if escalation is not None:
            expected_double.update(populations[key])
    if set(double_reviewed) != expected_double:
        raise AuditValidationError(
            "double review does not match sample and escalation"
        )


def _validate_review_ledger_entry(
    entry,
    source_map,
    decisions_by_id,
    policy,
    batch_ids,
    reviewed_source_ids,
):
    source_ids, double_reviewed = (
        _validate_review_entry_identity(
            entry,
            source_map,
            decisions_by_id,
            batch_ids,
            reviewed_source_ids,
        )
    )
    (
        mandatory_reviews,
        mandatory_ids,
        populations,
        initial_secondary,
    ) = _expected_initial_secondary(
        entry,
        source_map,
        decisions_by_id,
        policy,
    )
    if entry["mandatoryReviews"] != mandatory_reviews:
        raise AuditValidationError(
            "mandatoryReviews mismatch"
        )
    disagreement_ids = _validated_disagreement_ids(
        entry,
        double_reviewed,
    )
    escalations = _validated_escalations(
        entry,
        populations,
    )
    _validate_review_strata(
        entry,
        populations,
        mandatory_ids,
        initial_secondary,
        disagreement_ids,
        escalations,
    )
    for field in (
        "inputFingerprint",
        "baseDecisionsSha256",
        "acceptedDecisionsSha256",
    ):
        if re.fullmatch(
            r"[0-9a-f]{64}",
            entry[field],
        ) is None:
            raise AuditValidationError(
                f"invalid {field}"
            )
    reviewed_source_ids.update(source_ids)


def _validated_resolution_evidence(
    freeze,
    primary_patch,
    secondary_patch,
    resolutions,
    decisions_by_id,
):
    if not isinstance(resolutions, dict) or set(resolutions) != {
        "batchId",
        "resolutions",
        "criticalOmissions",
    }:
        raise AuditValidationError(
            "trusted batch evidence resolution fields mismatch"
        )
    if resolutions["batchId"] != freeze["batchId"]:
        raise AuditValidationError(
            "trusted batch evidence resolution batchId mismatch"
        )
    primary = _records_by_source_id(
        primary_patch["changes"],
        "trusted primary patch",
    )
    secondary = _records_by_source_id(
        secondary_patch["changes"],
        "trusted secondary patch",
    )
    disagreements = {}
    for source_id in sorted(primary.keys() & secondary.keys()):
        fields = sorted(
            field
            for field in set(primary[source_id]) | set(secondary[source_id])
            if primary[source_id].get(field)
            != secondary[source_id].get(field)
        )
        if fields:
            disagreements[source_id] = fields

    resolution_by_id = {}
    for row in resolutions["resolutions"]:
        if not isinstance(row, dict) or set(row) != {
            "sourceId",
            "fields",
            "finalRecord",
            "resolutionNote",
        }:
            raise AuditValidationError(
                "trusted batch evidence resolution row fields mismatch"
            )
        source_id = row["sourceId"]
        if source_id in resolution_by_id:
            raise AuditValidationError(
                "duplicate trusted batch evidence resolution"
            )
        if row["fields"] != disagreements.get(source_id):
            raise AuditValidationError(
                "trusted batch evidence disagreement fields mismatch"
            )
        if (
            not isinstance(row["resolutionNote"], str)
            or not row["resolutionNote"].strip()
        ):
            raise AuditValidationError(
                "trusted batch evidence resolutionNote must be non-blank"
            )
        final_record = row["finalRecord"]
        if (
            not isinstance(final_record, dict)
            or final_record.get("sourceId") != source_id
            or final_record != decisions_by_id.get(source_id)
        ):
            raise AuditValidationError(
                "trusted batch evidence finalRecord mismatch"
            )
        for field in set(primary[source_id]) - set(row["fields"]):
            if final_record.get(field) != primary[source_id].get(field):
                raise AuditValidationError(
                    "trusted batch evidence changes an agreed field"
                )
        resolution_by_id[source_id] = row
    if set(resolution_by_id) != set(disagreements):
        raise AuditValidationError(
            "trusted batch evidence resolution set mismatch"
        )

    critical_ids = set()
    for row in resolutions["criticalOmissions"]:
        if not isinstance(row, dict) or set(row) != {
            "sourceId",
            "note",
        }:
            raise AuditValidationError(
                "trusted batch evidence critical omission fields mismatch"
            )
        source_id = row["sourceId"]
        if (
            source_id in critical_ids
            or source_id not in secondary
            or not isinstance(row["note"], str)
            or not row["note"].strip()
        ):
            raise AuditValidationError(
                "invalid trusted batch evidence critical omission"
            )
        critical_ids.add(source_id)

    for source_id in freeze["sourceIds"]:
        if source_id not in resolution_by_id and (
            primary[source_id] != decisions_by_id[source_id]
        ):
            raise AuditValidationError(
                "trusted batch evidence accepted decision mismatch"
            )


def _review_input_fingerprint(
    freeze,
    primary_patch,
    secondary_patch,
    resolutions,
):
    return sha256_json({
        "freezeSha256": freeze["freezeSha256"],
        "primaryPatchSha256": sha256_json(primary_patch),
        "secondaryPatchSha256": sha256_json(secondary_patch),
        "resolutionSha256": sha256_json(resolutions),
    })


def _validate_review_against_batch_evidence(
    entry,
    evidence,
    ledger_prefix,
    source_map,
    decisions,
    decisions_by_id,
    policy,
):
    if not isinstance(evidence, dict) or set(evidence) != {
        "freeze",
        "primaryPatch",
        "secondaryPatch",
        "resolutions",
    }:
        raise AuditValidationError(
            "review entry requires trusted batch evidence"
        )
    freeze = evidence["freeze"]
    primary_patch = evidence["primaryPatch"]
    secondary_patch = evidence["secondaryPatch"]
    resolutions = evidence["resolutions"]
    if not all(
        isinstance(value, dict)
        for value in (
            freeze,
            primary_patch,
            secondary_patch,
            resolutions,
        )
    ):
        raise AuditValidationError(
            "trusted batch evidence artifacts must be objects"
        )
    if (
        freeze.get("batchId") != entry["batchId"]
        or freeze.get("baseLedgerSha256") != sha256_json(ledger_prefix)
        or freeze.get("baseDecisionsSha256")
        != entry["baseDecisionsSha256"]
        or not isinstance(freeze.get("catalogSourceIds"), list)
        or not set(freeze["catalogSourceIds"]) <= set(source_map)
    ):
        raise AuditValidationError(
            "review ledger does not match trusted batch evidence"
        )
    validate_review_patch(
        freeze,
        primary_patch,
        source_map,
        set(freeze["sourceIds"]),
        policy,
    )
    secondary_ids = {
        item["sourceId"] for item in secondary_patch["changes"]
    }
    validate_review_patch(
        freeze,
        secondary_patch,
        source_map,
        secondary_ids,
        policy,
    )
    _validated_resolution_evidence(
        freeze,
        primary_patch,
        secondary_patch,
        resolutions,
        decisions_by_id,
    )
    input_fingerprint = _review_input_fingerprint(
        freeze,
        primary_patch,
        secondary_patch,
        resolutions,
    )
    expected = build_review_ledger_entry(
        freeze,
        primary_patch,
        secondary_patch,
        resolutions,
        source_map,
        decisions,
        policy,
        entry["acceptedDecisionsSha256"],
        input_fingerprint,
    )
    if entry != expected:
        raise AuditValidationError(
            "review ledger does not match trusted batch evidence"
        )


def _historical_decisions_before_stage_a_amendments(ledger, decisions):
    amendment_positions = [
        position
        for position, entry in enumerate(ledger)
        if entry.get("entryType") == "stage-a-amendment"
    ]
    if not amendment_positions:
        return copy.deepcopy(decisions)
    first = amendment_positions[0]
    if any(entry.get("entryType") != "stage-a-amendment" for entry in ledger[first:]):
        raise AuditValidationError("stage-a amendments must be ledger tail entries")
    historical = copy.deepcopy(decisions)
    positions = {
        decision["sourceId"]: position
        for position, decision in enumerate(historical)
    }
    seen_amendments = set()
    seen_sources = set()
    for entry in reversed(ledger[first:]):
        source_id = entry.get("sourceId")
        if entry.get("amendmentId") in seen_amendments or source_id in seen_sources:
            raise AuditValidationError("duplicate stage-a amendment")
        _validate_stage_a_amendment_entry(
            entry,
            {row["sourceId"]: row for row in historical},
        )
        if entry["acceptedDecisionsSha256"] != sha256_json(historical):
            raise AuditValidationError("stage-a amendment accepted hash mismatch")
        historical[positions[source_id]] = copy.deepcopy(entry["beforeRecord"])
        if entry["baseDecisionsSha256"] != sha256_json(historical):
            raise AuditValidationError("stage-a amendment base hash mismatch")
        seen_amendments.add(entry["amendmentId"])
        seen_sources.add(source_id)
    return historical


def validate_review_ledger(
    index,
    visuals,
    decisions,
    ledger,
    policy,
    current_decisions_sha256,
    require_complete=False,
    batch_evidence=None,
):
    actual_current_decisions_sha256 = sha256_json(decisions)
    if current_decisions_sha256 != actual_current_decisions_sha256:
        raise AuditValidationError(
            "current decisions SHA-256 mismatch"
        )
    source_map = source_items_by_id(index, visuals)
    decisions_by_id = _records_by_source_id(
        decisions,
        "decision",
    )
    if set(decisions_by_id) != set(source_map):
        raise AuditValidationError(
            "ledger validation requires complete decisions"
        )
    if not isinstance(ledger, list) or not ledger:
        raise AuditValidationError(
            "review ledger must be non-empty"
        )
    if batch_evidence is None:
        batch_evidence = {}
    if not isinstance(batch_evidence, dict):
        raise AuditValidationError(
            "batch_evidence must be a mapping"
        )
    historical_decisions = _historical_decisions_before_stage_a_amendments(
        ledger,
        decisions,
    )
    historical_decisions_by_id = _records_by_source_id(
        historical_decisions,
        "historical decision",
    )
    previous_hash = _validate_ledger_genesis(ledger[0])
    attempts = {}
    discovered_visual_ids = set()
    reviewed_source_ids = set()
    batch_ids = set()
    used_batch_evidence = set()
    for position, entry in enumerate(ledger[1:], start=1):
        if entry.get("baseDecisionsSha256") != previous_hash:
            raise AuditValidationError(
                "ledger hash chain is broken"
            )
        entry_type = entry.get("entryType")
        if entry_type == "discovery":
            _validate_discovery_ledger_entry(
                entry,
                source_map,
                attempts,
                discovered_visual_ids,
            )
        elif entry_type == "review":
            _validate_review_ledger_entry(
                entry,
                source_map,
                historical_decisions_by_id,
                policy,
                batch_ids,
                reviewed_source_ids,
            )
            batch_id = entry.get("batchId")
            evidence = batch_evidence.get(batch_id)
            if evidence is None:
                raise AuditValidationError(
                    "review entry requires trusted batch evidence"
                )
            _validate_review_against_batch_evidence(
                entry,
                evidence,
                ledger[:position],
                source_map,
                historical_decisions,
                historical_decisions_by_id,
                policy,
            )
            used_batch_evidence.add(batch_id)
        elif entry_type == "stage-a-amendment":
            pass
        else:
            raise AuditValidationError(
                f"unknown ledger entryType: {entry_type}"
            )
        accepted = entry["acceptedDecisionsSha256"]
        if re.fullmatch(r"[0-9a-f]{64}", accepted) is None:
            raise AuditValidationError(
                "invalid acceptedDecisionsSha256"
            )
        previous_hash = accepted
    if used_batch_evidence != set(batch_evidence):
        raise AuditValidationError(
            "unused trusted batch evidence"
        )
    if previous_hash != actual_current_decisions_sha256:
        raise AuditValidationError(
            "ledger tail does not match current decisions"
        )
    expected_visual_ids = {
        item["sourceId"] for item in visuals
    }
    if discovered_visual_ids != expected_visual_ids:
        raise AuditValidationError(
            "discovery ledger does not exactly cover visual catalog"
        )
    if require_complete and reviewed_source_ids != set(source_map):
        raise AuditValidationError(
            "complete ledger does not cover every source"
        )
