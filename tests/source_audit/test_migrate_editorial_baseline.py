from __future__ import annotations

import copy
import json
import os
import pathlib
import tempfile
import unittest
from unittest import mock

from scripts.source_audit.migrate_editorial_baseline import (
    _assert_preserved_fields,
    _build_parser,
    _validate_migration_paths,
    _validate_migration_preconditions,
    _write_migration_outputs,
    main,
    migrate,
    migrate_with_genesis,
)
from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.decisions import _validate_catalog_page_chapters
from scripts.source_audit.build_reports import main as build_reports_main
from scripts.source_audit.transactions import sha256_json
from tests.source_audit.editorial_fixtures import (
    discovery_cli_workspace,
    sample_index,
    sample_legacy_decisions,
    sample_page20_index,
    sample_policy,
    sample_visual,
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


def _preface_source_map(item, *, item_page=10):
    return {
        f"page-{item_page:03d}": {
            "sourceId": f"page-{item_page:03d}",
            "kind": "page",
            "pdfPage": item_page,
            "chapter": None,
        },
        "page-015": {
            "sourceId": "page-015",
            "kind": "page",
            "pdfPage": 15,
            "chapter": 1,
        },
        item["sourceId"]: item,
    }


class MigrationContractTests(unittest.TestCase):
    def test_migration_adds_schema_without_making_editorial_decisions(
        self,
    ):
        legacy = sample_legacy_decisions()
        migrated = migrate(sample_index(), [], legacy)
        self.assertEqual(len(migrated), len(legacy))
        self.assertTrue(
            all(
                decision["reviewState"] == "unreviewed"
                for decision in migrated
            )
        )
        self.assertTrue(
            all(
                decision["disposition"] == "unreviewed"
                for decision in migrated
            )
        )

    def test_migration_preserves_existing_editorial_fields(self):
        old = {
            "sourceId": "figure-1-2",
            "reason": "既有原因",
            "lessonIds": ["1-1"],
            "markdownRefs": ["reference/book-analysis.md:52-78"],
            "captionConflictNote": "既有冲突说明",
            "visualClass": "semantic-core",
            "visualHandling": "redraw",
        }
        new = {
            **old,
            "reviewState": "unreviewed",
            "disposition": "unreviewed",
        }
        _assert_preserved_fields(old, new)
        changed = {**new, "reason": "被覆盖"}
        with self.assertRaisesRegex(
            AuditValidationError, "overwrote reason"
        ):
            _assert_preserved_fields(old, changed)

    def test_migration_is_idempotent(self):
        first = migrate(
            sample_index(), [], sample_legacy_decisions()
        )
        second = migrate(sample_index(), [], first)
        self.assertEqual(second, first)

    def test_migration_creates_one_fixed_genesis_and_is_idempotent(
        self,
    ):
        index = sample_page20_index()
        legacy = sample_legacy_decisions(index)
        decisions, ledger = migrate_with_genesis(
            index,
            [],
            legacy,
            [],
            sample_policy(),
        )
        self.assertEqual(len(ledger), 1)
        self.assertEqual(ledger[0]["entryType"], "genesis")
        self.assertEqual(
            ledger[0]["acceptedDecisionsSha256"],
            sha256_json(decisions),
        )
        self.assertEqual(
            migrate_with_genesis(
                index,
                [],
                decisions,
                ledger,
                sample_policy(),
            ),
            (decisions, ledger),
        )

    def test_preface_numbered_item_matches_unchaptered_page(self):
        _validate_catalog_page_chapters(_preface_source_map({
            "sourceId": "figure-0-1",
            "kind": "figure",
            "number": "0-1",
            "pdfPage": 10,
            "chapter": 0,
        }))

    def test_rejects_nonfigure_chapter_zero_preface_item(self):
        for kind in ("table", "experiment", "visual"):
            with self.subTest(kind=kind):
                with self.assertRaisesRegex(
                    AuditValidationError, "catalog chapter/page mismatch"
                ):
                    _validate_catalog_page_chapters(_preface_source_map({
                        "sourceId": f"{kind}-0-1",
                        "kind": kind,
                        "number": "0-1",
                        "pdfPage": 10,
                        "chapter": 0,
                    }))

    def test_rejects_chapter_zero_figure_after_first_chapter_page(self):
        with self.assertRaisesRegex(
            AuditValidationError, "catalog chapter/page mismatch"
        ):
            _validate_catalog_page_chapters(_preface_source_map(
                {
                    "sourceId": "figure-0-2",
                    "kind": "figure",
                    "number": "0-2",
                    "pdfPage": 20,
                    "chapter": 0,
                },
                item_page=20,
            ))

    def test_rejects_preface_figure_with_mismatched_numbering(self):
        with self.assertRaisesRegex(
            AuditValidationError, "catalog chapter/page mismatch"
        ):
            _validate_catalog_page_chapters(_preface_source_map({
                "sourceId": "figure-0-1",
                "kind": "figure",
                "number": "0-2",
                "pdfPage": 10,
                "chapter": 0,
            }))


class MigrationPreconditionTests(unittest.TestCase):
    def test_rejects_nonempty_visual_catalog(self):
        with self.assertRaisesRegex(
            AuditValidationError, "visual catalog must be empty"
        ):
            _validate_migration_preconditions(
                [sample_visual()],
                sample_legacy_decisions(),
                834,
                834,
            )

    def test_rejects_wrong_source_count(self):
        with self.assertRaisesRegex(
            AuditValidationError, "source count mismatch"
        ):
            _validate_migration_preconditions(
                [],
                sample_legacy_decisions(),
                835,
                834,
            )

    def test_rejects_reviewed_baseline_record(self):
        decisions = sample_legacy_decisions()
        decisions[0]["reviewState"] = "reviewed"
        with self.assertRaisesRegex(
            AuditValidationError,
            "unreviewed count mismatch|reviewed decision",
        ):
            _validate_migration_preconditions(
                [],
                decisions,
                len(decisions),
                len(decisions),
            )


class MigrationPathSafetyTests(unittest.TestCase):
    def test_rejects_cross_file_alias_before_read(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            index = root / "index.json"
            index.write_text("not-json", encoding="utf-8")
            decisions = root / "decisions.json"
            decisions.symlink_to(index)
            roles = {
                "index": index,
                "visuals": root / "visuals.json",
                "decisionsInput": decisions,
                "decisionsOutput": decisions,
                "ledgerInput": root / "ledger.json",
                "ledgerOutput": root / "ledger.json",
                "policy": root / "policy.json",
            }
            with self.assertRaisesRegex(
                AuditValidationError, "path alias"
            ):
                _validate_migration_paths(roles)


class MigrationTransactionTests(unittest.TestCase):
    def test_two_file_migration_rolls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            decisions_path = root / "decisions.json"
            ledger_path = root / "ledger.json"
            originals = {
                decisions_path: b"old-decisions\n",
                ledger_path: b"old-ledger\n",
            }
            real_replace = os.replace
            for failure_position in (1, 2):
                with self.subTest(failure_position=failure_position):
                    for path, content in originals.items():
                        path.write_bytes(content)
                    with mock.patch(
                        "scripts.source_audit.transactions.os.replace",
                        side_effect=_fail_at(
                            real_replace, failure_position
                        ),
                    ):
                        with self.assertRaisesRegex(
                            OSError, "injected replacement failure"
                        ):
                            _write_migration_outputs(
                                decisions_path,
                                ledger_path,
                                [{"sourceId": "page-001"}],
                                [{"entryType": "genesis"}],
                            )
                    self.assertEqual(
                        {
                            path: path.read_bytes()
                            for path in originals
                        },
                        originals,
                    )


class MigrationCliTests(unittest.TestCase):
    def test_o94_parser_dispatch_and_validation_exit_code(self):
        argv = [
            "--index", "index.json",
            "--visuals", "visuals.json",
            "--decisions", "decisions.json",
            "--ledger", "ledger.json",
            "--policy", "policy.json",
            "--expected-source-count", "834",
            "--expected-unreviewed-count", "834",
        ]
        parsed = _build_parser().parse_args(argv)
        self.assertEqual(parsed.expected_source_count, 834)
        with mock.patch(
            "scripts.source_audit.migrate_editorial_baseline."
            "_validate_migration_paths",
            side_effect=AuditValidationError("path alias"),
        ):
            self.assertEqual(main(argv), 2)

    def test_cli_migrates_path_arguments_from_parser(self):
        index = sample_page20_index()
        decisions = sample_legacy_decisions(index)
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            paths = {
                "index": root / "index.json",
                "visuals": root / "visuals.json",
                "decisions": root / "decisions.json",
                "ledger": root / "ledger.json",
                "policy": root / "policy.json",
            }
            values = {
                "index": index,
                "visuals": [],
                "decisions": decisions,
                "ledger": [],
                "policy": sample_policy(),
            }
            for key, path in paths.items():
                path.write_text(json.dumps(values[key]), encoding="utf-8")
            argv = [
                flag
                for key, flag in (
                    ("index", "--index"),
                    ("visuals", "--visuals"),
                    ("decisions", "--decisions"),
                    ("ledger", "--ledger"),
                    ("policy", "--policy"),
                )
                for flag in (flag, str(paths[key]))
            ] + [
                "--expected-source-count", str(len(decisions)),
                "--expected-unreviewed-count", str(len(decisions)),
            ]
            self.assertEqual(main(argv), 0)
            self.assertEqual(
                len(json.loads(paths["ledger"].read_text(encoding="utf-8"))),
                1,
            )

    def test_formal_report_cli_accepts_parser_string_paths(self):
        repository = pathlib.Path(__file__).resolve().parents[2]
        with discovery_cli_workspace(accepted_review=True) as workspace, \
                tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            evidence_root = workspace.evidence_root
            self.assertTrue((evidence_root / "review-freezes").is_dir())
            self.assertTrue((evidence_root / "review-patches").is_dir())
            argv = [
                "--pdf", str(repository / "reference/原始文档.pdf"),
                "--index", str(workspace.index),
                "--unnumbered-visuals", str(workspace.visuals),
                "--decisions", str(workspace.decisions),
                "--review-ledger", str(workspace.ledger),
                "--policy", str(workspace.policy),
                "--analysis", "reference/book-analysis.md",
                "--course-outline", "docs/project/02-课程大纲.md",
                "--review-evidence-root", str(evidence_root),
                "--coverage-report", str(root / "coverage.md"),
                "--visual-report", str(root / "visual.md"),
            ]
            self.assertEqual(build_reports_main(argv), 0)
            self.assertTrue((root / "coverage.md").is_file())
            self.assertTrue((root / "visual.md").is_file())
