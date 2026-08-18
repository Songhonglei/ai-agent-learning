import copy
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
    sha256_file,
)
from scripts.source_audit.decisions import (
    APPROVED_CAPTION_CONFLICT_SOURCE_IDS,
)
from scripts.source_audit.review_batches import (
    _validate_manifest_selection,
    _verified_manifest_records,
    _verified_policy_snapshot,
    build_current_batch_evidence,
    compare_review_patches,
    freeze_batch,
    validate_frozen_batch,
    validate_frozen_immutable_evidence,
    validate_review_patch,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
)
from tests.source_audit.editorial_fixtures import (
    current_batch_evidence,
    frozen_batch,
    frozen_batch_workspace,
    sample_policy,
    sample_review_patch,
    sample_review_record,
    sample_source_item,
)


class ReviewPatchComparisonTests(unittest.TestCase):
    def test_compare_review_patches_reports_exact_changed_fields(self):
        primary = sample_review_patch(
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    disposition="redraw",
                    reason="primary reason",
                )
            ]
        )
        secondary = sample_review_patch(
            reviewer="reviewer-b",
            reviewerTaskId="/root/calibration_secondary",
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    disposition="text-alt",
                    reason="secondary reason",
                )
            ],
        )
        self.assertEqual(
            compare_review_patches(primary, secondary),
            [{
                "sourceId": "figure-1-2",
                "fields": ["disposition", "reason"],
            }],
        )


class FrozenBatchTests(unittest.TestCase):
    def test_pinned_normal_manifest_keeps_pre_discovery_source_ids(self):
        with frozen_batch_workspace() as paths:
            manifest = load_json(paths.manifest)
            visuals = load_json(paths.visuals)
            visuals.append({
                "sourceId": "visual-p020-01",
                "kind": "visual",
                "pdfPage": 20,
                "region": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.2},
                "semanticBrief": "发现后的新增视觉",
                "discoveryEvidence": "人工目检；PDF 第20页新增视觉",
            })
            decisions = load_json(paths.decisions)
            decisions.append({
                "sourceId": "visual-p020-01",
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
                "visualTextAlternative": "",
                "visualHandlingNote": "",
            })

            source_map, decisions_by_id = _validate_manifest_selection(
                manifest,
                load_json(paths.index),
                visuals,
                sorted(decisions, key=lambda row: row["sourceId"]),
                load_json(paths.ledger),
                load_json(paths.policy),
            )

        self.assertIn("visual-p020-01", source_map)
        self.assertNotIn("visual-p020-01", manifest["sourceIds"])
        self.assertEqual(
            decisions_by_id["visual-p020-01"]["reviewState"],
            "unreviewed",
        )

    def test_freeze_batch_captures_complete_immutable_evidence(self):
        with frozen_batch_workspace() as paths:
            manifest = load_json(paths.manifest)
            freeze = freeze_batch(
                manifest,
                paths.pdf,
                paths.index,
                paths.visuals,
                paths.decisions,
                paths.ledger,
                paths.policy,
                paths.analysis,
                paths.course_outline,
            )
            self.assertEqual(
                freeze["sourceIds"],
                manifest["sourceIds"],
            )
            self.assertTrue(
                set(freeze["catalogSourceIds"])
                - set(manifest["sourceIds"])
            )
            self.assertEqual(
                [item["pdfPage"] for item in freeze["pageImages"]],
                manifest["pages"],
            )
            self.assertEqual(
                freeze["policySnapshotPath"],
                manifest["policySnapshotPath"],
            )
            self.assertEqual(
                freeze["captionConflictSourceIds"],
                load_json(paths.policy)["captionConflictSourceIds"],
            )
            self.assertEqual(
                freeze["freezeSha256"],
                sha256_json({
                    key: value for key, value in freeze.items()
                    if key != "freezeSha256"
                }),
            )
            self.assertTrue(freeze["frozenPageDecisions"])

    def test_freeze_batch_rejects_unknown_or_duplicate_decisions(self):
        for scenario in ("unknown", "duplicate"):
            with self.subTest(scenario=scenario), frozen_batch_workspace() as paths:
                manifest = load_json(paths.manifest)
                decisions = load_json(paths.decisions)
                if scenario == "unknown":
                    decisions.append(
                        sample_review_record(sourceId="zz-unknown-source")
                    )
                    expected_error = "unknown sourceId"
                else:
                    decisions.append(copy.deepcopy(decisions[-1]))
                    expected_error = "duplicate decision sourceId"
                paths.decisions.write_bytes(
                    deterministic_json_bytes(decisions)
                )
                manifest["decisionsSha256"] = sha256_file(
                    paths.decisions
                )
                with self.assertRaisesRegex(
                    AuditValidationError,
                    expected_error,
                ):
                    freeze_batch(
                        manifest,
                        paths.pdf,
                        paths.index,
                        paths.visuals,
                        paths.decisions,
                        paths.ledger,
                        paths.policy,
                        paths.analysis,
                        paths.course_outline,
                    )

    def test_freeze_batch_rejects_nonapproved_conflict_set(self):
        with frozen_batch_workspace() as paths:
            manifest = load_json(paths.manifest)
            policy = load_json(paths.policy)
            policy["captionConflictSourceIds"] = []
            policy_bytes = deterministic_json_bytes(policy)
            paths.policy.write_bytes(policy_bytes)
            snapshot = Path.cwd() / manifest["policySnapshotPath"]
            snapshot.write_bytes(policy_bytes)
            manifest["editorialPolicySha256"] = sha256_file(
                paths.policy
            )
            manifest["policySnapshotSha256"] = sha256_file(snapshot)

            with self.assertRaisesRegex(
                AuditValidationError,
                "captionConflictSourceIds",
            ):
                freeze_batch(
                    manifest,
                    paths.pdf,
                    paths.index,
                    paths.visuals,
                    paths.decisions,
                    paths.ledger,
                    paths.policy,
                    paths.analysis,
                    paths.course_outline,
                )

    def test_verified_manifest_records_reject_page_artifact_drift(self):
        for name in ("pageImages", "pageBundles"):
            with self.subTest(name=name), frozen_batch_workspace() as paths:
                manifest = load_json(paths.manifest)
                artifact = (
                    Path.cwd() / manifest[name][0]["path"]
                )
                artifact.write_bytes(b"mutated artifact")
                with self.assertRaisesRegex(
                    AuditValidationError,
                    rf"{name}.*hash",
                ):
                    _verified_manifest_records(
                        manifest,
                        name,
                        Path.cwd(),
                    )

    def test_verified_policy_snapshot_rejects_snapshot_drift(self):
        with frozen_batch_workspace() as paths:
            manifest = load_json(paths.manifest)
            snapshot = (
                Path.cwd() / manifest["policySnapshotPath"]
            )
            snapshot.write_bytes(b"mutated policy snapshot")
            with self.assertRaisesRegex(
                AuditValidationError,
                "policy snapshot.*hash",
            ):
                _verified_policy_snapshot(
                    manifest,
                    Path.cwd(),
                    sha256_file(paths.policy),
                )


class FrozenBatchValidationTests(unittest.TestCase):
    def test_validate_frozen_immutable_evidence_rejects_bundle_drift(self):
        freeze = frozen_batch()
        current = current_batch_evidence(freeze)
        current["pageBundles"][0]["sha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError,
            "pageBundles",
        ):
            validate_frozen_immutable_evidence(freeze, current)

    def test_validate_frozen_immutable_evidence_rejects_conflict_set_drift(self):
        freeze = frozen_batch()
        freeze["captionConflictSourceIds"] = ["figure-1-2"]
        freeze["freezeSha256"] = sha256_json({
            key: value for key, value in freeze.items()
            if key != "freezeSha256"
        })
        current = current_batch_evidence(freeze)
        current["captionConflictSourceIds"] = []
        with self.assertRaisesRegex(
            AuditValidationError,
            "captionConflictSourceIds",
        ):
            validate_frozen_immutable_evidence(freeze, current)

    def test_validate_frozen_batch_rejects_nonapproved_conflict_sets(self):
        approved = list(APPROVED_CAPTION_CONFLICT_SOURCE_IDS)
        scenarios = {
            "empty": [],
            "missing-member": approved[:-1],
            "out-of-order": list(reversed(approved)),
            "unknown-id": [*approved[:-1], "unknown-source"],
            "missing-field": None,
        }
        for scenario, conflicts in scenarios.items():
            with self.subTest(scenario=scenario):
                freeze = frozen_batch()
                if conflicts is None:
                    del freeze["captionConflictSourceIds"]
                else:
                    freeze["captionConflictSourceIds"] = conflicts
                freeze["freezeSha256"] = sha256_json({
                    key: value for key, value in freeze.items()
                    if key != "freezeSha256"
                })
                current = current_batch_evidence(freeze)
                with self.assertRaisesRegex(
                    AuditValidationError,
                    "captionConflictSourceIds",
                ):
                    validate_frozen_batch(freeze, current)

        freeze = frozen_batch()
        missing_source_id = approved[-1]
        freeze["catalogSourceIds"].remove(missing_source_id)
        del freeze["baseReviewStates"][missing_source_id]
        freeze["freezeSha256"] = sha256_json({
            key: value for key, value in freeze.items()
            if key != "freezeSha256"
        })
        current = current_batch_evidence(freeze)
        with self.assertRaisesRegex(
            AuditValidationError,
            "outside frozen catalog",
        ):
            validate_frozen_batch(freeze, current)

    def test_validate_frozen_batch_rejects_mutable_baseline_drift(self):
        freeze = frozen_batch()
        current = current_batch_evidence(freeze)
        current["baseDecisionsSha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError,
            "baseDecisionsSha256",
        ):
            validate_frozen_batch(freeze, current)


class ReviewPatchValidationTests(unittest.TestCase):
    def test_validate_review_patch_requires_complete_frozen_conflict_record(self):
        freeze = frozen_batch(source_ids=["figure-1-4"])
        source_map = {
            "figure-1-4": sample_source_item(
                sourceId="figure-1-4",
                kind="figure",
            )
        }
        incomplete = sample_review_record(
            sourceId="figure-1-4",
            captionConflictResolved=True,
        )
        patch = sample_review_patch(
            freeze=freeze,
            changes=[incomplete],
        )
        with self.assertRaisesRegex(
            AuditValidationError,
            "complete record fields",
        ):
            validate_review_patch(
                freeze,
                patch,
                source_map,
                {"figure-1-4"},
                sample_policy(),
            )

    def test_validate_review_patch_uses_frozen_conflict_set(self):
        freeze = frozen_batch(source_ids=["figure-1-4"])
        source_map = {
            "figure-1-4": sample_source_item(
                sourceId="figure-1-4",
                kind="figure",
            )
        }
        patch = sample_review_patch(freeze=freeze)
        mutable_policy = sample_policy(captionConflictSourceIds=[])

        with self.assertRaisesRegex(
            AuditValidationError,
            "complete record fields",
        ):
            validate_review_patch(
                freeze,
                patch,
                source_map,
                {"figure-1-4"},
                mutable_policy,
            )

    def test_validate_review_patch_rejects_tampered_freeze(self):
        freeze = frozen_batch(source_ids=["figure-1-2"])
        patch = sample_review_patch(freeze=freeze)
        freeze["captionConflictSourceIds"] = []
        source_map = {
            "figure-1-2": sample_source_item(
                sourceId="figure-1-2",
                kind="figure",
            )
        }
        with self.assertRaisesRegex(
            AuditValidationError,
            "freezeSha256 mismatch",
        ):
            validate_review_patch(
                freeze,
                patch,
                source_map,
                {"figure-1-2"},
                sample_policy(),
            )


class CurrentBatchEvidenceTests(unittest.TestCase):
    def test_build_current_batch_evidence_hashes_only_confined_files(self):
        with frozen_batch_workspace() as paths:
            freeze = load_json(paths.freeze)
            evidence = build_current_batch_evidence(
                freeze,
                paths.pdf,
                paths.index,
                paths.visuals,
                paths.decisions,
                paths.ledger,
                paths.policy,
                paths.analysis,
                paths.course_outline,
                paths.image_dir,
                paths.package_dir,
            )
            self.assertEqual(
                evidence["catalogSourceIds"],
                freeze["catalogSourceIds"],
            )
            self.assertEqual(
                [item["pdfPage"] for item in evidence["pageImages"]],
                freeze["pages"],
            )
            self.assertEqual(
                evidence["policySnapshotSha256"],
                freeze["policySnapshotSha256"],
            )

    def test_build_current_batch_evidence_rejects_external_symlink_roots(self):
        for field in ("image", "package"):
            with (
                self.subTest(field=field),
                frozen_batch_workspace() as paths,
                tempfile.TemporaryDirectory() as outside_directory,
            ):
                freeze = load_json(paths.freeze)
                outside = Path(outside_directory)
                if field == "image":
                    outside_root = outside / "images"
                    outside_root.mkdir()
                    source = paths.image_dir / "page-020.png"
                    (outside_root / source.name).write_bytes(
                        source.read_bytes()
                    )
                    root_link = paths.freeze.parent / "external-images"
                    root_link.symlink_to(
                        outside_root,
                        target_is_directory=True,
                    )
                    freeze["pageImages"][0]["path"] = (
                        root_link / source.name
                    ).relative_to(Path.cwd()).as_posix()
                    image_dir = root_link
                    package_dir = paths.package_dir
                else:
                    outside_root = outside / "packages"
                    outside_root.mkdir()
                    for source in paths.package_dir.iterdir():
                        if source.is_file():
                            (outside_root / source.name).write_bytes(
                                source.read_bytes()
                            )
                    root_link = paths.freeze.parent / "external-packages"
                    root_link.symlink_to(
                        outside_root,
                        target_is_directory=True,
                    )
                    freeze["pageBundles"][0]["path"] = (
                        root_link / "page-020.json"
                    ).relative_to(Path.cwd()).as_posix()
                    freeze["policySnapshotPath"] = (
                        root_link / "editorial-policy.snapshot.json"
                    ).relative_to(Path.cwd()).as_posix()
                    image_dir = paths.image_dir
                    package_dir = root_link

                with self.assertRaisesRegex(
                    AuditValidationError,
                    rf"{field} root.*project root",
                ):
                    build_current_batch_evidence(
                        freeze,
                        paths.pdf,
                        paths.index,
                        paths.visuals,
                        paths.decisions,
                        paths.ledger,
                        paths.policy,
                        paths.analysis,
                        paths.course_outline,
                        image_dir,
                        package_dir,
                    )
