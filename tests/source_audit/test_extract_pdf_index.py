import hashlib
import io
import os
import shutil
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import Mock, call, patch

from pypdf import PdfReader

from scripts.source_audit.extract_pdf_index import (
    build_source_index,
    extract_numbered_occurrences,
    extract_printed_page,
    main,
)


class FakePage:
    def __init__(self, text):
        self.text = text
        self.extract_calls = 0

    def extract_text(self):
        self.extract_calls += 1
        return self.text


class FakeDestination:
    def __init__(self, title, page_index):
        self.title = title
        self.page_index = page_index


class FakeMetadata:
    title = "测试标题"
    author = "测试作者"


class FakeReader:
    def __init__(self, pages, outline):
        self.pages = pages
        self.outline = outline
        self.metadata = FakeMetadata()

    def get_destination_page_number(self, destination):
        return destination.page_index


class ExtractPdfIndexTests(unittest.TestCase):
    APPROVED_SOURCE = Path(__file__).resolve().parents[2] / "reference/原始文档.pdf"

    def test_extract_printed_page_uses_last_standalone_number(self):
        self.assertEqual(extract_printed_page("标题\n正文\n12\n"), 12)
        self.assertIsNone(extract_printed_page("标题\n正文\n"))

    def test_extract_numbered_occurrences_preserves_semantic_symbols(self):
        text = (
            "实验 1-1 ★★：上下文的关键作用\n"
            "图 1-2 实验 1-1——上下文消融实验设计\n"
            "完整基线 ✓ ✓\n"
            "无工具定义 ✗\n"
            "无推理过程 △\n"
        )
        items = extract_numbered_occurrences(text, pdf_page=20)
        ids = {(item["kind"], item["number"]) for item in items}
        self.assertEqual(ids, {("experiment", "1-1"), ("figure", "1-2")})
        self.assertEqual(items[0]["pdfPage"], 20)
        for item in items:
            self.assertEqual(
                item["symbolCounts"],
                {"check": 2, "cross": 1, "triangle": 1, "star": 2},
            )

    def test_build_source_index_preserves_page_outline_and_numbered_contracts(self):
        pages = [
            FakePage("目录  前言\n实验 1-1 标题 . . . 12\n1\n"),
            FakePage("实验 1-1 ★★：真实标题\n完整 ✓\n待定 △\n2\n"),
            FakePage(
                "实验 1-1 后续说明\n"
                + ("很长的内容 \t" * 40)
                + "\n失败 ✗\n3\n"
            ),
        ]
        outline = [
            FakeDestination("引言", 0),
            FakeDestination("第 1 章 测试", 1),
            [FakeDestination("1.1 小节", 2)],
        ]
        reader = FakeReader(pages, outline)

        with (
            patch(
                "scripts.source_audit.extract_pdf_index.PdfReader",
                return_value=reader,
            ),
            patch(
                "scripts.source_audit.extract_pdf_index.sha256_file",
                return_value="fake-sha256",
            ),
        ):
            manifest, index = build_source_index(
                Path("fake.pdf"), "reference/fake.pdf"
            )

        self.assertEqual([page.extract_calls for page in pages], [1, 1, 1])
        self.assertEqual(
            set(index["pages"][0]),
            {
                "sourceId",
                "kind",
                "pdfPage",
                "printedPage",
                "chapter",
                "charCount",
                "textPreview",
                "symbolCounts",
            },
        )
        self.assertEqual(
            index["pages"][0]["textPreview"],
            "目录 前言 实验 1-1 标题 . . . 12 1",
        )
        self.assertEqual(len(index["pages"][2]["textPreview"]), 160)
        self.assertNotIn("\n", index["pages"][2]["textPreview"])
        self.assertNotIn("\t", index["pages"][2]["textPreview"])
        self.assertNotIn("  ", index["pages"][2]["textPreview"])
        self.assertEqual(
            index["outline"],
            [
                {
                    "sourceId": "outline-001-001",
                    "kind": "outline",
                    "depth": 0,
                    "ordinal": 1,
                    "pdfPage": 1,
                    "title": "引言",
                },
                {
                    "sourceId": "outline-002-002",
                    "kind": "outline",
                    "depth": 0,
                    "ordinal": 2,
                    "pdfPage": 2,
                    "title": "第 1 章 测试",
                },
                {
                    "sourceId": "outline-003-003",
                    "kind": "outline",
                    "depth": 1,
                    "ordinal": 3,
                    "pdfPage": 3,
                    "title": "1.1 小节",
                },
            ],
        )

        self.assertEqual(len(index["numberedItems"]), 1)
        item = index["numberedItems"][0]
        self.assertEqual(
            set(item),
            {
                "sourceId",
                "kind",
                "number",
                "chapter",
                "pdfPage",
                "printedPage",
                "title",
                "occurrences",
                "symbolCounts",
                "captionConflict",
            },
        )
        self.assertEqual(item["sourceId"], "experiment-1-1")
        self.assertEqual(item["pdfPage"], 2)
        self.assertEqual(item["printedPage"], 2)
        self.assertEqual(item["title"], "★★：真实标题")
        self.assertEqual(
            item["occurrences"],
            [
                {
                    "pdfPage": 1,
                    "printedPage": 1,
                    "title": "标题 . . . 12",
                },
                {
                    "pdfPage": 2,
                    "printedPage": 2,
                    "title": "★★：真实标题",
                },
                {
                    "pdfPage": 3,
                    "printedPage": 3,
                    "title": "后续说明",
                },
            ],
        )
        self.assertTrue(item["captionConflict"])
        self.assertEqual(
            item["symbolCounts"],
            {"check": 1, "cross": 0, "triangle": 1, "star": 2},
        )
        self.assertEqual(
            manifest,
            {
                "schemaVersion": 1,
                "pdfPath": "reference/fake.pdf",
                "sha256": "fake-sha256",
                "title": "测试标题",
                "author": "测试作者",
                "pageCount": 3,
                "counts": {
                    "figures": 0,
                    "tables": 0,
                    "experiments": 1,
                    "outlineItems": 3,
                },
            },
        )

    def test_build_source_index_prefers_true_caption_after_cross_page_reference(self):
        reader = FakeReader(
            [
                FakePage(
                    "图 8-3 展示了这四种方式及其关系。\n"
                    "实验难度 ★★\n"
                    "231\n"
                ),
                FakePage("图 8-3 持续进化的四种更新方式\n232\n"),
            ],
            [],
        )

        with (
            patch(
                "scripts.source_audit.extract_pdf_index.PdfReader",
                return_value=reader,
            ),
            patch(
                "scripts.source_audit.extract_pdf_index.sha256_file",
                return_value="fake-sha256",
            ),
        ):
            _, index = build_source_index(Path("fake.pdf"), "reference/fake.pdf")

        item = index["numberedItems"][0]
        self.assertEqual(item["pdfPage"], 2)
        self.assertEqual(item["printedPage"], 232)
        self.assertEqual(item["title"], "持续进化的四种更新方式")
        self.assertEqual(
            item["occurrences"],
            [
                {
                    "pdfPage": 1,
                    "printedPage": 231,
                    "title": "展示了这四种方式及其关系。",
                },
                {
                    "pdfPage": 2,
                    "printedPage": 232,
                    "title": "持续进化的四种更新方式",
                },
            ],
        )
        self.assertTrue(item["captionConflict"])
        self.assertEqual(
            item["symbolCounts"],
            {"check": 0, "cross": 0, "triangle": 0, "star": 0},
        )

    def test_main_builds_validates_writes_once_in_order_and_limits_stdout(self):
        manifest = {
            "pageCount": 3,
            "counts": {
                "figures": 1,
                "tables": 2,
                "experiments": 3,
                "outlineItems": 4,
            },
        }
        index = {"pages": [], "outline": [], "numberedItems": []}
        calls = Mock()

        with tempfile.TemporaryDirectory() as directory:
            pdf_path = Path(directory) / "input.pdf"
            manifest_path = Path(directory) / "manifest.json"
            index_path = Path(directory) / "index.json"
            shutil.copyfile(self.APPROVED_SOURCE, pdf_path)

            with (
                patch(
                    "scripts.source_audit.extract_pdf_index.build_source_index",
                    return_value=(manifest, index),
                ) as build,
                patch(
                    "scripts.source_audit.extract_pdf_index.validate_index"
                ) as validate,
                patch(
                    "scripts.source_audit.extract_pdf_index.write_json_deterministic"
                ) as write,
            ):
                calls.attach_mock(build, "build")
                calls.attach_mock(validate, "validate")
                calls.attach_mock(write, "write")
                output = io.StringIO()
                with redirect_stdout(output):
                    result = main(
                        [
                            "--pdf",
                            str(pdf_path),
                            "--manifest",
                            str(manifest_path),
                            "--index",
                            str(index_path),
                        ]
                    )

        self.assertEqual(result, 0)
        self.assertEqual(
            calls.mock_calls,
            [
                call.build(pdf_path, str(pdf_path)),
                call.validate(index),
                call.write(manifest_path, manifest),
                call.write(index_path, index),
            ],
        )
        self.assertEqual(
            output.getvalue(),
            (
                f"{manifest_path}\n"
                f"{index_path}\n"
                "pages=3 figures=1 tables=2 experiments=3 outlineItems=4\n"
            ),
        )

    def test_main_rejects_a_missing_pdf_before_building(self):
        with tempfile.TemporaryDirectory() as directory:
            missing_pdf = Path(directory) / "missing.pdf"
            output = io.StringIO()
            with patch(
                "scripts.source_audit.extract_pdf_index.build_source_index"
            ) as build:
                with self.assertRaises(SystemExit) as raised:
                    with redirect_stdout(output):
                        main(
                            [
                                "--pdf",
                                str(missing_pdf),
                                "--manifest",
                                str(Path(directory) / "manifest.json"),
                                "--index",
                                str(Path(directory) / "index.json"),
                            ]
                        )

        self.assertEqual(str(raised.exception), f"PDF not found: {missing_pdf}")
        build.assert_not_called()
        self.assertEqual(output.getvalue(), "")

    def test_main_rejects_every_exact_input_output_conflict_before_building(self):
        path_pairs = (
            ("pdf", "manifest"),
            ("pdf", "index"),
            ("manifest", "index"),
        )
        for first_name, second_name in path_pairs:
            with self.subTest(first=first_name, second=second_name):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    paths = {
                        "pdf": root / "source.pdf",
                        "manifest": root / "manifest.json",
                        "index": root / "index.json",
                    }
                    paths[second_name] = paths[first_name]
                    paths["pdf"].write_bytes(b"immutable source")
                    for name in ("manifest", "index"):
                        if not paths[name].exists():
                            paths[name].write_bytes(f"{name} sentinel".encode())
                    before = {
                        path: path.read_bytes()
                        for path in set(paths.values())
                        if path.exists()
                    }

                    with patch(
                        "scripts.source_audit.extract_pdf_index.build_source_index",
                        return_value=self._minimal_build_result(),
                    ) as build:
                        self._assert_path_conflict(paths)

                    build.assert_not_called()
                    self.assertEqual(
                        {
                            path: path.read_bytes()
                            for path in before
                        },
                        before,
                    )

    def test_main_rejects_relative_case_and_unicode_path_aliases_before_building(self):
        project_root = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory(dir=project_root) as directory:
            root = Path(directory)
            nested = root / "nested"
            nested.mkdir()
            cases = (
                (
                    root / "relative.pdf",
                    nested / ".." / "relative.pdf",
                    root / "relative-index.json",
                ),
                (
                    root / "Source.pdf",
                    root / "source.pdf",
                    root / "case-index.json",
                ),
                (
                    root / "Référence.pdf",
                    root / "Re\u0301fe\u0301rence.pdf",
                    root / "unicode-index.json",
                ),
            )
            for source, manifest, index in cases:
                with self.subTest(source=source, manifest=manifest):
                    source.write_bytes(b"immutable source")
                    source_before = source.read_bytes()
                    paths = {
                        "pdf": source,
                        "manifest": manifest,
                        "index": index,
                    }
                    with patch(
                        "scripts.source_audit.extract_pdf_index.build_source_index",
                        return_value=self._minimal_build_result(),
                    ) as build:
                        self._assert_path_conflict(paths)

                    build.assert_not_called()
                    self.assertEqual(source.read_bytes(), source_before)
                    if manifest.exists():
                        self.assertTrue(os.path.samefile(source, manifest))
                    else:
                        self.assertFalse(manifest.exists())
                    self.assertFalse(index.exists())

    def test_main_rejects_symlink_and_hardlink_source_aliases_before_building(self):
        for alias_kind in ("symlink", "hardlink"):
            with self.subTest(alias_kind=alias_kind):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    source = root / "source.pdf"
                    alias = root / f"{alias_kind}-manifest.json"
                    source.write_bytes(b"immutable source")
                    if alias_kind == "symlink":
                        alias.symlink_to(source)
                    else:
                        os.link(source, alias)
                    source_before = source.read_bytes()
                    paths = {
                        "pdf": source,
                        "manifest": alias,
                        "index": root / "index.json",
                    }

                    with patch(
                        "scripts.source_audit.extract_pdf_index.build_source_index",
                        return_value=self._minimal_build_result(),
                    ) as build:
                        self._assert_path_conflict(paths)

                    build.assert_not_called()
                    self.assertEqual(source.read_bytes(), source_before)
                    self.assertFalse(paths["index"].exists())

    def test_main_rejects_changed_parseable_pdf_before_building_or_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            changed_pdf = self._changed_parseable_pdf(root)
            paths = {
                "pdf": changed_pdf,
                "manifest": root / "manifest.json",
                "index": root / "index.json",
            }
            paths["manifest"].write_bytes(b"manifest sentinel")
            paths["index"].write_bytes(b"index sentinel")
            before = {
                name: path.read_bytes()
                for name, path in paths.items()
            }

            with patch(
                "scripts.source_audit.extract_pdf_index.build_source_index",
                return_value=self._minimal_build_result(),
            ) as build:
                self._assert_main_rejected(paths)

            build.assert_not_called()
            self.assertEqual(
                {name: path.read_bytes() for name, path in paths.items()},
                before,
            )

    def test_main_accepts_changed_parseable_pdf_with_explicit_hash_confirmation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            changed_pdf = self._changed_parseable_pdf(root)
            paths = {
                "pdf": changed_pdf,
                "manifest": root / "manifest.json",
                "index": root / "index.json",
            }
            expected_hash = hashlib.sha256(changed_pdf.read_bytes()).hexdigest()
            source_before = changed_pdf.read_bytes()

            with patch(
                "scripts.source_audit.extract_pdf_index.build_source_index",
                return_value=self._minimal_build_result(),
            ) as build:
                output = io.StringIO()
                with redirect_stdout(output):
                    try:
                        result = main(
                            self._main_arguments(
                                paths, expected_sha256=expected_hash
                            )
                        )
                    except SystemExit as raised:
                        self.fail(
                            "explicit source hash confirmation was rejected: "
                            f"{raised.code}"
                        )

            self.assertEqual(result, 0)
            build.assert_called_once_with(changed_pdf, str(changed_pdf))
            self.assertEqual(changed_pdf.read_bytes(), source_before)
            self.assertTrue(paths["manifest"].is_file())
            self.assertTrue(paths["index"].is_file())

    def _changed_parseable_pdf(self, root):
        changed_pdf = root / "changed-source.pdf"
        shutil.copyfile(self.APPROVED_SOURCE, changed_pdf)
        with changed_pdf.open("ab") as file:
            file.write(b"\n% task-7 changed-but-parseable probe\n")
        self.assertEqual(len(PdfReader(changed_pdf).pages), 314)
        return changed_pdf

    def _assert_main_rejected(self, paths):
        stderr = io.StringIO()
        with self.assertRaises(SystemExit) as raised:
            with redirect_stderr(stderr), redirect_stdout(io.StringIO()):
                main(self._main_arguments(paths))
        self.assertNotEqual(raised.exception.code, 0)

    def _assert_path_conflict(self, paths):
        expected_sha256 = hashlib.sha256(paths["pdf"].read_bytes()).hexdigest()
        stderr = io.StringIO()
        with self.assertRaises(SystemExit) as raised:
            with redirect_stderr(stderr), redirect_stdout(io.StringIO()):
                main(
                    self._main_arguments(
                        paths, expected_sha256=expected_sha256
                    )
                )
        self.assertNotEqual(raised.exception.code, 0)
        self.assertIn("path conflict", stderr.getvalue())

    @staticmethod
    def _main_arguments(paths, expected_sha256=None):
        arguments = [
            "--pdf",
            str(paths["pdf"]),
            "--manifest",
            str(paths["manifest"]),
            "--index",
            str(paths["index"]),
        ]
        if expected_sha256 is not None:
            arguments.extend(["--expected-sha256", expected_sha256])
        return arguments

    @staticmethod
    def _minimal_build_result():
        return (
            {
                "pageCount": 0,
                "counts": {
                    "figures": 0,
                    "tables": 0,
                    "experiments": 0,
                    "outlineItems": 0,
                },
            },
            {"pages": [], "outline": [], "numberedItems": []},
        )
