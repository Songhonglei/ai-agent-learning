import hashlib
import io
import os
import shutil
import tempfile
import unittest

from scripts.source_audit.decisions import initial_editorial_decision
from tests.source_audit.editorial_fixtures import sample_page20_index
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

from pypdf import PdfReader

from scripts.source_audit.build_reports import (
    initial_decision,
    initialize_decisions,
    main,
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.models import (
    AuditValidationError,
    write_json_deterministic,
)


class BuildReportsTests(unittest.TestCase):
    def test_partial_formal_options_reject_before_report_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            coverage = root / "coverage.md"
            visual = root / "visual.md"
            coverage.write_bytes(b"old coverage\n")
            visual.write_bytes(b"old visual\n")
            stderr = io.StringIO()
            with redirect_stderr(stderr):
                result = main([
                    "--index", str(root / "index.json"),
                    "--decisions", str(root / "decisions.json"),
                    "--coverage-report", str(coverage),
                    "--visual-report", str(visual),
                    "--review-evidence-root", str(root / "evidence"),
                ])
            self.assertEqual(result, 2)
            self.assertIn("formal report options", stderr.getvalue())
            self.assertEqual(coverage.read_bytes(), b"old coverage\n")
            self.assertEqual(visual.read_bytes(), b"old visual\n")

    def test_initial_decision_delegates_to_editorial_contract(self):
        item = {"sourceId": "page-001", "kind": "page", "pdfPage": 1, "chapter": 1}
        self.assertEqual(initial_decision(item), initial_editorial_decision(item))

    APPROVED_SOURCE = Path(__file__).resolve().parents[2] / "reference/原始文档.pdf"

    def setUp(self):
        self.index = {
            "pages": [{"sourceId": "page-001", "kind": "page", "pdfPage": 1}],
            "outline": [],
            "numberedItems": [
                {
                    "sourceId": "figure-1-2",
                    "kind": "figure",
                    "number": "1-2",
                    "pdfPage": 20,
                    "printedPage": 12,
                    "title": "上下文消融实验设计",
                    "symbolCounts": {"check": 22, "cross": 6, "triangle": 2, "star": 2},
                }
            ],
        }

    def test_initial_decision_uses_the_unreviewed_record_shape(self):
        self.assertEqual(
            initial_decision(self.index["pages"][0]),
            initial_editorial_decision(self.index["pages"][0]),
        )

    def test_initialize_decisions_never_overwrites_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "decisions.json"
            path.write_text('[{"sourceId":"kept"}]\n', encoding="utf-8")
            decisions = initialize_decisions(self.index, path)
            self.assertEqual(decisions, [{"sourceId": "kept"}])
            self.assertEqual(
                path.read_text(encoding="utf-8"), '[{"sourceId":"kept"}]\n'
            )

    def test_initialize_decisions_writes_records_in_source_id_order(self):
        index = {
            "pages": [{"sourceId": "page-002", "kind": "page"}],
            "outline": [{"sourceId": "outline-001-001", "kind": "outline"}],
            "numberedItems": [{"sourceId": "figure-1-1", "kind": "figure"}],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "nested" / "decisions.json"
            decisions = initialize_decisions(index, path)

        self.assertEqual(
            [decision["sourceId"] for decision in decisions],
            ["figure-1-1", "outline-001-001", "page-002"],
        )

    def test_reports_show_incomplete_count_and_semantic_symbols(self):
        decisions = [
            {
                "sourceId": item["sourceId"],
                "disposition": "unreviewed",
                "reason": "",
                "lessonIds": [],
                "markdownRefs": [],
                "visualClass": None,
                "visualHandling": None,
                "reviewState": "unreviewed",
            }
            for item in self.index["pages"] + self.index["numberedItems"]
        ]
        coverage = render_coverage_matrix(self.index, decisions)
        visual = render_visual_asset_index(self.index, decisions)
        self.assertIn("未检查：2", coverage)
        self.assertIn("22次正确标记", visual)
        self.assertIn("6次错误标记", visual)
        self.assertIn("2次部分成立标记", visual)
        self.assertIn("2颗难度星", visual)

    def test_reports_list_conflicts_with_selected_caption_and_all_occurrences(self):
        index = {
            "pages": [],
            "outline": [],
            "numberedItems": [
                {
                    "sourceId": "figure-2-1",
                    "kind": "figure",
                    "number": "2-1",
                    "pdfPage": 40,
                    "printedPage": 32,
                    "title": "图选中 | 标题",
                    "captionConflict": True,
                    "occurrences": [
                        {
                            "pdfPage": 40,
                            "printedPage": 32,
                            "title": "图选中 | 标题",
                        },
                        {
                            "pdfPage": 39,
                            "printedPage": 31,
                            "title": "图候选 | 一",
                        },
                    ],
                },
                {
                    "sourceId": "experiment-1-1",
                    "kind": "experiment",
                    "number": "1-1",
                    "pdfPage": 30,
                    "printedPage": 22,
                    "title": "实验选中",
                    "captionConflict": True,
                    "occurrences": [
                        {
                            "pdfPage": 30,
                            "printedPage": 22,
                            "title": "实验选中",
                        },
                        {
                            "pdfPage": 29,
                            "printedPage": 21,
                            "title": "实验候选",
                        },
                    ],
                },
            ],
        }
        decisions = [
            {
                **initial_decision(index["numberedItems"][0]),
                "captionConflictResolved": True,
                "captionConflictNote": "人工\r\n确认 | 正确",
            },
            initial_decision(index["numberedItems"][1]),
        ]

        coverage = render_coverage_matrix(index, decisions)
        visual = render_visual_asset_index(index, decisions)

        self.assertIn("标题冲突：2；未解决：1", coverage)
        self.assertLess(
            coverage.index("experiment-1-1"),
            coverage.index("figure-2-1"),
        )
        self.assertIn(
            "PDF 29 / 印刷页 21 / 实验候选<br>PDF 30 / 印刷页 22 / 实验选中",
            coverage,
        )
        self.assertIn("图选中 \\| 标题", coverage)
        self.assertIn("图候选 \\| 一", coverage)
        self.assertIn("人工<br>确认 \\| 正确", coverage)
        self.assertIn("标题冲突：1；未解决：0", visual)
        self.assertIn("figure-2-1", visual)
        self.assertNotIn("experiment-1-1", visual)

    def test_normal_cli_writes_reports_for_unresolved_caption_conflicts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            index = {
                "pages": [],
                "outline": [],
                "numberedItems": [
                    {
                        "sourceId": "figure-8-3",
                        "kind": "figure",
                        "number": "8-3",
                        "pdfPage": 240,
                        "printedPage": 232,
                        "title": "持续进化的四种更新方式",
                        "captionConflict": True,
                        "occurrences": [
                            {
                                "pdfPage": 239,
                                "printedPage": 231,
                                "title": "展示了这四种方式及其关系。",
                            },
                            {
                                "pdfPage": 240,
                                "printedPage": 232,
                                "title": "持续进化的四种更新方式",
                            },
                        ],
                    }
                ],
                "pdfPath": str(self.APPROVED_SOURCE),
            }
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "source-coverage-matrix.md",
                "visual": root / "visual-asset-index.md",
            }
            write_json_deterministic(paths["index"], index)
            write_json_deterministic(
                paths["decisions"],
                [initial_decision(index["numberedItems"][0])],
            )
            stderr = io.StringIO()

            with redirect_stderr(stderr):
                result = main(self._cli_arguments(paths))

            self.assertEqual(result, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertIn("标题冲突：1；未解决：1", paths["coverage"].read_text())
            self.assertIn("标题冲突：1；未解决：1", paths["visual"].read_text())

    def test_conflict_report_treats_blank_resolution_note_as_unresolved(self):
        item = {
            "sourceId": "figure-8-3",
            "kind": "figure",
            "number": "8-3",
            "pdfPage": 240,
            "printedPage": 232,
            "title": "持续进化的四种更新方式",
            "captionConflict": True,
            "occurrences": [],
        }
        report = render_coverage_matrix(
            {
                "pages": [],
                "outline": [],
                "numberedItems": [item],
            },
            [
                {
                    **initial_decision(item),
                    "captionConflictResolved": True,
                    "captionConflictNote": "   ",
                }
            ],
        )

        self.assertIn("标题冲突：1；未解决：1", report)
        self.assertIn("| 未解决 |", report)

    def test_complete_cli_reports_specific_combination_error_without_zero_count(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "source-coverage-matrix.md",
                "visual": root / "visual-asset-index.md",
            }
            write_json_deterministic(
                paths["index"],
                {**self.index, "pdfPath": str(self.APPROVED_SOURCE)},
            )
            write_json_deterministic(
                paths["decisions"],
                [
                    {
                        **initial_decision(self.index["pages"][0]),
                        "disposition": "included",
                        "reviewState": "reviewed",
                    },
                    {
                        **initial_decision(self.index["numberedItems"][0]),
                        "disposition": "included",
                        "lessonIds": ["lesson-01"],
                        "reviewState": "reviewed",
                    },
                ],
            )
            stderr = io.StringIO()

            with redirect_stderr(stderr):
                result = main(self._cli_arguments(paths) + ["--require-complete"])

            self.assertEqual(result, 2)
            self.assertEqual(
                stderr.getvalue(),
                "完成门禁失败：reviewed figure figure-1-2 requires "
                "visualClass and visualHandling\n",
            )
            self.assertNotIn("未检查：0", stderr.getvalue())
            self.assertTrue(paths["coverage"].is_file())
            self.assertTrue(paths["visual"].is_file())

    def test_complete_cli_reports_course_used_semantic_core_omit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "source-coverage-matrix.md",
                "visual": root / "visual-asset-index.md",
            }
            write_json_deterministic(
                paths["index"],
                {**self.index, "pdfPath": str(self.APPROVED_SOURCE)},
            )
            write_json_deterministic(
                paths["decisions"],
                [
                    {
                        **initial_decision(self.index["pages"][0]),
                        "disposition": "included",
                        "reviewState": "reviewed",
                    },
                    {
                        **initial_decision(self.index["numberedItems"][0]),
                        "disposition": "included",
                        "lessonIds": ["lesson-01"],
                        "visualClass": "semantic-core",
                        "visualHandling": "omit",
                        "reviewState": "reviewed",
                    },
                ],
            )
            stderr = io.StringIO()

            with redirect_stderr(stderr):
                result = main(self._cli_arguments(paths) + ["--require-complete"])

            self.assertEqual(result, 2)
            self.assertEqual(
                stderr.getvalue(),
                "完成门禁失败：semantic-core course visuals cannot be omitted\n",
            )
            self.assertTrue(paths["coverage"].is_file())
            self.assertTrue(paths["visual"].is_file())

    def test_complete_cli_rejects_blank_reason_without_changing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            item = {
                "sourceId": "figure-1-1",
                "kind": "figure",
                "number": "1-1",
                "pdfPage": 20,
                "printedPage": 12,
                "title": "有待人工核验的图",
            }
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "source-coverage-matrix.md",
                "visual": root / "visual-asset-index.md",
            }
            write_json_deterministic(
                paths["index"],
                {
                    "pages": [],
                    "outline": [],
                    "numberedItems": [item],
                    "pdfPath": str(self.APPROVED_SOURCE),
                },
            )
            write_json_deterministic(
                paths["decisions"],
                [
                    {
                        **initial_decision(item),
                        "disposition": "excluded",
                        "reason": " \t\n",
                        "visualClass": "semantic-core",
                        "visualHandling": "omit",
                        "reviewState": "reviewed",
                    }
                ],
            )
            paths["coverage"].write_bytes(b"existing coverage\n")
            paths["visual"].write_bytes(b"existing visual\n")
            before = {
                name: path.read_bytes()
                for name, path in paths.items()
                if name in {"decisions", "coverage", "visual"}
            }
            stdout = io.StringIO()
            stderr = io.StringIO()

            with redirect_stdout(stdout), redirect_stderr(stderr):
                result = main(self._cli_arguments(paths) + ["--require-complete"])

            self.assertEqual(result, 2)
            self.assertEqual(stdout.getvalue(), "")
            self.assertEqual(
                stderr.getvalue(),
                "完成门禁失败：excluded decisions require a non-empty string reason\n",
            )
            self.assertEqual(
                {
                    name: path.read_bytes()
                    for name, path in paths.items()
                    if name in {"decisions", "coverage", "visual"}
                },
                before,
            )

    def test_normal_cli_raises_for_blank_reason_without_changing_reports(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            item = {
                "sourceId": "page-001",
                "kind": "page",
                "pdfPage": 1,
            }
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "source-coverage-matrix.md",
                "visual": root / "visual-asset-index.md",
            }
            write_json_deterministic(
                paths["index"],
                {
                    "pages": [item],
                    "outline": [],
                    "numberedItems": [],
                    "pdfPath": str(self.APPROVED_SOURCE),
                },
            )
            write_json_deterministic(
                paths["decisions"],
                [
                    {
                        **initial_decision(item),
                        "disposition": "missing",
                        "reason": "\n",
                        "lessonIds": ["lesson-01"],
                        "reviewState": "reviewed",
                    }
                ],
            )
            paths["coverage"].write_bytes(b"existing coverage\n")
            paths["visual"].write_bytes(b"existing visual\n")
            reports_before = {
                name: path.read_bytes()
                for name, path in paths.items()
                if name in {"coverage", "visual"}
            }

            with self.assertRaisesRegex(
                AuditValidationError, "non-empty string reason"
            ):
                main(self._cli_arguments(paths))

            self.assertEqual(
                {
                    name: path.read_bytes()
                    for name, path in paths.items()
                    if name in {"coverage", "visual"}
                },
                reports_before,
            )

    def test_normal_cli_rejects_malformed_list_fields_before_creating_reports(self):
        for field in ("lessonIds", "markdownRefs"):
            with self.subTest(field=field):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    item = {
                        "sourceId": "page-001",
                        "kind": "page",
                        "pdfPage": 1,
                    }
                    paths = {
                        "index": root / "source-index.json",
                        "decisions": root / "coverage-decisions.json",
                        "coverage": root / "source-coverage-matrix.md",
                        "visual": root / "visual-asset-index.md",
                    }
                    write_json_deterministic(
                        paths["index"],
                        {
                            "pages": [item],
                            "outline": [],
                            "numberedItems": [],
                            "pdfPath": str(self.APPROVED_SOURCE),
                        },
                    )
                    write_json_deterministic(
                        paths["decisions"],
                        [
                            {
                                **initial_decision(item),
                                field: "not-an-array",
                            }
                        ],
                    )
                    decisions_before = paths["decisions"].read_bytes()
                    stdout = io.StringIO()
                    stderr = io.StringIO()

                    with self.assertRaisesRegex(
                        AuditValidationError, f"{field} must be an array"
                    ):
                        with redirect_stdout(stdout), redirect_stderr(stderr):
                            main(self._cli_arguments(paths))

                    self.assertEqual(stdout.getvalue(), "")
                    self.assertEqual(stderr.getvalue(), "")
                    self.assertEqual(paths["decisions"].read_bytes(), decisions_before)
                    self.assertFalse(paths["coverage"].exists())
                    self.assertFalse(paths["visual"].exists())

    def test_complete_cli_rejects_malformed_list_fields_without_changing_files(self):
        for field in ("lessonIds", "markdownRefs"):
            with self.subTest(field=field):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    item = {
                        "sourceId": "page-001",
                        "kind": "page",
                        "pdfPage": 1,
                    }
                    paths = {
                        "index": root / "source-index.json",
                        "decisions": root / "coverage-decisions.json",
                        "coverage": root / "source-coverage-matrix.md",
                        "visual": root / "visual-asset-index.md",
                    }
                    write_json_deterministic(
                        paths["index"],
                        {
                            "pages": [item],
                            "outline": [],
                            "numberedItems": [],
                            "pdfPath": str(self.APPROVED_SOURCE),
                        },
                    )
                    write_json_deterministic(
                        paths["decisions"],
                        [
                            {
                                **initial_decision(item),
                                "disposition": "included",
                                "reviewState": "reviewed",
                                field: "not-an-array",
                            }
                        ],
                    )
                    paths["coverage"].write_bytes(b"existing coverage\n")
                    paths["visual"].write_bytes(b"existing visual\n")
                    before = {
                        name: path.read_bytes()
                        for name, path in paths.items()
                        if name in {"decisions", "coverage", "visual"}
                    }
                    stdout = io.StringIO()
                    stderr = io.StringIO()

                    with redirect_stdout(stdout), redirect_stderr(stderr):
                        result = main(
                            self._cli_arguments(paths) + ["--require-complete"]
                        )

                    self.assertEqual(result, 2)
                    self.assertEqual(stdout.getvalue(), "")
                    self.assertEqual(
                        stderr.getvalue(),
                        f"完成门禁失败：{field} must be an array: page-001\n",
                    )
                    self.assertEqual(
                        {
                            name: path.read_bytes()
                            for name, path in paths.items()
                            if name in {"decisions", "coverage", "visual"}
                        },
                        before,
                    )

    def test_coverage_uses_stable_sorting_and_escapes_markdown_cells(self):
        index = {
            "pages": [
                {
                    "sourceId": "page-002",
                    "kind": "page",
                    "pdfPage": 2,
                    "title": "第二页",
                },
                {
                    "sourceId": "page-001",
                    "kind": "page",
                    "pdfPage": 1,
                    "title": "A | B",
                },
            ],
            "outline": [],
            "numberedItems": [],
        }
        decisions = [
            {
                "sourceId": "page-002",
                "disposition": "included",
                "reason": "",
                "lessonIds": [],
                "markdownRefs": [],
                "visualClass": None,
                "visualHandling": None,
                "reviewState": "reviewed",
            },
            {
                "sourceId": "page-001",
                "disposition": "excluded",
                "reason": "A | B",
                "lessonIds": ["lesson|1"],
                "markdownRefs": ["doc|one.md"],
                "visualClass": None,
                "visualHandling": None,
                "reviewState": "reviewed",
            },
        ]

        report = render_coverage_matrix(index, decisions)

        self.assertLess(report.index("page-001"), report.index("page-002"))
        self.assertIn("A \\| B", report)
        self.assertIn("lesson\\|1", report)
        self.assertIn("doc\\|one.md", report)

    def test_coverage_normalizes_all_line_endings_inside_markdown_cells(self):
        index = {
            "pages": [
                {
                    "sourceId": "page-001",
                    "kind": "page",
                    "pdfPage": 1,
                    "title": "标题\r\n换行\r结尾 | 管道",
                }
            ],
            "outline": [],
            "numberedItems": [],
        }
        decisions = [
            {
                "sourceId": "page-001",
                "disposition": "included",
                "reason": "原因\r\n甲\r乙\n丙 | 管道",
                "lessonIds": ["课时\r\n甲 | 一", "课时\r乙"],
                "markdownRefs": ["文档\n甲 | 一", "文档\r\n乙"],
                "visualClass": None,
                "visualHandling": None,
                "reviewState": "reviewed",
            }
        ]

        report = render_coverage_matrix(index, decisions)

        self.assertNotIn("\r", report)
        self.assertIn(
            "| page-001 | 1 | — | 标题<br>换行<br>结尾 \\| 管道 | 纳入 | "
            "课时<br>甲 \\| 一、课时<br>乙 | 文档<br>甲 \\| 一、文档<br>乙 | "
            "原因<br>甲<br>乙<br>丙 \\| 管道 |",
            report,
        )
        self.assertEqual(
            len([line for line in report.splitlines() if "page-001" in line]),
            1,
        )

    def test_reports_show_known_or_unknown_pdf_fingerprint(self):
        decisions = [
            {
                "sourceId": "page-001",
                "disposition": "unreviewed",
                "reason": "",
                "lessonIds": [],
                "markdownRefs": [],
                "visualClass": None,
                "visualHandling": None,
                "reviewState": "unreviewed",
            }
        ]
        unknown_index = {
            "pages": self.index["pages"],
            "outline": [],
            "numberedItems": [],
        }
        self.assertIn(
            "PDF 指纹：未提供或未知", render_coverage_matrix(unknown_index, decisions)
        )

        with tempfile.TemporaryDirectory() as directory:
            pdf_path = Path(directory) / "source.pdf"
            pdf_path.write_bytes(b"x")
            known_index = {
                "pages": self.index["pages"],
                "outline": [],
                "numberedItems": [],
                "pdfPath": str(pdf_path),
            }
            report = render_coverage_matrix(known_index, decisions)

        self.assertIn(
            "PDF 指纹：2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881",
            report,
        )

    def test_cli_returns_two_for_an_incomplete_required_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            index_path = root / "source-index.json"
            decisions_path = root / "coverage-decisions.json"
            coverage_path = root / "source-coverage-matrix.md"
            visual_path = root / "visual-asset-index.md"
            write_json_deterministic(
                index_path,
                {**self.index, "pdfPath": str(self.APPROVED_SOURCE)},
            )

            result = main(
                [
                    "--index",
                    str(index_path),
                    "--decisions",
                    str(decisions_path),
                    "--coverage-report",
                    str(coverage_path),
                    "--visual-report",
                    str(visual_path),
                    "--require-complete",
                ]
            )

            self.assertEqual(result, 2)
            self.assertTrue(coverage_path.is_file())
            self.assertTrue(visual_path.is_file())

    def test_cli_reports_all_incomplete_items_and_preserves_existing_decisions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "source-coverage-matrix.md",
                "visual": root / "visual-asset-index.md",
            }
            write_json_deterministic(
                paths["index"],
                {**self.index, "pdfPath": str(self.APPROVED_SOURCE)},
            )
            write_json_deterministic(
                paths["decisions"],
                [initial_decision(self.index["pages"][0])],
            )
            decisions_before = paths["decisions"].read_bytes()
            stderr = io.StringIO()

            with redirect_stderr(stderr):
                result = main(self._cli_arguments(paths) + ["--require-complete"])

            self.assertEqual(result, 2)
            self.assertEqual(stderr.getvalue(), "未检查：2\n")
            self.assertTrue(paths["coverage"].is_file())
            self.assertTrue(paths["visual"].is_file())
            self.assertEqual(paths["decisions"].read_bytes(), decisions_before)

    def test_cli_normal_mode_stays_silent_for_incomplete_items(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_cli_inputs(Path(directory))
            stderr = io.StringIO()

            with redirect_stderr(stderr):
                result = main(self._cli_arguments(paths))

            self.assertEqual(result, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertTrue(paths["coverage"].is_file())
            self.assertTrue(paths["visual"].is_file())

    def test_cli_rejects_pdf_path_alias_with_every_explicit_path_before_writing(self):
        for aliased_name in ("index", "decisions", "coverage", "visual"):
            with self.subTest(aliased_name=aliased_name):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    paths = {
                        "index": root / "source-index.json",
                        "decisions": root / "coverage-decisions.json",
                        "coverage": root / "source-coverage-matrix.md",
                        "visual": root / "visual-asset-index.md",
                    }
                    pdf_path = paths[aliased_name]
                    paths["pdf"] = pdf_path
                    write_json_deterministic(
                        paths["index"],
                        {**self.index, "pdfPath": str(pdf_path)},
                    )
                    write_json_deterministic(
                        paths["decisions"],
                        [
                            initial_decision(item)
                            for item in (
                                self.index["pages"] + self.index["numberedItems"]
                            )
                        ],
                    )
                    for report_name in ("coverage", "visual"):
                        if not paths[report_name].exists():
                            paths[report_name].write_bytes(
                                f"{report_name} sentinel".encode()
                            )
                    before = {
                        path: path.read_bytes()
                        for path in set(paths.values())
                        if path.exists()
                    }

                    with patch(
                        "scripts.source_audit.build_reports.initialize_decisions"
                    ) as initialize:
                        self._assert_pdf_path_conflict(paths)

                    initialize.assert_not_called()
                    self.assertEqual(
                        {path: path.read_bytes() for path in before},
                        before,
                    )

    def test_cli_rejects_relative_case_and_unicode_pdf_output_aliases(self):
        project_root = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory(dir=project_root) as directory:
            root = Path(directory)
            nested = root / "nested"
            nested.mkdir()
            cases = (
                (
                    root / "relative.pdf",
                    nested / ".." / "relative.pdf",
                    "relative",
                ),
                (
                    root / "Source.pdf",
                    root / "source.pdf",
                    "case",
                ),
                (
                    root / "Référence.pdf",
                    root / "Re\u0301fe\u0301rence.pdf",
                    "unicode",
                ),
            )
            for source, coverage, label in cases:
                with self.subTest(label=label):
                    source.write_bytes(b"immutable source")
                    paths = self._write_cli_inputs(root / label, pdf_path=source)
                    paths["coverage"] = coverage
                    source_before = source.read_bytes()

                    with patch(
                        "scripts.source_audit.build_reports.initialize_decisions"
                    ) as initialize:
                        self._assert_pdf_path_conflict(paths)

                    initialize.assert_not_called()
                    self.assertEqual(source.read_bytes(), source_before)
                    if coverage.exists():
                        self.assertTrue(os.path.samefile(source, coverage))
                    self.assertFalse(paths["visual"].exists())

    def test_cli_rejects_symlink_and_hardlink_pdf_output_aliases(self):
        for alias_kind in ("symlink", "hardlink"):
            with self.subTest(alias_kind=alias_kind):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    source = root / "source.pdf"
                    source.write_bytes(b"immutable source")
                    paths = self._write_cli_inputs(root / "reports", pdf_path=source)
                    coverage = root / f"{alias_kind}-coverage.md"
                    if alias_kind == "symlink":
                        coverage.symlink_to(source)
                    else:
                        os.link(source, coverage)
                    paths["coverage"] = coverage
                    source_before = source.read_bytes()

                    with patch(
                        "scripts.source_audit.build_reports.initialize_decisions"
                    ) as initialize:
                        self._assert_pdf_path_conflict(paths)

                    initialize.assert_not_called()
                    self.assertEqual(source.read_bytes(), source_before)
                    self.assertFalse(paths["visual"].exists())

    def test_cli_rejects_changed_parseable_pdf_before_initializing_or_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            changed_pdf = self._changed_parseable_pdf(root)
            paths = self._write_cli_inputs(root / "reports", pdf_path=changed_pdf)
            paths["coverage"].write_bytes(b"coverage sentinel")
            paths["visual"].write_bytes(b"visual sentinel")
            before = {name: path.read_bytes() for name, path in paths.items()}

            with patch(
                "scripts.source_audit.build_reports.initialize_decisions"
            ) as initialize:
                self._assert_cli_conflict(paths)

            initialize.assert_not_called()
            self.assertEqual(
                {name: path.read_bytes() for name, path in paths.items()},
                before,
            )

    def test_cli_accepts_changed_parseable_pdf_with_explicit_hash_confirmation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            changed_pdf = self._changed_parseable_pdf(root)
            paths = self._write_cli_inputs(root / "reports", pdf_path=changed_pdf)
            expected_hash = hashlib.sha256(changed_pdf.read_bytes()).hexdigest()
            source_before = changed_pdf.read_bytes()

            try:
                result = main(self._cli_arguments(paths, expected_sha256=expected_hash))
            except SystemExit as raised:
                self.fail(
                    f"explicit source hash confirmation was rejected: {raised.code}"
                )

            self.assertEqual(result, 0)
            self.assertEqual(changed_pdf.read_bytes(), source_before)
            self.assertTrue(paths["coverage"].is_file())
            self.assertTrue(paths["visual"].is_file())

    def test_cli_rejects_every_exact_path_conflict_before_writing(self):
        path_pairs = (
            ("index", "decisions"),
            ("index", "coverage"),
            ("index", "visual"),
            ("decisions", "coverage"),
            ("decisions", "visual"),
            ("coverage", "visual"),
        )
        for first_name, second_name in path_pairs:
            with self.subTest(first=first_name, second=second_name):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    paths = {
                        "index": root / "source-index.json",
                        "decisions": root / "coverage-decisions.json",
                        "coverage": root / "source-coverage-matrix.md",
                        "visual": root / "visual-asset-index.md",
                    }
                    paths[second_name] = paths[first_name]
                    write_json_deterministic(paths["index"], self.index)
                    if paths["decisions"] != paths["index"]:
                        write_json_deterministic(
                            paths["decisions"],
                            [
                                initial_decision(item)
                                for item in (
                                    self.index["pages"] + self.index["numberedItems"]
                                )
                            ],
                        )
                    if not paths[first_name].exists():
                        paths[first_name].write_bytes(b"existing report\n")
                    before = paths[first_name].read_bytes()

                    self._assert_cli_conflict(paths)
                    self.assertEqual(paths[first_name].read_bytes(), before)

    def test_cli_rejects_a_relative_path_alias_without_touching_decisions(self):
        project_root = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory(dir=project_root) as directory:
            root = Path(directory)
            alias_directory = root / "alias"
            alias_directory.mkdir()
            paths = self._write_cli_inputs(root)
            decisions_before = paths["decisions"].read_bytes()
            relative_decisions = paths["decisions"].relative_to(project_root)
            paths["decisions"] = relative_decisions
            paths["coverage"] = (
                relative_decisions.parent
                / alias_directory.name
                / ".."
                / relative_decisions.name
            )

            self._assert_cli_conflict(paths)
            self.assertEqual(
                (project_root / relative_decisions).read_bytes(),
                decisions_before,
            )

    def test_cli_rejects_a_symbolic_link_alias_without_touching_decisions(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_cli_inputs(Path(directory))
            decisions_before = paths["decisions"].read_bytes()
            paths["coverage"].symlink_to(paths["decisions"])

            self._assert_cli_conflict(paths)
            self.assertEqual(paths["decisions"].read_bytes(), decisions_before)

    def test_cli_rejects_a_hard_link_alias_without_touching_decisions(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self._write_cli_inputs(Path(directory))
            decisions_before = paths["decisions"].read_bytes()
            os.link(paths["decisions"], paths["coverage"])

            self._assert_cli_conflict(paths)
            self.assertEqual(paths["decisions"].read_bytes(), decisions_before)

    def test_cli_rejects_two_reports_at_the_same_path_before_initialization(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "report.md",
                "visual": root / "report.md",
            }
            write_json_deterministic(paths["index"], self.index)

            self._assert_cli_conflict(paths)
            self.assertFalse(paths["decisions"].exists())
            self.assertFalse(paths["coverage"].exists())

    def test_cli_rejects_case_equivalent_absent_reports_before_initialization(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "Report.md",
                "visual": root / "report.md",
            }
            write_json_deterministic(paths["index"], self.index)
            index_before = paths["index"].read_bytes()

            self._assert_cli_conflict(paths)

            self.assertEqual(paths["index"].read_bytes(), index_before)
            self.assertFalse(paths["decisions"].exists())
            self.assertFalse(paths["coverage"].exists())
            self.assertFalse(paths["visual"].exists())

    def test_cli_rejects_case_equivalent_decisions_and_report_before_creation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "Decisions.json",
                "coverage": root / "decisions.json",
                "visual": root / "visual.md",
            }
            write_json_deterministic(paths["index"], self.index)
            index_before = paths["index"].read_bytes()

            self._assert_cli_conflict(paths)

            self.assertEqual(paths["index"].read_bytes(), index_before)
            self.assertFalse(paths["decisions"].exists())
            self.assertFalse(paths["coverage"].exists())
            self.assertFalse(paths["visual"].exists())

    def test_cli_rejects_unicode_equivalent_absent_reports(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = {
                "index": root / "source-index.json",
                "decisions": root / "coverage-decisions.json",
                "coverage": root / "Réport.md",
                "visual": root / "re\u0301port.md",
            }
            write_json_deterministic(paths["index"], self.index)

            self._assert_cli_conflict(paths)

            self.assertFalse(paths["decisions"].exists())
            self.assertFalse(paths["coverage"].exists())
            self.assertFalse(paths["visual"].exists())

    def _write_cli_inputs(self, root, pdf_path=None):
        pdf_path = pdf_path or self.APPROVED_SOURCE
        paths = {
            "pdf": pdf_path,
            "index": root / "source-index.json",
            "decisions": root / "coverage-decisions.json",
            "coverage": root / "source-coverage-matrix.md",
            "visual": root / "visual-asset-index.md",
        }
        write_json_deterministic(
            paths["index"],
            {**self.index, "pdfPath": str(pdf_path)},
        )
        decisions = [
            initial_decision(item)
            for item in self.index["pages"] + self.index["numberedItems"]
        ]
        write_json_deterministic(paths["decisions"], decisions)
        return paths

    def _changed_parseable_pdf(self, root):
        changed_pdf = root / "changed-source.pdf"
        shutil.copyfile(self.APPROVED_SOURCE, changed_pdf)
        with changed_pdf.open("ab") as file:
            file.write(b"\n% task-7 changed-but-parseable probe\n")
        self.assertEqual(len(PdfReader(changed_pdf).pages), 314)
        return changed_pdf

    def _assert_cli_conflict(self, paths):
        with redirect_stderr(io.StringIO()):
            try:
                main(self._cli_arguments(paths))
            except SystemExit as raised:
                self.assertNotEqual(raised.code, 0)
                return
            except Exception as raised:
                self.fail(
                    "expected a nonzero path-conflict exit, got "
                    f"{type(raised).__name__}: {raised}"
                )
        self.fail("expected a nonzero path-conflict exit")

    def _assert_pdf_path_conflict(self, paths):
        expected_sha256 = hashlib.sha256(paths["pdf"].read_bytes()).hexdigest()
        stderr = io.StringIO()
        with self.assertRaises(SystemExit) as raised:
            with redirect_stderr(stderr):
                main(self._cli_arguments(paths, expected_sha256=expected_sha256))
        self.assertNotEqual(raised.exception.code, 0)
        self.assertIn("path conflict", stderr.getvalue())

    @staticmethod
    def _cli_arguments(paths, expected_sha256=None):
        arguments = [
            "--index",
            str(paths["index"]),
            "--decisions",
            str(paths["decisions"]),
            "--coverage-report",
            str(paths["coverage"]),
            "--visual-report",
            str(paths["visual"]),
        ]
        if expected_sha256 is not None:
            arguments.extend(["--expected-sha256", expected_sha256])
        return arguments


if __name__ == "__main__":
    unittest.main()
