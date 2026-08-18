import argparse
import contextlib
import copy
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts.source_audit.build_review_packages import (
    _item_markdown_evidence,
    _build_package_outputs,
    _select_cli_handler,
    _validate_build_paths,
    build_batch_manifest,
    build_page_bundle,
    build_parser,
    extract_full_page_text,
    full_build_command,
    main,
    parse_markdown_sections,
    select_batch_pages,
    selection_only_command,
)
from scripts.source_audit.models import (
    AuditValidationError,
    sha256_file,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
)
from tests.source_audit.editorial_fixtures import (
    sample_analysis_sections,
    sample_calibration_decisions,
    sample_calibration_index,
    sample_decisions,
    sample_evidence_hashes,
    sample_must_keep_inventory,
    sample_outline_sections,
    sample_package_hashes,
    sample_page20_index,
    sample_policy,
    sample_short_calibration_decisions,
    sample_visual,
)


class ReviewPackageTextTests(unittest.TestCase):
    def test_extract_full_page_text_returns_every_pdf_page(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf_path = Path(directory) / "source.pdf"
            pdf_path.write_bytes(b"%PDF-1.4")
            completed = subprocess.CompletedProcess(
                args=["pdftotext"],
                returncode=0,
                stdout=b"page one\fpage two\f",
                stderr=b"",
            )
            with mock.patch(
                "scripts.source_audit.build_review_packages.shutil.which",
                return_value="/usr/bin/pdftotext",
            ), mock.patch(
                "scripts.source_audit.build_review_packages.subprocess.run",
                return_value=completed,
            ):
                self.assertEqual(
                    extract_full_page_text(pdf_path),
                    {1: "page one", 2: "page two"},
                )
class ReviewPackageMarkdownTests(unittest.TestCase):
    def test_parse_markdown_sections_preserves_exact_text_and_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "analysis.md"
            path.write_text(
                "# Book\nintro\n## 第1章 Start\nbody\n## Next\nend\n",
                encoding="utf-8",
            )
            sections = parse_markdown_sections(
                path,
                "reference/book-analysis.md",
            )
            chapter = next(
                item for item in sections
                if item["heading"] == "第1章 Start"
            )
            self.assertEqual(chapter["startLine"], 3)
            self.assertEqual(chapter["endLine"], 4)
            self.assertEqual(chapter["text"], "## 第1章 Start\nbody")
            self.assertEqual(
                chapter["path"],
                "reference/book-analysis.md",
            )

    def test_preface_item_uses_unified_formula_as_chapter_zero_evidence(self):
        formula = {
            "heading": "统一公式（全书锚点）",
            "headingLevel": 3,
            "text": "Agent = LLM（大脑）+ 上下文（眼睛）+ 工具（手脚）",
            "path": "reference/book-analysis.md",
            "startLine": 10,
            "endLine": 13,
        }
        analysis, outline = _item_markdown_evidence(
            {"sourceId": "figure-0-1", "chapter": 0},
            [{"lessonId": "0-1", "role": "primary"}],
            [formula, *sample_analysis_sections()],
            sample_outline_sections(),
            sample_policy(),
        )

        self.assertEqual(
            analysis["reference/book-analysis.md:10-13"]["heading"],
            "统一公式（全书锚点）",
        )
        self.assertEqual(
            outline["02-课程大纲.md:2-2"]["heading"],
            "0-1 Lesson 0-1",
        )
class ReviewPackageBundleTests(unittest.TestCase):
    def test_build_page_bundle_carries_complete_page_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            page_image = Path(directory) / "page-020.png"
            page_image.write_bytes(b"\x89PNG\r\n\x1a\nfixture")
            index = sample_page20_index(with_route_anchors=True)
            visuals = [sample_visual(
                pdfPage=20,
                sourceId="visual-p020-01",
            )]
            bundle = build_page_bundle(
                pdf_page=20,
                full_text={20: "x" * 300},
                index=index,
                visuals=visuals,
                decisions=sample_decisions(
                    index=index,
                    visuals=visuals,
                ),
                policy=sample_policy(),
                page_image=page_image,
                page_image_label=(
                    "tmp/pdfs/source-audit/page-020.png"
                ),
                page_image_sha256=sha256_file(page_image),
                evidence_hashes=sample_evidence_hashes(),
                analysis_sections=sample_analysis_sections(),
                outline_sections=sample_outline_sections(),
                must_keep_inventory=sample_must_keep_inventory(),
            )
            self.assertEqual(len(bundle["text"]), 300)
            self.assertEqual(
                [item["sourceId"] for item in bundle["sourceItems"]],
                [
                    "experiment-1-1",
                    "figure-1-2",
                    "page-020",
                    "visual-p020-01",
                ],
            )
            self.assertEqual(len(bundle["mustKeepInventory"]), 25)
            self.assertIn("caption-conflict", bundle["riskFlags"])
            self.assertTrue(bundle["analysisEvidence"][0]["text"])
class ReviewPackageSelectionTests(unittest.TestCase):
    def test_select_batch_pages_respects_scan_and_source_bounds(self):
        pages, source_ids = select_batch_pages(
            "calibration",
            sample_calibration_index(),
            [sample_visual()],
            sample_calibration_decisions(),
            sample_policy(),
        )
        self.assertTrue(
            {10, 20, 32, 35, 52, 81, 239, 240, 279}
            <= set(pages)
        )
        self.assertGreaterEqual(len(source_ids), 30)
        self.assertLessEqual(len(source_ids), 40)
        self.assertEqual(source_ids, sorted(set(source_ids)))

    def test_normal_selection_is_stable_prioritizes_pending_scans_and_excludes_prior_ids(self):
        """A normal selector must not regress to calibration-only routing."""
        index = sample_calibration_index()
        decisions = sample_calibration_decisions()
        decisions_by_id = {
            decision["sourceId"]: decision for decision in decisions
        }
        for source_id in ("page-032", "page-035"):
            decisions_by_id[source_id].update({
                "visualReviewState": "unreviewed",
                "visualReviewer": "",
            })
        accepted_or_prior_ids = {
            "page-032",
            "figure-1-4",
        }

        try:
            first = select_batch_pages(
                "normal",
                index,
                [sample_visual()],
                sorted(
                    decisions_by_id.values(),
                    key=lambda item: item["sourceId"],
                ),
                sample_policy(),
                batch_id="normal-002",
                excluded_source_ids=accepted_or_prior_ids,
            )
        except (AuditValidationError, TypeError) as error:
            self.fail(f"normal selection is unavailable: {error}")
        second = select_batch_pages(
            "normal",
            index,
            [sample_visual()],
            sorted(decisions_by_id.values(), key=lambda item: item["sourceId"]),
            sample_policy(),
            batch_id="normal-002",
            excluded_source_ids=accepted_or_prior_ids,
        )

        pages, source_ids = first
        self.assertEqual(first, second)
        self.assertGreaterEqual(len(source_ids), 20)
        self.assertLessEqual(len(source_ids), 40)
        self.assertGreaterEqual(len(pages), 5)
        self.assertLessEqual(len(pages), 15)
        self.assertIn(35, pages)
        self.assertNotIn(32, pages)
        self.assertFalse(accepted_or_prior_ids & set(source_ids))
        self.assertIn("experiment-1-1", source_ids)
class ReviewPackageManifestTests(unittest.TestCase):
    def test_build_batch_manifest_is_hash_bound_and_deterministic(self):
        arguments = {
            "batch_id": "calibration-001",
            "mode": "calibration",
            "index": sample_calibration_index(),
            "visuals": [sample_visual()],
            "decisions": sample_calibration_decisions(),
            "policy": sample_policy(),
            "package_hashes": sample_package_hashes(),
            "policy_snapshot_label": (
                "tmp/source-audit/review-packages/calibration/"
                "editorial-policy.snapshot.json"
            ),
        }
        first = build_batch_manifest(**arguments)
        second = build_batch_manifest(**arguments)
        self.assertEqual(
            deterministic_json_bytes(first),
            deterministic_json_bytes(second),
        )
        self.assertEqual(
            [item["pdfPage"] for item in first["pageBundles"]],
            first["pages"],
        )
        self.assertEqual(
            first["policySnapshotSha256"],
            sha256_json(arguments["policy"]),
        )
class ReviewPackageCliTests(unittest.TestCase):
    def test_selection_only_command_accepts_a_normal_twenty_source_batch(self):
        args = argparse.Namespace(
            batch_id="normal-002",
            index="index.json",
            visuals="visuals.json",
            decisions="decisions.json",
            policy="policy.json",
            mode="normal",
        )
        payloads = {
            Path("index.json"): sample_calibration_index(),
            Path("visuals.json"): [sample_visual()],
            Path("decisions.json"): sample_calibration_decisions(),
            Path("policy.json"): sample_policy(),
        }
        with mock.patch(
            "scripts.source_audit.build_review_packages.load_json",
            side_effect=lambda path: copy.deepcopy(payloads[Path(path)]),
        ), mock.patch(
            "scripts.source_audit.build_review_packages.select_batch_pages",
            return_value=(
                [10, 20, 32, 35, 52],
                [f"source-{number:02d}" for number in range(20)],
            ),
        ) as selector, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(selection_only_command(args), 0)
        selector.assert_called_once_with(
            "normal",
            payloads[Path("index.json")],
            payloads[Path("visuals.json")],
            payloads[Path("decisions.json")],
            payloads[Path("policy.json")],
            batch_id="normal-002",
        )

    def test_selection_only_command_emits_a_pinnable_normal_selection(self):
        args = argparse.Namespace(
            batch_id="normal-001",
            index="index.json",
            visuals="visuals.json",
            decisions="decisions.json",
            policy="policy.json",
            mode="normal",
        )
        payloads = {
            Path("index.json"): sample_calibration_index(),
            Path("visuals.json"): [sample_visual()],
            Path("decisions.json"): sample_calibration_decisions(),
            Path("policy.json"): sample_policy(),
        }
        output = io.StringIO()
        with mock.patch(
            "scripts.source_audit.build_review_packages.load_json",
            side_effect=lambda path: copy.deepcopy(payloads[Path(path)]),
        ), mock.patch(
            "scripts.source_audit.build_review_packages.select_batch_pages",
            return_value=([10, 20, 32, 35, 52], [
                f"source-{number:02d}" for number in range(20)
            ]),
        ), contextlib.redirect_stdout(output):
            self.assertEqual(selection_only_command(args), 0)

        self.assertEqual(
            json.loads(output.getvalue()),
            {
                "batchId": "normal-001",
                "mode": "normal",
                "pages": [10, 20, 32, 35, 52],
                "sourceCount": 20,
                "sourceIds": [
                    f"source-{number:02d}" for number in range(20)
                ],
            },
        )

    def test_selection_only_command_reports_shortfall_without_writes(self):
        args = argparse.Namespace(
            index=Path("index.json"),
            visuals=Path("visuals.json"),
            decisions=Path("decisions.json"),
            policy=Path("policy.json"),
            mode="calibration",
        )
        payloads = {
            Path("index.json"): sample_calibration_index(),
            Path("visuals.json"): [sample_visual()],
            Path("decisions.json"): sample_short_calibration_decisions(),
            Path("policy.json"): sample_policy(),
        }
        output = io.StringIO()
        with mock.patch(
            "scripts.source_audit.build_review_packages.load_json",
            side_effect=lambda path: copy.deepcopy(payloads[Path(path)]),
        ), mock.patch(
            "scripts.source_audit.build_review_packages.select_batch_pages",
            return_value=([10, 20, 32, 35, 52, 81, 239, 240, 279], ["x"] * 29),
        ), contextlib.redirect_stdout(output):
            status = selection_only_command(args)
        self.assertEqual(status, 3)
        self.assertEqual(
            json.loads(output.getvalue()),
            {
                "pages": [10, 20, 32, 35, 52, 81, 239, 240, 279],
                "sourceCount": 29,
            },
        )

    def test_selection_only_command_converts_cli_paths_to_path_objects(self):
        args = argparse.Namespace(
            index="index.json",
            visuals="visuals.json",
            decisions="decisions.json",
            policy="policy.json",
            mode="calibration",
        )
        loaded = []

        def load(path):
            loaded.append(path)
            return sample_policy() if path.name == "policy.json" else {}

        with mock.patch(
            "scripts.source_audit.build_review_packages.load_json",
            side_effect=load,
        ), mock.patch(
            "scripts.source_audit.build_review_packages.select_batch_pages",
            return_value=([], []),
        ), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(selection_only_command(args), 3)
        self.assertEqual(
            loaded,
            [
                Path("index.json"),
                Path("visuals.json"),
                Path("decisions.json"),
                Path("policy.json"),
            ],
        )

    def test_build_paths_reject_every_protected_input_under_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "packages"
            output.mkdir()
            defaults = {
                "pdf": root / "source.pdf",
                "index": root / "index.json",
                "visuals": root / "visuals.json",
                "decisions": root / "decisions.json",
                "policy": root / "policy.json",
                "analysis": root / "analysis.md",
                "course_outline": root / "outline.md",
                "image_dir": root / "images",
                "output_dir": output,
            }
            for name in defaults:
                if name == "output_dir":
                    continue
                with self.subTest(name=name):
                    values = dict(defaults)
                    values[name] = output / f"protected-{name}"
                    with self.assertRaisesRegex(
                        AuditValidationError,
                        "path conflict",
                    ):
                        _validate_build_paths(
                            argparse.Namespace(**values)
                        )

    def test_build_paths_reject_output_under_protected_image_tree(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            image_dir = root / "images"
            image_dir.mkdir()
            args = argparse.Namespace(
                pdf=root / "source.pdf",
                index=root / "index.json",
                visuals=root / "visuals.json",
                decisions=root / "decisions.json",
                policy=root / "policy.json",
                analysis=root / "analysis.md",
                course_outline=root / "outline.md",
                image_dir=image_dir,
                output_dir=image_dir / "packages",
            )
            with self.assertRaisesRegex(AuditValidationError, "path conflict"):
                _validate_build_paths(args)

    def test_build_paths_reject_casefold_and_unicode_containment_aliases(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            defaults = {
                "pdf": root / "source.pdf",
                "index": root / "index.json",
                "visuals": root / "visuals.json",
                "decisions": root / "decisions.json",
                "policy": root / "policy.json",
                "analysis": root / "analysis.md",
                "course_outline": root / "outline.md",
                "image_dir": root / "images",
                "output_dir": root / "packages",
            }
            cases = {
                "casefold": {
                    "output_dir": root / "PACKAGES",
                    "policy": root / "packages" / "policy.json",
                },
                "unicode": {
                    "output_dir": root / "caf\u00e9",
                    "analysis": root / "cafe\u0301" / "analysis.md",
                },
            }
            for name, changes in cases.items():
                with self.subTest(name=name):
                    values = dict(defaults)
                    values.update(changes)
                    with self.assertRaisesRegex(AuditValidationError, "path conflict"):
                        _validate_build_paths(argparse.Namespace(**values))

    def test_full_build_writes_all_package_files(self):
        args = argparse.Namespace(output_dir="tmp/packages")
        outputs = {
            Path("tmp/packages/page-020.json"): b"{}\n",
            Path("tmp/packages/editorial-policy.snapshot.json"): b"{}\n",
            Path("tmp/packages/manifest.json"): b"{}\n",
        }
        summary = {
            "batchId": "calibration-001",
            "pageCount": 1,
            "sourceCount": 30,
        }
        output = io.StringIO()
        with mock.patch(
            "scripts.source_audit.build_review_packages._build_package_outputs",
            return_value=(outputs, summary),
        ) as builder, mock.patch(
            "scripts.source_audit.build_review_packages.write_files_transaction",
        ) as transaction, contextlib.redirect_stdout(output):
            status = full_build_command(args)
        builder.assert_called_once_with(args)
        transaction.assert_called_once_with(outputs)
        self.assertEqual(status, 0)
        self.assertEqual(json.loads(output.getvalue()), summary)

    def test_normal_full_build_uses_its_batch_id_for_pages_and_manifest(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as directory:
            root = Path(directory).relative_to(Path.cwd())
            policy_path = root / "policy.json"
            policy_path.write_text(
                json.dumps(sample_policy()),
                encoding="utf-8",
            )
            args = argparse.Namespace(
                batch_id="normal-002",
                mode="normal",
                pdf=root / "source.pdf",
                index=root / "index.json",
                visuals=root / "visuals.json",
                decisions=root / "decisions.json",
                policy=policy_path,
                analysis=root / "analysis.md",
                course_outline=root / "outline.md",
                image_dir=root / "images",
                output_dir=root / "packages",
            )
            inputs = {
                "index": sample_calibration_index(),
                "visuals": [sample_visual()],
                "decisions": sample_calibration_decisions(),
                "policy": sample_policy(),
                "fullText": {},
                "analysisSections": [],
                "outlineSections": [],
            }
            selected_pages = [10, 20, 32, 35, 52]
            selected_source_ids = [f"source-{number}" for number in range(20)]
            with mock.patch(
                "scripts.source_audit.build_review_packages._validate_build_paths",
            ), mock.patch(
                "scripts.source_audit.build_review_packages._load_build_inputs",
                return_value=inputs,
            ), mock.patch(
                "scripts.source_audit.build_review_packages._package_evidence_hashes",
                return_value=sample_evidence_hashes(),
            ), mock.patch(
                "scripts.source_audit.build_review_packages.build_must_keep_inventory",
                return_value=[],
            ), mock.patch(
                "scripts.source_audit.build_review_packages.build_page_bundle",
                return_value={},
            ), mock.patch(
                "scripts.source_audit.build_review_packages.sha256_file",
                return_value="a" * 64,
            ), mock.patch(
                "scripts.source_audit.build_review_packages.select_batch_pages",
                return_value=(selected_pages, selected_source_ids),
            ) as selector:
                outputs, summary = _build_package_outputs(args)

        self.assertEqual(summary["sourceCount"], 20)
        self.assertEqual(
            json.loads(outputs[args.output_dir / "manifest.json"])["pages"],
            selected_pages,
        )
        self.assertEqual(
            [call.kwargs.get("batch_id") for call in selector.call_args_list],
            ["normal-002", "normal-002"],
        )

    def test_normal_full_build_uses_a_pinned_selection_after_discovery(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as directory:
            root = Path(directory).relative_to(Path.cwd())
            policy_path = root / "policy.json"
            policy_path.write_text(
                json.dumps(sample_policy()),
                encoding="utf-8",
            )
            pinned = {
                "batchId": "normal-001",
                "mode": "normal",
                "pages": [10, 20, 81, 239, 240],
                "sourceCount": 20,
                "sourceIds": [
                    "experiment-1-1", "experiment-10-4",
                    "experiment-2-7", "experiment-2-8",
                    "experiment-4-4", "figure-1-4",
                    "figure-10-3", "figure-2-6", "figure-3-5",
                    "figure-8-2", "figure-8-3", "figure-8-4",
                    "page-010", "page-020", "page-081", "page-239",
                    "page-240", "table-10-1", "table-7-4", "table-8-2",
                ],
            }
            selection_path = root / "normal-001-selection.json"
            selection_path.write_text(json.dumps(pinned), encoding="utf-8")
            args = argparse.Namespace(
                batch_id="normal-001",
                mode="normal",
                pdf=root / "source.pdf",
                index=root / "index.json",
                visuals=root / "visuals.json",
                decisions=root / "decisions.json",
                policy=policy_path,
                analysis=root / "analysis.md",
                course_outline=root / "outline.md",
                image_dir=root / "images",
                output_dir=root / "packages",
                selection=selection_path,
            )
            inputs = {
                "index": sample_calibration_index(),
                "visuals": [sample_visual()],
                "decisions": sample_calibration_decisions(),
                "policy": sample_policy(),
                "fullText": {},
                "analysisSections": [],
                "outlineSections": [],
            }
            with mock.patch(
                "scripts.source_audit.build_review_packages._validate_build_paths",
            ), mock.patch(
                "scripts.source_audit.build_review_packages._load_build_inputs",
                return_value=inputs,
            ), mock.patch(
                "scripts.source_audit.build_review_packages._package_evidence_hashes",
                return_value=sample_evidence_hashes(),
            ), mock.patch(
                "scripts.source_audit.build_review_packages.build_must_keep_inventory",
                return_value=[],
            ), mock.patch(
                "scripts.source_audit.build_review_packages.build_page_bundle",
                return_value={},
            ), mock.patch(
                "scripts.source_audit.build_review_packages.sha256_file",
                return_value="a" * 64,
            ), mock.patch(
                "scripts.source_audit.build_review_packages.select_batch_pages",
                side_effect=AssertionError("pinned full build must not reselect"),
            ) as selector:
                outputs, summary = _build_package_outputs(args)

        manifest = json.loads(outputs[args.output_dir / "manifest.json"])
        self.assertEqual(summary["sourceCount"], 20)
        self.assertEqual(manifest["pages"], pinned["pages"])
        self.assertEqual(manifest["sourceIds"], pinned["sourceIds"])
        selector.assert_not_called()

    def test_full_build_snapshots_raw_policy_bytes_with_matching_manifest_hash(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as directory:
            root = Path(directory).relative_to(Path.cwd())
            policy = sample_policy()
            policy_bytes = json.dumps(
                policy,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
            paths = {
                name: root / filename
                for name, filename in {
                    "pdf": "source.pdf",
                    "index": "index.json",
                    "visuals": "visuals.json",
                    "decisions": "decisions.json",
                    "policy": "policy.json",
                    "analysis": "analysis.md",
                    "course_outline": "outline.md",
                }.items()
            }
            for name, path in paths.items():
                path.write_bytes(
                    policy_bytes if name == "policy" else b"fixture\n"
                )
            image_dir = root / "images"
            image_dir.mkdir()
            output_dir = root / "packages"
            args = argparse.Namespace(
                batch_id="calibration-001",
                mode="calibration",
                image_dir=image_dir,
                output_dir=output_dir,
                **paths,
            )
            inputs = {
                "index": sample_calibration_index(),
                "visuals": [sample_visual()],
                "decisions": sample_calibration_decisions(),
                "policy": policy,
                "fullText": {},
                "analysisSections": [],
                "outlineSections": [],
            }
            with mock.patch(
                "scripts.source_audit.build_review_packages._load_build_inputs",
                return_value=inputs,
            ), mock.patch(
                "scripts.source_audit.build_review_packages.select_batch_pages",
                return_value=([], ["source"] * 30),
            ), mock.patch(
                "scripts.source_audit.build_review_packages.build_must_keep_inventory",
                return_value=[],
            ), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(full_build_command(args), 0)
            snapshot = output_dir / "editorial-policy.snapshot.json"
            manifest = json.loads((output_dir / "manifest.json").read_text())
            self.assertEqual(snapshot.read_bytes(), policy_bytes)
            self.assertEqual(manifest["policySnapshotSha256"], sha256_file(paths["policy"]))
            self.assertEqual(manifest["policySnapshotSha256"], sha256_file(snapshot))

    def test_main_parses_task10_full_and_selection_commands(self):
        common = [
            "--batch-id", "calibration-001", "--index", "i",
            "--visuals", "v", "--decisions", "d", "--policy", "e",
            "--mode", "calibration",
        ]
        parser = build_parser()
        selection = parser.parse_args([*common, "--selection-only"])
        full = parser.parse_args([
            *common, "--pdf", "p", "--analysis", "a",
            "--course-outline", "c", "--image-dir", "g",
            "--output-dir", "o",
        ])
        self.assertIs(
            _select_cli_handler(parser, selection),
            selection_only_command,
        )
        self.assertIs(
            _select_cli_handler(parser, full),
            full_build_command,
        )
