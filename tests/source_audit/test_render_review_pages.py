import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.render_review_pages import (
    all_page_numbers,
    main,
    parse_page_selection,
    render_pages,
    review_page_numbers,
)


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class RenderReviewPagesTests(unittest.TestCase):
    def test_all_page_numbers_accepts_only_continuous_index_pages(self):
        self.assertEqual(
            all_page_numbers({
                "pages": [
                    {"pdfPage": 1},
                    {"pdfPage": 2},
                    {"pdfPage": 3},
                ]
            }),
            [1, 2, 3],
        )
        with self.assertRaisesRegex(
            AuditValidationError,
            "continuous",
        ):
            all_page_numbers({
                "pages": [
                    {"pdfPage": 1},
                    {"pdfPage": 3},
                ]
            })

    def test_page_selection_is_sorted_and_unique(self):
        self.assertEqual(parse_page_selection("20,10,20,81"), [10, 20, 81])

    def test_page_selection_rejects_invalid_or_non_positive_pages(self):
        for value in ("", "10,,20", "zero", "0", "-1"):
            with self.subTest(value=value):
                with self.assertRaisesRegex(AuditValidationError, "page"):
                    parse_page_selection(value)

    def test_review_pages_include_visuals_and_semantic_symbols_once(self):
        index = {
            "pages": [
                {"pdfPage": 10, "symbolCounts": {}},
                {"pdfPage": 20, "symbolCounts": {"check": 2}},
                {"pdfPage": 20, "symbolCounts": {"cross": 1}},
            ],
            "numberedItems": [
                {"kind": "figure", "pdfPage": 10},
                {"kind": "experiment", "pdfPage": 20},
            ],
        }
        self.assertEqual(review_page_numbers(index), [10, 20])

    def test_review_pages_include_empty_text_pages_and_deduplicate_all_reasons(self):
        index = {
            "pages": [
                {"pdfPage": 30, "charCount": 0, "symbolCounts": {}},
                {
                    "pdfPage": 20,
                    "charCount": 0,
                    "symbolCounts": {"check": 2},
                },
                {
                    "pdfPage": 10,
                    "charCount": 8,
                    "symbolCounts": {"cross": 1},
                },
                {"pdfPage": 40, "charCount": 8, "symbolCounts": {}},
            ],
            "numberedItems": [
                {"kind": "figure", "pdfPage": 20},
                {"kind": "experiment", "pdfPage": 10},
            ],
        }

        self.assertEqual(review_page_numbers(index), [10, 20, 30])

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_uses_singlefile_and_explicit_page(self, run):
        with tempfile.TemporaryDirectory() as directory:
            def write_png(arguments, **_kwargs):
                Path(f"{arguments[-1]}.png").write_bytes(PNG_SIGNATURE + b"test")

            run.side_effect = write_png
            rendered = render_pages(
                Path("source.pdf"),
                [10],
                Path(directory),
                "/path/to/pdftoppm",
            )
            self.assertEqual(rendered, [Path(directory) / "page-010.png"])
        args = run.call_args.args[0]
        self.assertIn("-singlefile", args)
        self.assertEqual(args[args.index("-f") + 1], "10")
        self.assertEqual(args[args.index("-l") + 1], "10")
        self.assertEqual(args[-2], "source.pdf")
        temporary_prefix = Path(args[-1])
        self.assertTrue(temporary_prefix.is_relative_to(Path(directory)))
        self.assertNotEqual(temporary_prefix, Path(directory) / "page-010")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_sorts_and_deduplicates_pages(self, run):
        def write_png(arguments, **_kwargs):
            Path(f"{arguments[-1]}.png").write_bytes(PNG_SIGNATURE + b"test")

        run.side_effect = write_png
        with tempfile.TemporaryDirectory() as directory:
            rendered = render_pages(
                Path("source.pdf"), [20, 10, 20], Path(directory), "pdftoppm"
            )

        self.assertEqual(
            [path.name for path in rendered], ["page-010.png", "page-020.png"]
        )
        rendered_pages = [
            call.args[0][call.args[0].index("-f") + 1]
            for call in run.call_args_list
        ]
        self.assertEqual(rendered_pages, ["10", "20"])

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_symlink_to_source_without_changing_pdf(self, run):
        self._assert_source_alias_is_rejected(run, "symlink")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_hardlink_to_source_without_changing_pdf(self, run):
        self._assert_source_alias_is_rejected(run, "hardlink")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_source_at_final_output_path_without_changing_it(
        self, run
    ):
        self._assert_source_alias_is_rejected(run, "same-path")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_main_rejects_direct_index_output_alias_before_subprocess(self, run):
        self._assert_index_output_alias_is_rejected(run, "same-path")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_main_rejects_symlink_index_output_alias_before_subprocess(self, run):
        self._assert_index_output_alias_is_rejected(run, "symlink")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_main_rejects_hardlink_index_output_alias_before_subprocess(self, run):
        self._assert_index_output_alias_is_rejected(run, "hardlink")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_stale_png_cannot_stand_in_for_missing_new_output(self, run):
        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            stale_png = output_dir / "page-010.png"
            stale_bytes = PNG_SIGNATURE + b"STALE"
            stale_png.write_bytes(stale_bytes)

            with self.assertRaisesRegex(AuditValidationError, "missing"):
                render_pages(Path("source.pdf"), [10], output_dir, "pdftoppm")

            self.assertEqual(stale_png.read_bytes(), stale_bytes)

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_does_not_create_a_missing_parent_directory(self, run):
        with tempfile.TemporaryDirectory() as directory:
            missing_parent = Path(directory) / "implicit-parent"
            output_dir = missing_parent / "explicit-output"

            with self.assertRaises(FileNotFoundError):
                render_pages(Path("source.pdf"), [10], output_dir, "pdftoppm")

            self.assertFalse(missing_parent.exists())
        run.assert_not_called()

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_invalid_pages_before_subprocess(self, run):
        with tempfile.TemporaryDirectory() as directory:
            for invalid_page in (0, -1, 1.5, "1", True):
                with self.subTest(page=invalid_page):
                    run.reset_mock()
                    with self.assertRaisesRegex(AuditValidationError, "page"):
                        render_pages(
                            Path("source.pdf"),
                            [invalid_page],
                            Path(directory),
                            "pdftoppm",
                        )
                    run.assert_not_called()

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_invalid_dpi_before_subprocess(self, run):
        with tempfile.TemporaryDirectory() as directory:
            for invalid_dpi in (0, -1, 120.5, "120", True):
                with self.subTest(dpi=invalid_dpi):
                    run.reset_mock()
                    with self.assertRaisesRegex(AuditValidationError, "DPI"):
                        render_pages(
                            Path("source.pdf"),
                            [10],
                            Path(directory),
                            "pdftoppm",
                            invalid_dpi,
                        )
                    run.assert_not_called()

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_subprocess_failure_is_propagated(self, run):
        failure = subprocess.CalledProcessError(2, ["pdftoppm"])
        run.side_effect = failure
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(subprocess.CalledProcessError) as raised:
                render_pages(
                    Path("source.pdf"), [10], Path(directory), "pdftoppm"
                )
        self.assertIs(raised.exception, failure)

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_a_missing_png(self, run):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(AuditValidationError, "missing"):
                render_pages(Path("source.pdf"), [10], Path(directory), "pdftoppm")

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_rejects_a_non_png_output(self, run):
        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)

            def write_invalid_png(arguments, **_kwargs):
                Path(f"{arguments[-1]}.png").write_bytes(b"not a PNG")

            run.side_effect = write_invalid_png
            with self.assertRaisesRegex(AuditValidationError, "signature"):
                render_pages(Path("source.pdf"), [10], output_dir, "pdftoppm")

    @patch("scripts.source_audit.render_review_pages.render_pages")
    def test_main_uses_index_review_pages_by_default(self, render):
        index = {
            "pages": [{"pdfPage": 20, "symbolCounts": {"check": 1}}],
            "numberedItems": [{"kind": "figure", "pdfPage": 10}],
        }
        with tempfile.TemporaryDirectory() as directory:
            index_path = Path(directory) / "index.json"
            index_path.write_text(json.dumps(index), encoding="utf-8")
            result = main(
                [
                    "--pdf",
                    "source.pdf",
                    "--index",
                    str(index_path),
                    "--output-dir",
                    "review-pages",
                ]
            )

        self.assertEqual(result, 0)
        render.assert_called_once_with(
            Path("source.pdf"),
            [10, 20],
            Path("review-pages"),
            "pdftoppm",
            120,
            protected_inputs={"index": index_path},
        )

    @patch("scripts.source_audit.render_review_pages.render_pages")
    def test_main_uses_explicit_page_selection(self, render):
        with tempfile.TemporaryDirectory() as directory:
            index_path = Path(directory) / "index.json"
            index_path.write_text(
                json.dumps({"pages": [], "numberedItems": []}), encoding="utf-8"
            )
            result = main(
                [
                    "--pdf",
                    "source.pdf",
                    "--index",
                    str(index_path),
                    "--output-dir",
                    "review-pages",
                    "--pdftoppm",
                    "/tools/pdftoppm",
                    "--dpi",
                    "200",
                    "--pages",
                    "20,10,20",
                ]
            )

        self.assertEqual(result, 0)
        render.assert_called_once_with(
            Path("source.pdf"),
            [10, 20],
            Path("review-pages"),
            "/tools/pdftoppm",
            200,
            protected_inputs={"index": index_path},
        )

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_main_rejects_invalid_default_index_pages_before_subprocess(self, run):
        with tempfile.TemporaryDirectory() as directory:
            directory_path = Path(directory)
            output_dir = directory_path / "review-pages"
            output_dir.mkdir()
            index_path = directory_path / "index.json"

            for invalid_page in (0, -1, 1.5, "1", True):
                with self.subTest(page=invalid_page):
                    run.reset_mock()
                    index_path.write_text(
                        json.dumps(
                            {
                                "pages": [
                                    {
                                        "pdfPage": invalid_page,
                                        "symbolCounts": {"check": 1},
                                    }
                                ],
                                "numberedItems": [],
                            }
                        ),
                        encoding="utf-8",
                    )
                    with self.assertRaisesRegex(AuditValidationError, "page"):
                        main(
                            [
                                "--pdf",
                                "source.pdf",
                                "--index",
                                str(index_path),
                                "--output-dir",
                                str(output_dir),
                            ]
                        )
                    run.assert_not_called()

    def _assert_source_alias_is_rejected(self, run, alias_kind):
        with tempfile.TemporaryDirectory() as directory:
            directory_path = Path(directory)
            output_dir = directory_path / "review-pages"
            output_dir.mkdir()
            source_pdf = directory_path / "source.pdf"
            final_png = output_dir / "page-001.png"

            if alias_kind == "same-path":
                source_pdf = final_png
            source_pdf.write_bytes(b"%PDF-immutable-source")
            if alias_kind == "symlink":
                final_png.symlink_to(source_pdf)
            elif alias_kind == "hardlink":
                os.link(source_pdf, final_png)

            original_bytes = source_pdf.read_bytes()
            original_hash = hashlib.sha256(original_bytes).hexdigest()

            def write_png(arguments, **_kwargs):
                Path(f"{arguments[-1]}.png").write_bytes(
                    PNG_SIGNATURE + b"new render"
                )

            run.side_effect = write_png
            raised = None
            try:
                render_pages(source_pdf, [1], output_dir, "pdftoppm")
            except AuditValidationError as error:
                raised = error

            final_source_bytes = source_pdf.read_bytes()
            self.assertEqual(final_source_bytes, original_bytes)
            self.assertEqual(
                hashlib.sha256(final_source_bytes).hexdigest(), original_hash
            )
            self.assertIsNotNone(raised)
            run.assert_not_called()

    def _assert_index_output_alias_is_rejected(self, run, alias_kind):
        with tempfile.TemporaryDirectory() as directory:
            directory_path = Path(directory)
            output_dir = directory_path / "review-pages"
            output_dir.mkdir()
            source_pdf = directory_path / "source.pdf"
            source_pdf.write_bytes(b"%PDF-immutable-source")
            final_png = output_dir / "page-001.png"
            index_path = (
                final_png
                if alias_kind == "same-path"
                else directory_path / "source-index.json"
            )
            index_path.write_text(
                json.dumps(
                    {
                        "pages": [
                            {
                                "pdfPage": 1,
                                "charCount": 0,
                                "symbolCounts": {},
                            }
                        ],
                        "numberedItems": [],
                    }
                ),
                encoding="utf-8",
            )
            if alias_kind == "symlink":
                final_png.symlink_to(index_path)
            elif alias_kind == "hardlink":
                os.link(index_path, final_png)

            source_before = source_pdf.read_bytes()
            index_before = index_path.read_bytes()

            def write_png(arguments, **_kwargs):
                Path(f"{arguments[-1]}.png").write_bytes(
                    PNG_SIGNATURE + b"new render"
                )

            run.side_effect = write_png
            with self.assertRaisesRegex(AuditValidationError, "path conflict"):
                main(
                    [
                        "--pdf",
                        str(source_pdf),
                        "--index",
                        str(index_path),
                        "--output-dir",
                        str(output_dir),
                    ]
                )

            self.assertEqual(source_pdf.read_bytes(), source_before)
            self.assertEqual(index_path.read_bytes(), index_before)
            if alias_kind in {"symlink", "hardlink"}:
                self.assertTrue(os.path.samefile(index_path, final_png))
            run.assert_not_called()
