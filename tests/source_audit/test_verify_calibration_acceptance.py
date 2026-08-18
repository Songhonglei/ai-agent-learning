from __future__ import annotations

import copy
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.verify_calibration_acceptance import (
    _gate_caption_conflicts,
    _gate_pdf_hash,
    _gate_report_determinism,
    _require_calibration_source_count,
    _require_frozen_discovery_unchanged,
    _require_independent_reviewers,
    _load_verifier_case,
    main as verifier_main,
    run_stage_a_gate,
    verify_calibration_acceptance,
)
from tests.source_audit.editorial_fixtures import (
    _trusted_review_evidence,
    valid_calibration_case,
    valid_stage_a_case,
)
from scripts.source_audit.transactions import sha256_json


class StageAGateRuleTests(unittest.TestCase):
    def test_valid_complete_state_passes_stage_a_gate(self):
        case = valid_stage_a_case()
        run_stage_a_gate(
            case["pdf_sha256"], case["index"], case["visuals"],
            case["decisions"], case["ledger"], case["policy"],
            case["must_keep_inventory"], case["batch_evidence"],
        )

    def test_rejects_missing_trusted_review_evidence(self):
        case = valid_stage_a_case()
        with self.assertRaisesRegex(
            AuditValidationError, "trusted review evidence",
        ):
            run_stage_a_gate(
                case["pdf_sha256"], case["index"], case["visuals"],
                case["decisions"], case["ledger"], case["policy"],
                case["must_keep_inventory"], None,
            )

    def test_rejects_missing_lesson_1_1_semantic_core_source(self):
        case = valid_stage_a_case()
        semantic_core = next(
            row for row in case["decisions"]
            if row["sourceId"] == "figure-stage-1-1"
        )
        semantic_core["visualClass"] = "evidence"
        semantic_core["visualHandling"] = "text-alt"
        with self.assertRaisesRegex(
            AuditValidationError, "1-1 semantic-core source",
        ):
            run_stage_a_gate(
                case["pdf_sha256"], case["index"], case["visuals"],
                case["decisions"], case["ledger"], case["policy"],
                case["must_keep_inventory"], case["batch_evidence"],
            )

    def test_rejects_partially_covered_trusted_ledger(self):
        case = valid_stage_a_case()
        evidence = next(iter(case["batch_evidence"].values()))
        freeze = copy.deepcopy(evidence["freeze"])
        freeze["sourceIds"] = freeze["sourceIds"][:8]
        freeze["freezeSha256"] = sha256_json({
            key: value for key, value in freeze.items()
            if key != "freezeSha256"
        })
        review, partial_evidence = _trusted_review_evidence(
            case["index"], case["visuals"], freeze, case["decisions"],
        )
        with self.assertRaisesRegex(
            AuditValidationError, "complete ledger does not cover",
        ):
            run_stage_a_gate(
                case["pdf_sha256"], case["index"], case["visuals"],
                case["decisions"], [*case["ledger"][:-1], review],
                case["policy"], case["must_keep_inventory"],
                partial_evidence,
            )

    def test_rejects_caption_and_pdf_mutations(self):
        case = valid_stage_a_case()
        source_id = case["policy"]["captionConflictSourceIds"][0]
        next(row for row in case["decisions"] if row["sourceId"] == source_id)["captionConflictNote"] = ""
        with self.assertRaisesRegex(AuditValidationError, "caption conflict"):
            _gate_caption_conflicts({**case, "mustKeepInventory": case["must_keep_inventory"]})
        with self.assertRaisesRegex(AuditValidationError, "approved PDF"):
            _gate_pdf_hash("f" * 64)

    def test_report_persistence_detects_nondeterminism(self):
        with self.assertRaisesRegex(AuditValidationError, "report determinism"):
            _gate_report_determinism((b"a", b"b"), (b"c", b"b"))


class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_valid_calibration_returns_deterministic_summary(self):
        case = valid_calibration_case()
        self.assertEqual(
            verify_calibration_acceptance(**case),
            verify_calibration_acceptance(**case),
        )

    def test_rejects_calibration_bounds_discovery_and_identity(self):
        with self.assertRaisesRegex(AuditValidationError, "outside 30..40"):
            _require_calibration_source_count({"sourceIds": list(range(29))})
        case = valid_calibration_case()
        page = case["freeze"]["frozenPageDecisions"][0]
        next(row for row in case["decisions"] if row["sourceId"] == page["sourceId"])["visualReviewer"] = "changed"
        with self.assertRaisesRegex(AuditValidationError, "page discovery changed"):
            _require_frozen_discovery_unchanged(case["freeze"], case["decisions"])
        entry = valid_calibration_case()["ledger"][-1]
        entry["secondaryReviewer"] = " reviewer-a "
        with self.assertRaisesRegex(AuditValidationError, "not independent"):
            _require_independent_reviewers(entry)


class VerifierCliTests(unittest.TestCase):
    def _arguments(self):
        return [
            "--freeze", "freeze.json", "--pdf", "source.pdf",
            "--index", "index.json", "--visuals", "visuals.json",
            "--decisions", "decisions.json", "--ledger", "ledger.json",
            "--policy", "policy.json", "--analysis", "analysis.md",
            "--course-outline", "outline.md", "--image-dir", "images",
            "--package-dir", "package", "--review-evidence-root", "evidence",
        ]

    def test_cli_converts_string_paths_before_loading(self):
        def assert_path_arguments(args):
            for name in (
                "freeze", "pdf", "index", "visuals", "decisions", "ledger",
                "policy", "analysis", "course_outline", "image_dir",
                "package_dir", "review_evidence_root",
            ):
                self.assertIsInstance(getattr(args, name), pathlib.Path)
            return {}

        with mock.patch(
            "scripts.source_audit.verify_calibration_acceptance._load_verifier_case",
            side_effect=assert_path_arguments,
        ), mock.patch(
            "scripts.source_audit.verify_calibration_acceptance.verify_calibration_acceptance",
            return_value={},
        ):
            self.assertEqual(verifier_main(self._arguments()), 0)

    def test_real_evidence_layout_protects_formal_inputs_not_freeze_or_package(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            evidence_root = root / "tmp" / "source-audit"
            freeze = evidence_root / "review-freezes" / "calibration.json"
            package = evidence_root / "review-packages" / "calibration"
            freeze.parent.mkdir(parents=True)
            package.mkdir(parents=True)
            (evidence_root / "review-patches").mkdir()
            formal = root / "reference"
            formal.mkdir()
            args = SimpleNamespace(
                freeze=freeze,
                pdf=formal / "source.pdf",
                index=formal / "index.json",
                visuals=formal / "visuals.json",
                decisions=formal / "decisions.json",
                ledger=formal / "ledger.json",
                policy=formal / "policy.json",
                analysis=formal / "analysis.md",
                course_outline=formal / "outline.md",
                image_dir=root / "tmp" / "pdfs",
                package_dir=package,
                review_evidence_root=evidence_root,
            )

            def assert_protected_roles(ledger, evidence, protected):
                self.assertEqual(evidence, evidence_root)
                self.assertNotIn("freeze", protected)
                self.assertNotIn("package_dir", protected)
                self.assertEqual(
                    set(protected),
                    {
                        "pdf", "index", "visuals", "decisions", "ledger",
                        "policy", "analysis", "course_outline", "image_dir",
                    },
                )
                return {}

            with mock.patch(
                "scripts.source_audit.verify_calibration_acceptance.load_json",
                side_effect=[{}, {}, [], [], [], {}],
            ), mock.patch(
                "scripts.source_audit.verify_calibration_acceptance.parse_markdown_sections",
                return_value=[],
            ), mock.patch(
                "scripts.source_audit.verify_calibration_acceptance.build_must_keep_inventory",
                return_value=[],
            ), mock.patch(
                "scripts.source_audit.verify_calibration_acceptance._load_existing_review_batch_evidence",
                side_effect=assert_protected_roles,
            ), mock.patch(
                "scripts.source_audit.verify_calibration_acceptance.build_current_batch_evidence",
                return_value={},
            ):
                _load_verifier_case(args)

    def test_path_validation_returns_two_before_loading(self):
        self.assertEqual(verifier_main([
            "--freeze", "same", "--pdf", "same", "--index", "index",
            "--visuals", "visuals", "--decisions", "decisions", "--ledger", "ledger",
            "--policy", "policy", "--analysis", "analysis", "--course-outline", "outline",
            "--image-dir", "images", "--package-dir", "package",
            "--review-evidence-root", "evidence",
        ]), 2)
