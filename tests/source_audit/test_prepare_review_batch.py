import copy
import json
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from unittest.mock import patch

from scripts.source_audit.models import AuditValidationError, load_json
from scripts.source_audit.prepare_review_batch import (
    _assert_discovery_targets_unreviewed,
    _update_target_symbol_alternatives,
    apply_discovery_patch,
    build_parser,
    discovery_command,
    freeze_command,
    main,
    persist_discovery_candidates,
    verify_command,
)
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    validate_frozen_batch,
)
from tests.source_audit.editorial_fixtures import (
    current_batch_evidence,
    discovery_cli_workspace,
    frozen_batch,
    frozen_batch_workspace,
    sample_batch_manifest,
    sample_calibration_decisions,
    sample_calibration_index,
    sample_freeze_args,
    sample_policy,
    sample_verify_args,
    sample_visual,
)


class PrepareReviewBatchTests(unittest.TestCase):
    @staticmethod
    def discovery_patch(pdf_page=239, visuals=None, symbol_review=None):
        return {
            "pdfPage": pdf_page,
            "attempt": 1,
            "reviewer": "visual-scanner-a",
            "numberedVisualIds": [],
            "visuals": copy.deepcopy(visuals or []),
            "symbolReview": copy.deepcopy(symbol_review or []),
        }

    def test_discovery_assigns_append_only_visual_ids(self):
        index = sample_calibration_index()
        visuals = [sample_visual()]
        decisions = sample_calibration_decisions(visuals=visuals)
        patch = self.discovery_patch(
            pdf_page=239,
            visuals=[{
                "localId": "new-01",
                "region": {"x": 0.12, "y": 0.24, "width": 0.66, "height": 0.31},
                "semanticBrief": "关系示意",
                "discoveryEvidence": "全页视觉扫描；PDF 第239页中部",
            }],
        )
        candidate_visuals, candidate_decisions, mapping = apply_discovery_patch(
            index, visuals, decisions, patch, sample_policy()
        )
        self.assertEqual(mapping, {"new-01": "visual-p239-01"})
        self.assertIn("visual-p239-01", {item["sourceId"] for item in candidate_visuals})
        self.assertEqual(
            next(row for row in candidate_decisions if row["sourceId"] == "visual-p239-01")["reviewState"],
            "unreviewed",
        )

    def test_discovery_rejects_incomplete_frozen_conflict_catalog_without_mutation(self):
        index = sample_calibration_index()
        missing_id = sample_policy()["captionConflictSourceIds"][0]
        index["numberedItems"] = [
            item for item in index["numberedItems"]
            if item["sourceId"] != missing_id
        ]
        visuals = [sample_visual()]
        decisions = [
            decision for decision in sample_calibration_decisions(visuals=visuals)
            if decision["sourceId"] != missing_id
        ]
        patch = self.discovery_patch(
            pdf_page=239,
            visuals=[{
                "localId": "new-01",
                "region": {"x": 0.12, "y": 0.24, "width": 0.66, "height": 0.31},
                "semanticBrief": "关系示意",
                "discoveryEvidence": "全页视觉扫描；PDF 第239页中部",
            }],
        )
        before = copy.deepcopy((index, visuals, decisions))

        with self.assertRaisesRegex(AuditValidationError, "caption conflict IDs missing"):
            apply_discovery_patch(index, visuals, decisions, patch, sample_policy())

        self.assertEqual((index, visuals, decisions), before)

    def test_discovery_replaces_page_symbol_alternatives(self):
        page = {"pdfPage": 239, "sourceId": "page-239"}
        decisions = sample_calibration_decisions()
        target = next(row for row in decisions if row["sourceId"] == "experiment-cal-239-01")
        target["symbolTextAlternatives"] = [{"symbol": "★", "pdfPage": 239, "meaning": "stale"}]
        _update_target_symbol_alternatives(
            page,
            [{
                "symbol": "★", "observedCount": 2,
                "semanticAssignments": [{
                    "targetRef": "experiment-cal-239-01", "count": 2,
                    "meaning": "实验难度：两星",
                }],
                "nonSemanticCount": 0, "note": "两枚星均表示实验难度",
            }],
            decisions, {},
        )
        self.assertEqual(target["symbolTextAlternatives"], [{
            "symbol": "★", "pdfPage": 239, "meaning": "实验难度：两星",
        }])

    def test_discovery_rejects_reviewed_page_visual_or_target(self):
        decisions = sample_calibration_decisions()
        page = next(row for row in decisions if row["sourceId"] == "page-239")
        page["reviewState"] = "reviewed"
        patch = self.discovery_patch(pdf_page=239, visuals=[])
        with self.assertRaisesRegex(AuditValidationError, "reviewed"):
            _assert_discovery_targets_unreviewed(patch, decisions)

    def test_discovery_cli_failure_restores_visuals_decisions_and_ledger(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = [root / "visuals.json", root / "decisions.json", root / "ledger.json"]
            for position, path in enumerate(paths, start=1):
                path.write_bytes(f"old-{position}".encode())
            before = {path: path.read_bytes() for path in paths}
            with patch(
                "scripts.source_audit.transactions.os.replace",
                side_effect=[None, OSError("second replace failed"), None],
            ):
                with self.assertRaisesRegex(OSError, "second replace failed"):
                    persist_discovery_candidates(
                        *paths,
                        [{"sourceId": "visual-p239-01"}],
                        [{"sourceId": "page-239"}],
                        [{"entryType": "discovery"}],
                    )
            self.assertEqual({path: path.read_bytes() for path in paths}, before)


class PrepareReviewBatchFreezeTests(unittest.TestCase):
    def test_freeze_command_commits_one_validated_freeze(self):
        args = sample_freeze_args()
        expected = frozen_batch()
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.load_json",
            return_value=sample_batch_manifest(),
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.frozen_manifest_artifact_paths",
            return_value={},
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.frozen_manifest_evidence_roots",
            return_value={},
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.freeze_batch",
            return_value=expected,
        ) as freeze_builder, mock.patch(
            "scripts.source_audit.prepare_review_batch.write_json_transaction",
        ) as transaction:
            result = freeze_command(args)
        freeze_builder.assert_called_once()
        transaction.assert_called_once_with({
            Path(args.output): expected
        })
        self.assertEqual(result, expected)

    def test_freeze_command_converts_manifest_cli_path(self):
        args = sample_freeze_args()
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.load_json",
            return_value=sample_batch_manifest(),
        ) as loader, mock.patch(
            "scripts.source_audit.prepare_review_batch.frozen_manifest_artifact_paths",
            return_value={},
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.frozen_manifest_evidence_roots",
            return_value={},
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.freeze_batch",
            return_value=frozen_batch(),
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.write_json_transaction",
        ):
            freeze_command(args)
        loader.assert_called_once_with(Path(args.manifest))

    def test_freeze_command_rejects_output_aliasing_frozen_artifacts(self):
        with frozen_batch_workspace() as paths:
            manifest = load_json(paths.manifest)
            artifact_labels = [
                manifest["pageImages"][0]["path"],
                manifest["pageBundles"][0]["path"],
                manifest["policySnapshotPath"],
            ]
            targets = []
            for position, label in enumerate(artifact_labels, start=1):
                artifact = (Path.cwd() / label).resolve()
                symbolic = paths.freeze.parent / f"output-{position}.symlink"
                hard = paths.freeze.parent / f"output-{position}.hardlink"
                symbolic.symlink_to(artifact)
                os.link(artifact, hard)
                targets.extend([artifact, symbolic, hard])
            for target in targets:
                with self.subTest(target=target), mock.patch(
                    "scripts.source_audit.prepare_review_batch.write_json_transaction",
                ) as transaction:
                    args = sample_freeze_args()
                    args.manifest = paths.manifest
                    args.pdf = paths.pdf
                    args.index = paths.index
                    args.visuals = paths.visuals
                    args.decisions = paths.decisions
                    args.ledger = paths.ledger
                    args.policy = paths.policy
                    args.analysis = paths.analysis
                    args.course_outline = paths.course_outline
                    args.output = target
                    with self.assertRaisesRegex(
                        AuditValidationError,
                        "path conflict",
                    ):
                        freeze_command(args)
                    transaction.assert_not_called()

    def test_freeze_command_rejects_output_containing_evidence_roots(self):
        with frozen_batch_workspace() as paths:
            targets = [
                paths.image_dir,
                paths.image_dir / "freeze.json",
                paths.package_dir,
                paths.package_dir / "freeze.json",
                paths.freeze.parent,
            ]
            for target in targets:
                with self.subTest(target=target), mock.patch(
                    "scripts.source_audit.prepare_review_batch.write_json_transaction",
                ) as transaction:
                    args = sample_freeze_args()
                    args.manifest = paths.manifest
                    args.pdf = paths.pdf
                    args.index = paths.index
                    args.visuals = paths.visuals
                    args.decisions = paths.decisions
                    args.ledger = paths.ledger
                    args.policy = paths.policy
                    args.analysis = paths.analysis
                    args.course_outline = paths.course_outline
                    args.output = target
                    with self.assertRaisesRegex(
                        AuditValidationError,
                        "path conflict",
                    ):
                        freeze_command(args)
                    transaction.assert_not_called()


class PrepareReviewBatchVerifyTests(unittest.TestCase):
    def test_verify_command_returns_summary_without_writing(self):
        args = sample_verify_args()
        freeze = frozen_batch(
            pages=[20, 32],
            source_ids=["figure-1-2"],
        )
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.load_json",
            return_value=freeze,
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.build_current_batch_evidence",
            return_value=current_batch_evidence(freeze),
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.validate_frozen_batch",
        ) as validator, mock.patch(
            "scripts.source_audit.prepare_review_batch.write_json_transaction",
        ) as transaction:
            result = verify_command(args)
        validator.assert_called_once()
        transaction.assert_not_called()
        self.assertEqual(result, {
            "batchId": freeze["batchId"],
            "pageCount": 2,
            "sourceCount": 1,
            "freezeSha256": freeze["freezeSha256"],
        })

    def test_verify_command_converts_freeze_cli_path(self):
        args = sample_verify_args()
        freeze = frozen_batch()
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.load_json",
            return_value=freeze,
        ) as loader, mock.patch(
            "scripts.source_audit.prepare_review_batch.build_current_batch_evidence",
            return_value=current_batch_evidence(freeze),
        ), mock.patch(
            "scripts.source_audit.prepare_review_batch.validate_frozen_batch",
        ):
            verify_command(args)
        loader.assert_called_once_with(Path(args.freeze))


class PrepareReviewBatchDiscoveryTests(unittest.TestCase):
    @staticmethod
    def _formal_bytes(workspace):
        return {
            path: path.read_bytes()
            for path in (
                workspace.visuals,
                workspace.decisions,
                workspace.ledger,
            )
        }

    def test_discovery_after_review_loads_trusted_existing_evidence(self):
        with discovery_cli_workspace(
            accepted_review=True,
        ) as workspace:
            before_ledger = load_json(workspace.ledger)
            result = discovery_command(workspace.args)
            after_ledger = load_json(workspace.ledger)
        self.assertEqual(result["pdfPage"], 19)
        self.assertEqual(
            result["localToStable"],
            {"late-visual-01": "visual-p019-01"},
        )
        self.assertEqual(after_ledger[:-1], before_ledger)
        self.assertEqual(after_ledger[-1]["entryType"], "discovery")
        self.assertEqual(after_ledger[-1]["pdfPage"], 19)

    def test_discovery_after_review_rejects_missing_evidence_without_writes(self):
        with discovery_cli_workspace(
            accepted_review=True,
        ) as workspace:
            workspace.args.review_evidence_root = None
            before = self._formal_bytes(workspace)
            with self.assertRaisesRegex(
                AuditValidationError,
                "review evidence root is required",
            ):
                discovery_command(workspace.args)
            self.assertEqual(self._formal_bytes(workspace), before)

    def test_discovery_after_review_rejects_tampered_evidence_without_writes(self):
        with discovery_cli_workspace(
            accepted_review=True,
        ) as workspace:
            primary_path = workspace.evidence_files["primary"]
            primary = load_json(primary_path)
            primary["changes"][0]["reason"] = "forged rationale"
            primary_path.write_text(
                json.dumps(
                    primary,
                    ensure_ascii=False,
                    indent=2,
                    sort_keys=True,
                ) + "\n",
                encoding="utf-8",
            )
            before = self._formal_bytes(workspace)
            with self.assertRaisesRegex(
                AuditValidationError,
                "trusted batch evidence",
            ):
                discovery_command(workspace.args)
            self.assertEqual(self._formal_bytes(workspace), before)

    def test_discovery_rejects_symlinked_review_evidence_root_child(self):
        with discovery_cli_workspace(
            accepted_review=True,
        ) as workspace:
            freeze_root = workspace.evidence_root / "review-freezes"
            outside = workspace.evidence_root.parent / "outside-freezes"
            freeze_root.rename(outside)
            freeze_root.symlink_to(outside, target_is_directory=True)
            before = self._formal_bytes(workspace)
            with self.assertRaisesRegex(
                AuditValidationError,
                "review evidence.*symlink",
            ):
                discovery_command(workspace.args)
            self.assertEqual(self._formal_bytes(workspace), before)

    def test_discovery_rejects_review_evidence_hardlink_to_formal_input(self):
        with discovery_cli_workspace(
            accepted_review=True,
        ) as workspace:
            alias = (
                workspace.evidence_root
                / "review-patches"
                / "calibration"
                / "policy-alias.json"
            )
            os.link(workspace.policy, alias)
            before = self._formal_bytes(workspace)
            with self.assertRaisesRegex(
                AuditValidationError,
                "path conflict",
            ):
                discovery_command(workspace.args)
            self.assertEqual(self._formal_bytes(workspace), before)

    def test_discovery_command_rolls_back_all_three_targets_at_every_failure_position(self):
        for failure_position in (1, 2, 3):
            with self.subTest(
                failure_position=failure_position
            ), discovery_cli_workspace() as workspace:
                before = {
                    path: (
                        path.read_bytes(),
                        stat.S_IMODE(path.stat().st_mode),
                    )
                    for path in (
                        workspace.visuals,
                        workspace.decisions,
                        workspace.ledger,
                    )
                }
                original_replace = os.replace
                calls = {"count": 0}

                def injected_replace(source, target):
                    calls["count"] += 1
                    if calls["count"] == failure_position:
                        raise OSError(
                            "injected discovery replacement failure"
                        )
                    return original_replace(source, target)

                with mock.patch(
                    "scripts.source_audit.transactions.os.replace",
                    side_effect=injected_replace,
                ), self.assertRaisesRegex(
                    OSError,
                    "injected discovery replacement failure",
                ):
                    discovery_command(workspace.args)
                after = {
                    path: (
                        path.read_bytes(),
                        stat.S_IMODE(path.stat().st_mode),
                    )
                    for path in (
                        workspace.visuals,
                        workspace.decisions,
                        workspace.ledger,
                    )
                }
                self.assertEqual(after, before)


class PrepareReviewBatchCliTests(unittest.TestCase):
    def test_discovery_parser_accepts_review_evidence_root(self):
        args = build_parser().parse_args([
            "discover",
            "--patch", "p",
            "--index", "i",
            "--visuals", "v",
            "--decisions", "d",
            "--ledger", "l",
            "--policy", "e",
            "--review-evidence-root", "r",
        ])
        self.assertEqual(args.review_evidence_root, "r")

    def test_parser_matches_all_task10_subcommands(self):
        parser = build_parser()
        discover = parser.parse_args([
            "discover", "--patch", "p", "--index", "i", "--visuals", "v",
            "--decisions", "d", "--ledger", "l", "--policy", "e",
        ])
        freeze = parser.parse_args([
            "freeze", "--manifest", "m", "--pdf", "p", "--index", "i", "--visuals", "v",
            "--decisions", "d", "--ledger", "l", "--policy", "e", "--analysis", "a",
            "--course-outline", "c", "--output", "o",
        ])
        verify = parser.parse_args([
            "verify", "--freeze", "f", "--pdf", "p", "--index", "i", "--visuals", "v",
            "--decisions", "d", "--ledger", "l", "--policy", "e", "--analysis", "a",
            "--course-outline", "c", "--image-dir", "g", "--package-dir", "k",
        ])
        self.assertIs(discover.handler, discovery_command)
        self.assertIs(freeze.handler, freeze_command)
        self.assertIs(verify.handler, verify_command)

    def test_main_dispatches_and_serializes_success(self):
        argv = [
            "discover", "--patch", "p", "--index", "i", "--visuals", "v",
            "--decisions", "d", "--ledger", "l", "--policy", "e",
        ]
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.discovery_command", return_value={"status": "ok"}
        ) as handler, mock.patch("sys.stdout.write") as output:
            self.assertEqual(main(argv), 0)
        handler.assert_called_once()
        output.assert_called_once_with('{\n  "status": "ok"\n}\n')
