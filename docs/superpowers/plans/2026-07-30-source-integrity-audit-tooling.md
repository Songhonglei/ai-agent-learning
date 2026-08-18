# Source Integrity Audit Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic, read-only tooling that inventories the 314-page source PDF, bootstraps human review decisions, generates coverage and visual reports, and renders the pages required for visual verification.

**Architecture:** A small Python package separates contracts, PDF extraction, report generation, and page rendering. JSON is the canonical machine-readable layer; Markdown reports are generated views. Automation may initialize items as `unreviewed`, but only humans may decide whether content is included, compressed, excluded, or missing.

**Tech Stack:** Bundled Python 3, Python standard library `unittest`, `pypdf`, Poppler `pdftoppm`, JSON, Markdown.

## Global Constraints

- Use `python3`, never `python`.
- Read `reference/原始文档.pdf` without modifying it.
- The expected PDF SHA-256 is `27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`.
- The expected source baseline is 314 pages, 120 numbered figures, 23 numbered tables, and 94 numbered experiments.
- Generated JSON and Markdown must use stable ordering, UTF-8, LF line endings, and no volatile timestamps.
- `coverage-decisions.json` may be created only when absent and must never be overwritten by generation.
- Keyword similarity must never be treated as proof that content is covered.
- Rendered review pages belong under `tmp/pdfs/source-audit/` and must not be committed.
- The plan implements audit tooling and the initial audit baseline; chapter-by-chapter editorial decisions are a separate implementation plan.

---

### Task 1: Core contracts and deterministic JSON

**Files:**
- Create: `scripts/source_audit/__init__.py`
- Create: `scripts/source_audit/models.py`
- Create: `tests/source_audit/__init__.py`
- Create: `tests/source_audit/test_models.py`

**Interfaces:**
- Consumes: Python dictionaries loaded from generated JSON.
- Produces:
  - `AuditValidationError`
  - `stable_source_id(kind, number=None, pdf_page=None, ordinal=None) -> str`
  - `load_json(path: Path) -> object`
  - `write_json_deterministic(path: Path, value: object) -> None`
  - `all_source_items(index: dict) -> list[dict]`
  - `validate_index(index: dict) -> None`
  - `validate_decisions(index: dict, decisions: list[dict], require_complete: bool = False) -> None`

- [x] **Step 1: Write failing model tests**

```python
import json
import tempfile
import unittest
from pathlib import Path

from scripts.source_audit.models import (
    AuditValidationError,
    stable_source_id,
    validate_decisions,
    write_json_deterministic,
)


class ModelTests(unittest.TestCase):
    def test_stable_source_ids(self):
        self.assertEqual(stable_source_id("figure", number="1-2"), "figure-1-2")
        self.assertEqual(stable_source_id("page", pdf_page=20), "page-020")
        self.assertEqual(
            stable_source_id("outline", pdf_page=20, ordinal=3),
            "outline-020-003",
        )

    def test_deterministic_json_has_sorted_keys_and_final_newline(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "out.json"
            write_json_deterministic(path, {"z": 1, "a": 2})
            self.assertEqual(path.read_text(), '{\n  "a": 2,\n  "z": 1\n}\n')

    def test_complete_validation_rejects_unreviewed_item(self):
        index = {
            "pages": [{"sourceId": "page-001"}],
            "outline": [],
            "numberedItems": [],
        }
        decisions = [{
            "sourceId": "page-001",
            "disposition": "unreviewed",
            "reason": "",
            "lessonIds": [],
            "markdownRefs": [],
            "reviewState": "unreviewed",
        }]
        with self.assertRaisesRegex(AuditValidationError, "unreviewed"):
            validate_decisions(index, decisions, require_complete=True)
```

- [x] **Step 2: Run the model tests and verify the import failure**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_models -v
```

Expected: `ModuleNotFoundError: No module named 'scripts.source_audit'`.

- [x] **Step 3: Implement the contracts**

`models.py` must define these exact constants and validation rules:

```python
DISPOSITIONS = {"included", "compressed", "excluded", "missing", "unreviewed"}
VISUAL_CLASSES = {"semantic-core", "evidence", "decorative"}
VISUAL_HANDLINGS = {"reuse", "redraw", "text-alt", "omit"}
NUMBERED_KINDS = {"figure", "table", "experiment"}
ALL_KINDS = NUMBERED_KINDS | {"page", "outline"}


class AuditValidationError(ValueError):
    pass


def stable_source_id(kind, number=None, pdf_page=None, ordinal=None):
    if kind in NUMBERED_KINDS and number:
        return f"{kind}-{number}"
    if kind == "page" and pdf_page is not None:
        return f"page-{pdf_page:03d}"
    if kind == "outline" and pdf_page is not None and ordinal is not None:
        return f"outline-{pdf_page:03d}-{ordinal:03d}"
    raise AuditValidationError(f"cannot build source id for kind={kind!r}")
```

`write_json_deterministic` must call `json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)`, append exactly one newline, create parent directories, and write UTF-8. `validate_decisions` must reject duplicate or unknown IDs, invalid enum values, empty reasons for `excluded` or `missing`, reviewed records without a final disposition, and `semantic-core` course visuals handled as `omit`.

- [x] **Step 4: Run the model tests**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_models -v
```

Expected: all tests pass.

- [x] **Step 5: Commit Task 1**

```bash
git add scripts/source_audit/__init__.py scripts/source_audit/models.py tests/source_audit/__init__.py tests/source_audit/test_models.py
git commit -m "feat: add source audit data contracts"
```

### Task 2: PDF manifest and source index extraction

**Files:**
- Create: `scripts/source_audit/extract_pdf_index.py`
- Create: `tests/source_audit/test_extract_pdf_index.py`
- Create: `tests/source_audit/test_original_pdf_integration.py`

**Interfaces:**
- Consumes:
  - `reference/原始文档.pdf`
  - `stable_source_id` and deterministic JSON helpers from Task 1
- Produces:
  - `sha256_file(path: Path) -> str`
  - `extract_printed_page(text: str) -> int | None`
  - `extract_numbered_occurrences(text: str, pdf_page: int) -> list[dict]`
  - `flatten_outline(reader) -> list[dict]`
  - `build_source_index(pdf_path: Path, relative_pdf_path: str) -> tuple[dict, dict]`
  - CLI options `--pdf`, `--manifest`, and `--index`

- [x] **Step 1: Write failing pure-function tests**

```python
import unittest

from scripts.source_audit.extract_pdf_index import (
    extract_numbered_occurrences,
    extract_printed_page,
)


class ExtractPdfIndexTests(unittest.TestCase):
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
```

- [x] **Step 2: Run the extraction unit tests and verify the import failure**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_extract_pdf_index -v
```

Expected: import fails because `extract_pdf_index.py` does not exist.

- [x] **Step 3: Implement extraction helpers and index schema**

Use these exact regular expressions:

```python
NUMBERED_LINE = re.compile(
    r"(?m)^(图|表|实验)\s*([0-9]+-[0-9]+)\s*[:：—-]?\s*([^\n]*)$"
)
PRINTED_PAGE_LINE = re.compile(r"^\s*([0-9]+)\s*$")
SYMBOL_KEYS = {"✓": "check", "✗": "cross", "△": "triangle", "★": "star"}
KIND_MAP = {"图": "figure", "表": "table", "实验": "experiment"}
```

`build_source_index` must return:

```python
manifest = {
    "schemaVersion": 1,
    "pdfPath": "reference/原始文档.pdf",
    "sha256": "...",
    "title": "...",
    "author": "...",
    "pageCount": 314,
    "counts": {
        "figures": 120,
        "tables": 23,
        "experiments": 94,
        "outlineItems": 283,
    },
}

index = {
    "schemaVersion": 1,
    "pdfPath": "reference/原始文档.pdf",
    "pages": [],
    "outline": [],
    "numberedItems": [],
}
```

Each page entry must contain `sourceId`, `kind`, `pdfPage`, `printedPage`, `chapter`, `charCount`, `textPreview` limited to 160 normalized characters, and page-level `symbolCounts`. Each outline entry must contain `sourceId`, `kind`, `depth`, `ordinal`, `pdfPage`, and `title`. Each numbered item must contain `sourceId`, `kind`, `number`, `chapter`, `pdfPage`, `printedPage`, `title`, `occurrences`, and page-level `symbolCounts`.

When an item appears more than once, merge occurrences by `(kind, number)`, use the first page containing a caption-like line as `pdfPage`, preserve every candidate in `occurrences`, and set `captionConflict` to `true` when distinct non-empty titles remain.

- [x] **Step 4: Write the original-PDF integration test**

```python
import unittest
from pathlib import Path

from scripts.source_audit.extract_pdf_index import build_source_index


class OriginalPdfIntegrationTests(unittest.TestCase):
    def test_current_pdf_matches_approved_baseline(self):
        manifest, index = build_source_index(
            Path("reference/原始文档.pdf"),
            "reference/原始文档.pdf",
        )
        self.assertEqual(
            manifest["sha256"],
            "27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac",
        )
        self.assertEqual(manifest["pageCount"], 314)
        self.assertEqual(manifest["counts"]["figures"], 120)
        self.assertEqual(manifest["counts"]["tables"], 23)
        self.assertEqual(manifest["counts"]["experiments"], 94)
        self.assertEqual(manifest["counts"]["outlineItems"], 283)
        self.assertFalse([
            page for page in index["pages"] if page["charCount"] == 0
        ])
```

- [x] **Step 5: Implement the extraction CLI**

The module entry point must:

1. Resolve paths from the current project root.
2. Fail with a clear message when the PDF is absent.
3. Build manifest and index once.
4. Validate the index.
5. Write both outputs with `write_json_deterministic`.
6. Print only the output paths and final counts.

Run syntax:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.extract_pdf_index \
  --pdf reference/原始文档.pdf \
  --manifest reference/source-audit/source-manifest.json \
  --index reference/source-audit/source-index.json
```

- [x] **Step 6: Run extraction tests**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest \
  tests.source_audit.test_extract_pdf_index \
  tests.source_audit.test_original_pdf_integration -v
```

Expected: all tests pass and the integration test completes without modifying the PDF.

- [x] **Step 7: Commit Task 2**

```bash
git add scripts/source_audit/extract_pdf_index.py tests/source_audit/test_extract_pdf_index.py tests/source_audit/test_original_pdf_integration.py
git commit -m "feat: extract deterministic PDF source index"
```

### Task 3: Human decision bootstrap and generated reports

**Files:**
- Create: `scripts/source_audit/build_reports.py`
- Create: `tests/source_audit/test_build_reports.py`

**Interfaces:**
- Consumes:
  - `source-index.json`
  - optional existing `coverage-decisions.json`
  - validation and JSON helpers from Task 1
- Produces:
  - `initial_decision(item: dict) -> dict`
  - `initialize_decisions(index: dict, decisions_path: Path) -> list[dict]`
  - `render_coverage_matrix(index: dict, decisions: list[dict]) -> str`
  - `render_visual_asset_index(index: dict, decisions: list[dict]) -> str`
  - CLI options `--index`, `--decisions`, `--coverage-report`, `--visual-report`, and `--require-complete`

- [x] **Step 1: Write failing report tests**

```python
import tempfile
import unittest
from pathlib import Path

from scripts.source_audit.build_reports import (
    initialize_decisions,
    render_coverage_matrix,
    render_visual_asset_index,
)


class BuildReportsTests(unittest.TestCase):
    def setUp(self):
        self.index = {
            "pages": [{"sourceId": "page-001", "kind": "page", "pdfPage": 1}],
            "outline": [],
            "numberedItems": [{
                "sourceId": "figure-1-2",
                "kind": "figure",
                "number": "1-2",
                "pdfPage": 20,
                "printedPage": 12,
                "title": "上下文消融实验设计",
                "symbolCounts": {"check": 22, "cross": 6, "triangle": 2, "star": 2},
            }],
        }

    def test_initialize_decisions_never_overwrites_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "decisions.json"
            path.write_text('[{"sourceId":"kept"}]\n')
            decisions = initialize_decisions(self.index, path)
            self.assertEqual(decisions, [{"sourceId": "kept"}])
            self.assertEqual(path.read_text(), '[{"sourceId":"kept"}]\n')

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
```

- [x] **Step 2: Run report tests and verify the import failure**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_build_reports -v
```

Expected: import fails because `build_reports.py` does not exist.

- [x] **Step 3: Implement decision initialization**

The initial record for every item returned by `all_source_items(index)` must be:

```python
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
```

If `decisions_path` exists, load and return it without writing. If absent, create the parent directory, write all initial records in `sourceId` order, and return them.

- [x] **Step 4: Implement both Markdown reports**

`source-coverage-matrix.md` must contain:

- PDF fingerprint and baseline totals.
- Disposition summary with Chinese labels.
- Separate tables for pages, outline items, figures, tables, and experiments.
- Columns: source ID, PDF page, printed page, title, disposition, lesson IDs, Markdown references, and reason.
- A visible warning when any item is `unreviewed`.

`visual-asset-index.md` must contain:

- Figure and table totals.
- Visual-class and visual-handling summaries.
- Columns: source ID, PDF page, title, semantic symbol text, visual class, handling, lessons, and disposition.
- Symbol text such as `22次正确标记、6次错误标记、2次部分成立标记、2颗难度星`.

- [x] **Step 5: Implement the report CLI and completion gate**

The CLI must initialize or load decisions, validate them, write both reports, then:

- exit `0` for a normal in-progress report;
- exit `2` when `--require-complete` is present and any item is unreviewed;
- never modify an existing decisions file.

- [x] **Step 6: Run report tests**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_build_reports -v
```

Expected: all tests pass.

- [x] **Step 7: Commit Task 3**

```bash
git add scripts/source_audit/build_reports.py tests/source_audit/test_build_reports.py
git commit -m "feat: generate source audit reports"
```

### Task 4: Visual review page renderer

**Files:**
- Create: `scripts/source_audit/render_review_pages.py`
- Create: `tests/source_audit/test_render_review_pages.py`

**Interfaces:**
- Consumes:
  - source index
  - immutable source PDF
  - `pdftoppm`
- Produces:
  - `review_page_numbers(index: dict) -> list[int]`
  - `parse_page_selection(value: str) -> list[int]`
  - `render_pages(pdf_path: Path, pages: list[int], output_dir: Path, pdftoppm: str, dpi: int = 120) -> list[Path]`
  - PNG files named `page-010.png`

- [x] **Step 1: Write failing renderer tests**

```python
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.source_audit.render_review_pages import (
    parse_page_selection,
    render_pages,
    review_page_numbers,
)


class RenderReviewPagesTests(unittest.TestCase):
    def test_page_selection_is_sorted_and_unique(self):
        self.assertEqual(parse_page_selection("20,10,20,81"), [10, 20, 81])

    def test_review_pages_include_visuals_and_semantic_symbols(self):
        index = {
            "pages": [
                {"pdfPage": 10, "symbolCounts": {}},
                {"pdfPage": 20, "symbolCounts": {"check": 2}},
            ],
            "numberedItems": [
                {"kind": "figure", "pdfPage": 10},
                {"kind": "experiment", "pdfPage": 20},
            ],
        }
        self.assertEqual(review_page_numbers(index), [10, 20])

    @patch("scripts.source_audit.render_review_pages.subprocess.run")
    def test_render_uses_singlefile_and_explicit_page(self, run):
        with tempfile.TemporaryDirectory() as directory:
            def write_png(arguments, **_kwargs):
                Path(f"{arguments[-1]}.png").write_bytes(
                    b"\x89PNG\r\n\x1a\n" + b"test"
                )

            run.side_effect = write_png
            render_pages(
                Path("source.pdf"),
                [10],
                Path(directory),
                "/path/to/pdftoppm",
            )
        args = run.call_args.args[0]
        self.assertIn("-singlefile", args)
        self.assertEqual(args[args.index("-f") + 1], "10")
        self.assertEqual(args[args.index("-l") + 1], "10")
```

- [x] **Step 2: Run renderer tests and verify the import failure**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_render_review_pages -v
```

Expected: import fails because `render_review_pages.py` does not exist.

- [x] **Step 3: Implement safe rendering**

Use `subprocess.run([...], check=True, capture_output=True, text=True)` without a shell. The command for PDF page 10 must be equivalent to:

```bash
pdftoppm -f 10 -l 10 -singlefile -png -r 120 reference/原始文档.pdf tmp/pdfs/source-audit/page-010
```

Before each render, create only the explicit output directory. After rendering, require the expected PNG to exist and begin with the eight-byte PNG signature `\x89PNG\r\n\x1a\n`; otherwise raise `AuditValidationError`.

- [x] **Step 4: Implement the renderer CLI**

CLI options:

- `--pdf`
- `--index`
- `--output-dir`
- `--pdftoppm`
- `--dpi`
- optional `--pages 10,20,81,279`

When `--pages` is omitted, render every page returned by `review_page_numbers`.

- [x] **Step 5: Run renderer tests**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_render_review_pages -v
```

Expected: all tests pass.

- [x] **Step 6: Commit Task 4**

```bash
git add scripts/source_audit/render_review_pages.py tests/source_audit/test_render_review_pages.py
git commit -m "feat: render PDF pages for visual audit"
```

### Task 5: Generate and verify the current audit baseline

**Files:**
- Create: `reference/source-audit/source-manifest.json`
- Create: `reference/source-audit/source-index.json`
- Create: `reference/source-audit/coverage-decisions.json`
- Create: `reference/source-audit/source-coverage-matrix.md`
- Create: `reference/source-audit/visual-asset-index.md`
- Modify: `reference/材料来源说明.md`
- Modify: `06-开发计划与验收标准.md`
- Modify: `docs/superpowers/specs/2026-07-30-source-integrity-audit-design.md`

**Interfaces:**
- Consumes: all tooling from Tasks 1-4 and the immutable PDF.
- Produces: the first reproducible audit baseline and four rendered spot-check pages.

- [x] **Step 1: Run the full automated test suite**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: all tests pass.

- [x] **Step 2: Generate manifest and index**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.extract_pdf_index \
  --pdf reference/原始文档.pdf \
  --manifest reference/source-audit/source-manifest.json \
  --index reference/source-audit/source-index.json
```

Expected summary: `314 pages, 120 figures, 23 tables, 94 experiments, 283 outline items`.

- [x] **Step 3: Bootstrap decisions and generate reports**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_reports \
  --index reference/source-audit/source-index.json \
  --decisions reference/source-audit/coverage-decisions.json \
  --coverage-report reference/source-audit/source-coverage-matrix.md \
  --visual-report reference/source-audit/visual-asset-index.md
```

Expected: reports are generated, decisions are preserved, and the report clearly says the editorial review is incomplete.

- [x] **Step 4: Verify deterministic generation**

Capture hashes:

```bash
shasum -a 256 \
  reference/source-audit/source-manifest.json \
  reference/source-audit/source-index.json \
  reference/source-audit/source-coverage-matrix.md \
  reference/source-audit/visual-asset-index.md
```

Run Steps 2 and 3 again, then run the same hash command. Expected: all four hashes are unchanged and `coverage-decisions.json` is byte-for-byte unchanged.

- [x] **Step 5: Render mandatory visual spot checks**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages \
  --pdf reference/原始文档.pdf \
  --index reference/source-audit/source-index.json \
  --output-dir tmp/pdfs/source-audit \
  --pdftoppm /Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm \
  --pages 10,20,81,279
```

Expected: `page-010.png`, `page-020.png`, `page-081.png`, and `page-279.png` exist and pass PNG-signature validation.

- [x] **Step 6: Inspect all four rendered pages**

Inspect each PNG with the local image viewer. Verify:

- page 10: Agent formula and chapter relationship diagram are readable;
- page 20: check, cross, triangle, and star meanings are readable;
- page 81: four memory strategies and the simplicity-to-expressiveness axis are readable;
- page 279: shared and non-shared context architectures and trade-offs are readable.

Expected: zero clipping, black squares, overlapping text, or unreadable semantic symbols.

- [x] **Step 7: Update project documentation**

Replace `reference/材料来源说明.md` with:

```markdown
# 材料来源说明

## 事实源

- `原始文档.pdf` 是课程知识内容的原始事实源，审计工具只读访问。
- `book-analysis.md` 是面向非技术白领的选择性分析与课程提炼，不是原书的完整Markdown转换。
- 产品会话、视觉稿和线上Demo属于产品表达来源，不应冒充原书结论。

## 来源审计

- [源文件清单](source-audit/source-manifest.json)
- [结构化来源索引](source-audit/source-index.json)
- [人工处置记录](source-audit/coverage-decisions.json)
- [来源覆盖矩阵](source-audit/source-coverage-matrix.md)
- [视觉资产索引](source-audit/visual-asset-index.md)

覆盖矩阵和视觉索引由审计工具生成。只要人工处置记录中仍有 `unreviewed`，阶段A就尚未完成。
```

In the design spec, replace `待书面规格确认` with `工具已实现，人工复核中`. In `06-开发计划与验收标准.md`, replace `阶段A执行准备中` with `阶段A自动索引完成，人工复核中`. Do not check any Stage A completion checkbox.

- [x] **Step 8: Verify the source PDF is unchanged**

Run:

```bash
shasum -a 256 reference/原始文档.pdf
```

Expected:

```text
27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac  reference/原始文档.pdf
```

- [x] **Step 9: Verify the completion gate correctly fails**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_reports \
  --index reference/source-audit/source-index.json \
  --decisions reference/source-audit/coverage-decisions.json \
  --coverage-report reference/source-audit/source-coverage-matrix.md \
  --visual-report reference/source-audit/visual-asset-index.md \
  --require-complete
```

Expected: exit code `2` with a concise count of unreviewed items. This is a successful negative test proving tooling cannot falsely declare Stage A complete.

- [x] **Step 10: Commit Task 5**

```bash
git add reference/source-audit reference/材料来源说明.md 06-开发计划与验收标准.md docs/superpowers/specs/2026-07-30-source-integrity-audit-design.md
git commit -m "docs: establish source audit baseline"
```

### Task 6: Tooling acceptance and editorial-review handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-07-30-source-integrity-audit-tooling.md`
- Outside this tooling plan: `docs/superpowers/plans/2026-07-30-source-integrity-editorial-review.md`

**Interfaces:**
- Consumes: tested tooling, generated audit baseline, and rendered review pages.
- Produces: verified evidence that tooling is ready, plus an explicit boundary for the next plan.

- [x] **Step 1: Run the full suite and capture evidence**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: all tests pass with zero errors and zero failures.

- [x] **Step 2: Re-run baseline invariants**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests.source_audit.test_original_pdf_integration -v
```

Expected: the hash, 314/120/23/94 counts, 283 outline items, and non-empty page text all pass.

- [x] **Step 3: Confirm generated-file and temporary-file boundaries**

Run:

```bash
git status --short
git check-ignore -v tmp/pdfs/source-audit/page-010.png
```

Expected: the committed audit JSON/Markdown files are tracked, and rendered PNGs are ignored.

- [x] **Step 4: Record the tooling-plan result**

Mark completed checkboxes in this plan only after their commands have actually passed. Append this structure with the real command output copied into each matching bullet:

```markdown
## Execution Result

- Full test command: `/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -p 'test_*.py' -v`
- Test outcome: exact final `unittest` summary from Step 1.
- Source PDF SHA-256: exact `shasum -a 256` output from Task 5 Step 8.
- Generated artifacts: the five paths under `reference/source-audit/`.
- Visual inspection: pages 10, 20, 81, and 279, with the observed defect count.
- Remaining editorial work: exact `unreviewed` count from the completion-gate failure.
- Stage A status: open pending chapter-by-chapter editorial review.
```

- [x] **Step 5: Commit acceptance evidence**

```bash
git add docs/superpowers/plans/2026-07-30-source-integrity-audit-tooling.md
git commit -m "docs: record source audit tooling verification"
```

## Self-Review Checklist

- Spec coverage: Tasks 1-5 implement every automated component and output named in the design.
- Scope boundary: editorial dispositions remain human work and are not guessed by automation.
- Placeholder scan: the plan contains no unresolved placeholder or unspecified code step.
- Type consistency: `sourceId`, `pdfPage`, `printedPage`, `numberedItems`, `symbolCounts`, and decision enum values are consistent across tasks.
- Safety: the PDF is read-only, decisions are never overwritten, rendering uses explicit pages without a shell, and completion must fail while review remains.

## Execution Result

- Full test command: `/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -p 'test_*.py' -v`
- Test outcome:

  ```text
  ----------------------------------------------------------------------
  Ran 53 tests in 6.694s

  OK
  ```

- Baseline invariant outcome:

  ```text
  ----------------------------------------------------------------------
  Ran 1 test in 6.478s

  OK
  ```

- Source PDF SHA-256: `27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac  reference/原始文档.pdf`
- Generated artifacts:
  - `reference/source-audit/source-manifest.json`
  - `reference/source-audit/source-index.json`
  - `reference/source-audit/coverage-decisions.json`
  - `reference/source-audit/source-coverage-matrix.md`
  - `reference/source-audit/visual-asset-index.md`
- Visual inspection: pages 10, 20, 81, and 279; observed defect count: `0`.
- Remaining editorial work: completion gate exited `2` with `未检查：834`.
- Stage A status: open pending chapter-by-chapter editorial review.

## Post-review remediation

The whole-branch review found cross-task safety and completion-gate gaps that
were not exercised by the first 53 tests. The initial execution evidence above
remains historically accurate, but the branch is not ready for editorial
handoff until Tasks 7-10 below are complete and independently reviewed.

### Task 7: Protect every source input and pin the approved PDF

**Files:**
- Modify: `scripts/source_audit/models.py`
- Modify: `scripts/source_audit/extract_pdf_index.py`
- Modify: `scripts/source_audit/build_reports.py`
- Modify: `tests/source_audit/test_models.py`
- Modify: `tests/source_audit/test_extract_pdf_index.py`
- Modify: `tests/source_audit/test_build_reports.py`

**Interfaces:**
- Produces shared normalized-path and file-identity conflict checks.
- Adds `APPROVED_PDF_SHA256` and `--expected-sha256` to both generation CLIs.
- Rejects all input/output aliases before any output or decisions file is
  created or changed.

- [x] **Step 1: Add failing path-safety tests**

Cover exact paths, relative aliases, case/Unicode-equivalent paths, symlinks,
and hard links. For the extractor, the PDF, manifest, and index must be pairwise
distinct. For report generation, the index, decisions, coverage report, visual
report, and the index's `pdfPath` must be pairwise distinct. Every rejection
must happen before a write, and source/input bytes must remain unchanged.

- [x] **Step 2: Add a failing approved-fingerprint test**

Use a still-parseable PDF copy whose bytes and SHA-256 differ from the approved
source. Both CLIs must reject it before building or writing outputs. A caller
may deliberately pass a different `--expected-sha256` only as an explicit
source-version confirmation.

- [x] **Step 3: Implement shared path identity and fingerprint guards**

The guards must compare normalized absolute paths, Unicode-normalized
case-folded keys, and `os.path.samefile` for existing files. The approved
default SHA-256 is:

```text
27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac
```

Run all checks before `build_source_index`, `initialize_decisions`, or any
JSON/Markdown write.

- [x] **Step 4: Run focused and full tests**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest \
  tests.source_audit.test_models \
  tests.source_audit.test_extract_pdf_index \
  tests.source_audit.test_build_reports -v

/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

- [x] **Step 5: Commit Task 7**

```bash
git add scripts/source_audit/models.py scripts/source_audit/extract_pdf_index.py \
  scripts/source_audit/build_reports.py tests/source_audit/test_models.py \
  tests/source_audit/test_extract_pdf_index.py tests/source_audit/test_build_reports.py
git commit -m "fix: protect source audit inputs"
```

### Task 8: Make the completion gate match Stage A semantics

**Files:**
- Modify: `scripts/source_audit/models.py`
- Modify: `scripts/source_audit/build_reports.py`
- Modify: `tests/source_audit/test_models.py`
- Modify: `tests/source_audit/test_build_reports.py`

**Interfaces:**
- Adds optional manual conflict-resolution fields
  `captionConflictResolved` and `captionConflictNote`.
- Adds explicit conflict evidence to both generated reports.
- Makes `require_complete=True` enforce cross-field completion rules.

- [x] **Step 1: Add failing decision-combination tests**

The completion gate must reject:

- reviewed figures or tables without both `visualClass` and `visualHandling`;
- `missing` items without at least one non-empty `lessonId`;
- indexed `captionConflict=true` items without
  `captionConflictResolved=true` and a non-empty `captionConflictNote`;
- course-used `semantic-core` visuals handled as `omit`.

It must accept an explicitly excluded semantic-core visual when it has a
non-empty reason, no lesson placement, and `visualHandling=omit`.

- [x] **Step 2: Add failing conflict-report tests**

The coverage report must list every conflicting numbered item, the selected
caption, every candidate page/title, and its resolution state/note. The visual
report must do the same for conflicting figures and tables. Normal in-progress
reports remain allowed, but unresolved conflicts must be visibly counted.

- [x] **Step 3: Implement completion semantics and diagnostics**

Optional conflict fields must have valid types when present. Existing decisions
files without the new fields remain readable and are treated as unresolved.
When `--require-complete` fails, retain the exact current
`未检查：N` message for unreviewed records; otherwise print one concise
`完成门禁失败：...` diagnostic instead of falsely reporting `未检查：0`.

- [x] **Step 4: Run focused and full tests**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest \
  tests.source_audit.test_models tests.source_audit.test_build_reports -v

/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

- [x] **Step 5: Commit Task 8**

```bash
git add scripts/source_audit/models.py scripts/source_audit/build_reports.py \
  tests/source_audit/test_models.py tests/source_audit/test_build_reports.py
git commit -m "fix: enforce source audit completion semantics"
```

### Task 9: Close visual-queue and documentation drift

**Files:**
- Modify: `scripts/source_audit/render_review_pages.py`
- Modify: `tests/source_audit/test_render_review_pages.py`
- Modify: `docs/superpowers/specs/2026-07-30-source-integrity-audit-design.md`
- Modify: `06-开发计划与验收标准.md`

**Interfaces:**
- Adds every `charCount == 0` page to the default visual-review queue.
- Updates the design with the implemented Git state, fingerprint pin,
  conflict-resolution gate, and conditional semantic-core omission rule.
- Updates the project queue without checking any Stage A exit checkbox.

- [x] **Step 1: Add a failing empty-text-page test**

`review_page_numbers` must include a page with `charCount == 0` even when it has
no numbered item and no semantic symbol. Multiple reasons for the same page
must still yield one sorted page number.

- [x] **Step 2: Implement the visual-queue rule and run renderer tests**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_render_review_pages -v
```

- [x] **Step 3: Correct the design and execution queue**

Replace the design-time “Git is not initialized” statement with the actual
implemented isolation state. Document the approved fingerprint default,
explicit override behavior, unresolved-caption gate, empty-text visual queue,
and that `semantic-core + omit` is permitted only for a reasoned exclusion
with no course placement. In `06-开发计划与验收标准.md`, state that automated
tooling is implemented and hardened while the 834-item chapter-by-chapter
editorial review remains next. Keep every Stage A completion checkbox open.

- [x] **Step 4: Run the full suite and scan documentation**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
rg -n '尚未初始化Git|待书面规格确认|阶段A执行准备中' \
  docs/superpowers/specs/2026-07-30-source-integrity-audit-design.md \
  06-开发计划与验收标准.md
```

Expected: all tests pass and the stale-state scan returns no matches.

- [x] **Step 5: Commit Task 9**

```bash
git add scripts/source_audit/render_review_pages.py \
  tests/source_audit/test_render_review_pages.py \
  docs/superpowers/specs/2026-07-30-source-integrity-audit-design.md \
  06-开发计划与验收标准.md
git commit -m "docs: align source audit safety and status"
```

### Task 10: Regenerate and accept the hardened baseline

**Files:**
- Regenerate if changed: `reference/source-audit/source-manifest.json`
- Regenerate if changed: `reference/source-audit/source-index.json`
- Preserve byte-for-byte: `reference/source-audit/coverage-decisions.json`
- Regenerate: `reference/source-audit/source-coverage-matrix.md`
- Regenerate: `reference/source-audit/visual-asset-index.md`
- Modify: `docs/superpowers/plans/2026-07-30-source-integrity-audit-tooling.md`

- [x] **Step 1: Run all automated tests with warnings as errors**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

- [x] **Step 2: Regenerate twice and verify deterministic hashes**

Run the extractor and report commands twice using the approved default
fingerprint. The manifest and index may change only if the hardened schema
requires it. `coverage-decisions.json` must remain byte-for-byte unchanged.
The reports must visibly list all current caption conflicts and their
unresolved status.

- [x] **Step 3: Re-run safety and completion negative tests**

The automated suite must prove exact/symlink/hardlink output collisions and a
changed-but-parseable PDF cannot modify inputs or outputs. The real completion
gate must still exit `2` with `未检查：834`; this is expected because editorial
review has not begun.

- [x] **Step 4: Re-run visual inspection**

Verify pages 10, 20, 81, 279, 239, and 240. Confirm zero clipping, black
squares, overlap, or unreadable semantic symbols and confirm Figure 8-3 remains
mapped to PDF page 240 without the page-239 experiment stars.

- [x] **Step 5: Record final remediation evidence**

Mark Tasks 7-10 complete only after their evidence exists. Append a
`## Hardened Acceptance Result` section containing final test totals, artifact
hashes, PDF hash, safety-negative-test summary, caption-conflict count,
remaining `unreviewed` count, visual defect count, and the statement
`Stage A remains open for editorial review`.

- [x] **Step 6: Commit Task 10**

```bash
git add reference/source-audit/source-manifest.json \
  reference/source-audit/source-index.json \
  reference/source-audit/source-coverage-matrix.md \
  reference/source-audit/visual-asset-index.md \
  docs/superpowers/plans/2026-07-30-source-integrity-audit-tooling.md
git commit -m "docs: accept hardened source audit baseline"
```

## Task 10 Hardened Acceptance Result

- Final automated verification: `83/83` tests passed under `-W error`.
- Approved PDF SHA-256:
  `27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`.
- Final artifact SHA-256 values:
  - `source-manifest.json`:
    `11e0e92e4314445a1c7cb8a05abd768f60d4f1f22720ccee69c8b0e2f173f5d7`
  - `source-index.json`:
    `101c5adc73073a0afb3b4dd08d0fa7b6b56a9aa8a611b2ff6a95c87a75b220ce`
  - `coverage-decisions.json`:
    `fa3eec86b557f9023b19ab5c09a80362764cea3a43cecca66fecaa14ab440f0f`
  - `source-coverage-matrix.md`:
    `334bcaacd036772e16a384a9cdde9054cd95e10ee8414eb2bc2f85db7922fc03`
  - `visual-asset-index.md`:
    `4c6006271411320b171b096a1f621b21ff32b3b55421a5103fb432fa2833dd50`
- Two approved-default regeneration rounds produced identical hashes.
  `coverage-decisions.json` remained byte-for-byte unchanged; the manifest and
  index required no schema-driven change.
- Safety negatives passed: `12/12` focused automated tests and `14/14` real
  CLI probes rejected direct, symlink, and hard-link aliases plus a changed but
  still parseable 314-page PDF without changing protected bytes.
- The real completion gate returned exit `2`, empty stdout, and exact stderr
  `未检查：834`; remaining `unreviewed` count: `834`.
- Caption conflicts remain visibly unresolved for all `21/21` coverage items
  and all `15/15` visual items, with every candidate occurrence listed.
- Visual inspection defects: `0` across PDF pages 10, 20, 81, 279, 239, and
  240. Figure 8-3 remains mapped to PDF page 240; the two page-239 stars belong
  only to Experiment 8-1 and are absent from the Figure 8-3 semantic record.

Stage A remains open for editorial review

### Task 11: Enforce decision list-field contracts

**Files:**
- Modify: `scripts/source_audit/models.py`
- Modify: `tests/source_audit/test_models.py`
- Modify: `tests/source_audit/test_build_reports.py`
- Modify: `docs/superpowers/plans/2026-07-30-source-integrity-audit-tooling.md`

**Interfaces:**
- Requires `lessonIds` and `markdownRefs` on every decision to be arrays of
  non-blank strings.
- Rejects malformed list fields before report generation or any file write.
- Preserves the existing valid empty-array and non-empty-array completion
  semantics.

- [x] **Step 1: Add failing model-contract tests**

For both `lessonIds` and `markdownRefs`, reject a missing field, `null`, a
string, object, number, boolean, a list containing a non-string, and a list
containing an empty or whitespace-only string. Accept `[]` and arrays whose
string members remain non-empty after `strip()`.

- [x] **Step 2: Add failing real-CLI regression tests**

Prove that malformed `lessonIds` and `markdownRefs` fail in normal mode and
under `--require-complete` before either report is created or changed. In
completion mode the CLI must return `2`, keep stdout empty, emit exactly one
`完成门禁失败：...` line on stderr, and leave decisions plus existing reports
byte-for-byte unchanged.

Also preserve the semantic-core symmetry:

- `excluded + reason + lessonIds=[] + semantic-core/omit` passes;
- the same decision with `lessonIds=["1-1"]` fails;
- `lessonIds="1-1"` fails as a type error rather than being treated as no
  course placement.

- [x] **Step 3: Implement base validation**

Validate both fields inside `validate_decisions` before the
`require_complete=False` early return. Only after this validation may
completion logic compute lesson placement. Do not rewrite or normalize the
human decisions file.

- [x] **Step 4: Re-run focused, full, and formal gates**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest \
  tests.source_audit.test_models tests.source_audit.test_build_reports -v

/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

The formal completion gate must remain exit `2` with exact
`未检查：834`; the approved PDF and five formal artifacts must retain their
Task 10 SHA-256 values.

- [x] **Step 5: Record re-acceptance and commit Task 11**

Append a `## Final Decision-Contract Re-acceptance Result` section with the
new focused/full totals, invalid-value matrix, real-CLI results, formal hashes,
and the statement `Stage A remains open for editorial review`.

```bash
git add scripts/source_audit/models.py \
  tests/source_audit/test_models.py \
  tests/source_audit/test_build_reports.py \
  docs/superpowers/plans/2026-07-30-source-integrity-audit-tooling.md
git commit -m "fix: validate source audit list fields"
```

## Final Decision-Contract Re-acceptance Result

- Focused verification: `55/55` tests passed under `-W error`.
- Full automated verification: `89/89` tests passed under `-W error`.
- Invalid-value matrix: for both `lessonIds` and `markdownRefs`, all `18/18`
  field/category combinations rejected missing, `null`, string, object, number,
  boolean, an array containing a non-string, an array containing an empty
  string, and an array containing a whitespace-only string. Both fields accept
  `[]` and non-empty string arrays whose members remain non-blank after
  `strip()` without normalizing or rewriting the decisions.
- Real CLI entrypoint matrix: all `4/4` field/mode probes rejected malformed
  `lessonIds` and `markdownRefs` before report writes in normal mode and under
  `--require-complete`. Normal mode created neither report; completion mode
  returned `2`, kept stdout empty, emitted exactly one
  `完成门禁失败：...` stderr line, and preserved decisions plus both existing
  reports byte-for-byte.
- Semantic-core symmetry remained intact: excluded `semantic-core/omit` with a
  reason and `lessonIds=[]` passed; `lessonIds=["1-1"]` failed the course-use
  rule; `lessonIds="1-1"` failed the array type contract.
- The real formal completion gate returned exit `2`, empty stdout, and exact
  single-line stderr `未检查：834`.
- Approved PDF SHA-256:
  `27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`.
- Formal artifact SHA-256 values remained unchanged before and after the gate:
  - `source-manifest.json`:
    `11e0e92e4314445a1c7cb8a05abd768f60d4f1f22720ccee69c8b0e2f173f5d7`
  - `source-index.json`:
    `101c5adc73073a0afb3b4dd08d0fa7b6b56a9aa8a611b2ff6a95c87a75b220ce`
  - `coverage-decisions.json`:
    `fa3eec86b557f9023b19ab5c09a80362764cea3a43cecca66fecaa14ab440f0f`
  - `source-coverage-matrix.md`:
    `334bcaacd036772e16a384a9cdde9054cd95e10ee8414eb2bc2f85db7922fc03`
  - `visual-asset-index.md`:
    `4c6006271411320b171b096a1f621b21ff32b3b55421a5103fb432fa2833dd50`

Stage A remains open for editorial review
