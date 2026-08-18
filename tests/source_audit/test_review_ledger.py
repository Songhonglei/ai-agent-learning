import copy
import hashlib
import unittest
from pathlib import Path

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import upgrade_editorial_decisions
from scripts.source_audit.models import AuditValidationError, load_json
from scripts.source_audit.review_ledger import (
    _validate_stage_a_amendment_entry,
    _validate_discovery_ledger_entry,
    _validate_ledger_genesis,
    _validate_review_entry_identity,
    _validate_review_ledger_entry,
    _validate_review_strata,
    _validated_disagreement_ids,
    build_discovery_ledger_entry,
    build_stage_a_amendment_entry,
    build_genesis_ledger_entry,
    build_review_ledger_entry,
    required_after_escalation,
    required_secondary_source_ids,
    required_second_review_reasons,
    validate_review_ledger,
)
from scripts.source_audit.transactions import sha256_json
from tests.source_audit.editorial_fixtures import (
    frozen_batch,
    sample_complete_ledger,
    sample_decisions,
    sample_integration_case,
    sample_page20_index,
    sample_policy,
    sample_review_entry,
    sample_review_patch,
    sample_review_record,
    sample_sampling_source_map,
    sample_source_item,
    sample_visual,
)


_MIGRATED_BASELINE_SHA256 = (
    "c2e59acccb8c77a89103b9e698a5f82d"
    "60ec5803930551e132976484934294ca"
)


def _migrated_baseline_case():
    index = load_json(
        Path("reference/source-audit/source-index.json")
    )
    legacy = load_json(
        Path("reference/source-audit/coverage-decisions.json")
    )
    visuals = load_json(
        Path("reference/source-audit/unnumbered-visuals.json")
    )
    decisions = upgrade_editorial_decisions(index, visuals, legacy)
    policy = load_json(
        Path("reference/source-audit/editorial-policy.json")
    )
    return index, visuals, decisions, policy


def _review_input_fingerprint_for_test(evidence):
    return sha256_json({
        "freezeSha256": evidence["freeze"]["freezeSha256"],
        "primaryPatchSha256": sha256_json(evidence["primaryPatch"]),
        "secondaryPatchSha256": sha256_json(
            evidence["secondaryPatch"]
        ),
        "resolutionSha256": sha256_json(evidence["resolutions"]),
    })


def _trusted_review_case():
    arguments = sample_integration_case()["arguments"]
    index = arguments["index"]
    visuals = arguments["visuals"]
    policy = arguments["policy"]
    freeze = arguments["freeze"]
    primary_patch = arguments["primary_patch"]
    secondary_patch = arguments["secondary_patch"]
    resolutions = arguments["resolution"]

    decisions_by_id = {
        item["sourceId"]: item for item in arguments["decisions"]
    }
    decisions_by_id.update({
        item["sourceId"]: item for item in primary_patch["changes"]
    })
    decisions_by_id.update({
        item["sourceId"]: item["finalRecord"]
        for item in resolutions["resolutions"]
    })
    decisions = sorted(
        decisions_by_id.values(),
        key=lambda item: item["sourceId"],
    )
    accepted_hash = sha256_json(decisions)
    base_hash = freeze["baseDecisionsSha256"]
    prefix = [
        build_genesis_ledger_entry(
            _MIGRATED_BASELINE_SHA256,
            834,
        ),
        build_discovery_ledger_entry(
            20,
            1,
            "visual-scanner-a",
            [],
            _MIGRATED_BASELINE_SHA256,
            base_hash,
        ),
    ]
    source_map = source_items_by_id(index, visuals)
    freeze["frozenPageDecisions"] = [
        item
        for item in primary_patch["changes"]
        if source_map[item["sourceId"]]["kind"] == "page"
    ]
    freeze["baseLedgerSha256"] = sha256_json(prefix)
    freeze["freezeSha256"] = sha256_json({
        key: value
        for key, value in freeze.items()
        if key != "freezeSha256"
    })
    for patch in (primary_patch, secondary_patch):
        patch["evidenceHashes"]["baseLedgerSha256"] = (
            freeze["baseLedgerSha256"]
        )
        patch["evidenceHashes"]["freezeSha256"] = (
            freeze["freezeSha256"]
        )
    input_fingerprint = _review_input_fingerprint_for_test({
        "freeze": freeze,
        "primaryPatch": primary_patch,
        "secondaryPatch": secondary_patch,
        "resolutions": resolutions,
    })
    entry = build_review_ledger_entry(
        freeze,
        primary_patch,
        secondary_patch,
        resolutions,
        source_map,
        decisions,
        policy,
        accepted_hash,
        input_fingerprint,
    )
    evidence = {
        freeze["batchId"]: {
            "freeze": freeze,
            "primaryPatch": primary_patch,
            "secondaryPatch": secondary_patch,
            "resolutions": resolutions,
        },
    }
    return (
        index,
        visuals,
        decisions,
        [*prefix, entry],
        policy,
        accepted_hash,
        evidence,
    )


class ReviewLedgerRiskTests(unittest.TestCase):
    def test_required_second_review_reasons_combines_derived_and_manual_risks(self):
        item = sample_source_item(
            sourceId="figure-1-2",
            kind="figure",
        )
        decision = sample_review_record(
            sourceId="figure-1-2",
            riskFlags=[
                "critical-number",
                "experiment-conclusion",
                "lesson-1-1",
                "scope-boundary",
            ],
            mustKeepIds=["analysis-high-risk-missing-path"],
        )
        self.assertEqual(
            required_second_review_reasons(
                item,
                decision,
                sample_policy(),
            ),
            [
                "analysis-high-risk",
                "critical-number",
                "experiment-conclusion",
                "lesson-1-1",
                "scope-boundary",
                "visual",
            ],
        )


class StageAAmendmentLedgerTests(unittest.TestCase):
    def test_stage_a_amendment_records_before_after_and_hash_chain(self):
        before = {
            "sourceId": "experiment-7-11",
            "reviewState": "reviewed",
            "lessonIds": [],
            "mustKeepIds": [],
            "riskFlags": [],
        }
        after = {
            **before,
            "mustKeepIds": ["analysis-high-priority-03"],
        }
        entry = build_stage_a_amendment_entry(
            amendment_id="stage-a-001",
            reviewer="reviewer-stage-a-closure",
            reviewer_task_id="/root/stage_a_closure",
            before_record=before,
            after_record=after,
            reason="补齐第7章未来技术人员版的必保留论点来源。",
            base_decisions_sha256="a" * 64,
            accepted_decisions_sha256="b" * 64,
        )
        self.assertEqual(entry["entryType"], "stage-a-amendment")
        self.assertEqual(entry["sourceId"], "experiment-7-11")
        self.assertEqual(entry["beforeRecord"], before)
        self.assertEqual(entry["afterRecord"], after)
        _validate_stage_a_amendment_entry(
            entry,
            {"experiment-7-11": after},
        )

    def test_ledger_accepts_a_trailing_stage_a_amendment_without_mutating_review_evidence(self):
        index, visuals, decisions, ledger, policy, _, evidence = _trusted_review_case()
        source_id = "figure-1-2"
        before = next(row for row in decisions if row["sourceId"] == source_id)
        after = copy.deepcopy(before)
        after["reason"] = "阶段A收口时补充该语义核心图对课程纵向样板的适用说明。"
        candidate = [
            after if row["sourceId"] == source_id else row
            for row in decisions
        ]
        entry = build_stage_a_amendment_entry(
            amendment_id="stage-a-002",
            reviewer="reviewer-stage-a-closure",
            reviewer_task_id="/root/stage_a_closure",
            before_record=before,
            after_record=after,
            reason="补充已审图示的阶段A纵向样板说明。",
            base_decisions_sha256=sha256_json(decisions),
            accepted_decisions_sha256=sha256_json(candidate),
        )
        validate_review_ledger(
            index,
            visuals,
            candidate,
            [*ledger, entry],
            policy,
            sha256_json(candidate),
            batch_evidence=evidence,
        )


class ReviewLedgerSamplingTests(unittest.TestCase):
    def test_required_secondary_source_ids_uses_mandatory_and_ranked_strata(self):
        freeze = frozen_batch(
            mode="normal",
            batch_id="normal-001",
            source_ids=[
                "experiment-1-1",
                "experiment-1-2",
                "experiment-1-3",
                "experiment-1-4",
                "experiment-1-5",
                "experiment-1-6",
                "figure-1-2",
            ],
        )
        source_map = sample_sampling_source_map(
            freeze["sourceIds"]
        )
        primary = sample_review_patch(
            batchId="normal-001",
            changes=[
                sample_review_record(
                    sourceId=source_id,
                    lessonIds=(
                        ["1-1"]
                        if source_id == "figure-1-2"
                        else ["0-1"]
                    ),
                    riskFlags=(
                        ["lesson-1-1"]
                        if source_id == "figure-1-2"
                        else []
                    ),
                )
                for source_id in freeze["sourceIds"]
            ],
        )
        required = required_secondary_source_ids(
            freeze,
            primary,
            source_map,
            sample_policy(captionConflictSourceIds=[]),
        )
        ranked_experiments = sorted(
            freeze["sourceIds"][:-1],
            key=lambda source_id: hashlib.sha256(
                (
                    "normal-001"
                    + "\0"
                    + source_id
                ).encode("utf-8")
            ).hexdigest(),
        )[:5]
        self.assertEqual(
            required,
            {"figure-1-2", *ranked_experiments},
        )


class ReviewLedgerGenesisTests(unittest.TestCase):
    def test_build_genesis_ledger_entry_anchors_the_migrated_baseline(self):
        digest = "a" * 64
        self.assertEqual(
            build_genesis_ledger_entry(digest, 834),
            {
                "entryType": "genesis",
                "genesisId": "editorial-baseline-834",
                "sourceCount": 834,
                "baseDecisionsSha256": digest,
                "acceptedDecisionsSha256": digest,
            },
        )


class ReviewLedgerDiscoveryTests(unittest.TestCase):
    def test_build_discovery_ledger_entry_records_sorted_visual_ids(self):
        entry = build_discovery_ledger_entry(
            pdf_page=239,
            attempt=1,
            reviewer="visual-scanner-a",
            added_visual_ids=["visual-p239-01"],
            base_decisions_sha256="a" * 64,
            accepted_decisions_sha256="b" * 64,
        )
        self.assertEqual(
            entry,
            {
                "entryType": "discovery",
                "discoveryId": "discovery-p239-01",
                "pdfPage": 239,
                "attempt": 1,
                "reviewer": "visual-scanner-a",
                "addedVisualIds": ["visual-p239-01"],
                "baseDecisionsSha256": "a" * 64,
                "acceptedDecisionsSha256": "b" * 64,
            },
        )


class ReviewLedgerEscalationTests(unittest.TestCase):
    def test_required_after_escalation_expands_every_triggered_stratum(self):
        freeze = frozen_batch(
            mode="normal",
            source_ids=[
                "experiment-1-1",
                "experiment-1-2",
                "experiment-1-3",
                "experiment-1-4",
                "experiment-1-5",
                "experiment-1-6",
            ],
        )
        source_map = sample_sampling_source_map(
            freeze["sourceIds"]
        )
        required = {
            "experiment-1-1",
            "experiment-1-2",
            "experiment-1-3",
            "experiment-1-4",
            "experiment-1-5",
        }
        expanded = required_after_escalation(
            freeze,
            required,
            [{
                "sourceId": "experiment-1-1",
                "fields": ["disposition"],
            }],
            [],
            source_map,
        )
        self.assertEqual(expanded, set(freeze["sourceIds"]))


class ReviewLedgerEntryTests(unittest.TestCase):
    def test_build_review_ledger_entry_persists_resolution_rationale(self):
        freeze = frozen_batch(
            mode="calibration",
            source_ids=["figure-1-2"],
        )
        source_map = {
            "figure-1-2": sample_source_item(
                sourceId="figure-1-2",
                kind="figure",
                chapter=1,
            )
        }
        primary = sample_review_patch(
            reviewer="reviewer-a",
            reviewerTaskId="/root/calibration_primary",
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    disposition="redraw",
                )
            ],
        )
        secondary = sample_review_patch(
            reviewer="reviewer-b",
            reviewerTaskId="/root/calibration_secondary",
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    disposition="text-alt",
                )
            ],
        )
        resolutions = {
            "resolutions": [{
                "sourceId": "figure-1-2",
                "resolutionNote": "Redraw preserves the source relation.",
            }],
            "criticalOmissions": [],
        }
        candidate = [
            sample_review_record(
                sourceId="figure-1-2",
                disposition="redraw",
            )
        ]
        entry = build_review_ledger_entry(
            freeze,
            primary,
            secondary,
            resolutions,
            source_map,
            candidate,
            sample_policy(),
            "b" * 64,
            "c" * 64,
        )
        self.assertEqual(
            entry["disagreements"],
            [{
                "sourceId": "figure-1-2",
                "fields": ["disposition"],
                "resolutionNote": (
                    "Redraw preserves the source relation."
                ),
            }],
        )
        self.assertEqual(
            entry["doubleReviewedSourceIds"],
            ["figure-1-2"],
        )


class ReviewLedgerValidationTests(unittest.TestCase):
    def test_rejects_forged_caller_current_decisions_hash(self):
        index, visuals, decisions, policy = _migrated_baseline_case()
        actual_hash = sha256_json(decisions)
        ledger = [
            build_genesis_ledger_entry(actual_hash, 834)
        ]
        with self.assertRaisesRegex(
            AuditValidationError,
            "current decisions SHA-256 mismatch",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                policy,
                "f" * 64,
            )

    def test_rejects_genesis_not_bound_to_migrated_baseline(self):
        index, visuals, decisions, policy = _migrated_baseline_case()
        ledger = [
            build_genesis_ledger_entry("f" * 64, 834)
        ]
        with self.assertRaisesRegex(
            AuditValidationError,
            "genesis baseline",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                policy,
                sha256_json(decisions),
            )

    def test_accepts_review_entry_bound_to_trusted_batch_evidence(self):
        (
            index,
            visuals,
            decisions,
            ledger,
            policy,
            decisions_hash,
            batch_evidence,
        ) = _trusted_review_case()
        validate_review_ledger(
            index,
            visuals,
            decisions,
            ledger,
            policy,
            decisions_hash,
            require_complete=True,
            batch_evidence=batch_evidence,
        )

    def test_requires_trusted_batch_evidence_for_review_entries(self):
        (
            index,
            visuals,
            decisions,
            ledger,
            policy,
            decisions_hash,
            _batch_evidence,
        ) = _trusted_review_case()
        with self.assertRaisesRegex(
            AuditValidationError,
            "trusted batch evidence",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                policy,
                decisions_hash,
                require_complete=True,
            )

    def test_rejects_forged_review_metadata_against_batch_evidence(self):
        (
            index,
            visuals,
            decisions,
            ledger,
            policy,
            decisions_hash,
            batch_evidence,
        ) = _trusted_review_case()
        ledger[-1]["primaryReviewer"] = "forged-reviewer"
        with self.assertRaisesRegex(
            AuditValidationError,
            "trusted batch evidence",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                policy,
                decisions_hash,
                require_complete=True,
                batch_evidence=batch_evidence,
            )

    def test_rejects_forged_review_input_fingerprint(self):
        (
            index,
            visuals,
            decisions,
            ledger,
            policy,
            decisions_hash,
            batch_evidence,
        ) = _trusted_review_case()
        ledger[-1]["inputFingerprint"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError,
            "trusted batch evidence",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                policy,
                decisions_hash,
                require_complete=True,
                batch_evidence=batch_evidence,
            )

    def test_rejects_resolution_not_matching_accepted_decisions(self):
        (
            index,
            visuals,
            decisions,
            ledger,
            policy,
            decisions_hash,
            batch_evidence,
        ) = _trusted_review_case()
        evidence = batch_evidence[ledger[-1]["batchId"]]
        source_id = evidence["resolutions"]["resolutions"][0][
            "sourceId"
        ]
        evidence["resolutions"]["resolutions"][0]["finalRecord"] = next(
            item
            for item in evidence["secondaryPatch"]["changes"]
            if item["sourceId"] == source_id
        )
        ledger[-1]["inputFingerprint"] = _review_input_fingerprint_for_test(
            evidence,
        )
        with self.assertRaisesRegex(
            AuditValidationError,
            "finalRecord mismatch",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                policy,
                decisions_hash,
                require_complete=True,
                batch_evidence=batch_evidence,
            )

    def test_rejects_normalized_duplicate_reviewer_identities(self):
        reviewer_pairs = (
            ("reviewer-a", " reviewer-a "),
            (
                "r\N{LATIN SMALL LETTER E WITH ACUTE}viewer-a",
                "re\N{COMBINING ACUTE ACCENT}viewer-a",
            ),
        )
        for primary_reviewer, secondary_reviewer in reviewer_pairs:
            with self.subTest(
                primary=primary_reviewer,
                secondary=secondary_reviewer,
            ):
                (
                    index,
                    visuals,
                    decisions,
                    ledger,
                    policy,
                    decisions_hash,
                    batch_evidence,
                ) = _trusted_review_case()
                evidence = batch_evidence[ledger[-1]["batchId"]]
                evidence["primaryPatch"]["reviewer"] = primary_reviewer
                evidence["secondaryPatch"]["reviewer"] = (
                    secondary_reviewer
                )
                ledger[-1]["primaryReviewer"] = primary_reviewer
                ledger[-1]["secondaryReviewer"] = secondary_reviewer
                ledger[-1]["inputFingerprint"] = _review_input_fingerprint_for_test(
                    evidence,
                )
                with self.assertRaisesRegex(
                    AuditValidationError,
                    "distinct reviewers",
                ):
                    validate_review_ledger(
                        index,
                        visuals,
                        decisions,
                        ledger,
                        policy,
                        decisions_hash,
                        require_complete=True,
                        batch_evidence=batch_evidence,
                    )

    def test_review_identity_rejects_duplicate_batch_and_source_overlap(self):
        entry = sample_review_entry()
        source = sample_source_item()
        source_map = {source["sourceId"]: source}
        decisions = {
            source["sourceId"]: {"reviewState": "reviewed"},
        }
        cases = (
            ({entry["batchId"]}, set(), "duplicate reviewed batchId"),
            (set(), {source["sourceId"]}, "multiple batches"),
        )
        for batch_ids, reviewed_ids, message in cases:
            with self.subTest(message=message), self.assertRaisesRegex(
                AuditValidationError,
                message,
            ):
                _validate_review_entry_identity(
                    entry,
                    source_map,
                    decisions,
                    batch_ids,
                    reviewed_ids,
                )

    def test_discovery_validator_rejects_duplicate_and_wrong_page_visuals(self):
        visual = sample_visual(
            pdfPage=20,
            sourceId="visual-p020-01",
        )
        source_map = {visual["sourceId"]: visual}
        entry = build_discovery_ledger_entry(
            10, 1, "scanner-a", [visual["sourceId"]],
            "a" * 64, "a" * 64,
        )
        for discovered in (set(), {visual["sourceId"]}):
            with self.subTest(discovered=bool(discovered)), self.assertRaisesRegex(
                AuditValidationError,
                "invalid discovered visual",
            ):
                _validate_discovery_ledger_entry(
                    entry,
                    source_map,
                    {},
                    discovered,
                )

    def test_validate_ledger_genesis_rejects_missing_genesis(self):
        with self.assertRaisesRegex(
            AuditValidationError,
            "genesis",
        ):
            _validate_ledger_genesis({
                "entryType": "review",
            })

    def test_validate_review_ledger_rejects_a_broken_hash_prefix(self):
        index = sample_page20_index()
        visuals = [
            sample_visual(
                pdfPage=20,
                sourceId="visual-p020-01",
            )
        ]
        decisions = sample_decisions(
            index=index,
            visuals=visuals,
            reviewState="reviewed",
        )
        ledger = sample_complete_ledger(
            index=index,
            visuals=visuals,
            decisions=decisions,
        )
        ledger[1]["baseDecisionsSha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError,
            "hash chain",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                sample_policy(),
                sha256_json(decisions),
                require_complete=True,
            )
