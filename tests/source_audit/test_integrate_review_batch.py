from __future__ import annotations

import copy
import os
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.integrate_review_batch import (
    _accepted_retry,
    _apply_command,
    _assert_unreviewed_delta,
    _build_parser,
    _compare_command,
    _disagreement_ledger_rows,
    _records_by_source_id,
    _replace_records_preserving_order,
    _render_accepted_reports,
    _require_agreed_fields_unchanged,
    _require_exact_secondary_expansion,
    _require_resolution_batch_id,
    _require_resolution_final_records,
    _require_resolution_notes,
    _require_secondary_coverage,
    _require_unique_resolution_ids,
    _resolve_complete_records,
    _validate_accepted_retry,
    _validate_candidate_state,
    _validate_critical_omissions,
    _validate_current_evidence,
    _validate_disagreement_ledger_rows,
    _validate_integration_paths,
    _validate_retry_reports,
    _write_apply_outputs,
    _write_comparison_outputs,
    build_comparison_artifacts,
    integrate_review_batch,
    main,
    review_input_fingerprint,
)
from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.review_ledger import required_secondary_source_ids
from scripts.source_audit.review_batches import compare_review_patches
from scripts.source_audit.transactions import deterministic_json_bytes, sha256_json
from tests.source_audit.editorial_fixtures import (
    sample_calibration_decisions,
    sample_integration_case as _raw_integration_case,
)


def _fail_at(real_replace, failure_position):
    calls = 0

    def replace(source, target):
        nonlocal calls
        calls += 1
        if calls == failure_position:
            raise OSError("injected replacement failure")
        return real_replace(source, target)

    return replace


def sample_integration_case(variant=None):
    case = _raw_integration_case(variant)
    arguments = case["arguments"]
    source_map = source_items_by_id(arguments["index"], arguments["visuals"])
    # The shared fixture represents the all-source post-discovery state used
    # by ledger tests.  Task 7 needs a valid one-page frozen review batch.
    if variant not in {"unexpanded-stratum", "missing-secondary"}:
        freeze = arguments["freeze"]
        source_ids = sorted(
            source_id for source_id, item in source_map.items()
            if item["pdfPage"] == 20
        )
        freeze["sourceIds"] = source_ids
        freeze["freezeSha256"] = sha256_json({
            key: value for key, value in freeze.items()
            if key != "freezeSha256"
        })
        for patch_name in ("primary_patch", "secondary_patch"):
            patch = arguments[patch_name]
            patch["changes"] = [
                row for row in patch["changes"]
                if row["sourceId"] in source_ids
            ]
            patch["evidenceHashes"]["freezeSha256"] = freeze["freezeSha256"]
    return {
        **case,
        **arguments,
        "primaryPatch": arguments["primary_patch"],
        "secondaryPatch": arguments["secondary_patch"],
        "currentEvidence": arguments["current_evidence_hashes"],
        "mustKeepInventory": arguments["must_keep_inventory"],
        "sourceMap": source_map,
        "expectedExpandedSecondaryIds": list(arguments["freeze"]["sourceIds"]),
    }


def sample_partial_secondary_case():
    case = sample_integration_case()
    primary = copy.deepcopy(case["primaryPatch"])
    secondary = copy.deepcopy(case["secondaryPatch"])
    if len(primary["changes"]) < 2:
        raise AssertionError("partial-secondary fixture requires two primary records")
    unsampled = primary["changes"][-1]["sourceId"]
    secondary["changes"] = [
        row for row in secondary["changes"] if row["sourceId"] != unsampled
    ]
    return {
        **case,
        "primaryPatch": primary,
        "secondaryPatch": secondary,
        "disagreements": compare_review_patches(primary, secondary),
        "requiredSecondaryIds": sorted(row["sourceId"] for row in secondary["changes"]),
        "unsampledSourceId": unsampled,
    }


class IntegrationResolutionTests(unittest.TestCase):
    def test_resolution_contract_rejections(self):
        case = sample_integration_case()
        bad = copy.deepcopy(case["resolution"])
        bad["batchId"] = "calibration-999"
        with self.assertRaisesRegex(AuditValidationError, "batchId mismatch"):
            _require_resolution_batch_id(case["freeze"], bad)
        duplicate = copy.deepcopy(case["resolution"])
        duplicate["resolutions"].append(copy.deepcopy(duplicate["resolutions"][0]))
        with self.assertRaisesRegex(AuditValidationError, "duplicate resolution sourceId"):
            _require_unique_resolution_ids(duplicate)
        blank = copy.deepcopy(case["resolution"])
        blank["resolutions"][0]["finalRecord"] = None
        with self.assertRaisesRegex(AuditValidationError, "finalRecord must be an object"):
            _require_resolution_final_records(blank)
        blank = copy.deepcopy(case["resolution"])
        blank["resolutions"][0]["resolutionNote"] = " "
        with self.assertRaisesRegex(AuditValidationError, "requires note"):
            _require_resolution_notes(blank)

    def test_resolution_rejects_agreed_field_change(self):
        case = sample_integration_case()
        primary = _records_by_source_id(case["primaryPatch"])
        secondary = _records_by_source_id(case["secondaryPatch"])
        row = copy.deepcopy(case["resolution"]["resolutions"][0])
        row["finalRecord"]["reason"] = "双方未同意的额外改写"
        with self.assertRaisesRegex(AuditValidationError, "changed agreed field"):
            _require_agreed_fields_unchanged(row, primary[row["sourceId"]], secondary[row["sourceId"]])

    def test_critical_omissions_require_exact_double_reviewed_rows(self):
        case = sample_integration_case()
        source_id = case["freeze"]["sourceIds"][0]
        valid = {"batchId": case["freeze"]["batchId"], "resolutions": [], "criticalOmissions": [{"sourceId": source_id, "note": "二审确认正文遗漏了关键限制条件"}]}
        _validate_critical_omissions(case["freeze"], valid, {source_id})
        with self.assertRaisesRegex(AuditValidationError, "duplicate critical omission"):
            _validate_critical_omissions(case["freeze"], {**valid, "criticalOmissions": valid["criticalOmissions"] * 2}, {source_id})


class IntegrationRejectionTests(unittest.TestCase):
    def test_secondary_and_unreviewed_rejections(self):
        case = sample_integration_case("missing-secondary")
        required = required_secondary_source_ids(case["freeze"], case["primaryPatch"], case["sourceMap"], case["policy"])
        with self.assertRaisesRegex(AuditValidationError, "secondary patch missing required IDs"):
            _require_secondary_coverage(required, set(_records_by_source_id(case["secondaryPatch"])))
        case = sample_integration_case("unexpanded-stratum")
        with self.assertRaisesRegex(AuditValidationError, "secondary expansion mismatch"):
            _require_exact_secondary_expansion(case["expectedExpandedSecondaryIds"], set(_records_by_source_id(case["secondaryPatch"])))
        before = sample_calibration_decisions()
        after = copy.deepcopy(before)
        after[0]["reviewState"] = "reviewed"
        with self.assertRaisesRegex(AuditValidationError, "unreviewed delta mismatch"):
            _assert_unreviewed_delta(before, after, {})

    def test_rejects_reviewed_id_and_stale_evidence(self):
        before = sample_calibration_decisions()
        before[0]["reviewState"] = "reviewed"
        replacements = {before[0]["sourceId"]: {**before[0], "reason": "不允许覆盖既有审核结论"}}
        with self.assertRaisesRegex(AuditValidationError, "cannot overwrite reviewed IDs"):
            _assert_unreviewed_delta(before, _replace_records_preserving_order(before, replacements), replacements)
        case = sample_integration_case()
        current = copy.deepcopy(case["currentEvidence"])
        current["pdfSha256"] = "f" * 64
        with self.assertRaisesRegex(AuditValidationError, "pdfSha256 mismatch"):
            _validate_current_evidence(case["freeze"], current)

    def test_candidate_rejects_bad_ledger_and_must_keep(self):
        case = sample_integration_case("invalid-ledger")
        with self.assertRaisesRegex(AuditValidationError, "genesis|ledger"):
            _validate_candidate_state(case["index"], case["visuals"], case["decisions"], case["ledger"], case["policy"], case["mustKeepInventory"])
        case = sample_integration_case("invalid-must-keep-coverage")
        candidate = _replace_records_preserving_order(case["decisions"], _records_by_source_id(case["primaryPatch"]))
        with self.assertRaisesRegex(AuditValidationError, "mustKeep|route"):
            _validate_candidate_state(case["index"], case["visuals"], candidate, case["ledger"], case["policy"], case["mustKeepInventory"])


class IntegrationRecoveryTests(unittest.TestCase):
    def test_fingerprint_and_retry_evidence(self):
        case = sample_integration_case()
        fingerprint = review_input_fingerprint(case["freeze"], case["primaryPatch"], case["secondaryPatch"], case["resolution"])
        with self.assertRaisesRegex(AuditValidationError, "inputFingerprint mismatch"):
            _accepted_retry([{"entryType": "review", "batchId": case["freeze"]["batchId"], "inputFingerprint": "f" * 64}], case["freeze"]["batchId"], fingerprint)
        current = copy.deepcopy(case["currentEvidence"])
        current["pageImages"][0]["sha256"] = "f" * 64
        with self.assertRaisesRegex(AuditValidationError, "pageImages"):
            _validate_accepted_retry(case["freeze"], current, case["index"], case["visuals"], case["decisions"], case["ledger"], case["policy"])

    def test_identical_retry_is_read_only_and_returns_existing_entry(self):
        case = sample_integration_case()
        accepted = integrate_review_batch(**case["arguments"])
        retry = integrate_review_batch(**{**case["arguments"], "decisions": accepted["decisions"], "ledger": accepted["ledger"]})
        self.assertEqual(retry["status"], "already-accepted")
        self.assertEqual(retry["entry"], accepted["ledger"][-1])

    def test_retry_rejects_stale_report_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            coverage, visual = root / "coverage.md", root / "visual.md"
            coverage.write_bytes(b"# stale\n")
            visual.write_bytes(b"# visual\n")
            with self.assertRaisesRegex(AuditValidationError, "coverage report bytes"):
                _validate_retry_reports(coverage, visual, "# coverage\n", "# visual\n")


class IntegrationLedgerDurabilityTests(unittest.TestCase):
    def test_durable_disagreement_rows(self):
        case = sample_integration_case()
        rows = _disagreement_ledger_rows(case["resolution"]["resolutions"])
        self.assertEqual(rows[0]["resolutionNote"], case["resolution"]["resolutions"][0]["resolutionNote"])
        rows[0]["resolutionNote"] = " "
        with self.assertRaisesRegex(AuditValidationError, "blank resolutionNote"):
            _validate_disagreement_ledger_rows(rows)


class IntegrationPartialReviewTests(unittest.TestCase):
    def test_unsampled_ids_use_primary_records(self):
        case = sample_partial_secondary_case()
        result = _resolve_complete_records(case["freeze"], case["primaryPatch"], case["secondaryPatch"], case["resolution"], case["disagreements"], set(case["requiredSecondaryIds"]))
        self.assertEqual(result[case["unsampledSourceId"]], _records_by_source_id(case["primaryPatch"])[case["unsampledSourceId"]])


class IntegrationComparisonTests(unittest.TestCase):
    def test_comparison_artifacts_are_deterministic_and_unfilled(self):
        case = sample_integration_case()
        first = build_comparison_artifacts(case["freeze"], case["primaryPatch"], case["secondaryPatch"], case["sourceMap"], case["policy"])
        second = build_comparison_artifacts(case["freeze"], case["primaryPatch"], case["secondaryPatch"], case["sourceMap"], case["policy"])
        self.assertEqual(deterministic_json_bytes(first[0]), deterministic_json_bytes(second[0]))
        self.assertTrue(all(row["finalRecord"] is None and row["resolutionNote"] == "" for row in first[1]["resolutions"]))

    def test_compare_rejects_stale_frozen_evidence_before_writes(self):
        mutations = (
            ("pdfSha256", "f" * 64),
            ("sourceIndexSha256", "f" * 64),
            ("baseDecisionsSha256", "f" * 64),
            ("baseLedgerSha256", "f" * 64),
            ("pageImages.0.sha256", "f" * 64),
        )
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            args = SimpleNamespace(
                disagreements_output=root / "disagreements.json",
                resolution_output=root / "resolution.json",
            )
            original = {
                args.disagreements_output: b"old-disagreements\n",
                args.resolution_output: b"old-resolution\n",
            }
            for field, value in mutations:
                with self.subTest(field=field):
                    case = sample_integration_case()
                    context = copy.deepcopy(case["arguments"])
                    if field == "pageImages.0.sha256":
                        context["current_evidence_hashes"]["pageImages"][0]["sha256"] = value
                    else:
                        context["current_evidence_hashes"][field] = value
                    for path in original:
                        path.unlink(missing_ok=True)
                    with self.assertRaises(AuditValidationError):
                        _compare_command(args, context)
                    self.assertFalse(args.disagreements_output.exists())
                    self.assertFalse(args.resolution_output.exists())
                    for path, contents in original.items():
                        path.write_bytes(contents)
                    with self.assertRaises(AuditValidationError):
                        _compare_command(args, context)
                    self.assertEqual(
                        {path: path.read_bytes() for path in original}, original,
                    )


class IntegrationTransactionTests(unittest.TestCase):
    def test_compare_and_apply_roll_back_all_targets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            report, template = root / "report.json", root / "template.json"
            original = {report: b"old-report\n", template: b"old-template\n"}
            real_replace = os.replace
            for position in (1, 2):
                for path, value in original.items(): path.write_bytes(value)
                with mock.patch("scripts.source_audit.transactions.os.replace", side_effect=_fail_at(real_replace, position)):
                    with self.assertRaisesRegex(OSError, "injected replacement failure"):
                        _write_comparison_outputs(report, template, {"batchId": "calibration-001", "disagreements": []}, {"batchId": "calibration-001", "resolutions": [], "criticalOmissions": []})
                self.assertEqual({path: path.read_bytes() for path in original}, original)
            paths = [root / name for name in ("decisions.json", "ledger.json", "coverage.md", "visual.md")]
            originals = [b"d\n", b"l\n", b"c\n", b"v\n"]
            for position in (1, 2, 3, 4):
                for path, value in zip(paths, originals, strict=True): path.write_bytes(value)
                with mock.patch("scripts.source_audit.transactions.os.replace", side_effect=_fail_at(real_replace, position)):
                    with self.assertRaisesRegex(OSError, "injected replacement failure"):
                        _write_apply_outputs(paths, [], [], "# coverage\n", "# visual\n")
                self.assertEqual([path.read_bytes() for path in paths], originals)


class IntegrationPathSafetyTests(unittest.TestCase):
    def test_cross_role_alias_is_rejected_before_read(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            freeze = root / "freeze.json"; freeze.write_text("not-json", encoding="utf-8")
            alias = root / "decisions.json"; alias.symlink_to(freeze)
            roles = {"freeze": freeze, "decisionsInput": alias, "decisionsOutput": alias, "ledgerInput": root / "ledger.json", "ledgerOutput": root / "ledger.json", "coverageOutput": root / "coverage.md", "visualOutput": root / "visual.md"}
            with self.assertRaisesRegex(AuditValidationError, "path alias"):
                _validate_integration_paths("apply", roles)
            package = root / "package"; package.mkdir()
            with self.assertRaisesRegex(AuditValidationError, "inside frozen evidence root"):
                _validate_integration_paths("apply", {"package_dir": package, "image_dir": root / "images", "coverageOutput": package / "coverage.md"})


class IntegrationCliTests(unittest.TestCase):
    def _common(self):
        return ["--freeze", "freeze.json", "--primary-patch", "primary.json", "--secondary-patch", "secondary.json", "--pdf", "source.pdf", "--index", "index.json", "--visuals", "visuals.json", "--decisions", "decisions.json", "--ledger", "ledger.json", "--policy", "policy.json", "--analysis", "analysis.md", "--course-outline", "outline.md", "--image-dir", "images", "--package-dir", "package"]

    def test_parser_and_main_dispatch(self):
        extras = {"compare": ["--disagreements-output", "diff.json", "--resolution-output", "resolution.json"], "validate-resolution": ["--resolution", "resolution.json", "--json"], "apply": ["--resolution", "resolution.json", "--coverage-report", "coverage.md", "--visual-report", "visual.md"]}
        command_paths = {
            "compare": ("disagreements_output", "resolution_output"),
            "validate-resolution": ("resolution",),
            "apply": ("resolution", "coverage_report", "visual_report"),
        }
        parser = _build_parser()
        for command, extra in extras.items():
            parsed = parser.parse_args([command, *self._common(), *extra])
            self.assertEqual(parsed.command, command)
            for name in command_paths[command]:
                self.assertIsInstance(getattr(parsed, name), pathlib.Path)
        with mock.patch("scripts.source_audit.integrate_review_batch._validate_integration_paths"), mock.patch("scripts.source_audit.integrate_review_batch._load_common_inputs", return_value={}):
            for command, extra in extras.items():
                target = "scripts.source_audit.integrate_review_batch._" + command.replace("-", "_") + "_command"
                with mock.patch(target, return_value={"status": "ok"}) as handler:
                    self.assertEqual(main([command, *self._common(), *extra]), 0)
                    handler.assert_called_once()
        with mock.patch("scripts.source_audit.integrate_review_batch._validate_integration_paths", side_effect=AuditValidationError("bad input")):
            self.assertEqual(main(["compare", *self._common(), *extras["compare"]]), 2)

    def test_compare_cli_converts_string_paths_before_loading(self):
        extra = [
            "--disagreements-output", "diff.json",
            "--resolution-output", "resolution.json",
        ]

        def assert_path_arguments(args):
            for name in (
                "freeze", "primary_patch", "secondary_patch", "pdf", "index",
                "visuals", "decisions", "ledger", "policy", "analysis",
                "course_outline", "image_dir", "package_dir",
                "disagreements_output", "resolution_output",
            ):
                self.assertIsInstance(getattr(args, name), pathlib.Path)
            return {}

        with mock.patch(
            "scripts.source_audit.integrate_review_batch._validate_integration_paths",
        ), mock.patch(
            "scripts.source_audit.integrate_review_batch._load_common_inputs",
            side_effect=assert_path_arguments,
        ), mock.patch(
            "scripts.source_audit.integrate_review_batch._compare_command",
            return_value={"status": "ok"},
        ):
            self.assertEqual(
                main(["compare", *self._common(), *extra]),
                0,
            )


class IntegrationReportTests(unittest.TestCase):
    def test_expanded_renderers_receive_full_context(self):
        values = (
            {"pages": []}, [{"sourceId": "page-001"}], [],
            [{"entryType": "genesis"}], {"lessonIds": []},
            [{"mustKeepId": "course-objective-0-1"}], "a" * 64,
        )
        with mock.patch(
            "scripts.source_audit.integrate_review_batch.render_coverage_matrix",
            return_value="# coverage\n",
        ) as coverage, mock.patch(
            "scripts.source_audit.integrate_review_batch.render_visual_asset_index",
            return_value="# visual\n",
        ) as visual:
            reports = _render_accepted_reports(*values)
        coverage.assert_called_once_with(*values)
        visual.assert_called_once_with(*values[:-1])
        self.assertEqual(set(reports), {"coverage", "visual"})

    def test_apply_result_contains_deterministic_legacy_reports(self):
        result = integrate_review_batch(**sample_integration_case()["arguments"])
        self.assertIn("#", result["coverage"])
        self.assertIn("#", result["visual"])
