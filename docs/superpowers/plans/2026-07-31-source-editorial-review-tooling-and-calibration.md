# Source Editorial Review Tooling and Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic editorial-review toolchain, migrate the 834-item baseline without making content decisions, and complete the first 30–40-item double-blind calibration batch.

**Architecture:** The generated PDF index and a manually maintained unnumbered-visual catalog form one complete source universe. `coverage-decisions.json` remains the only final per-source decision store; discovery, frozen review packages, full-record patches, a hash-chained review ledger, and generated Markdown reports provide controlled evidence around it. This plan stops after an accepted calibration batch because only then are the real added visual IDs, final source total, disagreement rate, and safe remaining batch boundaries known; those facts become the inputs to the separate full-book editorial execution plan.

**Tech Stack:** Bundled Python 3.12, Python standard-library `unittest`, `pypdf`, Poppler `pdftoppm`, deterministic JSON, Markdown, SHA-256, Git.

## Global Constraints

- Use `python3`, never `python`; run tests with `/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
- Treat `reference/原始文档.pdf` as read-only. Its approved SHA-256 is `27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`.
- Preserve the current generated baseline: 314 pages, 283 outline items, 120 figures, 23 tables, 94 experiments, and 834 total source items before unnumbered-visual discovery.
- Keep `reference/source-audit/coverage-decisions.json` as the only final per-source editorial decision store.
- `included`, `compressed`, and `missing` require at least one ID from `0-1`, `0-2`, `1-1`, `1-2`, `1-3`, `2-1`, `2-2`, `2-3`, `3-1`, `3-2`, `4-1`, `4-2`; `excluded` requires an empty `lessonIds`.
- Every source in Chapters 5, 7, and 9 is `excluded`, has no current lesson ID, and uses the exact reason `[版本边界] 留待未来技术人员版`.
- Lesson 2-3 uses Chapter 3 §3.1 and Chapter 8 as primary candidates and Chapter 2 only as supplemental context. Lesson 1-3 uses Chapters 2 and 4 as primary candidates and Chapter 1 Harness guardrails as a secondary candidate.
- Semantic-core visuals default to `redraw`. Evidence visuals default to `text-alt`. `reuse` requires a non-empty `visualHandlingNote` beginning `[复用依据]` and explaining why original data, screenshot, or appearance must be preserved.
- The allowed visual matrix is exact: semantic-core accepts `redraw` or evidence-backed `reuse`; evidence accepts `text-alt` or evidence-backed `reuse`; decorative accepts only `omit + excluded`. Semantic-core cannot use `text-alt` or `omit`; evidence cannot use `redraw` or `omit`.
- Every semantic-core or evidence visual requires a non-empty `visualTextAlternative` that is not `见原图`, `参见原图`, or another reference-only placeholder. Decorative visuals use `decorative + omit + excluded`.
- Page-level extracted `symbolCounts` are only discovery evidence. A symbol belongs to a source only after `symbolReview` records the assignment and the target decision contains a matching `symbolTextAlternatives` entry.
- The frozen must-keep inventory is derived from 12 course-outline lesson intentions, the 5 highest-priority analysis claims, and all 8 rows under the red high-risk table. Every inventory ID must be acknowledged by reviewed source decisions; future-version claims remain explicitly mapped to excluded Chapters 5, 7, or 9 rather than disappearing.
- Scan all pages 1–314. The existing `review_page_numbers(index)` result is only the default risk queue; “queue-external pages” means `set(range(1, 315)) - set(review_page_numbers(index))`.
- Generated JSON and Markdown use UTF-8, LF, stable ordering, one final newline, and no timestamps or absolute machine paths.
- Review images and packages stay under `tmp/` and are not committed. Formal catalog, decisions, ledger, policy, and reports are committed.
- A frozen batch fingerprints the PDF, source index, visual catalog, decisions file,
  review ledger, editorial policy, analysis Markdown, course-outline Markdown,
  every page image, and every page bundle.
- A rejected discovery or review transaction changes no formal file. Successful transactions preserve a continuous decisions hash chain.
- The 21 baseline caption-conflict IDs are frozen as:
  `experiment-1-1`, `figure-1-4`, `table-2-1`, `figure-2-6`,
  `experiment-2-7`, `experiment-2-8`, `figure-3-5`, `experiment-4-4`,
  `figure-4-9`, `table-7-3`, `table-7-4`, `figure-8-2`, `figure-8-3`,
  `table-8-2`, `figure-8-4`, `experiment-9-1`, `table-10-1`,
  `table-10-2`, `figure-10-3`, `table-10-4`, `experiment-10-4`.
- Do not begin the full-book batch execution in this plan. Its exact task list is generated from accepted calibration evidence, not guessed from the initial 834-item count.

---

## Execution Sequence

The checkbox steps inside Tasks 1–10 are the only executable sequence in this
plan. Execute them in document order. Each checkbox is one concrete 2–5 minute
action. Non-checkbox schemas, templates, explanations, and acceptance rules are
context only and must not be marked complete.

For every Python file, execute its single-file bootstrap step before adding any
behavior. A bootstrap block is the complete import/constant/class preamble for
that file; copy it literally. Every symbol imported by a test bootstrap must
already exist as an import-safe production stub whose body raises
`NotImplementedError` naming that symbol. Later test blocks that repeat a class header mean
“insert this method into the one bootstrapped class,” not “define the class
again.” A step that explicitly says to replace an existing test method replaces
that method in place rather than adding a duplicate. Later production blocks
that repeat a function name explicitly replace
the preceding staged version of that function; the finished module must contain
exactly one definition of each class and function.

Every RED command is valid only when unittest imports and collects the exact
class-qualified method and the failure names the behavior introduced by the
immediately following implementation step. An import error, missing fixture,
wrong test target, syntax error, or unrelated exception is not RED: stop, repair
the file bootstrap or fixture, rerun the same command, and proceed only after
the intended failure is observed.

Any checkbox that collects an agent result may issue at most two 60-second
`wait_agent` calls, must inspect the exact canonical task path with
`list_agents`, and must bind the accepted final notification to that same task
path. If the target is still running after the second poll, stop the Task, leave
the checkbox unchecked, and report the bounded wait as a blocker; never loop a
single checkbox indefinitely.

## File Responsibility Map

### Create

- `reference/source-audit/editorial-policy.json` — approved lesson candidates, version boundary, conflict baseline, visual defaults, and calibration-page rules.
- `reference/source-audit/unnumbered-visuals.json` — stable identities and locations of manually discovered visual objects.
- `reference/source-audit/review-ledger.json` — hash-chain, independent-review coverage, disagreement, sampling, and escalation evidence; never a second decision store.
- `scripts/source_audit/catalog.py` — complete source-universe construction and unnumbered-visual validation without widening generated-index kinds.
- `scripts/source_audit/decisions.py` — editorial decision initialization, migration, and complete contract validation.
- `scripts/source_audit/must_keep.py` — deterministic 25-item must-keep inventory extraction and coverage validation.
- `scripts/source_audit/transactions.py` — rollback-capable deterministic multi-file replacement.
- `scripts/source_audit/prepare_review_batch.py` — apply a page discovery patch and freeze evidence for review.
- `scripts/source_audit/build_review_packages.py` — full-text, page-grouped bundles and deterministic batch manifests.
- `scripts/source_audit/review_batches.py` — frozen-batch and full-record patch validation.
- `scripts/source_audit/review_ledger.py` — genesis anchor, reviewer independence, required second review, sampling, disagreement, escalation, and hash-chain validation.
- `scripts/source_audit/integrate_review_batch.py` — compare patches, apply explicit resolutions, validate candidate outputs, and commit one batch transaction.
- `scripts/source_audit/verify_calibration_acceptance.py` — prove the real calibration size, double review, hash chain, and exact state delta.
- `scripts/source_audit/migrate_editorial_baseline.py` — one-way, idempotent migration of the current 834 unreviewed decisions.
- `tests/source_audit/test_catalog.py`
- `tests/source_audit/test_decisions.py`
- `tests/source_audit/test_must_keep.py`
- `tests/source_audit/test_transactions.py`
- `tests/source_audit/test_prepare_review_batch.py`
- `tests/source_audit/test_build_review_packages.py`
- `tests/source_audit/test_review_batches.py`
- `tests/source_audit/test_review_ledger.py`
- `tests/source_audit/test_integrate_review_batch.py`
- `tests/source_audit/test_verify_calibration_acceptance.py`
- `tests/source_audit/test_migrate_editorial_baseline.py`
- `tests/source_audit/editorial_fixtures.py` — shared minimal valid index, policy, decision, bundle, patch, and ledger factories for the new focused tests.
- `docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md` — tracked pre-migration fingerprints and both deterministic report-pass hashes.
- `docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/calibration-acceptance.md` — tracked calibration verifier output, hashes, counts, review results, and execution evidence.
- `docs/superpowers/plans/2026-07-31-source-editorial-review-execution.md` — Plan 2 generated only from accepted calibration evidence.

### Modify

- `scripts/source_audit/build_reports.py` — consume the complete source universe, render new fields, and enforce the expanded Stage A gate.
- `scripts/source_audit/render_review_pages.py` — validate the upper page bound and support explicit full-book rendering without changing the risk-queue helper.
- `tests/source_audit/test_models.py`
- `tests/source_audit/test_build_reports.py`
- `tests/source_audit/test_render_review_pages.py`
- `reference/source-audit/coverage-decisions.json` — migrate the approved 834-item baseline and later apply the accepted calibration decisions.
- `reference/source-audit/source-coverage-matrix.md` — regenerate the deterministic coverage report after migration and calibration.
- `reference/source-audit/visual-asset-index.md` — regenerate the deterministic visual report after migration and calibration.
- `06-开发计划与验收标准.md` — record accepted calibration evidence while keeping Stage A open.
- `docs/superpowers/specs/2026-07-31-source-editorial-review-design.md` — record that the user approved the written design.

---

### Task 1: Editorial policy and complete source catalog

**Files:**
- Create: `reference/source-audit/editorial-policy.json`
- Create: `scripts/source_audit/catalog.py`
- Create: `tests/source_audit/test_catalog.py`
- Create: `tests/source_audit/editorial_fixtures.py`
- Modify: `tests/source_audit/test_models.py`

**Interfaces:**
- Consumes: generated `source-index.json`, manually maintained `unnumbered-visuals.json`.
- Produces:
  - `stable_visual_id(pdf_page: int, ordinal: int) -> str`
  - `validate_unnumbered_visuals(index: dict, visuals: list[dict]) -> None`
  - `all_editorial_source_items(index: dict, visuals: list[dict]) -> list[dict]`
  - `source_items_by_id(index: dict, visuals: list[dict]) -> dict[str, dict]`
  - `chapter_for_item(index: dict, item: dict) -> int | None`
  - `EDITORIAL_KINDS = ALL_KINDS | {"visual"}` scoped to `catalog.py`; do not
    change `models.ALL_KINDS`.
  - Test factories `sample_index(page_count: int = 2)`, `sample_visual()`, `sample_policy()`,
    `sample_decisions(index=None, visuals=None, target_source_id=None, **changes)`,
    `sample_reviewed_decision(**changes)`,
    `sample_page_and_experiment_decisions(symbol_review: list[dict], target_alternatives: list[dict])`,
    `sample_page20_index()`,
    `sample_calibration_index()`, `sample_calibration_decisions()`,
    `sample_analysis_sections()`, `sample_outline_sections()`,
    `sample_must_keep_inventory()`, `sample_source_map()`,
    `claimed_must_keep_fixture(must_keep_id: str, **changes)`,
    `course_route_claim_fixture(lesson_id: str, chapter: int)`,
    `reviewed_visual_fixture(kind: str)`,
    `sample_package_hashes()`, `sample_ledger()`,
    `sample_review_entry(**changes)`, and
    `sample_legacy_decisions()`, `sample_integration_case()`,
    `valid_stage_a_case()`, and `valid_calibration_case()`.

#### Executable test-scaffold sequence

- [ ] **S1.B01 — Bootstrap only `scripts/source_audit/catalog.py`.**

```python
from __future__ import annotations

import copy
import math
import re

from scripts.source_audit.models import (
    ALL_KINDS,
    AuditValidationError,
    all_source_items,
    validate_index,
)
EDITORIAL_KINDS = ALL_KINDS | {"visual"}
VISUAL_ID = re.compile(r"visual-p([0-9]{3})-([0-9]{2})")
DISCOVERY_EVIDENCE = re.compile(r"(.+?)[；;]\s*PDF 第([0-9]+)页(?:.+)?")


def _pending(name):
    raise NotImplementedError(name)


def stable_visual_id(pdf_page: int, ordinal: int) -> str:
    return _pending("stable_visual_id")


def _validate_region(source_id: str, region: object) -> None:
    _pending("_validate_region")


def validate_unnumbered_visuals(index: dict, visuals: list[dict]) -> None:
    _pending("validate_unnumbered_visuals")


def chapter_for_item(index: dict, item: dict) -> int | None:
    return _pending("chapter_for_item")


def all_editorial_source_items(index: dict, visuals: list[dict]) -> list[dict]:
    return _pending("all_editorial_source_items")


def source_items_by_id(index: dict, visuals: list[dict]) -> dict[str, dict]:
    return _pending("source_items_by_id")
```

Expected: this new module contains exactly this complete preamble and API
scaffold; it imports successfully, and each unfinished API names itself.

- [ ] **S1.0 — Bootstrap only `tests/source_audit/editorial_fixtures.py` with the shared imports and constants.**

```python
from __future__ import annotations

import copy
import hashlib
import json
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

from scripts.source_audit.models import AuditValidationError


_PNG_BYTES = b"\x89PNG\r\n\x1a\nfixture"
_LESSON_IDS = [
    "0-1", "0-2", "1-1", "1-2", "1-3", "2-1",
    "2-2", "2-3", "3-1", "3-2", "4-1", "4-2",
]
_REQUIRED_PAGES = [10, 20, 81, 239, 240, 279]
_EXTERNAL_PAGES = [32, 35, 52]
_EVIDENCE_HASHES = {
    "pdfSha256": "a" * 64,
    "sourceIndexSha256": "b" * 64,
    "unnumberedVisualsSha256": "c" * 64,
    "decisionsSha256": "d" * 64,
    "editorialPolicySha256": "e" * 64,
    "analysisSha256": "1" * 64,
    "courseOutlineSha256": "2" * 64,
}
```

Expected: only the fixture imports and constants shown above are added, and the Python block parses.

- [ ] **S1.F01 — Add only fixture function `_fresh`.**

```python
def _fresh(value):
    return copy.deepcopy(value)
```

Expected: only `_fresh` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F02 — Add only fixture function `_sha256_json`.**

```python
def _sha256_json(value):
    payload = (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
        + "\n"
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
```

Expected: only `_sha256_json` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F03 — Add only fixture function `_page`.**

```python
def _page(pdf_page, chapter=1, symbol_counts=None):
    return {
        "sourceId": f"page-{pdf_page:03d}",
        "kind": "page",
        "pdfPage": pdf_page,
        "printedPage": pdf_page - 8 if pdf_page > 8 else None,
        "chapter": chapter,
        "charCount": 240,
        "textPreview": f"PDF 第{pdf_page}页夹具正文",
        "symbolCounts": symbol_counts
        or {"check": 0, "cross": 0, "triangle": 0, "star": 0},
    }
```

Expected: only `_page` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F04 — Add only fixture function `_numbered`.**

```python
def _numbered(
    kind,
    number,
    pdf_page,
    chapter=1,
    *,
    caption_conflict=False,
):
    return {
        "sourceId": f"{kind}-{number}",
        "kind": kind,
        "number": number,
        "pdfPage": pdf_page,
        "printedPage": pdf_page - 8 if pdf_page > 8 else None,
        "chapter": chapter,
        "title": f"{kind} {number} 夹具",
        "captionConflict": caption_conflict,
        "occurrences": [{
            "pdfPage": pdf_page,
            "printedPage": pdf_page - 8 if pdf_page > 8 else None,
            "title": f"{kind} {number} 夹具",
        }],
        "symbolCounts": {
            "check": 0, "cross": 0, "triangle": 0, "star": 0,
        },
    }
```

Expected: only `_numbered` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F05 — Add only fixture function `_base_decision`.**

```python
def _base_decision(item):
    value = {
        "sourceId": item["sourceId"],
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
    }
    if item["kind"] in {"figure", "table", "visual"}:
        value.update({
            "visualTextAlternative": "",
            "visualHandlingNote": "",
        })
    if item["kind"] == "page":
        value.update({
            "visualReviewState": "unreviewed",
            "visualReviewer": "",
            "discoveredVisualIds": [],
            "symbolReview": [],
        })
    if item["sourceId"] in set(sample_policy()["captionConflictSourceIds"]):
        value.update({
            "captionConflictResolved": False,
            "captionConflictNote": "",
        })
    return value
```

Expected: only `_base_decision` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F06 — Add only fixture function `_reviewed_decision`.**

```python
def _reviewed_decision(item, *, lesson_id="0-1", must_keep_ids=None):
    value = _base_decision(item)
    value.update({
        "disposition": "included",
        "lessonIds": [lesson_id],
        "reviewState": "reviewed",
        "mustKeepIds": sorted(must_keep_ids or []),
    })
    if item["kind"] in {"figure", "table", "visual"}:
        value.update({
            "visualClass": "evidence",
            "visualHandling": "text-alt",
            "visualTextAlternative": (
                f"{item['sourceId']} 的关系和证据已转写为网页可读说明"
            ),
            "visualHandlingNote": "",
        })
    if item["kind"] == "page":
        value.update({
            "visualReviewState": "reviewed",
            "visualReviewer": "visual-scanner-a",
        })
    flags = set()
    if item["kind"] in {"figure", "table", "visual"}:
        flags.add("visual")
    if lesson_id == "1-1":
        flags.add("lesson-1-1")
    if any(
        value.startswith("analysis-high-risk-")
        for value in value["mustKeepIds"]
    ):
        flags.add("analysis-high-risk")
    if item["sourceId"] in set(sample_policy()["captionConflictSourceIds"]):
        flags.add("caption-conflict")
        value.update({
            "captionConflictResolved": True,
            "captionConflictNote": "已按页面正文核对题注冲突",
        })
    value["riskFlags"] = sorted(flags)
    return value
```

Expected: only `_reviewed_decision` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F07a — Add only `_sample_course_routes`.**

```python
def _sample_course_routes():
    return {
        "0-1": ([{"chapter": 1}], []),
        "0-2": ([{"chapter": 1}], []),
        "1-1": ([{"chapter": 2}], []),
        "1-2": ([{"chapter": 2}], []),
        "1-3": (
            [{"chapter": 2}, {"chapter": 4}],
            [{"chapter": 1, "sectionAnchor": "1.2.6 护栏与安全性"}],
        ),
        "2-1": ([{"chapter": 3}], []),
        "2-2": ([{"chapter": 3}], []),
        "2-3": (
            [
                {"chapter": 3, "sectionAnchor": "3.1 用户记忆系统"},
                {"chapter": 8},
            ],
            [{"chapter": 2}],
        ),
        "3-1": ([{"chapter": 4}], []),
        "3-2": ([{"chapter": 1}, {"chapter": 4}], []),
        "4-1": ([{"chapter": 6}], []),
        "4-2": ([{"chapter": 10}], []),
    }
```

Expected: only `_sample_course_routes` is added and the block parses.

- [ ] **S1.F07b — Add only `_sample_analysis_routes`.**

```python
def _sample_analysis_routes():
    priority = {
        "analysis-high-priority-01": ([1], ["0-1", "0-2", "3-2"], "current"),
        "analysis-high-priority-02": ([2], ["1-1", "1-2"], "current"),
        "analysis-high-priority-03": ([7], [], "future"),
        "analysis-high-priority-04": ([7], [], "future"),
        "analysis-high-priority-05": ([10], ["4-2"], "current"),
    }
    risk = {
        "analysis-high-risk-01": ([10], ["4-2"], "current"),
        "analysis-high-risk-02": ([7], [], "future"),
        "analysis-high-risk-03": ([2], ["1-1", "1-2"], "current"),
        "analysis-high-risk-04": ([2], ["1-1", "1-2"], "current"),
        "analysis-high-risk-05": ([6], ["4-1"], "current"),
        "analysis-high-risk-06": ([10], ["4-2"], "current"),
        "analysis-high-risk-07": ([7], [], "future"),
        "analysis-high-risk-08": ([5], [], "future"),
    }

    def routed(values):
        return {
            key: {
                "sourceChapters": chapters,
                "lessonIds": lessons,
                "versionStatus": status,
            }
            for key, (chapters, lessons, status) in values.items()
        }

    return routed(priority), routed(risk)
```

Expected: only `_sample_analysis_routes` is added and the block parses.

- [ ] **S1.F07c — Add only `_sample_must_keep_rules`.**

```python
def _sample_must_keep_rules():
    priority, risk = _sample_analysis_routes()
    return {
        "courseObjectives": {
            "lessonIds": _fresh(_LESSON_IDS),
            "sourceRoutingByLesson": {
                lesson_id: {
                    "primary": _fresh(routes[0]),
                    "secondary": _fresh(routes[1]),
                }
                for lesson_id, routes in _sample_course_routes().items()
            },
            "fieldLabel": "核心内容",
            "expectedCount": 12,
        },
        "highPriority": {
            "headingAnchor": "五条最高优先级的作者论断（非共识型）",
            "expectedCount": 5,
            "routing": priority,
        },
        "highRisk": {
            "headingAnchor": "🔴 高风险——容易被误引的表述",
            "expectedCount": 8,
            "routing": risk,
        },
    }
```

Expected: only `_sample_must_keep_rules` is added and the block parses.

- [ ] **S1.F07d — Add only fixture function `sample_policy`.**

```python
def sample_policy(**changes):
    chapter_lessons = {
        "1": [("0-1", "primary"), ("0-2", "primary"), ("3-2", "primary")],
        "2": [
            ("1-1", "primary"), ("1-2", "primary"),
            ("1-3", "primary"), ("2-3", "secondary"),
        ],
        "3": [("2-1", "primary"), ("2-2", "primary")],
        "4": [("1-3", "primary"), ("3-1", "primary"), ("3-2", "primary")],
        "5": [], "6": [("4-1", "primary")], "7": [],
        "8": [("2-3", "primary")], "9": [], "10": [("4-2", "primary")],
    }
    value = {
        "schemaVersion": 1,
        "lessonIds": _fresh(_LESSON_IDS),
        "excludedChapters": [5, 7, 9],
        "versionBoundaryReason": "[版本边界] 留待未来技术人员版",
        "chapterLessonCandidates": {
            chapter: [
                {"lessonId": lesson_id, "role": role}
                for lesson_id, role in values
            ]
            for chapter, values in chapter_lessons.items()
        },
        "sectionLessonCandidates": {
            "1.2.6 护栏与安全性": [
                {"lessonId": "1-3", "role": "secondary"},
            ],
            "3.1 用户记忆系统": [
                {"lessonId": "2-3", "role": "primary"},
            ],
        },
        "analysisHeadingAnchors": {
            "highPriority": "五条最高优先级的作者论断（非共识型）",
            "highRisk": "🔴 高风险——容易被误引的表述",
            "mediumRisk": "🟡 中风险——容易被过度解读的结论",
        },
        "mustKeepRules": _sample_must_keep_rules(),
        "captionConflictSourceIds": [
            "experiment-1-1", "experiment-2-7", "experiment-2-8",
            "experiment-4-4", "experiment-9-1", "experiment-10-4",
            "figure-1-4", "figure-2-6", "figure-3-5", "figure-4-9",
            "figure-8-2", "figure-8-3", "figure-8-4", "figure-10-3",
            "table-2-1", "table-7-3", "table-7-4", "table-8-2",
            "table-10-1", "table-10-2", "table-10-4",
        ],
        "calibration": {
            "requiredPages": _fresh(_REQUIRED_PAGES),
            "queueExternalCandidates": [32, 35, 52, 15, 26, 27],
            "minimumSourceItems": 30,
            "maximumSourceItems": 40,
        },
    }
    value.update(_fresh(changes))
    return value
```

Expected: `sample_policy` composes the three preceding helpers and accepts
explicit top-level field overrides for focused invalid-policy tests.

- [ ] **S1.F08 — Add only fixture function `sample_page20_index`.**

```python
def sample_page20_index(*, with_route_anchors=False):
    page = _page(
        20,
        chapter=1,
        symbol_counts={"check": 0, "cross": 0, "triangle": 0, "star": 2},
    )
    outline = []
    if with_route_anchors:
        outline = [{
            "sourceId": "outline-019-001",
            "kind": "outline",
            "pdfPage": 19,
            "ordinal": 1,
            "depth": 2,
            "title": "1.2.6 护栏与安全性",
            "chapter": 1,
        }, {
            "sourceId": "outline-021-002",
            "kind": "outline",
            "pdfPage": 21,
            "ordinal": 2,
            "depth": 2,
            "title": "3.1 用户记忆系统",
            "chapter": 3,
        }]
    return {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": [page],
        "outline": outline,
        "numberedItems": [
            _numbered(
                "experiment", "1-1", 20, caption_conflict=True,
            ),
            _numbered("figure", "1-2", 20),
        ],
    }
```

Expected: the default remains the minimal page-20 index; the opt-in variant
adds both policy section anchors without changing page-20 bundle membership.

- [ ] **S1.F09 — Add only fixture function `sample_index`.**

```python
def sample_index(page_count=2):
    if type(page_count) is not int or page_count < 1:
        raise ValueError("page_count must be a positive integer")
    if page_count == 2:
        pages = [_page(10), _page(20)]
    else:
        pages = [_page(page) for page in range(1, page_count + 1)]
    return {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": pages,
        "outline": [],
        "numberedItems": [],
    }
```

Expected: only `sample_index` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F10 — Add only fixture function `sample_visual`.**

```python
def sample_visual(**changes):
    explicit_source_id = "sourceId" in changes
    explicit_evidence = "discoveryEvidence" in changes
    value = {
        "sourceId": "visual-p010-01",
        "kind": "visual",
        "pdfPage": 10,
        "region": {"x": 0.1, "y": 0.2, "width": 0.5, "height": 0.4},
        "semanticBrief": "评价、学习与更新之间的闭环关系",
        "discoveryEvidence": "全页视觉扫描；PDF 第10页中央关系图",
    }
    value.update(_fresh(changes))
    if not explicit_source_id:
        value["sourceId"] = f"visual-p{value['pdfPage']:03d}-01"
    if not explicit_evidence:
        value["discoveryEvidence"] = (
            f"全页视觉扫描；PDF 第{value['pdfPage']}页中央关系图"
        )
    return value
```

Expected: only `sample_visual` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F11 — Add only fixture function `sample_page_decision`.**

```python
def sample_page_decision(**changes):
    page = sample_page20_index()["pages"][0]
    value = _reviewed_decision(page)
    value.update({
        "symbolReview": [{
            "symbol": "★",
            "observedCount": 2,
            "semanticAssignments": [{
                "sourceId": "experiment-1-1",
                "count": 2,
                "meaning": "实验难度：两星",
            }],
            "nonSemanticCount": 0,
            "note": "与页面提取计数一致",
        }],
    })
    value.update(_fresh(changes))
    return value
```

Expected: only `sample_page_decision` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F12 — Add only fixture function `sample_reviewed_decision`.**

```python
def sample_reviewed_decision(**changes):
    item = sample_page20_index()["numberedItems"][1]
    value = _reviewed_decision(item, lesson_id="1-1")
    value.update({
        "disposition": "compressed",
        "reason": "保留结论并压缩技术细节",
        "visualClass": "semantic-core",
        "visualHandling": "redraw",
        "visualTextAlternative": "上下文长度与任务表现之间存在约束关系",
    })
    value.update(_fresh(changes))
    return value
```

Expected: only `sample_reviewed_decision` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F13 — Add only fixture function `_decisions_for`.**

```python
def _decisions_for(index, visuals=None):
    selected_visuals = list(visuals or [])
    numbered_ids = {
        item["sourceId"] for item in index["numberedItems"]
    }
    visual_ids_by_page = {}
    for visual in selected_visuals:
        visual_ids_by_page.setdefault(
            visual["pdfPage"], []
        ).append(visual["sourceId"])
    records = []
    for item in [
        *index["pages"], *index["outline"],
        *index["numberedItems"], *selected_visuals,
    ]:
        lesson_id = "1-1" if item["sourceId"] == "figure-1-2" else "0-1"
        record = _reviewed_decision(item, lesson_id=lesson_id)
        if item["kind"] == "page":
            scan_complete = (
                item["pdfPage"] == 10
                or any(item.get("symbolCounts", {}).values())
                or bool(visual_ids_by_page.get(item["pdfPage"]))
            )
            record.update({
                "visualReviewState": (
                    "reviewed" if scan_complete else "unreviewed"
                ),
                "visualReviewer": (
                    "visual-scanner-a" if scan_complete else ""
                ),
                "discoveredVisualIds": sorted(
                    visual_ids_by_page.get(item["pdfPage"], [])
                ),
            })
            if (
                item["pdfPage"] == 20
                and item.get("symbolCounts", {}).get("star") == 2
                and "experiment-1-1" in numbered_ids
            ):
                record["symbolReview"] = _fresh(
                    sample_page_decision()["symbolReview"]
                )
        if item["sourceId"] == "experiment-1-1":
            record["symbolTextAlternatives"] = [{
                "symbol": "★",
                "pdfPage": 20,
                "meaning": "实验难度：两星",
            }]
        if item["sourceId"] == "figure-1-2":
            record.update({
                "disposition": "compressed",
                "reason": "保留结论并压缩技术细节",
                "visualClass": "semantic-core",
                "visualHandling": "redraw",
                "visualTextAlternative": (
                    "上下文长度与任务表现之间存在约束关系"
                ),
            })
        records.append(record)
    return sorted(records, key=lambda item: item["sourceId"])
```

Expected: only `_decisions_for` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F14 — Add only fixture function `sample_decisions`.**

```python
def sample_decisions(
    index=None,
    visuals=None,
    target_source_id=None,
    **changes,
):
    selected_index = _fresh(index or sample_index())
    selected_visuals = _fresh(visuals or [])
    records = _decisions_for(selected_index, selected_visuals)
    if changes:
        target = target_source_id
        if target is None:
            target = (
                "figure-1-2"
                if any(
                    item["sourceId"] == "figure-1-2"
                    for item in records
                )
                else records[-1]["sourceId"]
            )
        by_id = {item["sourceId"]: item for item in records}
        if target not in by_id:
            raise ValueError(f"unknown target_source_id: {target}")
        by_id[target].update(_fresh(changes))
    return sorted(records, key=lambda item: item["sourceId"])
```

Expected: only `sample_decisions` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F15 — Add only fixture function `sample_page_and_experiment_decisions`.**

```python
def sample_page_and_experiment_decisions(
    symbol_review,
    target_alternatives,
):
    page = sample_page_decision(symbolReview=_fresh(symbol_review))
    experiment = _base_decision({
        "sourceId": "experiment-1-1",
        "kind": "experiment",
    })
    experiment["symbolTextAlternatives"] = _fresh(target_alternatives)
    return sorted([page, experiment], key=lambda item: item["sourceId"])
```

Expected: only `sample_page_and_experiment_decisions` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F16 — Add only fixture function `reviewed_visual_fixture`.**

```python
def reviewed_visual_fixture(kind):
    if kind not in {"figure", "table", "visual"}:
        raise ValueError(f"unsupported visual kind: {kind}")
    page = _page(10)
    if kind == "visual":
        index = {
            "schemaVersion": 1,
            "pdfPath": "reference/原始文档.pdf",
            "pages": [page],
            "outline": [],
            "numberedItems": [],
        }
        visuals = [sample_visual()]
        item = visuals[0]
    else:
        item = _numbered(kind, "1-2", 10)
        index = {
            "schemaVersion": 1,
            "pdfPath": "reference/原始文档.pdf",
            "pages": [page],
            "outline": [],
            "numberedItems": [item],
        }
        visuals = []
    return _fresh((index, visuals, [_reviewed_decision(item)]))
```

Expected: only `reviewed_visual_fixture` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F17 — Add only fixture function `sample_analysis_sections`.**

```python
def sample_analysis_sections():
    priority = "\n".join(
        f"{number}. 最高优先级论断 {number}"
        for number in range(1, 6)
    )
    risk = "\n".join(
        ["| 编号 | 表述 |", "|---|---|"]
        + [
            f"| {number} | 高风险表述 {number} |"
            for number in range(1, 9)
        ]
    )
    return [{
        "heading": "第1章 基础概念",
        "headingLevel": 2,
        "text": "第一章完整分析证据",
        "path": "reference/book-analysis.md",
        "startLine": 1,
        "endLine": 1,
    }, {
        "heading": "五条最高优先级的作者论断（非共识型）",
        "headingLevel": 2,
        "text": priority,
        "path": "reference/book-analysis.md",
        "startLine": 3,
        "endLine": 7,
    }, {
        "heading": "🔴 高风险——容易被误引的表述",
        "headingLevel": 2,
        "text": risk,
        "path": "reference/book-analysis.md",
        "startLine": 9,
        "endLine": 18,
    }, {
        "heading": "🟡 中风险——容易被过度解读的结论",
        "headingLevel": 2,
        "text": "中风险证据边界",
        "path": "reference/book-analysis.md",
        "startLine": 20,
        "endLine": 20,
    }]
```

Expected: the fixture mirrors `parse_markdown_sections` output, includes the
chapter evidence row, and covers all three frozen analysis anchors.

- [ ] **S1.F18 — Add only fixture function `sample_outline_sections`.**

```python
def sample_outline_sections():
    return [{
        "heading": f"{lesson_id} Lesson {lesson_id}",
        "headingLevel": 2,
        "lessonId": lesson_id,
        "text": f"核心内容：课程目标 {lesson_id}",
        "path": "02-课程大纲.md",
        "startLine": number + 2,
        "endLine": number + 2,
    } for number, lesson_id in enumerate(_LESSON_IDS)]
```

Expected: every heading starts with the exact lesson ID and every row mirrors
the parsed Markdown path/line schema used by must-keep and bundle builders.

- [ ] **S1.F19 — Add only fixture function `sample_must_keep_inventory`.**

```python
def sample_must_keep_inventory():
    policy = sample_policy()
    inventory = []
    routes = policy["mustKeepRules"]["courseObjectives"][
        "sourceRoutingByLesson"
    ]
    for lesson_id in _LESSON_IDS:
        inventory.append({
            "mustKeepId": f"course-objective-{lesson_id}",
            "text": f"课程目标 {lesson_id}",
            "sourceRef": f"02-课程大纲.md:{_LESSON_IDS.index(lesson_id) + 2}",
            "primarySourceRoutes": _fresh(routes[lesson_id]["primary"]),
            "secondarySourceRoutes": _fresh(routes[lesson_id]["secondary"]),
            "lessonIds": [lesson_id],
            "versionStatus": "current",
        })
    for rule_name, id_prefix, count in (
        ("highPriority", "analysis-high-priority", 5),
        ("highRisk", "analysis-high-risk", 8),
    ):
        routing = policy["mustKeepRules"][rule_name]["routing"]
        for number in range(1, count + 1):
            must_keep_id = f"{id_prefix}-{number:02d}"
            route = routing[must_keep_id]
            inventory.append({
                "mustKeepId": must_keep_id,
                "text": f"{id_prefix} 原文 {number}",
                "sourceRef": f"reference/book-analysis.md:{20 + number}",
                "primarySourceRoutes": [
                    {"chapter": chapter}
                    for chapter in route["sourceChapters"]
                ],
                "secondarySourceRoutes": [],
                "lessonIds": _fresh(route["lessonIds"]),
                "versionStatus": route["versionStatus"],
            })
    return sorted(inventory, key=lambda item: item["mustKeepId"])
```

Expected: only `sample_must_keep_inventory` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F20 — Add only fixture function `sample_source_map`.**

```python
def sample_source_map():
    result = {
        item["sourceId"]: item
        for item in [
            *sample_index()["pages"],
            *sample_index()["outline"],
            *sample_index()["numberedItems"],
        ]
    }
    for position, item in enumerate(sample_must_keep_inventory(), start=1):
        chapter = item["primarySourceRoutes"][0]["chapter"]
        source_id = f"experiment-route-{position:02d}"
        result[source_id] = _numbered(
            "experiment", f"route-{position:02d}", 100 + position, chapter,
        )
    return result
```

Expected: only `sample_source_map` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F21 — Add only fixture function `claimed_must_keep_fixture`.**

```python
def claimed_must_keep_fixture(must_keep_id, **changes):
    inventory = {
        item["mustKeepId"]: item for item in sample_must_keep_inventory()
    }
    item = inventory[must_keep_id]
    source = _numbered(
        "experiment",
        "claim-1",
        120,
        item["primarySourceRoutes"][0]["chapter"],
    )
    if "chapter" in changes:
        source["chapter"] = changes["chapter"]
    lesson_ids = item["lessonIds"] or []
    decision = _reviewed_decision(
        source,
        lesson_id=lesson_ids[0] if lesson_ids else "0-1",
        must_keep_ids=[must_keep_id],
    )
    for key, value in changes.items():
        if key != "chapter":
            decision[key] = _fresh(value)
    return _fresh(([decision], {source["sourceId"]: source}))
```

Expected: only `claimed_must_keep_fixture` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F22 — Add only fixture function `course_route_claim_fixture`.**

```python
def course_route_claim_fixture(lesson_id, chapter):
    target_id = f"course-objective-{lesson_id}"
    policy = sample_policy()
    decisions = []
    source_map = {}
    for position, inventory_item in enumerate(
        sample_must_keep_inventory(), start=1,
    ):
        if inventory_item["mustKeepId"] == target_id:
            continue
        route = next(
            (
                value
                for value in inventory_item["primarySourceRoutes"]
                if "sectionAnchor" not in value
            ),
            inventory_item["primarySourceRoutes"][0],
        )
        source = _numbered(
            "experiment", f"complete-{position:02d}",
            130 + position, route["chapter"],
        )
        source_map[source["sourceId"]] = source
        routed_lessons = inventory_item["lessonIds"]
        decision = _reviewed_decision(
            source,
            lesson_id=routed_lessons[0] if routed_lessons else "0-1",
            must_keep_ids=[inventory_item["mustKeepId"]],
        )
        if inventory_item["versionStatus"] == "future":
            decision.update({
                "disposition": "excluded",
                "reason": policy["versionBoundaryReason"],
                "lessonIds": [],
            })
        decisions.append(decision)
    secondary = _numbered("experiment", "secondary-1", 121, chapter)
    source_map[secondary["sourceId"]] = secondary
    decisions.append(_reviewed_decision(
        secondary,
        lesson_id=lesson_id,
        must_keep_ids=[target_id],
    ))
    outline = []
    if lesson_id == "1-3":
        outline.append({
            "sourceId": "outline-121-001",
            "kind": "outline",
            "pdfPage": 121,
            "ordinal": 1,
            "depth": 2,
            "title": "1.2.6 护栏与安全性",
        })
    return _fresh((decisions, source_map, outline))
```

Expected: all other 24 inventory items have valid primary claims while the
selected course objective has only its declared secondary route.

- [ ] **S1.F23 — Add only fixture function `sample_page32_boundary_index`.**

```python
def sample_page32_boundary_index():
    value = sample_page20_index()
    value["pages"].extend([_page(31), _page(32)])
    value["outline"] = [{
        "sourceId": "outline-031-001",
        "kind": "outline",
        "pdfPage": 31,
        "ordinal": 1,
        "depth": 2,
        "title": "1.2.6 护栏与安全性",
    }, {
        "sourceId": "outline-032-002",
        "kind": "outline",
        "pdfPage": 32,
        "ordinal": 2,
        "depth": 2,
        "title": "1.3 新章节",
    }]
    return value
```

Expected: only `sample_page32_boundary_index` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F24 — Add only fixture function `sample_page87_outline_index`.**

```python
def sample_page87_outline_index():
    return {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": [_page(87, chapter=3), _page(88, chapter=3)],
        "outline": [{
            "sourceId": "outline-087-001",
            "kind": "outline",
            "pdfPage": 87,
            "ordinal": 1,
            "depth": 2,
            "title": "3.1 用户记忆系统",
        }, {
            "sourceId": "outline-088-002",
            "kind": "outline",
            "pdfPage": 88,
            "ordinal": 2,
            "depth": 2,
            "title": "3.2 下一节",
        }],
        "numberedItems": [],
    }
```

Expected: only `sample_page87_outline_index` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F25 — Add only fixture function `sample_calibration_index`.**

```python
def sample_calibration_index():
    pages = []
    for pdf_page in [*_REQUIRED_PAGES, *_EXTERNAL_PAGES]:
        page = _page(pdf_page)
        if pdf_page in _REQUIRED_PAGES:
            page["charCount"] = 0
            page["textPreview"] = ""
        pages.append(page)
    numbered = []
    for pdf_page in _REQUIRED_PAGES:
        for ordinal in range(1, 5):
            numbered.append(_numbered(
                "experiment",
                f"cal-{pdf_page:03d}-{ordinal:02d}",
                pdf_page,
            ))
    return {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": pages,
        "outline": [],
        "numberedItems": numbered,
    }
```

Expected: only `sample_calibration_index` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F26 — Add only fixture function `sample_calibration_decisions`.**

```python
def sample_calibration_decisions(visuals=None):
    index = sample_calibration_index()
    selected_visuals = _fresh(
        [sample_visual()] if visuals is None else visuals
    )
    records = []
    for item in [
        *index["pages"], *index["numberedItems"], *selected_visuals,
    ]:
        record = _base_decision(item)
        if item["kind"] == "page":
            record.update({
                "visualReviewState": "reviewed",
                "visualReviewer": "visual-scanner-a",
                "discoveredVisualIds": sorted(
                    visual["sourceId"]
                    for visual in selected_visuals
                    if visual["pdfPage"] == item["pdfPage"]
                ),
            })
        records.append(record)
    return sorted(records, key=lambda item: item["sourceId"])
```

Expected: decisions and page discovery inventories are built from the same
explicit visual list; omitting it preserves the one-visual calibration default.

- [ ] **S1.F27 — Add only fixture function `sample_package_hashes`.**

```python
def sample_package_hashes():
    result = {}
    for pdf_page in [*_REQUIRED_PAGES, *_EXTERNAL_PAGES]:
        result[pdf_page] = {
            "bundlePath": (
                "tmp/source-audit/review-packages/calibration/"
                f"page-{pdf_page:03d}.json"
            ),
            "bundleSha256": hashlib.sha256(
                f"bundle-{pdf_page}".encode()
            ).hexdigest(),
            "pageImage": (
                f"tmp/pdfs/source-audit/page-{pdf_page:03d}.png"
            ),
            "pageImageSha256": hashlib.sha256(
                f"image-{pdf_page}".encode()
            ).hexdigest(),
            "evidenceHashes": _fresh(_EVIDENCE_HASHES),
        }
    return result
```

Expected: only `sample_package_hashes` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F28 — Add only fixture function `build_sample_bundle`.**

```python
def build_sample_bundle(pdf_page=20, index=None, visuals=None):
    from scripts.source_audit.build_review_packages import build_page_bundle

    selected_index = _fresh(index or sample_page20_index())
    selected_visuals = _fresh(visuals or [])
    decisions = sample_decisions(
        index=selected_index,
        visuals=selected_visuals,
    )
    with tempfile.TemporaryDirectory() as directory:
        image = Path(directory) / f"page-{pdf_page:03d}.png"
        image.write_bytes(_PNG_BYTES)
        return build_page_bundle(
            pdf_page=pdf_page,
            full_text={pdf_page: "x" * 300},
            index=selected_index,
            visuals=selected_visuals,
            decisions=decisions,
            policy=sample_policy(),
            page_image=image,
            page_image_label=(
                f"tmp/pdfs/source-audit/page-{pdf_page:03d}.png"
            ),
            page_image_sha256=hashlib.sha256(_PNG_BYTES).hexdigest(),
            evidence_hashes=_fresh(_EVIDENCE_HASHES),
            analysis_sections=sample_analysis_sections(),
            outline_sections=sample_outline_sections(),
            must_keep_inventory=sample_must_keep_inventory(),
        )
```

Expected: only `build_sample_bundle` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F29 — Add only fixture function `_freeze_from`.**

```python
def _freeze_from(index, visuals, decisions, pages, source_ids):
    catalog_ids = sorted(
        item["sourceId"]
        for item in [
            *index["pages"], *index["outline"],
            *index["numberedItems"], *visuals,
        ]
    )
    by_id = {item["sourceId"]: item for item in decisions}
    records = lambda name: [{
        "pdfPage": page,
        "path": (
            f"tmp/pdfs/source-audit/page-{page:03d}.png"
            if name == "pageImages"
            else (
                "tmp/source-audit/review-packages/calibration/"
                f"page-{page:03d}.json"
            )
        ),
        "sha256": hashlib.sha256(f"{name}-{page}".encode()).hexdigest(),
    } for page in pages]
    freeze = {
        "schemaVersion": 1,
        "batchId": "calibration-001",
        "mode": "calibration",
        "pages": sorted(pages),
        "sourceIds": sorted(source_ids),
        "catalogSourceIds": catalog_ids,
        "baseReviewStates": {
            source_id: by_id[source_id]["reviewState"]
            for source_id in catalog_ids
        },
        "pageImages": records("pageImages"),
        "pageBundles": records("pageBundles"),
        "policySnapshotPath": (
            "tmp/source-audit/review-packages/calibration/"
            "editorial-policy.snapshot.json"
        ),
        "policySnapshotSha256": "3" * 64,
        "frozenPageDecisions": [
            _fresh(by_id[f"page-{page:03d}"]) for page in sorted(pages)
        ],
        "pdfSha256": "a" * 64,
        "sourceIndexSha256": "b" * 64,
        "unnumberedVisualsSha256": "c" * 64,
        "baseDecisionsSha256": _sha256_json(decisions),
        "baseLedgerSha256": "e" * 64,
        "editorialPolicySha256": "f" * 64,
        "analysisSha256": "1" * 64,
        "courseOutlineSha256": "2" * 64,
    }
    freeze["freezeSha256"] = _sha256_json(freeze)
    return freeze
```

Expected: only `_freeze_from` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F30 — Add only fixture function `frozen_batch`.**

```python
def frozen_batch(
    *,
    mode="calibration",
    batch_id=None,
    pages=None,
    source_ids=None,
):
    selected_pages = sorted(pages or [20])
    selected_ids = sorted(source_ids or ["figure-1-2"])
    page_ids = [f"page-{page:03d}" for page in selected_pages]
    catalog_ids = sorted(set([*page_ids, *selected_ids]))

    def records(kind):
        return [{
            "pdfPage": page,
            "path": (
                f"tmp/pdfs/source-audit/page-{page:03d}.png"
                if kind == "pageImages"
                else (
                    "tmp/source-audit/review-packages/calibration/"
                    f"page-{page:03d}.json"
                )
            ),
            "sha256": hashlib.sha256(
                f"{kind}-{page}".encode()
            ).hexdigest(),
        } for page in selected_pages]

    freeze = {
        "schemaVersion": 1,
        "batchId": batch_id or f"{mode}-001",
        "mode": mode,
        "pages": selected_pages,
        "sourceIds": selected_ids,
        "catalogSourceIds": catalog_ids,
        "baseReviewStates": {
            source_id: "unreviewed" for source_id in catalog_ids
        },
        "pageImages": records("pageImages"),
        "pageBundles": records("pageBundles"),
        "policySnapshotPath": (
            "tmp/source-audit/review-packages/calibration/"
            "editorial-policy.snapshot.json"
        ),
        "policySnapshotSha256": "3" * 64,
        "frozenPageDecisions": [
            sample_page_decision(
                sourceId=page_id,
                symbolReview=[],
            )
            for page_id in page_ids
        ],
        "pdfSha256": "a" * 64,
        "sourceIndexSha256": "b" * 64,
        "unnumberedVisualsSha256": "c" * 64,
        "baseDecisionsSha256": "d" * 64,
        "baseLedgerSha256": "e" * 64,
        "editorialPolicySha256": "f" * 64,
        "analysisSha256": "1" * 64,
        "courseOutlineSha256": "2" * 64,
    }
    freeze["freezeSha256"] = _sha256_json(freeze)
    return freeze
```

Expected: only `frozen_batch` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F31 — Add only fixture function `current_hashes`.**

```python
def current_hashes():
    freeze = frozen_batch()
    return {
        key: _fresh(value)
        for key, value in freeze.items()
        if key in {
            "pdfSha256", "sourceIndexSha256",
            "unnumberedVisualsSha256", "baseDecisionsSha256",
            "baseLedgerSha256", "editorialPolicySha256",
            "analysisSha256", "courseOutlineSha256",
            "policySnapshotPath", "policySnapshotSha256",
            "pageImages", "pageBundles",
            "catalogSourceIds", "baseReviewStates",
        }
    }
```

Expected: only `current_hashes` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F32 — Add only fixture function `sample_review_entry`.**

```python
def sample_review_entry(**changes):
    value = {
        "entryType": "review",
        "batchId": "calibration-001",
        "mode": "calibration",
        "sourceIds": ["figure-1-2"],
        "primaryReviewer": "reviewer-a",
        "primaryTaskId": "/root/calibration_primary",
        "secondaryReviewer": "reviewer-b",
        "secondaryTaskId": "/root/calibration_secondary",
        "doubleReviewedSourceIds": ["figure-1-2"],
        "mandatoryReviews": [{
            "sourceId": "figure-1-2",
            "reasons": ["lesson-1-1", "visual"],
        }],
        "strata": [{
            "key": "chapter-1|kind-figure",
            "populationSourceIds": ["figure-1-2"],
            "mandatorySourceIds": ["figure-1-2"],
            "sampledSourceIds": [],
            "doubleReviewedSourceIds": ["figure-1-2"],
            "disagreementSourceIds": [],
            "sourceDisagreementRate": 0.0,
            "expanded": False,
        }],
        "disagreements": [],
        "resolvedSourceIds": [],
        "sourceDisagreementRate": 0.0,
        "escalations": [],
        "inputFingerprint": "c" * 64,
        "baseDecisionsSha256": "a" * 64,
        "acceptedDecisionsSha256": "b" * 64,
    }
    value.update(_fresh(changes))
    return value
```

Expected: only `sample_review_entry` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F33 — Add only fixture function `sample_ledger`.**

```python
def sample_ledger(decisions=None, visuals=None):
    accepted_hash = _sha256_json(
        decisions if decisions is not None else sample_decisions()
    )
    ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": accepted_hash,
        "acceptedDecisionsSha256": accepted_hash,
    }]
    visuals_by_page = {}
    for visual in visuals or []:
        visuals_by_page.setdefault(
            visual["pdfPage"], []
        ).append(visual["sourceId"])
    for pdf_page in sorted(visuals_by_page):
        ledger.append({
            "entryType": "discovery",
            "discoveryId": f"discovery-p{pdf_page:03d}-01",
            "pdfPage": pdf_page,
            "attempt": 1,
            "reviewer": "visual-scanner-a",
            "addedVisualIds": sorted(visuals_by_page[pdf_page]),
            "baseDecisionsSha256": accepted_hash,
            "acceptedDecisionsSha256": accepted_hash,
        })
    return ledger
```

Expected: only `sample_ledger` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F34 — Add only fixture function `sample_legacy_decisions`.**

```python
def sample_legacy_decisions(index=None):
    selected_index = _fresh(index or sample_index())
    records = []
    for item in [
        *selected_index["pages"],
        *selected_index["outline"],
        *selected_index["numberedItems"],
    ]:
        records.append({
            "sourceId": item["sourceId"],
            "disposition": "unreviewed",
            "reason": "",
            "lessonIds": [],
            "markdownRefs": [],
            "visualClass": None,
            "visualHandling": None,
            "reviewState": "unreviewed",
        })
    return sorted(records, key=lambda item: item["sourceId"])
```

Expected: only `sample_legacy_decisions` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F35 — Add only fixture function `_review_patch`.**

```python
def _review_patch(freeze, records, reviewer, task_id):
    return {
        "batchId": freeze["batchId"],
        "reviewer": reviewer,
        "reviewerTaskId": task_id,
        "evidenceHashes": {
            key: freeze[key]
            for key in (
                "pdfSha256", "sourceIndexSha256",
                "unnumberedVisualsSha256", "baseDecisionsSha256",
                "baseLedgerSha256", "editorialPolicySha256",
                "analysisSha256", "courseOutlineSha256", "freezeSha256",
            )
        },
        "changes": _fresh(records),
    }
```

Expected: only `_review_patch` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F36 — Add only fixture function `_catalog_items`.**

```python
def _catalog_items(index, visuals=None):
    return [
        *index["pages"], *index["outline"],
        *index["numberedItems"], *(visuals or []),
    ]
```

Expected: only `_catalog_items` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F37 — Add only fixture function `_chapter_for_fixture`.**

```python
def _chapter_for_fixture(index, item):
    if item.get("chapter") is not None:
        return item["chapter"]
    return {
        page["pdfPage"]: page.get("chapter")
        for page in index["pages"]
    }.get(item["pdfPage"])
```

Expected: only `_chapter_for_fixture` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F38 — Add only fixture function `_mandatory_reasons`.**

```python
def _mandatory_reasons(item, decision, policy):
    reasons = set(
        decision["riskFlags"]
    ) & {
        "critical-number", "experiment-conclusion", "scope-boundary",
    }
    if item["sourceId"] in set(policy["captionConflictSourceIds"]):
        reasons.add("caption-conflict")
    if decision["disposition"] == "missing":
        reasons.add("missing")
    if item["kind"] in {"figure", "table", "visual"}:
        reasons.add("visual")
    if "1-1" in decision["lessonIds"]:
        reasons.add("lesson-1-1")
    if any(
        value.startswith("analysis-high-risk-")
        for value in decision["mustKeepIds"]
    ):
        reasons.add("analysis-high-risk")
    return sorted(reasons)
```

Expected: only `_mandatory_reasons` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F39 — Add only fixture function `_review_entry_for`.**

```python
def _review_entry_for(
    index,
    visuals,
    decisions,
    *,
    batch_id,
    mode,
    source_ids,
    base_hash,
    accepted_hash,
):
    policy = sample_policy()
    source_map = {
        item["sourceId"]: item
        for item in _catalog_items(index, visuals)
    }
    decisions_by_id = {
        item["sourceId"]: item for item in decisions
    }
    selected = sorted(source_ids)
    mandatory = []
    mandatory_ids = set()
    for source_id in selected:
        reasons = _mandatory_reasons(
            source_map[source_id], decisions_by_id[source_id], policy
        )
        if reasons:
            mandatory_ids.add(source_id)
            mandatory.append({"sourceId": source_id, "reasons": reasons})
    populations = {}
    for source_id in selected:
        item = source_map[source_id]
        chapter = _chapter_for_fixture(index, item)
        key = f"chapter-{chapter if chapter is not None else 'none'}|kind-{item['kind']}"
        populations.setdefault(key, []).append(source_id)
    strata = []
    for key in sorted(populations):
        population = sorted(populations[key])
        population_set = set(population)
        strata.append({
            "key": key,
            "populationSourceIds": population,
            "mandatorySourceIds": sorted(
                mandatory_ids & population_set
            ),
            "sampledSourceIds": sorted(
                population_set - mandatory_ids
            ),
            "doubleReviewedSourceIds": population,
            "disagreementSourceIds": [],
            "sourceDisagreementRate": 0.0,
            "expanded": False,
        })
    return {
        "entryType": "review",
        "batchId": batch_id,
        "mode": mode,
        "sourceIds": selected,
        "primaryReviewer": "reviewer-a",
        "primaryTaskId": "/root/calibration_primary",
        "secondaryReviewer": "reviewer-b",
        "secondaryTaskId": "/root/calibration_secondary",
        "doubleReviewedSourceIds": selected,
        "mandatoryReviews": mandatory,
        "strata": strata,
        "disagreements": [],
        "resolvedSourceIds": [],
        "sourceDisagreementRate": 0.0,
        "escalations": [],
        "inputFingerprint": "c" * 64,
        "baseDecisionsSha256": base_hash,
        "acceptedDecisionsSha256": accepted_hash,
    }
```

Expected: only `_review_entry_for` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F40a — Add only fixture helper `_calibration_case_parts`.**

```python
def _calibration_case_parts():
    index = sample_calibration_index()
    visuals = [sample_visual()]
    base = sample_calibration_decisions()
    pages = [*_REQUIRED_PAGES, *_EXTERNAL_PAGES]
    source_ids = [item["sourceId"] for item in base]
    freeze = _freeze_from(index, visuals, base, pages, source_ids)
    genesis_hash = "9" * 64
    base_ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": genesis_hash,
        "acceptedDecisionsSha256": genesis_hash,
    }, {
        "entryType": "discovery",
        "discoveryId": "discovery-p010-01",
        "pdfPage": 10,
        "attempt": 1,
        "reviewer": "visual-scanner-a",
        "addedVisualIds": ["visual-p010-01"],
        "baseDecisionsSha256": genesis_hash,
        "acceptedDecisionsSha256": freeze["baseDecisionsSha256"],
    }]
    freeze["baseLedgerSha256"] = _sha256_json(base_ledger)
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    })
    return index, visuals, source_ids, freeze, base_ledger
```

Expected: the helper returns the complete frozen calibration inputs and
hash-consistent pre-review ledger; its fenced block parses.

- [ ] **S1.F40b — Add only fixture helper `_calibration_accepted_decisions`.**

```python
def _calibration_accepted_decisions(index, visuals, freeze):
    frozen_pages = {
        value["sourceId"]: value
        for value in freeze["frozenPageDecisions"]
    }
    accepted = []
    for item in [
        *index["pages"], *index["numberedItems"], *visuals,
    ]:
        record = _reviewed_decision(item)
        if item["kind"] == "page":
            frozen = frozen_pages[item["sourceId"]]
            for field in (
                "visualReviewState", "visualReviewer",
                "discoveredVisualIds", "symbolReview",
            ):
                record[field] = _fresh(frozen[field])
        accepted.append(record)
    return sorted(accepted, key=lambda item: item["sourceId"])
```

Expected: the helper preserves every frozen page-scan field while producing
stable accepted-decision order; its fenced block parses.

- [ ] **S1.F40c — Add only fixture helper `_valid_calibration_payload`.**

```python
def _valid_calibration_payload():
    index, visuals, source_ids, freeze, base_ledger = (
        _calibration_case_parts()
    )
    accepted = _calibration_accepted_decisions(
        index, visuals, freeze,
    )
    review = _review_entry_for(
        index,
        visuals,
        accepted,
        batch_id=freeze["batchId"],
        mode="calibration",
        source_ids=source_ids,
        base_hash=freeze["baseDecisionsSha256"],
        accepted_hash=_sha256_json(accepted),
    )
    immutable = {
        key: _fresh(freeze[key])
        for key in (
            "pdfSha256", "sourceIndexSha256",
            "unnumberedVisualsSha256", "editorialPolicySha256",
            "analysisSha256", "courseOutlineSha256",
            "policySnapshotPath", "policySnapshotSha256",
            "pageImages", "pageBundles", "catalogSourceIds",
        )
    }
    return {
        "freeze": freeze,
        "current_immutable_evidence_hashes": immutable,
        "index": index,
        "visuals": visuals,
        "decisions": accepted,
        "ledger": [*base_ledger, review],
        "policy": sample_policy(),
        "must_keep_inventory": sample_must_keep_inventory(),
    }
```

Expected: the helper assembles the complete calibration payload with the same
ledger and immutable-evidence contract; its fenced block parses.

- [ ] **S1.F40d — Add only fixture helper `_integration_case_parts`.**

```python
def _integration_case_parts():
    index = sample_page20_index()
    visuals = []
    discovery_decisions = {
        item["sourceId"]: item
        for item in _decisions_for(index)
    }
    base = []
    for item in [*index["pages"], *index["numberedItems"]]:
        record = _base_decision(item)
        if item["kind"] == "page":
            for field in (
                "visualReviewState", "visualReviewer",
                "discoveredVisualIds", "symbolReview",
            ):
                record[field] = _fresh(
                    discovery_decisions[item["sourceId"]][field]
                )
        if item["sourceId"] == "experiment-1-1":
            record["symbolTextAlternatives"] = _fresh(
                discovery_decisions[item["sourceId"]][
                    "symbolTextAlternatives"
                ]
            )
        base.append(record)
    base_by_id = {item["sourceId"]: item for item in base}
    base = sorted(base_by_id.values(), key=lambda item: item["sourceId"])
    freeze = _freeze_from(
        index, visuals, base, [20],
        [item["sourceId"] for item in base],
    )
    base_ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": freeze["baseDecisionsSha256"],
        "acceptedDecisionsSha256": freeze["baseDecisionsSha256"],
    }]
    freeze["baseLedgerSha256"] = _sha256_json(base_ledger)
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    })
    return index, visuals, base, base_by_id, freeze, base_ledger
```

Expected: the helper returns the integration baseline, lookup, freeze, and
genesis ledger without mutating shared fixture data; its fenced block parses.

- [ ] **S1.F40e — Add only fixture helper `_integration_review_patches`.**

```python
def _integration_review_patches(index, base_by_id, freeze):
    final = {
        item["sourceId"]: item for item in _decisions_for(index)
    }
    for field in (
        "visualReviewState", "visualReviewer",
        "discoveredVisualIds", "symbolReview",
    ):
        final["page-020"][field] = _fresh(base_by_id["page-020"][field])
    primary_records = [final[source_id] for source_id in sorted(final)]
    secondary_records = _fresh(primary_records)
    secondary_figure = next(
        item for item in secondary_records
        if item["sourceId"] == "figure-1-2"
    )
    secondary_figure["visualHandling"] = "reuse"
    primary_figure = final["figure-1-2"]
    primary_figure["visualHandlingNote"] = "[复用依据] 已取得原图授权"
    secondary_figure["visualHandlingNote"] = "[复用依据] 已取得原图授权"
    resolution = {
        "batchId": freeze["batchId"],
        "resolutions": [{
            "sourceId": "figure-1-2",
            "fields": ["visualHandling"],
            "finalRecord": _fresh(primary_figure),
            "resolutionNote": "按统一网页风格重绘",
        }],
        "criticalOmissions": [],
    }
    primary = _review_patch(
        freeze, primary_records,
        "reviewer-a", "/root/calibration_primary",
    )
    secondary = _review_patch(
        freeze, secondary_records,
        "reviewer-b", "/root/calibration_secondary",
    )
    return primary, secondary, resolution
```

Expected: the helper constructs the two independent full-record patches and
their explicit visual-handling resolution; its fenced block parses.

- [ ] **S1.F40f — Add only fixture helper `_valid_integration_payload`.**

```python
def _valid_integration_payload():
    (
        index, visuals, base, base_by_id, freeze, base_ledger,
    ) = _integration_case_parts()
    primary, secondary, resolution = _integration_review_patches(
        index, base_by_id, freeze,
    )
    current = {
        key: _fresh(freeze[key])
        for key in (
            "pdfSha256", "sourceIndexSha256",
            "unnumberedVisualsSha256", "baseDecisionsSha256",
            "baseLedgerSha256", "editorialPolicySha256",
            "analysisSha256", "courseOutlineSha256",
            "policySnapshotPath", "policySnapshotSha256",
            "pageImages", "pageBundles",
            "catalogSourceIds", "baseReviewStates",
        )
    }
    arguments = {
        "index": index,
        "visuals": visuals,
        "decisions": base,
        "ledger": base_ledger,
        "policy": sample_policy(),
        "must_keep_inventory": sample_must_keep_inventory(),
        "freeze": freeze,
        "current_evidence_hashes": current,
        "primary_patch": primary,
        "secondary_patch": secondary,
        "resolution": resolution,
    }
    return {
        "arguments": arguments,
        "resolution": resolution,
        "currentEvidence": current,
    }
```

Expected: the helper assembles the exact integration arguments and current
evidence returned by the original fixture; its fenced block parses.

- [ ] **S1.F40g — Add only fixture dispatcher `_valid_case`.**

```python
def _valid_case(kind):
    if kind == "calibration":
        return _valid_calibration_payload()
    if kind == "integration":
        return _valid_integration_payload()
    raise ValueError(f"unknown valid fixture kind: {kind}")
```

Expected: the dispatcher accepts only the two supported fixture kinds and
delegates without duplicating either payload construction.

- [ ] **S1.F41a — Add only fixture helper `_normal_expansion_parts`.**

```python
def _normal_expansion_parts():
    index = {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": [_page(20)],
        "outline": [],
        "numberedItems": [
            _numbered("experiment", f"sample-{number}", 20)
            for number in range(1, 7)
        ],
    }
    visuals = []
    base = [_base_decision(item) for item in _catalog_items(index)]
    base_by_id = {item["sourceId"]: item for item in base}
    base_by_id["page-020"].update({
        "visualReviewState": "reviewed",
        "visualReviewer": "visual-scanner-a",
    })
    base = sorted(base_by_id.values(), key=lambda item: item["sourceId"])
    source_ids = [item["sourceId"] for item in base]
    freeze = _freeze_from(index, visuals, base, [20], source_ids)
    freeze["mode"] = "normal"
    base_ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": freeze["baseDecisionsSha256"],
        "acceptedDecisionsSha256": freeze["baseDecisionsSha256"],
    }]
    freeze["baseLedgerSha256"] = _sha256_json(base_ledger)
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    })
    return index, visuals, base, source_ids, freeze, base_ledger
```

Expected: the helper creates the normal-mode baseline and freeze with stable
source order and self-consistent hashes; its fenced block parses.

- [ ] **S1.F41b — Add only fixture helper `_normal_expansion_reviews`.**

```python
def _normal_expansion_reviews(index, source_ids, freeze):
    final_by_id = {
        item["sourceId"]: item for item in _decisions_for(index)
    }
    final_by_id["page-020"].update({
        "visualReviewState": "reviewed",
        "visualReviewer": "visual-scanner-a",
    })
    primary_records = [
        final_by_id[source_id] for source_id in sorted(final_by_id)
    ]
    experiment_ids = sorted(
        source_id for source_id in source_ids
        if source_id.startswith("experiment-")
    )
    sampled_experiments = sorted(
        experiment_ids,
        key=lambda source_id: hashlib.sha256(
            f"{freeze['batchId']}\0{source_id}".encode("utf-8")
        ).hexdigest(),
    )[:5]
    secondary_ids = {"page-020", *sampled_experiments}
    secondary_records = [
        _fresh(final_by_id[source_id])
        for source_id in sorted(secondary_ids)
    ]
    disagreement_id = sampled_experiments[0]
    next(
        item for item in secondary_records
        if item["sourceId"] == disagreement_id
    )["reason"] = "次审认为需要补充上下文"
    resolution = {
        "batchId": freeze["batchId"],
        "resolutions": [{
            "sourceId": disagreement_id,
            "fields": ["reason"],
            "finalRecord": _fresh(final_by_id[disagreement_id]),
            "resolutionNote": "保留主审的简洁表述",
        }],
        "criticalOmissions": [],
    }
    primary = _review_patch(
        freeze, primary_records,
        "reviewer-a", "/root/normal_primary",
    )
    secondary = _review_patch(
        freeze, secondary_records,
        "reviewer-b", "/root/normal_secondary",
    )
    return primary, secondary, resolution
```

Expected: the helper deterministically samples five experiments, creates one
resolvable disagreement, and returns both patches; its fenced block parses.

- [ ] **S1.F41c — Add only fixture function `_normal_expansion_case`.**

```python
def _normal_expansion_case():
    index, visuals, base, source_ids, freeze, base_ledger = (
        _normal_expansion_parts()
    )
    primary, secondary, resolution = _normal_expansion_reviews(
        index, source_ids, freeze,
    )
    current = {
        key: _fresh(freeze[key])
        for key in (
            "pdfSha256", "sourceIndexSha256",
            "unnumberedVisualsSha256", "baseDecisionsSha256",
            "baseLedgerSha256", "editorialPolicySha256",
            "analysisSha256", "courseOutlineSha256",
            "policySnapshotPath", "policySnapshotSha256",
            "pageImages", "pageBundles",
            "catalogSourceIds", "baseReviewStates",
        )
    }
    arguments = {
        "index": index,
        "visuals": visuals,
        "decisions": base,
        "ledger": base_ledger,
        "policy": sample_policy(),
        "must_keep_inventory": sample_must_keep_inventory(),
        "freeze": freeze,
        "current_evidence_hashes": current,
        "primary_patch": primary,
        "secondary_patch": secondary,
        "resolution": resolution,
    }
    return {
        "arguments": arguments,
        "resolution": resolution,
        "currentEvidence": current,
    }
```

Expected: the fixture assembles the unchanged normal-expansion arguments,
resolution, and current evidence from the two preceding helpers.

- [ ] **S1.F42 — Add only fixture function `sample_integration_case`.**

```python
def sample_integration_case(variant=None):
    case = (
        _normal_expansion_case()
        if variant == "unexpanded-stratum"
        else _valid_case("integration")
    )

    def run_apply():
        from scripts.source_audit.integrate_review_batch import (
            integrate_review_batch,
        )
        return integrate_review_batch(**case["arguments"])

    case["runApply"] = run_apply
    if variant == "missing-secondary":
        case["arguments"]["secondary_patch"]["changes"].pop()
    elif variant == "unexpanded-stratum":
        if case["arguments"]["freeze"]["mode"] != "normal":
            raise AssertionError("unexpanded fixture must use normal mode")
    elif variant == "reviewed-overwrite":
        source_id = case["arguments"]["freeze"]["sourceIds"][0]
        case["arguments"]["freeze"]["baseReviewStates"][source_id] = "reviewed"
        case["arguments"]["freeze"]["freezeSha256"] = _sha256_json({
            key: value
            for key, value in case["arguments"]["freeze"].items()
            if key != "freezeSha256"
        })
        case["arguments"]["current_evidence_hashes"][
            "baseReviewStates"
        ] = _fresh(case["arguments"]["freeze"]["baseReviewStates"])
        for patch_name in ("primary_patch", "secondary_patch"):
            case["arguments"][patch_name]["evidenceHashes"][
                "freezeSha256"
            ] = case["arguments"]["freeze"]["freezeSha256"]
    elif variant == "invalid-ledger":
        case["arguments"]["ledger"][0]["genesisId"] = "wrong-genesis"
    elif variant == "invalid-must-keep-coverage":
        must_keep_id = "analysis-high-priority-01"
        for patch_name in ("primary_patch", "secondary_patch"):
            record = next(
                item
                for item in case["arguments"][patch_name]["changes"]
                if item["sourceId"] == "experiment-1-1"
            )
            record["mustKeepIds"] = [must_keep_id]
        inventory_by_id = {
            item["mustKeepId"]: item
            for item in case["arguments"]["must_keep_inventory"]
        }
        inventory_by_id[must_keep_id][
            "primarySourceRoutes"
        ] = [{"chapter": 99}]
    elif variant is not None:
        raise ValueError(f"unknown integration fixture variant: {variant}")
    return case
```

Expected: only `sample_integration_case` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F43 — Add only fixture function `valid_calibration_case`.**

```python
def valid_calibration_case():
    return _fresh(_valid_case("calibration"))
```

Expected: only `valid_calibration_case` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S1.F44a — Add only fixture helper `_stage_a_index`.**

```python
def _stage_a_index(policy, inventory):
    pages = [
        _page(
            pdf_page,
            chapter=((pdf_page - 1) % 10) + 1,
        )
        for pdf_page in range(1, 315)
    ]
    numbered = []
    inventory_by_source = {}
    for position, inventory_item in enumerate(inventory, start=1):
        routes = inventory_item["primarySourceRoutes"]
        route = next(
            (
                value for value in routes
                if "sectionAnchor" not in value
            ),
            routes[0],
        )
        chapter = route["chapter"]
        source = _numbered(
            "experiment",
            f"stage-{position:02d}",
            100 + chapter,
            chapter,
        )
        numbered.append(source)
        inventory_by_source[source["sourceId"]] = inventory_item
    for source_id in policy["captionConflictSourceIds"]:
        kind, number = source_id.split("-", 1)
        chapter = int(number.split("-", 1)[0])
        numbered.append(_numbered(
            kind,
            number,
            200 + chapter,
            chapter,
            caption_conflict=True,
        ))
    index = {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": pages,
        "outline": [],
        "numberedItems": sorted(
            numbered, key=lambda item: item["sourceId"]
        ),
    }
    return index, inventory_by_source
```

Expected: the helper constructs all 314 pages, one routable source per
must-keep item, and every frozen caption-conflict source; its block parses.

- [ ] **S1.F44b — Add only fixture helper `_stage_a_decisions`.**

```python
def _stage_a_decisions(
    index,
    policy,
    inventory_by_source,
):
    decisions = []
    excluded = set(policy["excludedChapters"])
    for item in _catalog_items(index):
        inventory_item = inventory_by_source.get(item["sourceId"])
        lesson_ids = (
            inventory_item["lessonIds"]
            if inventory_item is not None
            else ["0-1"]
        )
        lesson_id = lesson_ids[0] if lesson_ids else "0-1"
        must_keep_ids = (
            [inventory_item["mustKeepId"]]
            if inventory_item is not None
            else []
        )
        record = _reviewed_decision(
            item,
            lesson_id=lesson_id,
            must_keep_ids=must_keep_ids,
        )
        if item["kind"] == "page":
            record.update({
                "visualReviewState": "reviewed",
                "visualReviewer": "visual-scanner-a",
                "discoveredVisualIds": [],
                "symbolReview": [],
            })
        if item["chapter"] in excluded:
            record.update({
                "disposition": "excluded",
                "reason": policy["versionBoundaryReason"],
                "lessonIds": [],
            })
            record["riskFlags"] = sorted(
                set(record["riskFlags"]) - {"lesson-1-1"}
            )
        decisions.append(record)
    return sorted(decisions, key=lambda item: item["sourceId"])
```

Expected: the helper reviews every Stage A source, routes must-keep IDs, and
applies the exact future-version boundary for Chapters 5, 7, and 9.

- [ ] **S1.F44c — Add only fixture function `valid_stage_a_case`.**

```python
def valid_stage_a_case():
    policy = sample_policy()
    inventory = sample_must_keep_inventory()
    index, inventory_by_source = _stage_a_index(policy, inventory)
    decisions = _stage_a_decisions(
        index, policy, inventory_by_source,
    )
    decisions_hash = _sha256_json(decisions)
    source_ids = [
        item["sourceId"] for item in _catalog_items(index)
    ]
    review = _review_entry_for(
        index,
        [],
        decisions,
        batch_id="stage-a-fixture",
        mode="calibration",
        source_ids=source_ids,
        base_hash=decisions_hash,
        accepted_hash=decisions_hash,
    )
    ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": decisions_hash,
        "acceptedDecisionsSha256": decisions_hash,
    }, review]
    return {
        "pdf_sha256": (
            "27dba7a82ce46fbaa60c27a99e633a029"
            "db455ec2ccec08c79466c57f317b4ac"
        ),
        "index": index,
        "visuals": [],
        "decisions": decisions,
        "ledger": ledger,
        "policy": policy,
        "must_keep_inventory": inventory,
    }
```

Expected: the fixture assembles the complete Stage A case and its matching
genesis/review ledger; its fenced block parses.

- [ ] **S1.F45 — Add only the small evidence and selection fixtures used by Tasks 4–6.**

```python
def sample_evidence_hashes():
    return _fresh(_EVIDENCE_HASHES)


def sample_short_calibration_decisions():
    return sample_calibration_decisions()[:29]


def current_batch_evidence(freeze):
    return {
        key: _fresh(value)
        for key, value in freeze.items()
        if key in {
            "pdfSha256", "sourceIndexSha256",
            "unnumberedVisualsSha256", "baseDecisionsSha256",
            "baseLedgerSha256", "editorialPolicySha256",
            "analysisSha256", "courseOutlineSha256",
            "policySnapshotPath", "policySnapshotSha256",
            "pageImages", "pageBundles", "catalogSourceIds",
            "baseReviewStates",
        }
    }
```

Expected: exactly these three independently callable fixtures are added; each
returns a fresh value and the block parses.

- [ ] **S1.F46 — Add only `sample_source_item` and `sample_sampling_source_map`.**

```python
def sample_source_item(**changes):
    source_id = changes.get("sourceId", "figure-1-2")
    kind = changes.get("kind", source_id.split("-", 1)[0])
    value = {
        "sourceId": source_id,
        "kind": kind,
        "pdfPage": changes.get("pdfPage", 20),
        "chapter": changes.get("chapter", 1),
        "symbolCounts": {
            "check": 0, "cross": 0, "triangle": 0, "star": 0,
        },
    }
    value.update(_fresh(changes))
    return value


def sample_sampling_source_map(source_ids):
    return {
        source_id: sample_source_item(
            sourceId=source_id,
            kind=source_id.split("-", 1)[0],
            chapter=1,
        )
        for source_id in source_ids
    }
```

Expected: both fixtures are added exactly once, return fresh source records,
and the block parses.

- [ ] **S1.F47 — Add only `sample_review_record` and `sample_review_patch`.**

```python
def sample_review_record(**changes):
    value = sample_reviewed_decision()
    value.update(_fresh(changes))
    return value


def sample_review_patch(**changes):
    freeze = changes.pop("freeze", frozen_batch())
    records = changes.pop(
        "changes",
        [sample_review_record(sourceId=source_id)
         for source_id in freeze["sourceIds"]],
    )
    reviewer = changes.pop("reviewer", "reviewer-a")
    task_id = changes.pop(
        "reviewerTaskId", "/root/calibration_primary",
    )
    value = _review_patch(freeze, records, reviewer, task_id)
    value.update(_fresh(changes))
    return value
```

Expected: both complete patch fixtures are added exactly once; arbitrary
keyword changes are copied, and the block parses.

- [ ] **S1.F48 — Add only the freeze/verify CLI argument fixtures.**

```python
def sample_freeze_args():
    return SimpleNamespace(
        manifest="tmp/manifest.json",
        pdf="reference/原始文档.pdf",
        index="reference/source-audit/source-index.json",
        visuals="reference/source-audit/unnumbered-visuals.json",
        decisions="reference/source-audit/coverage-decisions.json",
        ledger="reference/source-audit/review-ledger.json",
        policy="reference/source-audit/editorial-policy.json",
        analysis="reference/book-analysis.md",
        course_outline="02-课程大纲.md",
        output="tmp/freeze.json",
    )


def sample_verify_args():
    value = vars(sample_freeze_args()).copy()
    value.pop("manifest")
    value["freeze"] = value.pop("output")
    value["image_dir"] = "tmp/pdfs/source-audit"
    value["package_dir"] = "tmp/source-audit/review-packages/calibration"
    return SimpleNamespace(**value)


def sample_batch_manifest():
    return {"schemaVersion": 1, "batchId": "calibration-001"}
```

Expected: all paths are distinct and the argument names exactly match the
Task 10 `freeze` and `verify` commands.

- [ ] **S1.F49 — Add only `_write_fixture_json` and `sample_complete_ledger`.**

```python
def _write_fixture_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def sample_complete_ledger(*, index, visuals, decisions):
    accepted_hash = _sha256_json(decisions)
    ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": accepted_hash,
        "acceptedDecisionsSha256": accepted_hash,
    }]
    for pdf_page in sorted({item["pdfPage"] for item in visuals}):
        ledger.append({
            "entryType": "discovery",
            "discoveryId": f"discovery-p{pdf_page:03d}-01",
            "pdfPage": pdf_page,
            "attempt": 1,
            "reviewer": "visual-scanner-a",
            "addedVisualIds": sorted(
                item["sourceId"] for item in visuals
                if item["pdfPage"] == pdf_page
            ),
            "baseDecisionsSha256": accepted_hash,
            "acceptedDecisionsSha256": accepted_hash,
        })
    ledger.append(_review_entry_for(
        index, visuals, decisions,
        batch_id="complete-fixture",
        mode="calibration",
        source_ids=sorted(item["sourceId"] for item in _catalog_items(index, visuals)),
        base_hash=accepted_hash,
        accepted_hash=accepted_hash,
    ))
    return ledger
```

Expected: JSON writes are deterministic and the complete ledger fixture covers
the supplied source universe with an explicit genesis and review entry.

- [ ] **S1.F50 — Add only `frozen_batch_workspace` for real confined-file tests.**

```python
@contextmanager
def frozen_batch_workspace():
    with tempfile.TemporaryDirectory(
        dir=Path.cwd(), prefix=".source-audit-freeze-",
    ) as directory:
        root = Path(directory)
        image_dir = root / "images"
        package_dir = root / "packages"
        image_dir.mkdir()
        package_dir.mkdir()
        paths = SimpleNamespace(
            pdf=root / "source.pdf",
            index=root / "index.json",
            visuals=root / "visuals.json",
            decisions=root / "decisions.json",
            ledger=root / "ledger.json",
            policy=root / "policy.json",
            analysis=root / "analysis.md",
            course_outline=root / "course-outline.md",
            image_dir=image_dir,
            package_dir=package_dir,
            manifest=package_dir / "manifest.json",
            freeze=root / "freeze.json",
        )
        index = sample_page20_index()
        decisions = [_base_decision(item) for item in _catalog_items(index)]
        next(row for row in decisions if row["sourceId"] == "page-020").update({
            "visualReviewState": "reviewed",
            "visualReviewer": "visual-scanner-a",
        })
        policy = sample_policy()
        paths.pdf.write_bytes(b"fixture pdf")
        for path, value in (
            (paths.index, index), (paths.visuals, []),
            (paths.decisions, decisions),
            (paths.ledger, sample_ledger(decisions=decisions)),
            (paths.policy, policy),
        ):
            _write_fixture_json(path, value)
        paths.analysis.write_text("analysis\n", encoding="utf-8")
        paths.course_outline.write_text("outline\n", encoding="utf-8")
        yield _finish_frozen_workspace(paths, index, decisions, policy)
```

Expected: one temporary workspace is yielded and fully removed on exit; the
helper named in the return is added in the immediately following step.

- [ ] **S1.F51 — Add only `_finish_frozen_workspace`.**

```python
def _finish_frozen_workspace(paths, index, decisions, policy):
    project_root = Path.cwd()
    image = paths.image_dir / "page-020.png"
    bundle = paths.package_dir / "page-020.json"
    snapshot = paths.package_dir / "editorial-policy.snapshot.json"
    image.write_bytes(_PNG_BYTES)
    _write_fixture_json(bundle, {"pdfPage": 20})
    _write_fixture_json(snapshot, policy)
    source_ids = sorted(item["sourceId"] for item in _catalog_items(index))
    freeze = frozen_batch(
        mode="normal", pages=[20], source_ids=source_ids,
    )
    freeze.update({
        "catalogSourceIds": source_ids,
        "baseReviewStates": {
            source_id: "unreviewed" for source_id in source_ids
        },
        "pageImages": [{
            "pdfPage": 20,
            "path": image.relative_to(project_root).as_posix(),
            "sha256": hashlib.sha256(_PNG_BYTES).hexdigest(),
        }],
        "pageBundles": [{
            "pdfPage": 20,
            "path": bundle.relative_to(project_root).as_posix(),
            "sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(),
        }],
        "policySnapshotPath": snapshot.relative_to(project_root).as_posix(),
        "policySnapshotSha256": hashlib.sha256(snapshot.read_bytes()).hexdigest(),
        "pdfSha256": hashlib.sha256(paths.pdf.read_bytes()).hexdigest(),
        "sourceIndexSha256": hashlib.sha256(paths.index.read_bytes()).hexdigest(),
        "unnumberedVisualsSha256": hashlib.sha256(paths.visuals.read_bytes()).hexdigest(),
        "baseDecisionsSha256": hashlib.sha256(paths.decisions.read_bytes()).hexdigest(),
        "baseLedgerSha256": hashlib.sha256(paths.ledger.read_bytes()).hexdigest(),
        "editorialPolicySha256": hashlib.sha256(paths.policy.read_bytes()).hexdigest(),
        "analysisSha256": hashlib.sha256(paths.analysis.read_bytes()).hexdigest(),
        "courseOutlineSha256": hashlib.sha256(paths.course_outline.read_bytes()).hexdigest(),
    })
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items() if key != "freezeSha256"
    })
    _write_fixture_json(paths.freeze, freeze)
    _write_fixture_json(paths.manifest, _manifest_for_workspace(paths, freeze))
    return paths
```

Expected: all immutable files, hashes, project-relative paths, and the freeze
self-hash are materialized; `_manifest_for_workspace` is the next helper.

- [ ] **S1.F52 — Add only `_manifest_for_workspace`.**

```python
def _manifest_for_workspace(paths, freeze):
    return {
        "schemaVersion": 1,
        "batchId": freeze["batchId"],
        "mode": freeze["mode"],
        "pages": freeze["pages"],
        "sourceIds": freeze["sourceIds"],
        "pageImages": freeze["pageImages"],
        "pageBundles": freeze["pageBundles"],
        "policySnapshotPath": freeze["policySnapshotPath"],
        "policySnapshotSha256": freeze["policySnapshotSha256"],
        "pdfSha256": freeze["pdfSha256"],
        "sourceIndexSha256": freeze["sourceIndexSha256"],
        "unnumberedVisualsSha256": freeze["unnumberedVisualsSha256"],
        "decisionsSha256": freeze["baseDecisionsSha256"],
        "editorialPolicySha256": freeze["editorialPolicySha256"],
        "analysisSha256": freeze["analysisSha256"],
        "courseOutlineSha256": freeze["courseOutlineSha256"],
    }
```

Expected: the manifest uses the exact Task 4/5 field names and contains no
absolute path.

- [ ] **S1.F53 — Add only `discovery_cli_workspace`.**

```python
@contextmanager
def discovery_cli_workspace():
    with tempfile.TemporaryDirectory(
        dir=Path.cwd(), prefix=".source-audit-discovery-",
    ) as directory:
        root = Path(directory)
        index = sample_index(page_count=20)
        decisions = sample_decisions(index=index)
        target = next(
            row for row in decisions if row["sourceId"] == "page-019"
        )
        target.update({
            "disposition": "unreviewed",
            "lessonIds": [],
            "reviewState": "unreviewed",
            "riskFlags": [],
            "visualReviewState": "unreviewed",
            "visualReviewer": "",
        })
        paths = SimpleNamespace(
            patch=root / "patch.json",
            index=root / "index.json",
            visuals=root / "visuals.json",
            decisions=root / "decisions.json",
            ledger=root / "ledger.json",
            policy=root / "policy.json",
        )
        _write_fixture_json(paths.patch, {
            "pdfPage": 19, "attempt": 1, "reviewer": "visual-scanner-a",
            "numberedVisualIds": [], "visuals": [], "symbolReview": [],
        })
        for path, value in (
            (paths.index, index), (paths.visuals, []),
            (paths.decisions, decisions),
            (paths.ledger, sample_ledger(decisions=decisions)),
            (paths.policy, sample_policy()),
        ):
            _write_fixture_json(path, value)
        paths.args = SimpleNamespace(
            patch=paths.patch, index=paths.index, visuals=paths.visuals,
            decisions=paths.decisions, ledger=paths.ledger,
            policy=paths.policy,
        )
        yield paths
```

Expected: the yielded command arguments name six distinct files, page 19 is
unreviewed, and all files are removed after the test.

- [ ] **S1.B02 — Bootstrap only `tests/source_audit/test_catalog.py`.**

```python
import copy
import json
import unittest
from pathlib import Path

from scripts.source_audit.catalog import (
    all_editorial_source_items,
    chapter_for_item,
    source_items_by_id,
    stable_visual_id,
    validate_unnumbered_visuals,
)
from scripts.source_audit.models import (
    AuditValidationError,
    all_source_items,
)
from tests.source_audit.editorial_fixtures import (
    sample_index,
    sample_page20_index,
    sample_policy,
    sample_visual,
)


class CatalogTests(unittest.TestCase):
    pass
```

Expected: the complete fixture module already exists; unittest imports this
module and discovers the one empty `CatalogTests` class.

- [ ] **S1.B03 — Add only the Task 1 import to `tests/source_audit/test_models.py`.**

```python
from tests.source_audit.editorial_fixtures import sample_page20_index
```

Expected: the fixture import now resolves; the existing `ModelTests` class and
all other imports remain unchanged.

#### Catalog behavior cycles

- [ ] **T1.1 — Write `CatalogTests.test_stable_visual_id_uses_page_and_append_only_ordinal`.**

```python
class CatalogTests(unittest.TestCase):
    def test_stable_visual_id_uses_page_and_append_only_ordinal(self):
        self.assertEqual(stable_visual_id(10, 1), "visual-p010-01")
        with self.assertRaisesRegex(AuditValidationError, "pdfPage"):
            stable_visual_id(0, 1)
        with self.assertRaisesRegex(AuditValidationError, "ordinal"):
            stable_visual_id(10, 0)
```

Expected: only `CatalogTests.test_stable_visual_id_uses_page_and_append_only_ordinal` is added in this action, and the shown Python block parses.

- [ ] **R1.1 — Run `CatalogTests.test_stable_visual_id_uses_page_and_append_only_ordinal` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_stable_visual_id_uses_page_and_append_only_ordinal -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `stable_visual_id` and proves that exact function or branch contract is not yet present.

- [ ] **I1.1 — Implement only `stable_visual_id`.**

```python
def stable_visual_id(pdf_page: int, ordinal: int) -> str:
    if type(pdf_page) is not int or pdf_page < 1:
        raise AuditValidationError(f"pdfPage must be a positive integer: {pdf_page!r}")
    if type(ordinal) is not int or ordinal < 1 or ordinal > 99:
        raise AuditValidationError(f"ordinal must be an integer from 1 to 99: {ordinal!r}")
    return f"visual-p{pdf_page:03d}-{ordinal:02d}"
```

Expected: only `stable_visual_id` is added or changed in this action, and the shown Python block parses.

- [ ] **G1.1 — Re-run `CatalogTests.test_stable_visual_id_uses_page_and_append_only_ordinal` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_stable_visual_id_uses_page_and_append_only_ordinal -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T1.2 — Write `CatalogTests.test_region_rejects_nonfinite_and_out_of_bounds`.**

```python
class CatalogTests(unittest.TestCase):
    def test_region_rejects_nonfinite_and_out_of_bounds(self):
        index = sample_index(page_count=20)
        for field, value, message in (
            ("x", True, "numeric"),
            ("x", float("nan"), "finite"),
            ("width", float("inf"), "finite"),
            ("x", -0.1, "negative"),
            ("width", 0, "positive"),
            ("width", 1.1, "page width"),
            ("height", 1.1, "page height"),
        ):
            with self.subTest(field=field, value=value):
                visual = sample_visual()
                visual["region"][field] = value
                with self.assertRaisesRegex(AuditValidationError, message):
                    validate_unnumbered_visuals(index, [visual])
```

Expected: only `CatalogTests.test_region_rejects_nonfinite_and_out_of_bounds` is added in this action, and the shown Python block parses.

- [ ] **R1.2 — Run `CatalogTests.test_region_rejects_nonfinite_and_out_of_bounds` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_region_rejects_nonfinite_and_out_of_bounds -v
```

Expected: output contains `Ran 1 test` and `ERROR`; the traceback names
`validate_unnumbered_visuals`, not an import or fixture failure.

- [ ] **I1.2 — Implement only `_validate_region`.**

```python
def _validate_region(source_id: str, region: object) -> None:
    if not isinstance(region, dict):
        raise AuditValidationError(f"region must be an object: {source_id}")
    if set(region) != {"x", "y", "width", "height"}:
        raise AuditValidationError(f"region fields mismatch: {source_id}")
    for field in ("x", "y", "width", "height"):
        value = region[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise AuditValidationError(
                f"region.{field} must be numeric: {source_id}"
            )
        if not math.isfinite(value):
            raise AuditValidationError(
                f"region.{field} must be finite: {source_id}"
            )
    if region["x"] < 0 or region["y"] < 0:
        raise AuditValidationError(f"region origin is negative: {source_id}")
    if region["width"] <= 0 or region["height"] <= 0:
        raise AuditValidationError(f"region size must be positive: {source_id}")
    if region["x"] + region["width"] > 1:
        raise AuditValidationError(f"region exceeds page width: {source_id}")
    if region["y"] + region["height"] > 1:
        raise AuditValidationError(f"region exceeds page height: {source_id}")
```

Expected: only `_validate_region` is added or changed in this action, and the shown Python block parses.

- [ ] **I1.2B — Replace only the staged region-validation branch of `validate_unnumbered_visuals`.**

```python
def validate_unnumbered_visuals(index, visuals):
    validate_index(index)
    if not isinstance(visuals, list):
        raise AuditValidationError("unnumbered visuals must be a list")
    for position, item in enumerate(visuals):
        if not isinstance(item, dict):
            raise AuditValidationError(
                f"visual at position {position} must be an object"
            )
        _validate_region(
            item.get("sourceId", f"position-{position}"),
            item.get("region"),
        )
```

Expected: only the initial stub is replaced; this staged version implements
the region branch required by T1.2 and intentionally leaves T1.3 field
validation red.

- [ ] **G1.2 — Re-run `CatalogTests.test_region_rejects_nonfinite_and_out_of_bounds` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_region_rejects_nonfinite_and_out_of_bounds -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T1.3 — Write `CatalogTests.test_visual_fields_and_discovery_evidence_are_exact`.**

```python
class CatalogTests(unittest.TestCase):
    def test_visual_fields_and_discovery_evidence_are_exact(self):
        index = sample_index(page_count=20)
        valid = sample_visual()
        validate_unnumbered_visuals(index, [valid])
        cases = []
        wrong_fields = copy.deepcopy(valid)
        wrong_fields["extra"] = "forbidden"
        cases.append((wrong_fields, "fields"))
        wrong_page = copy.deepcopy(valid)
        wrong_page["pdfPage"] = 999
        cases.append((wrong_page, "unknown pdfPage"))
        wrong_evidence = copy.deepcopy(valid)
        wrong_evidence["discoveryEvidence"] = "PDF 第20页"
        cases.append((wrong_evidence, "page/method"))
        wrong_id = copy.deepcopy(valid)
        wrong_id["sourceId"] = "visual-p019-01"
        cases.append((wrong_id, "ID/page"))
        for visual, message in cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(AuditValidationError, message):
                    validate_unnumbered_visuals(index, [visual])
```

Expected: only `CatalogTests.test_visual_fields_and_discovery_evidence_are_exact` is added in this action, and the shown Python block parses.

- [ ] **R1.3 — Run `CatalogTests.test_visual_fields_and_discovery_evidence_are_exact` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_visual_fields_and_discovery_evidence_are_exact -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_unnumbered_visuals` and proves that exact function or branch contract is not yet present.

- [ ] **I1.3A — Add only `_validated_visual_identity`.**

```python
def _validated_visual_identity(
    item,
    position,
    generated_ids,
    known_pages,
):
    if not isinstance(item, dict):
        raise AuditValidationError(
            f"visual at position {position} must be an object"
        )
    required = {
        "sourceId", "kind", "pdfPage", "region",
        "semanticBrief", "discoveryEvidence",
    }
    if set(item) != required:
        raise AuditValidationError(
            f"visual fields mismatch at position {position}"
        )
    source_id = item["sourceId"]
    if not isinstance(source_id, str) or not source_id.strip():
        raise AuditValidationError("visual sourceId must be non-blank")
    if source_id in generated_ids:
        raise AuditValidationError(
            f"visual ID collides with generated index: {source_id}"
        )
    if item["kind"] != "visual":
        raise AuditValidationError(f"invalid visual kind: {source_id}")
    pdf_page = item["pdfPage"]
    if type(pdf_page) is not int or pdf_page not in known_pages:
        raise AuditValidationError(
            f"visual references unknown pdfPage: {source_id}"
        )
    match = VISUAL_ID.fullmatch(source_id)
    if match is None or int(match.group(1)) != pdf_page:
        raise AuditValidationError(
            f"visual ID/page mismatch: {source_id}"
        )
    _validate_region(source_id, item["region"])
    brief = item["semanticBrief"]
    if not isinstance(brief, str) or not brief.strip():
        raise AuditValidationError(
            f"semanticBrief must be non-blank: {source_id}"
        )
    evidence = item["discoveryEvidence"]
    evidence_match = (
        DISCOVERY_EVIDENCE.fullmatch(evidence)
        if isinstance(evidence, str)
        else None
    )
    if (
        evidence_match is None
        or not evidence_match.group(1).strip()
        or int(evidence_match.group(2)) != pdf_page
    ):
        raise AuditValidationError(
            f"discoveryEvidence page/method mismatch: {source_id}"
        )
    return source_id, pdf_page, int(match.group(2))
```

Expected: only `_validated_visual_identity` is added and the block parses.

- [ ] **I1.3B — Replace only `validate_unnumbered_visuals`.**

```python
def validate_unnumbered_visuals(index: dict, visuals: list[dict]) -> None:
    validate_index(index)
    if not isinstance(visuals, list):
        raise AuditValidationError("unnumbered visuals must be a list")
    generated_ids = {
        item["sourceId"] for item in all_source_items(index)
    }
    known_pages = {item["pdfPage"] for item in index["pages"]}
    seen_ids = set()
    ordinals_by_page = {}
    for position, item in enumerate(visuals):
        source_id, pdf_page, ordinal = _validated_visual_identity(
            item, position, generated_ids, known_pages,
        )
        if source_id in seen_ids:
            raise AuditValidationError(f"duplicate visual ID: {source_id}")
        seen_ids.add(source_id)
        ordinals_by_page.setdefault(pdf_page, []).append(ordinal)
    for pdf_page, ordinals in ordinals_by_page.items():
        expected = list(range(1, len(ordinals) + 1))
        if sorted(ordinals) != expected:
            raise AuditValidationError(
                f"visual ordinals must be contiguous on page {pdf_page}"
            )
    if [item["sourceId"] for item in visuals] != sorted(seen_ids):
        raise AuditValidationError(
            "unnumbered visuals must use sourceId order"
        )
```

Expected: only the staged `validate_unnumbered_visuals` definition is
replaced; identity and field validation delegates to I1.3A.

- [ ] **G1.3 — Re-run `CatalogTests.test_visual_fields_and_discovery_evidence_are_exact` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_visual_fields_and_discovery_evidence_are_exact -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T1.4 — Write `CatalogTests.test_chapter_for_item_uses_page_chapter_for_visual`.**

```python
class CatalogTests(unittest.TestCase):
    def test_chapter_for_item_uses_page_chapter_for_visual(self):
        index = sample_index(page_count=20)
        visual = sample_visual()
        self.assertEqual(chapter_for_item(index, visual), 1)
        explicit = {**visual, "chapter": 8}
        self.assertEqual(chapter_for_item(index, explicit), 8)
```

Expected: only `CatalogTests.test_chapter_for_item_uses_page_chapter_for_visual` is added in this action, and the shown Python block parses.

- [ ] **R1.4 — Run `CatalogTests.test_chapter_for_item_uses_page_chapter_for_visual` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_chapter_for_item_uses_page_chapter_for_visual -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `chapter_for_item` and proves that exact function or branch contract is not yet present.

- [ ] **I1.4 — Implement only `chapter_for_item`.**

```python
def chapter_for_item(index: dict, item: dict) -> int | None:
    if item.get("chapter") is not None:
        return item["chapter"]
    page_chapters = {
        page["pdfPage"]: page.get("chapter")
        for page in index["pages"]
    }
    return page_chapters[item["pdfPage"]]
```

Expected: only `chapter_for_item` is added or changed in this action, and the shown Python block parses.

- [ ] **G1.4 — Re-run `CatalogTests.test_chapter_for_item_uses_page_chapter_for_visual` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_chapter_for_item_uses_page_chapter_for_visual -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T1.5 — Write `CatalogTests.test_complete_source_universe_adds_visuals_without_mutating_index`.**

```python
class CatalogTests(unittest.TestCase):
    def test_complete_source_universe_adds_visuals_without_mutating_index(self):
        index = sample_index()
        before = copy.deepcopy(index)
        items = all_editorial_source_items(index, [sample_visual()])
        self.assertEqual(len(items), len(all_source_items(index)) + 1)
        self.assertEqual(index, before)
```

Expected: only `CatalogTests.test_complete_source_universe_adds_visuals_without_mutating_index` is added in this action, and the shown Python block parses.

- [ ] **R1.5 — Run `CatalogTests.test_complete_source_universe_adds_visuals_without_mutating_index` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_complete_source_universe_adds_visuals_without_mutating_index -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `all_editorial_source_items` and proves that exact function or branch contract is not yet present.

- [ ] **I1.5 — Implement only `all_editorial_source_items`.**

```python
def all_editorial_source_items(index: dict, visuals: list[dict]) -> list[dict]:
    validate_index(index)
    validate_unnumbered_visuals(index, visuals)
    expanded = [
        {**item, "chapter": chapter_for_item(index, item)}
        for item in [*all_source_items(index), *visuals]
    ]
    return sorted(
        expanded,
        key=lambda item: item["sourceId"],
    )
```

Expected: only `all_editorial_source_items` is added or changed in this action, and the shown Python block parses.

- [ ] **G1.5 — Re-run `CatalogTests.test_complete_source_universe_adds_visuals_without_mutating_index` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_complete_source_universe_adds_visuals_without_mutating_index -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T1.6 — Write `CatalogTests.test_source_items_by_id_returns_every_editorial_item`.**

```python
class CatalogTests(unittest.TestCase):
    def test_source_items_by_id_returns_every_editorial_item(self):
        index = sample_index(page_count=20)
        visual = sample_visual()
        by_id = source_items_by_id(index, [visual])
        self.assertEqual(set(by_id), {
            item["sourceId"]
            for item in all_editorial_source_items(index, [visual])
        })
        self.assertEqual(by_id[visual["sourceId"]]["kind"], "visual")
```

Expected: only `CatalogTests.test_source_items_by_id_returns_every_editorial_item` is added in this action, and the shown Python block parses.

- [ ] **R1.6 — Run `CatalogTests.test_source_items_by_id_returns_every_editorial_item` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_source_items_by_id_returns_every_editorial_item -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `source_items_by_id` and proves that exact function or branch contract is not yet present.

- [ ] **I1.6 — Implement only `source_items_by_id`.**

```python
def source_items_by_id(
    index: dict, visuals: list[dict]
) -> dict[str, dict]:
    return {
        item["sourceId"]: item
        for item in all_editorial_source_items(index, visuals)
    }
```

Expected: only `source_items_by_id` is added or changed in this action, and the shown Python block parses.

- [ ] **G1.6 — Re-run `CatalogTests.test_source_items_by_id_returns_every_editorial_item` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_source_items_by_id_returns_every_editorial_item -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T1.7 — Write `CatalogTests.test_policy_has_exact_conflicts_routes_and_calibration_pages`.**

```python
class CatalogTests(unittest.TestCase):
    def test_policy_has_exact_conflicts_routes_and_calibration_pages(self):
        policy = json.loads(
            Path("reference/source-audit/editorial-policy.json").read_text()
        )
        self.assertEqual(policy["schemaVersion"], 1)
        self.assertEqual(policy["excludedChapters"], [5, 7, 9])
        self.assertEqual(len(policy["captionConflictSourceIds"]), 21)
        self.assertEqual(policy["calibration"]["requiredPages"], [10, 20, 81, 239, 240, 279])
        self.assertEqual(policy["calibration"]["minimumSourceItems"], 30)
        self.assertEqual(policy["calibration"]["maximumSourceItems"], 40)
        self.assertEqual(
            policy["mustKeepRules"]["courseObjectives"]["expectedCount"],
            12,
        )
```

Expected: only `CatalogTests.test_policy_has_exact_conflicts_routes_and_calibration_pages` is added in this action, and the shown Python block parses.

- [ ] **R1.7 — Run `CatalogTests.test_policy_has_exact_conflicts_routes_and_calibration_pages` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_policy_has_exact_conflicts_routes_and_calibration_pages -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failure reports that `reference/source-audit/editorial-policy.json` is missing or does not satisfy the frozen policy contract.

- [ ] **S1.7a — Create the foundational `editorial-policy.json` object.**

```json
{
  "schemaVersion": 1,
  "lessonIds": ["0-1", "0-2", "1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "4-1", "4-2"],
  "excludedChapters": [5, 7, 9],
  "versionBoundaryReason": "[版本边界] 留待未来技术人员版",
  "chapterLessonCandidates": {
    "1": [{"lessonId": "0-1", "role": "primary"}, {"lessonId": "0-2", "role": "primary"}, {"lessonId": "3-2", "role": "primary"}],
    "2": [{"lessonId": "1-1", "role": "primary"}, {"lessonId": "1-2", "role": "primary"}, {"lessonId": "1-3", "role": "primary"}, {"lessonId": "2-3", "role": "secondary"}],
    "3": [{"lessonId": "2-1", "role": "primary"}, {"lessonId": "2-2", "role": "primary"}],
    "4": [{"lessonId": "1-3", "role": "primary"}, {"lessonId": "3-1", "role": "primary"}, {"lessonId": "3-2", "role": "primary"}],
    "5": [],
    "6": [{"lessonId": "4-1", "role": "primary"}],
    "7": [],
    "8": [{"lessonId": "2-3", "role": "primary"}],
    "9": [],
    "10": [{"lessonId": "4-2", "role": "primary"}]
  },
  "sectionLessonCandidates": {
    "1.2.6 护栏与安全性": [{"lessonId": "1-3", "role": "secondary"}],
    "3.1 用户记忆系统": [{"lessonId": "2-3", "role": "primary"}]
  },
  "analysisHeadingAnchors": {
    "highPriority": "五条最高优先级的作者论断（非共识型）",
    "highRisk": "🔴 高风险——容易被误引的表述",
    "mediumRisk": "🟡 中风险——容易被过度解读的结论"
  },
  "mustKeepRules": {},
  "captionConflictSourceIds": [
    "experiment-1-1", "experiment-2-7", "experiment-2-8",
    "experiment-4-4", "experiment-9-1", "experiment-10-4",
    "figure-1-4", "figure-2-6", "figure-3-5", "figure-4-9",
    "figure-8-2", "figure-8-3", "figure-8-4", "figure-10-3",
    "table-2-1", "table-7-3", "table-7-4", "table-8-2",
    "table-10-1", "table-10-2", "table-10-4"
  ],
  "calibration": {
    "requiredPages": [10, 20, 81, 239, 240, 279],
    "queueExternalCandidates": [32, 35, 52, 15, 26, 27],
    "minimumSourceItems": 30,
    "maximumSourceItems": 40
  }
}
```

Expected: the new file is valid JSON and freezes lesson routing, exclusions,
caption conflicts, and calibration limits before must-keep rules are added.

- [ ] **S1.7b — Add only the course-objective must-keep rule.**

```bash
python3 - <<'PY'
import json
from pathlib import Path

path = Path("reference/source-audit/editorial-policy.json")
policy = json.loads(path.read_text(encoding="utf-8"))
routing = {
    "0-1": {"primary": [{"chapter": 1}], "secondary": []},
    "0-2": {"primary": [{"chapter": 1}], "secondary": []},
    "1-1": {"primary": [{"chapter": 2}], "secondary": []},
    "1-2": {"primary": [{"chapter": 2}], "secondary": []},
    "1-3": {
        "primary": [{"chapter": 2}, {"chapter": 4}],
        "secondary": [{
            "chapter": 1,
            "sectionAnchor": "1.2.6 护栏与安全性",
        }],
    },
    "2-1": {"primary": [{"chapter": 3}], "secondary": []},
    "2-2": {"primary": [{"chapter": 3}], "secondary": []},
    "2-3": {
        "primary": [
            {"chapter": 3, "sectionAnchor": "3.1 用户记忆系统"},
            {"chapter": 8},
        ],
        "secondary": [{"chapter": 2}],
    },
    "3-1": {"primary": [{"chapter": 4}], "secondary": []},
    "3-2": {
        "primary": [{"chapter": 1}, {"chapter": 4}],
        "secondary": [],
    },
    "4-1": {"primary": [{"chapter": 6}], "secondary": []},
    "4-2": {"primary": [{"chapter": 10}], "secondary": []},
}
policy["mustKeepRules"]["courseObjectives"] = {
    "lessonIds": policy["lessonIds"],
    "sourceRoutingByLesson": routing,
    "fieldLabel": "核心内容",
    "expectedCount": 12,
}
path.write_text(
    json.dumps(policy, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
PY
```

Expected: `mustKeepRules.courseObjectives` contains all 12 exact lesson
routes, and the rewritten JSON remains deterministic and parseable.

- [ ] **S1.7c — Add only the five high-priority must-keep routes.**

```bash
python3 - <<'PY'
import json
from pathlib import Path

path = Path("reference/source-audit/editorial-policy.json")
policy = json.loads(path.read_text(encoding="utf-8"))
policy["mustKeepRules"]["highPriority"] = {
    "headingAnchor": "五条最高优先级的作者论断（非共识型）",
    "expectedCount": 5,
    "routing": {
        "analysis-high-priority-01": {"sourceChapters": [1], "lessonIds": ["0-1", "0-2", "3-2"], "versionStatus": "current"},
        "analysis-high-priority-02": {"sourceChapters": [2], "lessonIds": ["1-1", "1-2"], "versionStatus": "current"},
        "analysis-high-priority-03": {"sourceChapters": [7], "lessonIds": [], "versionStatus": "future"},
        "analysis-high-priority-04": {"sourceChapters": [7], "lessonIds": [], "versionStatus": "future"},
        "analysis-high-priority-05": {"sourceChapters": [10], "lessonIds": ["4-2"], "versionStatus": "current"},
    },
}
path.write_text(
    json.dumps(policy, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
PY
```

Expected: the five analysis claims have the exact current/future routes, and
the rewritten JSON remains deterministic and parseable.

- [ ] **S1.7d — Add only the eight high-risk must-keep routes.**

```bash
python3 - <<'PY'
import json
from pathlib import Path

path = Path("reference/source-audit/editorial-policy.json")
policy = json.loads(path.read_text(encoding="utf-8"))
policy["mustKeepRules"]["highRisk"] = {
    "headingAnchor": "🔴 高风险——容易被误引的表述",
    "expectedCount": 8,
    "routing": {
        "analysis-high-risk-01": {"sourceChapters": [10], "lessonIds": ["4-2"], "versionStatus": "current"},
        "analysis-high-risk-02": {"sourceChapters": [7], "lessonIds": [], "versionStatus": "future"},
        "analysis-high-risk-03": {"sourceChapters": [2], "lessonIds": ["1-1", "1-2"], "versionStatus": "current"},
        "analysis-high-risk-04": {"sourceChapters": [2], "lessonIds": ["1-1", "1-2"], "versionStatus": "current"},
        "analysis-high-risk-05": {"sourceChapters": [6], "lessonIds": ["4-1"], "versionStatus": "current"},
        "analysis-high-risk-06": {"sourceChapters": [10], "lessonIds": ["4-2"], "versionStatus": "current"},
        "analysis-high-risk-07": {"sourceChapters": [7], "lessonIds": [], "versionStatus": "future"},
        "analysis-high-risk-08": {"sourceChapters": [5], "lessonIds": [], "versionStatus": "future"},
    },
}
path.write_text(
    json.dumps(policy, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
PY
```

Expected: the eight red-table rows have their exact routes, and the completed
policy is deterministic JSON with the full 25-item must-keep contract.

- [ ] **G1.7 — Re-run `CatalogTests.test_policy_has_exact_conflicts_routes_and_calibration_pages` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog.CatalogTests.test_policy_has_exact_conflicts_routes_and_calibration_pages -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S1.R — Add the generated-index regression method without changing `models.ALL_KINDS`.**

```python
class ModelTests(unittest.TestCase):
    def test_generated_index_still_rejects_external_visual_kind(self):
        index = sample_page20_index()
        index["numberedItems"][0]["kind"] = "visual"
        with self.assertRaisesRegex(AuditValidationError, "kind"):
            validate_index(index)
```

This regression remains green only when the external `visual` kind stays scoped
to `catalog.EDITORIAL_KINDS`.

Expected: only this method is inserted into the existing `ModelTests` class;
`models.ALL_KINDS` is unchanged, and the fenced block parses.

- [ ] **F1 — Run the Task 1 focused gate.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_catalog tests.source_audit.test_models -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **A1 — Run the complete repository suite.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **C1 — Commit Task 1.**

```bash
git add reference/source-audit/editorial-policy.json scripts/source_audit/catalog.py tests/source_audit/editorial_fixtures.py tests/source_audit/test_catalog.py tests/source_audit/test_models.py
git commit -m "feat: add complete editorial source catalog"
```

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 2: Complete editorial decision contract

**Files:**
- Create: `scripts/source_audit/decisions.py`
- Create: `scripts/source_audit/must_keep.py`
- Create: `tests/source_audit/test_decisions.py`
- Create: `tests/source_audit/test_must_keep.py`
- Modify: `scripts/source_audit/build_reports.py`
- Modify: `tests/source_audit/test_build_reports.py`

**Interfaces:**
- Consumes: complete source universe, current decisions, editorial policy.
- Produces:
  - `initial_editorial_decision(item: dict) -> dict`
  - `upgrade_editorial_decisions(index: dict, visuals: list[dict], decisions: list[dict]) -> list[dict]`
  - `validate_editorial_record(item: dict, decision: dict, policy: dict) -> None`
  - `validate_editorial_decisions(index: dict, visuals: list[dict], decisions: list[dict], policy: dict, require_complete: bool = False) -> None`
  - `derived_risk_flags(item: dict, decision: dict, policy: dict) -> set[str]`
  - `build_must_keep_inventory(policy: dict, analysis_sections: list[dict], outline_sections: list[dict]) -> list[dict]`
  - `validate_must_keep_coverage(inventory: list[dict], decisions: list[dict], source_map: dict[str, dict], source_outline: list[dict], policy: dict, require_complete: bool = False) -> None`

- [ ] **S2.B01 — Bootstrap only `scripts/source_audit/decisions.py`.**

```python
from __future__ import annotations

import copy
import re
from copy import deepcopy
from pathlib import PurePosixPath

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.models import AuditValidationError


DISPOSITIONS = {"included", "compressed", "excluded", "missing", "unreviewed"}
VISUAL_KINDS = {"figure", "table", "visual"}
MANUAL_RISK_FLAGS = {
    "critical-number", "experiment-conclusion", "scope-boundary",
}
SYMBOL_KEYS = {"✓": "check", "✗": "cross", "△": "triangle", "★": "star"}
REFERENCE_ONLY_VISUAL_TEXT = re.compile(
    r"(?:请)?(?:(?:见|参见|参考)(?:原图|上图|图[0-9A-Za-z._-]+)|同原图)[。.]?"
)
MARKDOWN_LINES = re.compile(r"[^:]+:[1-9][0-9]*(?:-[1-9][0-9]*)?")
APPROVED_CAPTION_CONFLICT_SOURCE_IDS = (
    "experiment-1-1", "experiment-2-7", "experiment-2-8",
    "experiment-4-4", "experiment-9-1", "experiment-10-4",
    "figure-1-4", "figure-2-6", "figure-3-5", "figure-4-9",
    "figure-8-2", "figure-8-3", "figure-8-4", "figure-10-3",
    "table-2-1", "table-7-3", "table-7-4", "table-8-2",
    "table-10-1", "table-10-2", "table-10-4",
)
BASE_RECORD_FIELDS = {
    "sourceId", "disposition", "reason", "lessonIds", "markdownRefs",
    "visualClass", "visualHandling", "reviewState", "riskFlags",
    "mustKeepIds", "symbolTextAlternatives",
}


def _pending(name):
    raise NotImplementedError(name)


def initial_editorial_decision(item): return _pending("initial_editorial_decision")
def upgrade_editorial_decisions(index, visuals, decisions): return _pending("upgrade_editorial_decisions")
def validate_editorial_record(item, decision, policy): _pending("validate_editorial_record")
def validate_editorial_decisions(index, visuals, decisions, policy, require_complete=False): _pending("validate_editorial_decisions")
def derived_risk_flags(item, decision, policy): return _pending("derived_risk_flags")
def _is_reference_only_visual_text(value): return _pending("_is_reference_only_visual_text")
def _known_must_keep_ids(policy): return _pending("_known_must_keep_ids")
def _validate_course_placement(item, decision, policy): _pending("_validate_course_placement")
def _validate_frozen_conflict_policy(policy): _pending("_validate_frozen_conflict_policy")
def _validate_markdown_refs(decision): _pending("_validate_markdown_refs")
def _validate_page_scan(item, decision, source_map, decisions_by_id, require_complete=False): _pending("_validate_page_scan")
def _validate_risk_flags(item, decision, policy): _pending("_validate_risk_flags")
def _validate_symbol_review(page, decision, source_map, decisions_by_id, require_complete=False): _pending("_validate_symbol_review")
def _validate_symbol_text_alternatives(item, decision): _pending("_validate_symbol_text_alternatives")
def _validate_version_boundary(item, decision, policy): _pending("_validate_version_boundary")
```

Expected: this module imports with all shared constants and public API stubs.
No test imports a missing symbol; later implementation blocks replace the
matching stub and never add a second definition.

- [ ] **S2.B02 — Bootstrap only `scripts/source_audit/must_keep.py`.**

```python
from __future__ import annotations

import re
from copy import deepcopy

from scripts.source_audit.models import AuditValidationError


SOURCE_REF = re.compile(r"([^:]+):([1-9][0-9]*)(?:-([1-9][0-9]*))?")
CORE_CONTENT = re.compile(r"^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|$")
NUMBERED_ITEM = re.compile(r"^\s*[0-9]+[.)、]\s*(.+)$")


def _pending(name):
    raise NotImplementedError(name)


def build_must_keep_inventory(policy, analysis_sections, outline_sections):
    return _pending("build_must_keep_inventory")


def validate_must_keep_coverage(
    inventory,
    decisions,
    source_map,
    source_outline,
    policy,
    require_complete=False,
):
    _pending("validate_must_keep_coverage")
```

Expected: this new module imports successfully and both unfinished public APIs
name themselves.

- [ ] **S2.B03 — Bootstrap only `tests/source_audit/test_decisions.py`.**

```python
import copy
import unittest

from scripts.source_audit.decisions import (
    _is_reference_only_visual_text,
    _known_must_keep_ids,
    _validate_course_placement,
    _validate_frozen_conflict_policy,
    _validate_markdown_refs,
    _validate_page_scan,
    _validate_risk_flags,
    _validate_symbol_review,
    _validate_symbol_text_alternatives,
    _validate_version_boundary,
    derived_risk_flags,
    initial_editorial_decision,
    upgrade_editorial_decisions,
    validate_editorial_decisions,
    validate_editorial_record,
)
from scripts.source_audit.models import AuditValidationError, all_source_items
from tests.source_audit.editorial_fixtures import (
    reviewed_visual_fixture,
    sample_decisions,
    sample_index,
    sample_page20_index,
    sample_page_and_experiment_decisions,
    sample_page_decision,
    sample_policy,
    sample_reviewed_decision,
    sample_visual,
)


class DecisionContractTests(unittest.TestCase): pass
class DecisionVisualTextTests(unittest.TestCase): pass
```

Expected: the module imports and contains exactly these two test classes; later
T2 blocks insert methods into them.

- [ ] **S2.B04 — Bootstrap only `tests/source_audit/test_must_keep.py`.**

```python
import unittest

from scripts.source_audit.must_keep import (
    build_must_keep_inventory,
    validate_must_keep_coverage,
)
from scripts.source_audit.models import AuditValidationError
from tests.source_audit.editorial_fixtures import (
    claimed_must_keep_fixture,
    course_route_claim_fixture,
    sample_analysis_sections,
    sample_index,
    sample_must_keep_inventory,
    sample_outline_sections,
    sample_policy,
    sample_source_map,
)


class MustKeepTests(unittest.TestCase):
    pass
```

Expected: the module imports and contains one `MustKeepTests` class; later T2
blocks insert methods into it.

- [ ] **S2.B05 — Add only the Task 2 production import to `scripts/source_audit/build_reports.py`.**

```python
from scripts.source_audit.decisions import initial_editorial_decision
```

Expected: this import is added to the existing import section without removing
any existing build-report import or constant.

- [ ] **S2.B06 — Add only the Task 2 imports to `tests/source_audit/test_build_reports.py`.**

```python
from scripts.source_audit.decisions import initial_editorial_decision
from tests.source_audit.editorial_fixtures import sample_page20_index
```

Expected: both imports resolve, the existing `BuildReportsTests` class remains
unique and unchanged, and later T2.20 inserts one method into it.

#### Decision-rule behavior cycles

- [ ] **T2.1 — Write `DecisionContractTests.test_initial_page_and_visual_shapes`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_initial_page_and_visual_shapes(self):
        page = initial_editorial_decision({"sourceId": "page-010", "kind": "page"})
        self.assertEqual(page["riskFlags"], [])
        self.assertEqual(page["mustKeepIds"], [])
        self.assertEqual(page["symbolTextAlternatives"], [])
        self.assertEqual(page["visualReviewState"], "unreviewed")
        self.assertEqual(page["visualReviewer"], "")
        self.assertEqual(page["discoveredVisualIds"], [])
        self.assertEqual(page["symbolReview"], [])

        visual = initial_editorial_decision({
            "sourceId": "visual-p010-01", "kind": "visual"
        })
        self.assertEqual(visual["visualTextAlternative"], "")
        self.assertEqual(visual["visualHandlingNote"], "")
        self.assertIsNone(visual["visualClass"])
        self.assertIsNone(visual["visualHandling"])
```

Expected: only `DecisionContractTests.test_initial_page_and_visual_shapes` is added in this action, and the shown Python block parses.

- [ ] **R2.1 — Run `DecisionContractTests.test_initial_page_and_visual_shapes` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_initial_page_and_visual_shapes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `initial_editorial_decision` and proves that exact function or branch contract is not yet present.

- [ ] **I2.1 — Implement only `initial_editorial_decision`.**

```python
def initial_editorial_decision(item: dict) -> dict:
    value = {
        "sourceId": item["sourceId"],
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
    }
    if item["kind"] in VISUAL_KINDS:
        value["visualTextAlternative"] = ""
        value["visualHandlingNote"] = ""
    if item["kind"] == "page":
        value.update({
            "visualReviewState": "unreviewed",
            "visualReviewer": "",
            "discoveredVisualIds": [],
            "symbolReview": [],
        })
    if item["sourceId"] in APPROVED_CAPTION_CONFLICT_SOURCE_IDS:
        value.update({
            "captionConflictResolved": False,
            "captionConflictNote": "",
        })
    return value
```

Expected: only `initial_editorial_decision` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.1 — Re-run `DecisionContractTests.test_initial_page_and_visual_shapes` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_initial_page_and_visual_shapes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.2 — Write `DecisionVisualTextTests.test_visual_text_rejects_reference_only_placeholders`.**

```python
class DecisionVisualTextTests(unittest.TestCase):
    def test_visual_text_rejects_reference_only_placeholders(self):
        for value in (
            "见原图", "见图8-2", "参见上图", "请参考原图", "同原图",
        ):
            with self.subTest(value=value):
                self.assertTrue(_is_reference_only_visual_text(value))
        self.assertFalse(
            _is_reference_only_visual_text(
                "图8-2展示评价、学习和更新之间的闭环关系"
            )
        )
```

Expected: only `DecisionVisualTextTests.test_visual_text_rejects_reference_only_placeholders` is added in this action, and the shown Python block parses.

- [ ] **R2.2 — Run `DecisionVisualTextTests.test_visual_text_rejects_reference_only_placeholders` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionVisualTextTests.test_visual_text_rejects_reference_only_placeholders -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_is_reference_only_visual_text` and proves that exact function or branch contract is not yet present.

- [ ] **I2.2 — Implement only `_is_reference_only_visual_text`.**

```python
def _is_reference_only_visual_text(value: str) -> bool:
    compact = re.sub(r"\s+", "", value)
    return REFERENCE_ONLY_VISUAL_TEXT.fullmatch(compact) is not None
```

Expected: only `_is_reference_only_visual_text` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.2 — Re-run `DecisionVisualTextTests.test_visual_text_rejects_reference_only_placeholders` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionVisualTextTests.test_visual_text_rejects_reference_only_placeholders -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.3 — Write `DecisionContractTests.test_markdown_refs_are_project_relative_with_positive_lines`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_markdown_refs_are_project_relative_with_positive_lines(self):
        decision = sample_reviewed_decision()
        for value in (
            "/absolute/file.md:1",
            "../outside.md:1",
            "reference/file.md:0",
        ):
            invalid = copy.deepcopy(decision)
            invalid["markdownRefs"] = [value]
            with self.subTest(value=value):
                with self.assertRaisesRegex(AuditValidationError, "markdownRef"):
                    _validate_markdown_refs(invalid)
```

Expected: only `DecisionContractTests.test_markdown_refs_are_project_relative_with_positive_lines` is added in this action, and the shown Python block parses.

- [ ] **R2.3 — Run `DecisionContractTests.test_markdown_refs_are_project_relative_with_positive_lines` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_markdown_refs_are_project_relative_with_positive_lines -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_markdown_refs` and proves that exact function or branch contract is not yet present.

- [ ] **I2.3 — Implement only `_validate_markdown_refs`.**

```python
def _validate_markdown_refs(decision):
    for value in decision["markdownRefs"]:
        if ":" not in value or "\\" in value:
            raise AuditValidationError("invalid markdownRef")
        path_text, lines = value.rsplit(":", 1)
        path = PurePosixPath(path_text)
        if (
            path.is_absolute()
            or ".." in path.parts
            or path.suffix != ".md"
            or MARKDOWN_LINES.fullmatch(lines) is None
        ):
            raise AuditValidationError(
                f"invalid markdownRef: {value}"
            )
```

Expected: only `_validate_markdown_refs` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.3 — Re-run `DecisionContractTests.test_markdown_refs_are_project_relative_with_positive_lines` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_markdown_refs_are_project_relative_with_positive_lines -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.4 — Write `DecisionContractTests.test_course_placement_matrix`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_course_placement_matrix(self):
        cases = [
            ("included", [], "requires at least one lessonId"),
            ("compressed", ["9-9"], "invalid lessonId"),
            ("missing", [], "requires at least one lessonId"),
            ("excluded", ["1-1"], "requires empty lessonIds"),
        ]
        for disposition, lesson_ids, message in cases:
            with self.subTest(disposition=disposition):
                with self.assertRaisesRegex(AuditValidationError, message):
                    validate_editorial_decisions(
                        sample_page20_index(), [], [sample_reviewed_decision(
                            disposition=disposition, lessonIds=lesson_ids
                        )], sample_policy()
                    )
```

Expected: only `DecisionContractTests.test_course_placement_matrix` is added in this action, and the shown Python block parses.

- [ ] **R2.4 — Run `DecisionContractTests.test_course_placement_matrix` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_course_placement_matrix -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_course_placement` and proves that exact function or branch contract is not yet present.

- [ ] **I2.4 — Implement only `_validate_course_placement`.**

```python
def _validate_course_placement(item, decision, policy):
    disposition = decision["disposition"]
    lesson_ids = decision["lessonIds"]
    invalid = sorted(set(lesson_ids) - set(policy["lessonIds"]))
    if invalid:
        raise AuditValidationError(f"invalid lessonId: {invalid[0]}")
    if disposition in {"included", "compressed", "missing"} and not lesson_ids:
        raise AuditValidationError(
            f"{disposition} requires at least one lessonId: {item['sourceId']}"
        )
    if disposition == "excluded" and lesson_ids:
        raise AuditValidationError(
            f"excluded requires empty lessonIds: {item['sourceId']}"
        )
```

Expected: only `_validate_course_placement` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.4 — Re-run `DecisionContractTests.test_course_placement_matrix` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_course_placement_matrix -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.5 — Write `DecisionContractTests.test_version_boundary_requires_future_for_excluded_chapters`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_version_boundary_requires_future_for_excluded_chapters(self):
        policy = sample_policy()
        item = {"sourceId": "figure-5-1", "kind": "figure", "chapter": 5, "pdfPage": 120}
        decision = sample_reviewed_decision(sourceId=item["sourceId"])
        with self.assertRaisesRegex(AuditValidationError, "version"):
            _validate_version_boundary(item, decision, policy)
        decision.update({
            "disposition": "excluded",
            "lessonIds": [],
            "reason": policy["versionBoundaryReason"],
        })
        _validate_version_boundary(item, decision, policy)
```

Expected: the test uses the formal decision fields: future-version content is
represented by excluded disposition, empty lesson placement, and the frozen
version-boundary reason.

- [ ] **R2.5 — Run `DecisionContractTests.test_version_boundary_requires_future_for_excluded_chapters` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_version_boundary_requires_future_for_excluded_chapters -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_version_boundary` and proves that exact function or branch contract is not yet present.

- [ ] **I2.5 — Implement only `_validate_version_boundary`.**

```python
def _validate_version_boundary(item, decision, policy):
    if decision["reviewState"] != "reviewed":
        return
    if item.get("chapter") not in set(policy["excludedChapters"]):
        return
    expected = policy["versionBoundaryReason"]
    if (
        decision["disposition"] != "excluded"
        or decision["lessonIds"]
        or decision["reason"] != expected
    ):
        raise AuditValidationError(
            f"version boundary mismatch: {item['sourceId']}"
        )
```

Expected: only `_validate_version_boundary` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.5 — Re-run `DecisionContractTests.test_version_boundary_requires_future_for_excluded_chapters` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_version_boundary_requires_future_for_excluded_chapters -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.6 — Write `DecisionContractTests.test_reviewed_visual_kinds_reject_null_class_or_handling`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_reviewed_visual_kinds_reject_null_class_or_handling(self):
        for kind in ("figure", "table", "visual"):
            for field in ("visualClass", "visualHandling"):
                with self.subTest(kind=kind, field=field):
                    index, visuals, decisions = reviewed_visual_fixture(kind)
                    decisions[0][field] = None
                    with self.assertRaisesRegex(
                        AuditValidationError, field
                    ):
                        validate_editorial_decisions(
                            index, visuals, decisions, sample_policy()
                        )
```

Expected: only `DecisionContractTests.test_reviewed_visual_kinds_reject_null_class_or_handling` is added in this action, and the shown Python block parses.

- [ ] **R2.6 — Run `DecisionContractTests.test_reviewed_visual_kinds_reject_null_class_or_handling` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_reviewed_visual_kinds_reject_null_class_or_handling -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_visual_decision` and proves that exact function or branch contract is not yet present.

- [ ] **I2.6 — Implement only `_validate_visual_decision`.**

```python
def _validate_visual_decision(item, decision):
    if item["kind"] not in VISUAL_KINDS:
        return
    if decision["reviewState"] != "reviewed":
        return
    visual_class = decision["visualClass"]
    handling = decision["visualHandling"]
    text = decision["visualTextAlternative"]
    handling_note = decision["visualHandlingNote"]
    if visual_class not in {"semantic-core", "evidence", "decorative"}:
        raise AuditValidationError(
            f"reviewed visual requires visualClass: {item['sourceId']}"
        )
    if handling not in {"redraw", "text-alt", "reuse", "omit"}:
        raise AuditValidationError(
            f"reviewed visual requires visualHandling: {item['sourceId']}"
        )
    if visual_class in {"semantic-core", "evidence"} and (
        not text.strip()
        or _is_reference_only_visual_text(text)
    ):
        raise AuditValidationError(
            f"visualTextAlternative is required: {item['sourceId']}"
        )
    if visual_class == "semantic-core" and handling not in {"redraw", "reuse"}:
        raise AuditValidationError(
            f"semantic-core handling mismatch: {item['sourceId']}"
        )
    if visual_class == "evidence" and handling not in {"text-alt", "reuse"}:
        raise AuditValidationError(
            f"evidence handling mismatch: {item['sourceId']}"
        )
    if visual_class == "decorative" and (
        handling != "omit"
        or decision["disposition"] != "excluded"
        or text != ""
        or not handling_note.startswith("[装饰说明]")
        or not handling_note[len("[装饰说明]"):].strip()
    ):
        raise AuditValidationError(
            f"decorative visual contract mismatch: {item['sourceId']}"
        )
    if handling == "reuse":
        prefix = "[复用依据]"
        if (
            not handling_note.startswith(prefix)
            or not handling_note[len(prefix):].strip()
        ):
            raise AuditValidationError(
                f"reuse requires visualHandlingNote [复用依据]: {item['sourceId']}"
            )
```

Expected: only `_validate_visual_decision` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.6 — Re-run `DecisionContractTests.test_reviewed_visual_kinds_reject_null_class_or_handling` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_reviewed_visual_kinds_reject_null_class_or_handling -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.7 — Write `DecisionContractTests.test_derived_risk_flags_include_frozen_conflict_and_visual`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_derived_risk_flags_include_frozen_conflict_and_visual(self):
        policy = sample_policy()
        item = {
            "sourceId": policy["captionConflictSourceIds"][0],
            "kind": "figure",
            "chapter": 1,
            "pdfPage": 10,
            "captionConflict": True,
        }
        decision = sample_reviewed_decision(sourceId=item["sourceId"])
        self.assertIn("caption-conflict", derived_risk_flags(item, decision, policy))
```

Expected: only `DecisionContractTests.test_derived_risk_flags_include_frozen_conflict_and_visual` is added in this action, and the shown Python block parses.

- [ ] **R2.7 — Run `DecisionContractTests.test_derived_risk_flags_include_frozen_conflict_and_visual` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_derived_risk_flags_include_frozen_conflict_and_visual -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `derived_risk_flags` and proves that exact function or branch contract is not yet present.

- [ ] **I2.7 — Implement only `derived_risk_flags`.**

```python
def derived_risk_flags(item, decision, policy):
    flags = set()
    if item["sourceId"] in set(policy["captionConflictSourceIds"]):
        flags.add("caption-conflict")
    if decision["disposition"] == "missing":
        flags.add("missing")
    if item["kind"] in VISUAL_KINDS:
        flags.add("visual")
    if "1-1" in decision["lessonIds"]:
        flags.add("lesson-1-1")
    if any(
        value.startswith("analysis-high-risk-")
        for value in decision["mustKeepIds"]
    ):
        flags.add("analysis-high-risk")
    return flags
```

Expected: only `derived_risk_flags` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.7 — Re-run `DecisionContractTests.test_derived_risk_flags_include_frozen_conflict_and_visual` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_derived_risk_flags_include_frozen_conflict_and_visual -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.8 — Write `DecisionContractTests.test_risk_flags_must_equal_the_derived_set`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_risk_flags_must_equal_the_derived_set(self):
        policy = sample_policy()
        item = {"sourceId": "page-020", "kind": "page", "chapter": 1, "pdfPage": 20}
        decision = sample_page_decision(sourceId=item["sourceId"])
        decision["riskFlags"] = ["invented-risk"]
        with self.assertRaisesRegex(AuditValidationError, "risk"):
            _validate_risk_flags(item, decision, policy)
```

Expected: only `DecisionContractTests.test_risk_flags_must_equal_the_derived_set` is added in this action, and the shown Python block parses.

- [ ] **R2.8 — Run `DecisionContractTests.test_risk_flags_must_equal_the_derived_set` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_risk_flags_must_equal_the_derived_set -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_risk_flags` and proves that exact function or branch contract is not yet present.

- [ ] **I2.8 — Implement only `_validate_risk_flags`.**

```python
def _validate_risk_flags(item, decision, policy):
    if decision["reviewState"] != "reviewed":
        return
    actual = set(decision["riskFlags"])
    manual = actual & MANUAL_RISK_FLAGS
    expected = derived_risk_flags(item, decision, policy) | manual
    if actual != expected:
        raise AuditValidationError(f"riskFlags mismatch: {item['sourceId']}")
```

Expected: only `_validate_risk_flags` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.8 — Re-run `DecisionContractTests.test_risk_flags_must_equal_the_derived_set` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_risk_flags_must_equal_the_derived_set -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.9 — Write `DecisionContractTests.test_single_record_rejects_invalid_enum_and_course_placement`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_single_record_rejects_invalid_enum_and_course_placement(self):
        policy = sample_policy()
        index = sample_page20_index()
        item = next(item for item in all_source_items(index) if item["sourceId"] == "experiment-1-1")
        decision = next(
            row for row in sample_decisions(index=index)
            if row["sourceId"] == item["sourceId"]
        )
        invalid = copy.deepcopy(decision)
        invalid["disposition"] = "invented"
        with self.assertRaisesRegex(AuditValidationError, "disposition"):
            validate_editorial_record(item, invalid, policy)
```

Expected: only `DecisionContractTests.test_single_record_rejects_invalid_enum_and_course_placement` is added in this action, and the shown Python block parses.

- [ ] **R2.9 — Run `DecisionContractTests.test_single_record_rejects_invalid_enum_and_course_placement` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_single_record_rejects_invalid_enum_and_course_placement -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_editorial_record` and proves that exact function or branch contract is not yet present.

- [ ] **I2.9a — Add only helper `_record_fields_for`.**

```python
def _record_fields_for(item, policy):
    expected_fields = set(BASE_RECORD_FIELDS)
    if item["kind"] in VISUAL_KINDS:
        expected_fields.update({
            "visualTextAlternative", "visualHandlingNote",
        })
    if item["kind"] == "page":
        expected_fields.update({
            "visualReviewState", "visualReviewer",
            "discoveredVisualIds", "symbolReview",
        })
    if item["sourceId"] in set(policy["captionConflictSourceIds"]):
        expected_fields.update({
            "captionConflictResolved", "captionConflictNote",
        })
    return expected_fields
```

Expected: the helper returns the exact kind- and conflict-sensitive field set;
its fenced block parses.

- [ ] **I2.9b — Add only helper `_validate_record_shape`.**

```python
def _validate_record_shape(item, decision, policy):
    expected_fields = _record_fields_for(item, policy)
    if set(decision) != expected_fields:
        raise AuditValidationError(
            f"decision fields mismatch: {item['sourceId']}"
        )
    if decision["sourceId"] != item["sourceId"]:
        raise AuditValidationError("decision sourceId mismatch")
    if decision["disposition"] not in DISPOSITIONS:
        raise AuditValidationError(
            f"invalid disposition: {decision['disposition']}"
        )
    if decision["reviewState"] not in {"reviewed", "unreviewed"}:
        raise AuditValidationError(
            f"invalid reviewState: {decision['reviewState']}"
        )
    if (
        decision["reviewState"] == "reviewed"
        and decision["disposition"] == "unreviewed"
    ):
        raise AuditValidationError(
            "reviewed record requires final disposition"
        )
    if not isinstance(decision["reason"], str):
        raise AuditValidationError("reason must be a string")
```

Expected: the helper validates exact fields, identity, enums, state pairing,
and the scalar reason contract; its fenced block parses.

- [ ] **I2.9c — Add only helper `_validate_record_lists`.**

```python
def _validate_record_lists(decision):
    for field in (
        "lessonIds", "markdownRefs", "riskFlags",
        "mustKeepIds", "symbolTextAlternatives",
    ):
        if not isinstance(decision[field], list):
            raise AuditValidationError(f"{field} must be a list")
    for field in ("lessonIds", "markdownRefs", "riskFlags", "mustKeepIds"):
        if (
            decision[field] != sorted(set(decision[field]))
            or any(
                not isinstance(value, str) or not value.strip()
                for value in decision[field]
            )
        ):
            raise AuditValidationError(
                f"{field} must be sorted unique non-blank strings"
            )
    _validate_markdown_refs(decision)
```

Expected: the helper enforces list types and stable non-blank string sets,
then validates Markdown references; its fenced block parses.

- [ ] **I2.9d — Add only helper `_validate_record_kind_fields`.**

```python
def _validate_record_kind_fields(item, decision, policy):
    if item["sourceId"] in set(policy["captionConflictSourceIds"]):
        if decision["reviewState"] == "reviewed" and (
            decision["captionConflictResolved"] is not True
            or not isinstance(decision["captionConflictNote"], str)
            or not decision["captionConflictNote"].strip()
        ):
            raise AuditValidationError(
                f"caption conflict unresolved: {item['sourceId']}"
            )
    if item["kind"] == "page":
        if decision["visualReviewState"] not in {
            "reviewed", "unreviewed",
        }:
            raise AuditValidationError("invalid visualReviewState")
        if not isinstance(decision["visualReviewer"], str):
            raise AuditValidationError(
                "visualReviewer must be a string"
            )
        for field in ("discoveredVisualIds", "symbolReview"):
            if not isinstance(decision[field], list):
                raise AuditValidationError(f"{field} must be a list")
```

Expected: the helper enforces conflict-resolution evidence and page scan field
types without repeating the common record checks.

- [ ] **I2.9e — Replace only staged `validate_editorial_record`.**

```python
def validate_editorial_record(item, decision, policy):
    _validate_record_shape(item, decision, policy)
    _validate_record_lists(decision)
    _validate_course_placement(item, decision, policy)
    _validate_version_boundary(item, decision, policy)
    _validate_visual_decision(item, decision)
    _validate_risk_flags(item, decision, policy)
    _validate_record_kind_fields(item, decision, policy)
```

Expected: the public validator delegates each contract slice exactly once;
this block replaces its bootstrap stub and introduces no duplicate definition.

- [ ] **G2.9 — Re-run `DecisionContractTests.test_single_record_rejects_invalid_enum_and_course_placement` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_single_record_rejects_invalid_enum_and_course_placement -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.10 — Write `DecisionContractTests.test_upgrade_adds_only_missing_unreviewed_records`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_upgrade_adds_only_missing_unreviewed_records(self):
        index = sample_page20_index()
        existing = sample_decisions(index=index)
        before = copy.deepcopy(existing)
        upgraded = upgrade_editorial_decisions(index, [], existing[:-1])
        self.assertEqual(existing, before)
        self.assertEqual(
            {row["sourceId"] for row in upgraded},
            {item["sourceId"] for item in all_source_items(index)},
        )
        self.assertEqual(upgraded[-1]["reviewState"], "unreviewed")
```

Expected: only `DecisionContractTests.test_upgrade_adds_only_missing_unreviewed_records` is added in this action, and the shown Python block parses.

- [ ] **R2.10 — Run `DecisionContractTests.test_upgrade_adds_only_missing_unreviewed_records` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_upgrade_adds_only_missing_unreviewed_records -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `upgrade_editorial_decisions` and proves that exact function or branch contract is not yet present.

- [ ] **I2.10 — Implement only `upgrade_editorial_decisions`.**

```python
def upgrade_editorial_decisions(
    index: dict,
    visuals: list[dict],
    decisions: list[dict],
) -> list[dict]:
    source_map = source_items_by_id(index, visuals)
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    existing = {}
    for position, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            raise AuditValidationError(
                f"decision at position {position} must be an object"
            )
        source_id = decision.get("sourceId")
        if not isinstance(source_id, str) or not source_id.strip():
            raise AuditValidationError("decision sourceId must be non-blank")
        if source_id in existing:
            raise AuditValidationError(
                f"duplicate decision sourceId: {source_id}"
            )
        if source_id not in source_map:
            raise AuditValidationError(
                f"decision references unknown sourceId: {source_id}"
            )
        existing[source_id] = decision

    upgraded = []
    for source_id in sorted(source_map):
        defaults = initial_editorial_decision(source_map[source_id])
        if source_id not in existing:
            upgraded.append(defaults)
            continue
        preserved = deepcopy(existing[source_id])
        for field, default in defaults.items():
            if field not in preserved:
                preserved[field] = deepcopy(default)
        upgraded.append(preserved)
    return upgraded
```

Expected: only `upgrade_editorial_decisions` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.10 — Re-run `DecisionContractTests.test_upgrade_adds_only_missing_unreviewed_records` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_upgrade_adds_only_missing_unreviewed_records -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.11 — Write `DecisionContractTests.test_page_symbol_assignment_requires_matching_target_text`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_page_symbol_assignment_requires_matching_target_text(self):
        decisions = sample_page_and_experiment_decisions(
            symbol_review=[{
                "symbol": "★",
                "observedCount": 2,
                "semanticAssignments": [{
                    "sourceId": "experiment-1-1",
                    "count": 2,
                    "meaning": "实验难度：两星",
                }],
                "nonSemanticCount": 0,
                "note": "实验难度",
            }],
            target_alternatives=[],
        )
        with self.assertRaisesRegex(AuditValidationError, "symbolTextAlternatives"):
            validate_editorial_decisions(
                sample_page20_index(), [], decisions, sample_policy()
            )
```

Expected: only `DecisionContractTests.test_page_symbol_assignment_requires_matching_target_text` is added in this action, and the shown Python block parses.

- [ ] **R2.11 — Run `DecisionContractTests.test_page_symbol_assignment_requires_matching_target_text` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_page_symbol_assignment_requires_matching_target_text -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_symbol_text_alternatives` and proves that exact function or branch contract is not yet present.

- [ ] **I2.11 — Implement only `_validate_symbol_text_alternatives`.**

```python
def _validate_symbol_text_alternatives(item, decision):
    alternatives = decision["symbolTextAlternatives"]
    validated = []
    for position, entry in enumerate(alternatives):
        if not isinstance(entry, dict):
            raise AuditValidationError(
                f"symbolTextAlternatives[{position}] must be an object"
            )
        if set(entry) != {"symbol", "pdfPage", "meaning"}:
            raise AuditValidationError(
                f"symbolTextAlternatives fields mismatch: {item['sourceId']}"
            )
        symbol = entry["symbol"]
        pdf_page = entry["pdfPage"]
        meaning = entry["meaning"]
        if symbol not in SYMBOL_KEYS:
            raise AuditValidationError(
                f"invalid symbolTextAlternative symbol: {symbol!r}"
            )
        if type(pdf_page) is not int or pdf_page < 1:
            raise AuditValidationError(
                f"invalid symbolTextAlternative pdfPage: {item['sourceId']}"
            )
        if pdf_page != item.get("pdfPage"):
            raise AuditValidationError(
                f"symbolTextAlternative page mismatch: {item['sourceId']}"
            )
        if not isinstance(meaning, str) or not meaning.strip():
            raise AuditValidationError(
                f"symbolTextAlternative meaning is blank: {item['sourceId']}"
            )
        validated.append((pdf_page, symbol, meaning))
    if validated != sorted(set(validated)):
        raise AuditValidationError(
            "symbolTextAlternatives must be sorted and unique: "
            f"{item['sourceId']}"
        )
```

Expected: only `_validate_symbol_text_alternatives` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.11 — Re-run `DecisionContractTests.test_page_symbol_assignment_requires_matching_target_text` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_page_symbol_assignment_requires_matching_target_text -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.12 — Write `DecisionContractTests.test_symbol_review_requires_exact_observed_arithmetic`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_symbol_review_requires_exact_observed_arithmetic(self):
        index = sample_page20_index()
        decisions = sample_page_and_experiment_decisions(
            symbol_review=[{
                "symbol": "★",
                "observedCount": 2,
                "semanticAssignments": [{
                    "sourceId": "experiment-1-1",
                    "count": 1,
                    "meaning": "实验难度",
                }],
                "nonSemanticCount": 0,
                "note": "不平衡",
            }],
            target_alternatives=[],
        )
        page = index["pages"][0]
        source_map = {item["sourceId"]: item for item in all_source_items(index)}
        decisions_by_id = {row["sourceId"]: row for row in decisions}
        with self.assertRaisesRegex(AuditValidationError, "count|arithmetic"):
            _validate_symbol_review(page, decisions_by_id[page["sourceId"]], source_map, decisions_by_id)
```

Expected: only `DecisionContractTests.test_symbol_review_requires_exact_observed_arithmetic` is added in this action, and the shown Python block parses.

- [ ] **R2.12 — Run `DecisionContractTests.test_symbol_review_requires_exact_observed_arithmetic` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_symbol_review_requires_exact_observed_arithmetic -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_symbol_review` and proves that exact function or branch contract is not yet present.

- [ ] **I2.12a — Add only helper `_validated_symbol_assignment`.**

```python
def _validated_symbol_assignment(page, assignment, position):
    if not isinstance(assignment, dict):
        raise AuditValidationError(
            f"semanticAssignments[{position}] must be an object"
        )
    if set(assignment) != {"sourceId", "count", "meaning"}:
        raise AuditValidationError(
            f"semanticAssignments fields mismatch: {page['sourceId']}"
        )
    target_id = assignment["sourceId"]
    count = assignment["count"]
    meaning = assignment["meaning"]
    if not isinstance(target_id, str) or not target_id.strip():
        raise AuditValidationError("symbol assignment sourceId is blank")
    if type(count) is not int or count < 1:
        raise AuditValidationError(
            f"symbol assignment count must be positive: {target_id}"
        )
    if not isinstance(meaning, str) or not meaning.strip():
        raise AuditValidationError(
            f"symbol assignment meaning is blank: {target_id}"
        )
    return target_id, count, meaning
```

Expected: the helper validates one semantic assignment and returns its three
normalized contract values; its fenced block parses.

- [ ] **I2.12b — Add only helper `_validated_symbol_review_row`.**

```python
def _validated_symbol_review_row(
    page,
    row,
    position,
    seen_symbols,
):
    if not isinstance(row, dict):
        raise AuditValidationError(
            f"symbolReview[{position}] must be an object"
        )
    if set(row) != {
            "symbol",
            "observedCount",
            "semanticAssignments",
            "nonSemanticCount",
            "note",
    }:
        raise AuditValidationError(
            f"symbolReview fields mismatch: {page['sourceId']}"
        )
    symbol = row["symbol"]
    if symbol not in SYMBOL_KEYS or symbol in seen_symbols:
        raise AuditValidationError(
            f"invalid or duplicate symbolReview symbol: {symbol!r}"
        )
    seen_symbols.add(symbol)
    observed = row["observedCount"]
    non_semantic = row["nonSemanticCount"]
    if type(observed) is not int or observed < 0:
        raise AuditValidationError(
            f"invalid observedCount: {page['sourceId']} {symbol}"
        )
    if type(non_semantic) is not int or non_semantic < 0:
        raise AuditValidationError(
            f"invalid nonSemanticCount: {page['sourceId']} {symbol}"
        )
    if not isinstance(row["note"], str):
        raise AuditValidationError(
            f"symbolReview note must be a string: {page['sourceId']}"
        )
    assignments = row["semanticAssignments"]
    if not isinstance(assignments, list):
        raise AuditValidationError(
            f"semanticAssignments must be a list: {page['sourceId']}"
        )
    seen_assignments = set()
    semantic_total = 0
    for assignment_position, assignment in enumerate(assignments):
        target_id, count, meaning = _validated_symbol_assignment(
            page, assignment, assignment_position,
        )
        key = (target_id, meaning)
        if key in seen_assignments:
            raise AuditValidationError(
                f"duplicate symbol assignment: {target_id}"
            )
        seen_assignments.add(key)
        semantic_total += count
    return symbol, assignments, semantic_total
```

Expected: the helper validates one complete symbol row, detects duplicate
assignments, and returns the row values needed by later checks.

- [ ] **I2.12c — Add only helper `_validate_symbol_arithmetic`.**

```python
def _validate_symbol_arithmetic(
    page,
    decision,
    row,
    semantic_total,
    require_complete,
):
    scan_is_reviewed = decision["visualReviewState"] == "reviewed"
    if not scan_is_reviewed and not require_complete:
        return
    symbol = row["symbol"]
    observed = row["observedCount"]
    if semantic_total + row["nonSemanticCount"] != observed:
        raise AuditValidationError(
            f"symbolReview count mismatch: {page['sourceId']} {symbol}"
        )
    extracted = page.get("symbolCounts", {}).get(
        SYMBOL_KEYS[symbol], 0
    )
    if observed != extracted:
        prefix = "[计数更正]"
        if (
            not row["note"].startswith(prefix)
            or not row["note"][len(prefix):].strip()
        ):
            raise AuditValidationError(
                "symbol count correction requires [计数更正]: "
                f"{page['sourceId']} {symbol}"
            )
```

Expected: the helper enforces observed arithmetic and explicit count-correction
evidence whenever the page scan is complete.

- [ ] **I2.12d — Add only helper `_validate_symbol_assignment_target`.**

```python
def _validate_symbol_assignment_target(
    page,
    symbol,
    assignment,
    source_map,
    decisions_by_id,
):
    target_id = assignment["sourceId"]
    target = source_map.get(target_id)
    target_decision = decisions_by_id.get(target_id)
    if (
        target is None
        or target_decision is None
        or target.get("pdfPage") != page["pdfPage"]
    ):
        raise AuditValidationError(
            f"symbol assignment target page mismatch: {target_id}"
        )
    expected = {
        "symbol": symbol,
        "pdfPage": page["pdfPage"],
        "meaning": assignment["meaning"],
    }
    if target_decision["symbolTextAlternatives"].count(expected) != 1:
        raise AuditValidationError(
            f"missing matching symbolTextAlternative: {target_id}"
        )
```

Expected: the helper requires an on-page target decision with exactly one
matching text alternative; its fenced block parses.

- [ ] **I2.12e — Add only helper `_validate_symbol_review_coverage`.**

```python
def _validate_symbol_review_coverage(
    page,
    decision,
    rows_by_symbol,
    seen_symbols,
    require_complete,
):
    scan_is_reviewed = decision["visualReviewState"] == "reviewed"
    if not scan_is_reviewed and not require_complete:
        return
    extracted_symbols = {
        glyph
        for glyph, key in SYMBOL_KEYS.items()
        if page.get("symbolCounts", {}).get(key, 0) > 0
    }
    observed_symbols = {
        symbol
        for symbol, row in rows_by_symbol.items()
        if row["observedCount"] > 0
    }
    if seen_symbols != extracted_symbols | observed_symbols:
        raise AuditValidationError(
            f"symbolReview coverage mismatch: {page['sourceId']}"
        )
```

Expected: the helper proves complete coverage of every extracted or positively
observed glyph when page review is required.

- [ ] **I2.12f — Replace only staged `_validate_symbol_review`.**

```python
def _validate_symbol_review(
    page,
    decision,
    source_map,
    decisions_by_id,
    require_complete=False,
):
    review = decision["symbolReview"]
    glyph_order = {
        glyph: position
        for position, glyph in enumerate(SYMBOL_KEYS)
    }
    seen_symbols = set()
    rows_by_symbol = {}
    check_targets = (
        decision["visualReviewState"] == "reviewed"
        or require_complete
    )
    for position, row in enumerate(review):
        symbol, assignments, semantic_total = (
            _validated_symbol_review_row(
                page, row, position, seen_symbols,
            )
        )
        rows_by_symbol[symbol] = row
        _validate_symbol_arithmetic(
            page, decision, row, semantic_total, require_complete,
        )
        if check_targets:
            for assignment in assignments:
                _validate_symbol_assignment_target(
                    page,
                    symbol,
                    assignment,
                    source_map,
                    decisions_by_id,
                )
    if review != sorted(
        review,
        key=lambda row: glyph_order.get(
            row.get("symbol"), len(glyph_order),
        ),
    ):
        raise AuditValidationError(
            f"symbolReview must use canonical glyph order: {page['sourceId']}"
        )
    _validate_symbol_review_coverage(
        page,
        decision,
        rows_by_symbol,
        seen_symbols,
        require_complete,
    )
```

Expected: the staged validator is replaced by one orchestration pass over the
five narrow helpers; no duplicate `_validate_symbol_review` remains.

- [ ] **G2.12 — Re-run `DecisionContractTests.test_symbol_review_requires_exact_observed_arithmetic` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_symbol_review_requires_exact_observed_arithmetic -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.13 — Write `DecisionContractTests.test_complete_page_scan_requires_visual_inventory_and_notes`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_complete_page_scan_requires_visual_inventory_and_notes(self):
        index = sample_page20_index()
        decisions = sample_decisions(index=index)
        page = index["pages"][0]
        source_map = {item["sourceId"]: item for item in all_source_items(index)}
        decisions_by_id = {row["sourceId"]: row for row in decisions}
        page_decision = decisions_by_id[page["sourceId"]]
        cases = [{
            "visualReviewState": "unreviewed",
            "visualReviewer": "",
        }, {
            "discoveredVisualIds": ["visual-p020-01"],
        }]
        for changes in cases:
            invalid = copy.deepcopy(page_decision)
            invalid.update(changes)
            with self.subTest(changes=changes), self.assertRaisesRegex(
                AuditValidationError, "scan|inventory",
            ):
                _validate_page_scan(
                    page,
                    invalid,
                    source_map,
                    decisions_by_id,
                    require_complete=True,
                )
```

Expected: only `DecisionContractTests.test_complete_page_scan_requires_visual_inventory_and_notes` is added in this action, and the shown Python block parses.

- [ ] **R2.13 — Run `DecisionContractTests.test_complete_page_scan_requires_visual_inventory_and_notes` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_complete_page_scan_requires_visual_inventory_and_notes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_page_scan` and proves that exact function or branch contract is not yet present.

- [ ] **I2.13 — Implement only `_validate_page_scan`.**

```python
def _validate_page_scan(
    page,
    decision,
    source_map,
    decisions_by_id,
    require_complete=False,
):
    discovered = decision["discoveredVisualIds"]
    if (
        discovered != sorted(set(discovered))
        or any(
            not isinstance(source_id, str) or not source_id.strip()
            for source_id in discovered
        )
    ):
        raise AuditValidationError(
            f"discoveredVisualIds must be sorted and unique: {page['sourceId']}"
        )
    scan_is_reviewed = decision["visualReviewState"] == "reviewed"
    if require_complete and not scan_is_reviewed:
        raise AuditValidationError(
            f"page scan incomplete: {page['sourceId']}"
        )
    if scan_is_reviewed:
        if not decision["visualReviewer"].strip():
            raise AuditValidationError(
                f"reviewed page requires visualReviewer: {page['sourceId']}"
            )
        expected = sorted(
            source_id
            for source_id, item in source_map.items()
            if item["kind"] == "visual"
            and item["pdfPage"] == page["pdfPage"]
        )
        if discovered != expected:
            raise AuditValidationError(
                f"page visual inventory mismatch: {page['sourceId']}"
            )
        for source_id in discovered:
            item = source_map.get(source_id)
            if (
                item is None
                or item["kind"] != "visual"
                or item["pdfPage"] != page["pdfPage"]
            ):
                raise AuditValidationError(
                    f"wrong-page discovered visual: {source_id}"
                )
    _validate_symbol_review(
        page,
        decision,
        source_map,
        decisions_by_id,
        require_complete=require_complete,
    )
```

Expected: only `_validate_page_scan` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.13 — Re-run `DecisionContractTests.test_complete_page_scan_requires_visual_inventory_and_notes` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_complete_page_scan_requires_visual_inventory_and_notes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.14 — Write `DecisionContractTests.test_known_must_keep_ids_are_exactly_twenty_five`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_known_must_keep_ids_are_exactly_twenty_five(self):
        known = _known_must_keep_ids(sample_policy())
        self.assertEqual(len(known), 25)
        self.assertEqual(len(known), len(set(known)))
```

Expected: only `DecisionContractTests.test_known_must_keep_ids_are_exactly_twenty_five` is added in this action, and the shown Python block parses.

- [ ] **R2.14 — Run `DecisionContractTests.test_known_must_keep_ids_are_exactly_twenty_five` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_known_must_keep_ids_are_exactly_twenty_five -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_known_must_keep_ids` and proves that exact function or branch contract is not yet present.

- [ ] **I2.14 — Implement only `_known_must_keep_ids`.**

```python
def _known_must_keep_ids(policy):
    rules = policy["mustKeepRules"]
    result = {
        f"course-objective-{lesson_id}"
        for lesson_id in rules["courseObjectives"]["lessonIds"]
    }
    result.update(rules["highPriority"]["routing"])
    result.update(rules["highRisk"]["routing"])
    return result
```

Expected: only `_known_must_keep_ids` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.14 — Re-run `DecisionContractTests.test_known_must_keep_ids_are_exactly_twenty_five` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_known_must_keep_ids_are_exactly_twenty_five -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.15 — Write `DecisionContractTests.test_frozen_conflict_policy_requires_exact_source_set`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_frozen_conflict_policy_requires_exact_source_set(self):
        policy = sample_policy()
        index = sample_page20_index()
        source_map = {item["sourceId"]: item for item in all_source_items(index)}
        policy["captionConflictSourceIds"] = ["missing-source"]
        with self.assertRaisesRegex(AuditValidationError, "conflict|source"):
            _validate_frozen_conflict_policy(policy, source_map)
```

Expected: only `DecisionContractTests.test_frozen_conflict_policy_requires_exact_source_set` is added in this action, and the shown Python block parses.

- [ ] **R2.15 — Run `DecisionContractTests.test_frozen_conflict_policy_requires_exact_source_set` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_frozen_conflict_policy_requires_exact_source_set -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_frozen_conflict_policy` and proves that exact function or branch contract is not yet present.

- [ ] **I2.15 — Implement only `_validate_frozen_conflict_policy`.**

```python
def _validate_frozen_conflict_policy(policy, source_map):
    values = policy.get("captionConflictSourceIds")
    if (
        not isinstance(values, list)
        or values != list(APPROVED_CAPTION_CONFLICT_SOURCE_IDS)
    ):
        raise AuditValidationError(
            "caption conflict source IDs differ from approved 21-ID baseline"
        )
    missing = sorted(set(values) - set(source_map))
    if missing:
        raise AuditValidationError(
            f"caption conflict IDs missing from catalog: {missing}"
        )
```

Expected: only `_validate_frozen_conflict_policy` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.15 — Re-run `DecisionContractTests.test_frozen_conflict_policy_requires_exact_source_set` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_frozen_conflict_policy_requires_exact_source_set -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.16 — Write `DecisionContractTests.test_validate_editorial_decisions_requires_exact_source_universe`.**

```python
class DecisionContractTests(unittest.TestCase):
    def test_validate_editorial_decisions_requires_exact_source_universe(self):
        index = sample_page20_index()
        decisions = sample_decisions(index=index)
        validate_editorial_decisions(
            index, [], decisions, sample_policy(),
            require_complete=True,
        )
        with self.assertRaisesRegex(AuditValidationError, "source|decision"):
            validate_editorial_decisions(
                index, [], decisions[:-1], sample_policy(),
                require_complete=True,
            )
```

Expected: only `DecisionContractTests.test_validate_editorial_decisions_requires_exact_source_universe` is added in this action, and the shown Python block parses.

- [ ] **R2.16 — Run `DecisionContractTests.test_validate_editorial_decisions_requires_exact_source_universe` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_validate_editorial_decisions_requires_exact_source_universe -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_editorial_decisions` and proves that exact function or branch contract is not yet present.

- [ ] **I2.16a — Add only helper `_indexed_decisions`.**

```python
def _indexed_decisions(decisions, source_map):
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    decisions_by_id = {}
    ordered_ids = []
    for position, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            raise AuditValidationError(
                f"decision at position {position} must be an object"
            )
        source_id = decision.get("sourceId")
        if not isinstance(source_id, str) or not source_id.strip():
            raise AuditValidationError("decision sourceId must be non-blank")
        if source_id in decisions_by_id:
            raise AuditValidationError(
                f"duplicate decision sourceId: {source_id}"
            )
        if source_id not in source_map:
            raise AuditValidationError(
                f"decision references unknown sourceId: {source_id}"
            )
        decisions_by_id[source_id] = decision
        ordered_ids.append(source_id)
    if ordered_ids != sorted(ordered_ids):
        raise AuditValidationError("decisions must use sourceId order")
    return decisions_by_id, ordered_ids
```

Expected: the helper validates decision container, identity, uniqueness,
catalog membership, and source-ID ordering, then returns both indexes.

- [ ] **I2.16b — Add only helper `_validate_catalog_page_chapters`.**

```python
def _validate_catalog_page_chapters(source_map):
    page_by_number = {
        item["pdfPage"]: item
        for item in source_map.values()
        if item["kind"] == "page"
    }
    for source_id, item in source_map.items():
        if item["kind"] == "page":
            continue
        page = page_by_number.get(item.get("pdfPage"))
        if page is None or item.get("chapter") != page.get("chapter"):
            raise AuditValidationError(
                f"catalog chapter/page mismatch: {source_id}"
            )
```

Expected: the helper proves every non-page catalog item inherits the chapter
of its referenced page; its fenced block parses.

- [ ] **I2.16c — Add only helper `_validate_decision_members`.**

```python
def _validate_decision_members(
    source_map,
    decisions_by_id,
    ordered_ids,
    policy,
    require_complete,
):
    known_must_keep_ids = _known_must_keep_ids(policy)
    for source_id in ordered_ids:
        item = source_map[source_id]
        decision = decisions_by_id[source_id]
        validate_editorial_record(item, decision, policy)
        unknown_must_keep = sorted(
            set(decision["mustKeepIds"]) - known_must_keep_ids
        )
        if unknown_must_keep:
            raise AuditValidationError(
                f"unknown mustKeepId: {unknown_must_keep[0]}"
            )
        _validate_symbol_text_alternatives(item, decision)
        if item["kind"] == "page":
            _validate_page_scan(
                item,
                decision,
                source_map,
                decisions_by_id,
                require_complete=require_complete,
            )
```

Expected: the helper validates every present record, must-keep ID, symbol text
alternative, and page scan in stable decision order.

- [ ] **I2.16d — Replace only staged `validate_editorial_decisions`.**

```python
def validate_editorial_decisions(
    index: dict,
    visuals: list[dict],
    decisions: list[dict],
    policy: dict,
    require_complete: bool = False,
) -> None:
    if type(require_complete) is not bool:
        raise TypeError("require_complete must be a bool")
    source_map = source_items_by_id(index, visuals)
    _validate_frozen_conflict_policy(policy, source_map)
    decisions_by_id, ordered_ids = _indexed_decisions(
        decisions, source_map,
    )
    if require_complete and set(decisions_by_id) != set(source_map):
        missing = sorted(set(source_map) - set(decisions_by_id))
        extra = sorted(set(decisions_by_id) - set(source_map))
        raise AuditValidationError(
            f"decision source set mismatch: missing={missing}, extra={extra}"
        )
    _validate_catalog_page_chapters(source_map)
    _validate_decision_members(
        source_map,
        decisions_by_id,
        ordered_ids,
        policy,
        require_complete,
    )
    if require_complete:
        incomplete = sorted(
            source_id
            for source_id, decision in decisions_by_id.items()
            if (
                decision["reviewState"] != "reviewed"
                or decision["disposition"] == "unreviewed"
            )
        )
        if incomplete:
            raise AuditValidationError(
                f"unreviewed decisions remain: {incomplete}"
            )
```

Expected: the public validator replaces its bootstrap stub, orchestrates all
catalog and decision checks, and enforces completeness only when requested.

- [ ] **G2.16 — Re-run `DecisionContractTests.test_validate_editorial_decisions_requires_exact_source_universe` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions.DecisionContractTests.test_validate_editorial_decisions_requires_exact_source_universe -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.17 — Write `MustKeepTests.test_inventory_has_exact_25_atomic_items`.**

```python
class MustKeepTests(unittest.TestCase):
    def test_inventory_has_exact_25_atomic_items(self):
        inventory = build_must_keep_inventory(
            sample_policy(), sample_analysis_sections(), sample_outline_sections()
        )
        self.assertEqual(len(inventory), 25)
        self.assertEqual(
            {
                item["mustKeepId"]
                for item in inventory
                if item["mustKeepId"].startswith("course-")
            },
            {
                f"course-objective-{lesson_id}"
                for lesson_id in sample_policy()["lessonIds"]
            },
        )
```

Expected: only this method is inserted into the unique `MustKeepTests` class.

- [ ] **R2.17 — Run the exact inventory test before adding any extraction helper.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_must_keep.MustKeepTests.test_inventory_has_exact_25_atomic_items -v
```

Expected: unittest collects one test and fails with
`build_must_keep_inventory`; an import or fixture error is invalid RED.

#### Must-keep extraction implementation after RED

- [ ] **S2.M01 — Add only must-keep helper `_one_section`.**

```python
def _one_section(sections, heading_anchor):
    if not isinstance(sections, list):
        raise AuditValidationError("Markdown sections must be a list")
    matches = [
        section
        for section in sections
        if isinstance(section, dict)
        and section.get("heading") == heading_anchor
    ]
    if len(matches) != 1:
        raise AuditValidationError(
            f"expected one Markdown heading: {heading_anchor}"
        )
    return matches[0]
```

Expected: only `_one_section` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M02 — Add only must-keep helper `_line_source_ref`.**

```python
def _line_source_ref(section, offset):
    line_number = section["startLine"] + offset
    return f"{section['path']}:{line_number}-{line_number}"
```

Expected: only `_line_source_ref` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M03 — Add only must-keep helper `_course_core_content_rows`.**

```python
def _course_core_content_rows(
    outline_sections,
    expected_lesson_ids,
):
    if (
        not isinstance(expected_lesson_ids, list)
        or expected_lesson_ids != sorted(set(expected_lesson_ids))
    ):
        raise AuditValidationError(
            "course objective lessonIds must be sorted and unique"
        )
    rows = []
    for lesson_id in expected_lesson_ids:
        prefix = f"{lesson_id} "
        matches = [
            section
            for section in outline_sections
            if section.get("heading", "").startswith(prefix)
        ]
        if len(matches) != 1:
            raise AuditValidationError(
                f"expected one course heading for {lesson_id}"
            )
        section = matches[0]
        content_matches = []
        for offset, line in enumerate(section["text"].splitlines()):
            match = CORE_CONTENT.fullmatch(line)
            if match is not None:
                content_matches.append((offset, match.group(1)))
        if len(content_matches) != 1:
            raise AuditValidationError(
                f"expected one 核心内容 for {lesson_id}"
            )
        offset, text = content_matches[0]
        rows.append({
            "mustKeepId": f"course-objective-{lesson_id}",
            "text": text,
            "sourceRef": _line_source_ref(section, offset),
            "_lessonId": lesson_id,
        })
    return rows
```

Expected: only `_course_core_content_rows` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M04 — Add only must-keep helper `_numbered_list_rows`.**

```python
def _numbered_list_rows(
    section,
    expected_count,
    id_prefix,
):
    rows = []
    for offset, line in enumerate(section["text"].splitlines()):
        match = NUMBERED_ITEM.fullmatch(line)
        if match is None:
            continue
        ordinal = int(match.group(1))
        rows.append({
            "ordinal": ordinal,
            "text": match.group(2),
            "sourceRef": _line_source_ref(section, offset),
        })
    expected_ordinals = list(range(1, expected_count + 1))
    if [row["ordinal"] for row in rows] != expected_ordinals:
        raise AuditValidationError(
            f"{id_prefix} must contain numbered items 1..{expected_count}"
        )
    return [
        {
            "mustKeepId": f"{id_prefix}-{row['ordinal']:02d}",
            "text": row["text"],
            "sourceRef": row["sourceRef"],
        }
        for row in rows
    ]
```

Expected: only `_numbered_list_rows` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M05 — Add only must-keep helper `_table_cells`.**

```python
def _table_cells(line):
    value = line.strip()
    if not value.startswith("|") or not value.endswith("|"):
        return None
    cells = []
    current = []
    escaped = False
    for character in value[1:-1]:
        if escaped:
            current.append(character)
            escaped = False
        elif character == "\\":
            current.append(character)
            escaped = True
        elif character == "|":
            cells.append("".join(current).strip())
            current = []
        else:
            current.append(character)
    cells.append("".join(current).strip())
    return cells
```

Expected: only `_table_cells` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M06 — Add only must-keep helper `_markdown_table_rows`.**

```python
def _markdown_table_rows(
    section,
    expected_count,
    id_prefix,
):
    lines = section["text"].splitlines()
    table = []
    for offset, line in enumerate(lines):
        cells = _table_cells(line)
        if cells is None:
            if table:
                break
            continue
        table.append((offset, line.strip(), cells))
    if len(table) < 2:
        raise AuditValidationError(f"missing Markdown table: {id_prefix}")
    header = table[0][2]
    divider = table[1][2]
    if (
        len(header) < 1
        or len(divider) != len(header)
        or any(
            re.fullmatch(r":?-{3,}:?", cell) is None
            for cell in divider
        )
    ):
        raise AuditValidationError(
            f"invalid Markdown table header: {id_prefix}"
        )
    data = table[2:]
    if len(data) != expected_count:
        raise AuditValidationError(
            f"{id_prefix} must contain {expected_count} table rows"
        )
    rows = []
    for ordinal, (offset, raw_line, cells) in enumerate(data, start=1):
        if len(cells) != len(header) or any(not cell for cell in cells):
            raise AuditValidationError(
                f"invalid Markdown table row: {id_prefix}-{ordinal:02d}"
            )
        rows.append({
            "mustKeepId": f"{id_prefix}-{ordinal:02d}",
            "text": raw_line,
            "sourceRef": _line_source_ref(section, offset),
        })
    return rows
```

Expected: only `_markdown_table_rows` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M07 — Add only must-keep helper `_validated_routes`.**

```python
def _validated_routes(routes, label):
    if not isinstance(routes, list):
        raise AuditValidationError(f"{label} routes must be a list")
    result = []
    for route in routes:
        if not isinstance(route, dict):
            raise AuditValidationError(f"{label} route must be an object")
        if set(route) not in ({"chapter"}, {"chapter", "sectionAnchor"}):
            raise AuditValidationError(f"{label} route fields mismatch")
        if type(route["chapter"]) is not int or route["chapter"] < 1:
            raise AuditValidationError(f"{label} route chapter is invalid")
        if "sectionAnchor" in route and (
            not isinstance(route["sectionAnchor"], str)
            or not route["sectionAnchor"].strip()
        ):
            raise AuditValidationError(
                f"{label} sectionAnchor must be non-blank"
            )
        result.append(dict(route))
    if result != sorted(
        result,
        key=lambda route: (
            route["chapter"],
            route.get("sectionAnchor", ""),
        ),
    ):
        raise AuditValidationError(f"{label} routes must use stable order")
    if len({
        (route["chapter"], route.get("sectionAnchor"))
        for route in result
    }) != len(result):
        raise AuditValidationError(f"{label} routes contain duplicates")
    return result
```

Expected: only `_validated_routes` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M08 — Add only must-keep helper `_expected_inventory_ids`.**

```python
def _expected_inventory_ids(policy):
    rules = policy["mustKeepRules"]
    result = {
        f"course-objective-{lesson_id}"
        for lesson_id in rules["courseObjectives"]["lessonIds"]
    }
    result.update(rules["highPriority"]["routing"])
    result.update(rules["highRisk"]["routing"])
    return result
```

Expected: only `_expected_inventory_ids` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M09 — Add only must-keep helper `_outline_anchor_bounds`.**

```python
def _outline_anchor_bounds(section_anchor, source_outline):
    matches = [
        (position, item)
        for position, item in enumerate(source_outline)
        if item.get("title") == section_anchor
    ]
    if len(matches) != 1:
        raise AuditValidationError(
            f"expected one source outline anchor: {section_anchor}"
        )
    start_position, start = matches[0]
    end_position = len(source_outline)
    next_start = None
    for position, candidate in enumerate(
        source_outline[start_position + 1:],
        start=start_position + 1,
    ):
        if candidate["depth"] <= start["depth"]:
            end_position = position
            next_start = candidate
            break
    return start_position, end_position, start, next_start
```

Expected: only `_outline_anchor_bounds` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M10 — Add only must-keep helper `_item_matches_route`.**

```python
def _item_matches_route(item, route, source_map, source_outline):
    page_item = source_map.get(f"page-{item['pdfPage']:03d}")
    chapter = (
        page_item.get("chapter")
        if page_item is not None
        else item.get("chapter")
    )
    if chapter != route["chapter"]:
        return False
    anchor = route.get("sectionAnchor")
    if anchor is None:
        return True
    start_position, end_position, start, next_start = (
        _outline_anchor_bounds(anchor, source_outline)
    )
    if item["kind"] == "outline":
        positions = {
            value["sourceId"]: position
            for position, value in enumerate(source_outline)
        }
        position = positions.get(item["sourceId"])
        return (
            position is not None
            and start_position <= position < end_position
        )
    end_page = (
        next_start["pdfPage"]
        if next_start is not None
        else max(value["pdfPage"] for value in source_outline) + 1
    )
    return start["pdfPage"] <= item["pdfPage"] < end_page
```

Expected: only `_item_matches_route` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M11 — Add only must-keep helper `_matched_route_roles`.**

```python
def _matched_route_roles(item, inventory_item, source_map, source_outline):
    roles = set()
    if any(
        _item_matches_route(item, route, source_map, source_outline)
        for route in inventory_item["primarySourceRoutes"]
    ):
        roles.add("primary")
    if any(
        _item_matches_route(item, route, source_map, source_outline)
        for route in inventory_item["secondarySourceRoutes"]
    ):
        roles.add("secondary")
    return roles
```

Expected: only `_matched_route_roles` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S2.M12a — Add only per-item helper `_validate_inventory_item_structure`.**

```python
def _validate_inventory_item_structure(item, policy):
    expected_fields = {
        "mustKeepId",
        "text",
        "sourceRef",
        "primarySourceRoutes",
        "secondarySourceRoutes",
        "lessonIds",
        "versionStatus",
    }
    if not isinstance(item, dict) or set(item) != expected_fields:
        raise AuditValidationError("must-keep inventory fields mismatch")
    must_keep_id = item["mustKeepId"]
    if not isinstance(must_keep_id, str) or not must_keep_id.strip():
        raise AuditValidationError("mustKeepId must be non-blank")
    if not isinstance(item["text"], str) or not item["text"].strip():
        raise AuditValidationError(
            f"must-keep text is blank: {must_keep_id}"
        )
    match = SOURCE_REF.fullmatch(item["sourceRef"])
    if match is None or (
        match.group(3) is not None
        and int(match.group(3)) < int(match.group(2))
    ):
        raise AuditValidationError(
            f"invalid must-keep sourceRef: {must_keep_id}"
        )
    _validated_routes(item["primarySourceRoutes"], f"{must_keep_id} primary")
    _validated_routes(item["secondarySourceRoutes"], f"{must_keep_id} secondary")
    if not item["primarySourceRoutes"]:
        raise AuditValidationError(
            f"must-keep item has no primary route: {must_keep_id}"
        )
    if (
        item["lessonIds"] != sorted(set(item["lessonIds"]))
        or not set(item["lessonIds"]) <= set(policy["lessonIds"])
    ):
        raise AuditValidationError(
            f"must-keep lessonIds are invalid: {must_keep_id}"
        )
    if item["versionStatus"] not in {"current", "future"}:
        raise AuditValidationError(f"invalid versionStatus: {must_keep_id}")
    if item["versionStatus"] == "current" and not item["lessonIds"]:
        raise AuditValidationError(
            f"current item needs lessonIds: {must_keep_id}"
        )
    if item["versionStatus"] == "future":
        chapters = {route["chapter"] for route in item["primarySourceRoutes"]}
        if item["lessonIds"] or not chapters <= set(policy["excludedChapters"]):
            raise AuditValidationError(f"invalid future routing: {must_keep_id}")
    return must_keep_id
```

Expected: only `_validate_inventory_item_structure` is added, and its fenced
block parses.

- [ ] **S2.M12b — Add only collection helper `_validate_inventory_structure`.**

```python
def _validate_inventory_structure(inventory, policy):
    if not isinstance(inventory, list):
        raise AuditValidationError("must-keep inventory must be a list")
    ids = [
        _validate_inventory_item_structure(item, policy)
        for item in inventory
    ]
    if ids != sorted(set(ids)) or set(ids) != _expected_inventory_ids(policy):
        raise AuditValidationError(
            "must-keep inventory must be the exact sorted 25-ID set"
        )
```

Expected: only `_validate_inventory_structure` scaffold or schema unit is added, and its fenced block parses.

- [ ] **I2.17a — Add only helper `_course_inventory_rows`.**

```python
def _course_inventory_rows(policy, outline_sections):
    rules = policy["mustKeepRules"]
    course_rules = rules["courseObjectives"]
    expected_lessons = course_rules["lessonIds"]
    if (
        course_rules["expectedCount"] != 12
        or len(expected_lessons) != course_rules["expectedCount"]
    ):
        raise AuditValidationError(
            "course objective expectedCount must be 12"
        )
    course = _course_core_content_rows(
        outline_sections,
        expected_lesson_ids=expected_lessons,
    )
    course_rows = []
    routing_by_lesson = course_rules["sourceRoutingByLesson"]
    if set(routing_by_lesson) != set(expected_lessons):
        raise AuditValidationError(
            "sourceRoutingByLesson does not match course lessonIds"
        )
    for row in course:
        lesson_id = row.pop("_lessonId")
        routing = routing_by_lesson[lesson_id]
        if set(routing) != {"primary", "secondary"}:
            raise AuditValidationError(
                f"course routing fields mismatch: {lesson_id}"
            )
        row.update({
            "primarySourceRoutes": _validated_routes(
                routing["primary"], f"{lesson_id} primary"
            ),
            "secondarySourceRoutes": _validated_routes(
                routing["secondary"], f"{lesson_id} secondary"
            ),
            "lessonIds": [lesson_id],
            "versionStatus": "current",
        })
        if not row["primarySourceRoutes"]:
            raise AuditValidationError(
                f"course objective has no primary route: {lesson_id}"
            )
        course_rows.append(row)
    return course_rows
```

Expected: the helper extracts and validates exactly 12 course-objective rows,
including complete primary and secondary routing.

- [ ] **I2.17b — Add only helper `_validated_analysis_route`.**

```python
def _validated_analysis_route(row, route, policy):
    if set(route) != {
        "sourceChapters",
        "lessonIds",
        "versionStatus",
    }:
        raise AuditValidationError(
            f"{row['mustKeepId']} routing fields mismatch"
        )
    chapters = route["sourceChapters"]
    lesson_ids = route["lessonIds"]
    version_status = route["versionStatus"]
    if (
        not isinstance(chapters, list)
        or chapters != sorted(set(chapters))
        or any(
            type(chapter) is not int or chapter < 1
            for chapter in chapters
        )
        or not chapters
    ):
        raise AuditValidationError(
            f"{row['mustKeepId']} sourceChapters are invalid"
        )
    if (
        not isinstance(lesson_ids, list)
        or lesson_ids != sorted(set(lesson_ids))
        or not set(lesson_ids) <= set(policy["lessonIds"])
    ):
        raise AuditValidationError(
            f"{row['mustKeepId']} lessonIds are invalid"
        )
    if version_status not in {"current", "future"}:
        raise AuditValidationError(
            f"{row['mustKeepId']} versionStatus is invalid"
        )
    if version_status == "current" and not lesson_ids:
        raise AuditValidationError(
            f"current must-keep item needs a lesson: {row['mustKeepId']}"
        )
    if version_status == "future" and (
        lesson_ids
        or not set(chapters) <= set(policy["excludedChapters"])
    ):
        raise AuditValidationError(
            "future item is not routed only to excluded chapters: "
            f"{row['mustKeepId']}"
        )
    result = dict(row)
    result.update({
        "primarySourceRoutes": [
            {"chapter": chapter} for chapter in chapters
        ],
        "secondarySourceRoutes": [],
        "lessonIds": list(lesson_ids),
        "versionStatus": version_status,
    })
    return result
```

Expected: the helper converts one policy route into a validated analysis
inventory row while enforcing current/future routing boundaries.

- [ ] **I2.17c — Add only helper `_analysis_inventory_rows`.**

```python
def _analysis_inventory_rows(policy, analysis_sections):
    rules = policy["mustKeepRules"]
    analysis_specs = (
        ("highPriority", "analysis-high-priority", _numbered_list_rows),
        ("highRisk", "analysis-high-risk", _markdown_table_rows),
    )
    analysis_rows = []
    for rule_name, id_prefix, parser in analysis_specs:
        rule = rules[rule_name]
        section = _one_section(
            analysis_sections,
            rule["headingAnchor"],
        )
        parsed = parser(
            section,
            expected_count=rule["expectedCount"],
            id_prefix=id_prefix,
        )
        routing = rule["routing"]
        if set(routing) != {
            row["mustKeepId"] for row in parsed
        }:
            raise AuditValidationError(
                f"{rule_name} routing does not match parsed rows"
            )
        for row in parsed:
            analysis_rows.append(_validated_analysis_route(
                row,
                routing[row["mustKeepId"]],
                policy,
            ))
    return analysis_rows
```

Expected: the helper parses the five priority and eight risk rows, matches each
parsed ID to policy routing, and returns validated analysis inventory rows.

- [ ] **I2.17d — Replace only staged `build_must_keep_inventory`.**

```python
def build_must_keep_inventory(
    policy,
    analysis_sections,
    outline_sections,
):
    course_rows = _course_inventory_rows(policy, outline_sections)
    analysis_rows = _analysis_inventory_rows(
        policy, analysis_sections,
    )
    inventory = sorted(
        [*course_rows, *analysis_rows],
        key=lambda item: item["mustKeepId"],
    )
    if (
        len(inventory) != 25
        or len({item["mustKeepId"] for item in inventory}) != 25
    ):
        raise AuditValidationError(
            "must-keep inventory must contain 25 unique items"
        )
    return inventory
```

Expected: the public builder replaces its bootstrap stub, combines the two
validated inventories, and returns exactly 25 unique stable IDs.

- [ ] **G2.17 — Re-run `MustKeepTests.test_inventory_has_exact_25_atomic_items` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_must_keep.MustKeepTests.test_inventory_has_exact_25_atomic_items -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.18 — Write `MustKeepTests.test_incremental_gate_rejects_wrong_must_keep_routes`.**

```python
class MustKeepTests(unittest.TestCase):
    def test_incremental_gate_rejects_wrong_must_keep_routes(self):
        cases = [
            (
                "analysis-high-priority-02",
                {
                    "chapter": 4,
                    "lessonIds": ["1-1"],
                    "disposition": "included",
                },
            ),
            (
                "analysis-high-priority-02",
                {
                    "chapter": 2,
                    "lessonIds": ["4-2"],
                    "disposition": "included",
                },
            ),
            (
                "analysis-high-priority-03",
                {
                    "chapter": 7,
                    "lessonIds": ["1-1"],
                    "disposition": "included",
                },
            ),
        ]
        for must_keep_id, changes in cases:
            with self.subTest(must_keep_id=must_keep_id, changes=changes):
                decisions, source_map = claimed_must_keep_fixture(
                    must_keep_id, **changes
                )
                with self.assertRaises(AuditValidationError):
                    validate_must_keep_coverage(
                        sample_must_keep_inventory(),
                        decisions,
                        source_map,
                        sample_index()["outline"],
                        sample_policy(),
                        require_complete=False,
                    )
```

Expected: only `MustKeepTests.test_incremental_gate_rejects_wrong_must_keep_routes` is added in this action, and the shown Python block parses.

- [ ] **R2.18 — Run `MustKeepTests.test_incremental_gate_rejects_wrong_must_keep_routes` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_must_keep.MustKeepTests.test_incremental_gate_rejects_wrong_must_keep_routes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_must_keep_coverage` and proves that exact function or branch contract is not yet present.

- [ ] **I2.18a — Add only helper `_must_keep_decisions_by_id`.**

```python
def _must_keep_decisions_by_id(
    decisions,
    source_map,
    inventory_by_id,
):
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    decisions_by_id = {}
    for decision in decisions:
        if not isinstance(decision, dict):
            raise AuditValidationError("decision must be an object")
        source_id = decision.get("sourceId")
        if source_id in decisions_by_id:
            raise AuditValidationError(
                f"duplicate decision sourceId: {source_id}"
            )
        if source_id not in source_map:
            raise AuditValidationError(
                f"must-keep claim has unknown sourceId: {source_id}"
            )
        decisions_by_id[source_id] = decision
        unknown = sorted(
            set(decision.get("mustKeepIds", [])) - set(inventory_by_id)
        )
        if unknown:
            raise AuditValidationError(
                f"unknown mustKeepId: {unknown[0]}"
            )
    return decisions_by_id
```

Expected: the helper indexes only known catalog decisions and rejects duplicate
sources or unknown must-keep claims; its fenced block parses.

- [ ] **I2.18b — Add only helper `_validated_must_keep_claim`.**

```python
def _validated_must_keep_claim(
    source_id,
    decision,
    inventory_item,
    source_map,
    source_outline,
    policy,
):
    must_keep_id = inventory_item["mustKeepId"]
    roles = _matched_route_roles(
        source_map[source_id],
        inventory_item,
        source_map,
        source_outline,
    )
    if not roles:
        raise AuditValidationError(
            f"must-keep route mismatch: {must_keep_id} <- {source_id}"
        )
    if inventory_item["versionStatus"] == "current":
        if decision.get("disposition") not in {
            "included",
            "compressed",
            "missing",
        }:
            raise AuditValidationError(
                f"current must-keep disposition mismatch: {source_id}"
            )
        if not (
            set(decision.get("lessonIds", []))
            & set(inventory_item["lessonIds"])
        ):
            raise AuditValidationError(
                f"must-keep lesson mismatch: {must_keep_id} <- {source_id}"
            )
    elif (
        decision.get("disposition") != "excluded"
        or decision.get("lessonIds") != []
        or decision.get("reason") != policy["versionBoundaryReason"]
        or "primary" not in roles
    ):
        raise AuditValidationError(
            f"future must-keep mismatch: {must_keep_id} <- {source_id}"
        )
    return {"sourceId": source_id, "roles": roles}
```

Expected: the helper validates one claimed route, lesson/disposition pairing,
and future-version boundary, then returns the accepted claim evidence.

- [ ] **I2.18c — Add only helper `_collect_valid_must_keep_claims`.**

```python
def _collect_valid_must_keep_claims(
    decisions_by_id,
    inventory_by_id,
    source_map,
    source_outline,
    policy,
):
    valid_claims = {
        must_keep_id: [] for must_keep_id in inventory_by_id
    }
    for source_id, decision in decisions_by_id.items():
        if decision.get("reviewState") != "reviewed":
            continue
        for must_keep_id in decision.get("mustKeepIds", []):
            valid_claims[must_keep_id].append(
                _validated_must_keep_claim(
                    source_id,
                    decision,
                    inventory_by_id[must_keep_id],
                    source_map,
                    source_outline,
                    policy,
                )
            )
    return valid_claims
```

Expected: the helper collects validated reviewed claims under every inventory
ID and preserves empty buckets for the later complete gate.

- [ ] **I2.18d — Replace only staged incremental `validate_must_keep_coverage`.**

```python
def validate_must_keep_coverage(
    inventory,
    decisions,
    source_map,
    source_outline,
    policy,
    require_complete=False,
):
    if type(require_complete) is not bool:
        raise TypeError("require_complete must be a bool")
    _validate_inventory_structure(inventory, policy)
    inventory_by_id = {
        item["mustKeepId"]: item for item in inventory
    }
    decisions_by_id = _must_keep_decisions_by_id(
        decisions, source_map, inventory_by_id,
    )
    _collect_valid_must_keep_claims(
        decisions_by_id,
        inventory_by_id,
        source_map,
        source_outline,
        policy,
    )
```

Expected: this staged public definition replaces the bootstrap stub and
enforces all incremental claim checks; complete coverage remains RED for I2.19.

- [ ] **G2.18 — Re-run `MustKeepTests.test_incremental_gate_rejects_wrong_must_keep_routes` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_must_keep.MustKeepTests.test_incremental_gate_rejects_wrong_must_keep_routes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.19 — Write `MustKeepTests.test_complete_gate_rejects_secondary_only_or_unclaimed_items`.**

```python
class MustKeepTests(unittest.TestCase):
    def test_complete_gate_rejects_secondary_only_or_unclaimed_items(self):
        for lesson_id, secondary_chapter in (("2-3", 2), ("1-3", 1)):
            with self.subTest(lesson_id=lesson_id):
                decisions, source_map, source_outline = (
                    course_route_claim_fixture(
                        lesson_id, secondary_chapter
                    )
                )
                with self.assertRaisesRegex(
                    AuditValidationError, "primarySourceRoutes"
                ):
                    validate_must_keep_coverage(
                        sample_must_keep_inventory(),
                        decisions,
                        source_map,
                        source_outline,
                        sample_policy(),
                        require_complete=True,
                    )
```

Expected: only `MustKeepTests.test_complete_gate_rejects_secondary_only_or_unclaimed_items` is added in this action, and the shown Python block parses.

- [ ] **R2.19 — Run `MustKeepTests.test_complete_gate_rejects_secondary_only_or_unclaimed_items` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_must_keep.MustKeepTests.test_complete_gate_rejects_secondary_only_or_unclaimed_items -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_must_keep_coverage` and proves that exact function or branch contract is not yet present.

- [ ] **I2.19a — Add only helper `_require_complete_must_keep_claims`.**

```python
def _require_complete_must_keep_claims(
    inventory_by_id,
    valid_claims,
):
    for must_keep_id in inventory_by_id:
        claims = valid_claims[must_keep_id]
        if not claims:
            raise AuditValidationError(
                f"unclaimed mustKeepId: {must_keep_id}"
            )
        if not any("primary" in claim["roles"] for claim in claims):
            raise AuditValidationError(
                f"primarySourceRoutes not satisfied: {must_keep_id}"
            )
```

Expected: the helper rejects every unclaimed or secondary-only inventory item;
its fenced block parses.

- [ ] **I2.19b — Replace only staged `validate_must_keep_coverage`.**

```python
def validate_must_keep_coverage(
    inventory,
    decisions,
    source_map,
    source_outline,
    policy,
    require_complete=False,
):
    if type(require_complete) is not bool:
        raise TypeError("require_complete must be a bool")
    _validate_inventory_structure(inventory, policy)
    inventory_by_id = {
        item["mustKeepId"]: item for item in inventory
    }
    decisions_by_id = _must_keep_decisions_by_id(
        decisions, source_map, inventory_by_id,
    )
    valid_claims = _collect_valid_must_keep_claims(
        decisions_by_id,
        inventory_by_id,
        source_map,
        source_outline,
        policy,
    )
    if require_complete:
        _require_complete_must_keep_claims(
            inventory_by_id, valid_claims,
        )
```

Expected: the final public definition replaces the incremental stage, reuses
its validated claims, and adds the complete-coverage gate only when requested.

- [ ] **G2.19 — Re-run `MustKeepTests.test_complete_gate_rejects_secondary_only_or_unclaimed_items` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_must_keep.MustKeepTests.test_complete_gate_rejects_secondary_only_or_unclaimed_items -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T2.20 — Write `BuildReportsTests.test_initial_decision_delegates_to_editorial_contract`.**

```python
class BuildReportsTests(unittest.TestCase):
    def test_initial_decision_delegates_to_editorial_contract(self):
        item = {"sourceId": "page-001", "kind": "page", "pdfPage": 1, "chapter": 1}
        self.assertEqual(initial_decision(item), initial_editorial_decision(item))
```

Expected: only `BuildReportsTests.test_initial_decision_delegates_to_editorial_contract` is added in this action, and the shown Python block parses.

- [ ] **R2.20 — Run `BuildReportsTests.test_initial_decision_delegates_to_editorial_contract` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportsTests.test_initial_decision_delegates_to_editorial_contract -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `initial_decision` and proves that exact function or branch contract is not yet present.

- [ ] **I2.20 — Implement only `initial_decision`.**

```python
def initial_decision(item: dict) -> dict:
    return initial_editorial_decision(item)
```

Expected: only `initial_decision` is added or changed in this action, and the shown Python block parses.

- [ ] **G2.20 — Re-run `BuildReportsTests.test_initial_decision_delegates_to_editorial_contract` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportsTests.test_initial_decision_delegates_to_editorial_contract -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **F2 — Run the Task 2 focused gate.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_decisions tests.source_audit.test_must_keep tests.source_audit.test_build_reports -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **A2 — Run the complete repository suite.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **C2 — Commit Task 2.**

```bash
git add scripts/source_audit/decisions.py scripts/source_audit/must_keep.py scripts/source_audit/build_reports.py tests/source_audit/test_decisions.py tests/source_audit/test_must_keep.py tests/source_audit/test_build_reports.py
git commit -m "feat: validate editorial review decisions"
```

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 3: Rollback-capable writes and page discovery transactions

**Files:**
- Create: `scripts/source_audit/transactions.py`
- Create: `scripts/source_audit/prepare_review_batch.py`
- Create: `tests/source_audit/test_transactions.py`
- Create: `tests/source_audit/test_prepare_review_batch.py`

**Interfaces:**
- Consumes: source catalog, decisions, one complete page discovery patch.
- Produces:
  - `deterministic_json_bytes(value: object) -> bytes`
  - `sha256_json(value: object) -> str`
  - `write_files_transaction(values_by_path: dict[Path, bytes]) -> None`
  - `write_json_transaction(values_by_path: dict[Path, object]) -> None`
  - `apply_discovery_patch(index: dict, visuals: list[dict], decisions: list[dict], patch: dict, policy: dict) -> tuple[list[dict], list[dict], dict[str, str]]`
  - CLI `python3 -m scripts.source_audit.prepare_review_batch`

- [ ] **S3.B01 — Bootstrap only `scripts/source_audit/transactions.py`.**

```python
from __future__ import annotations

import hashlib
import json
import os
import stat
import tempfile
import unicodedata
from pathlib import Path

from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
)


def _pending(name):
    raise NotImplementedError(name)


def deterministic_json_bytes(value: object) -> bytes:
    return _pending("deterministic_json_bytes")


def sha256_json(value: object) -> str:
    return _pending("sha256_json")


def _stage_bytes(target: Path, payload: bytes, mode: int) -> Path:
    return _pending("_stage_bytes")


def write_files_transaction(values_by_path: dict[Path, bytes]) -> None:
    _pending("write_files_transaction")


def write_json_transaction(values_by_path: dict[Path, object]) -> None:
    _pending("write_json_transaction")
```

Expected: the new module imports and exposes all four APIs as named stubs;
later I3 blocks replace, never duplicate, these definitions.

- [ ] **S3.B02 — Bootstrap only `scripts/source_audit/prepare_review_batch.py`.**

```python
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import re
import sys
from pathlib import Path

from scripts.source_audit.catalog import (
    source_items_by_id,
    stable_visual_id,
)
from scripts.source_audit.decisions import (
    upgrade_editorial_decisions,
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    load_json,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_json_transaction,
)


STABLE_VISUAL_ID = re.compile(r"visual-p([0-9]{3})-([0-9]{2})")
DISCOVERY_EVIDENCE_VALUE = re.compile(
    r"(.+?)[；;]\s*PDF 第([0-9]+)页(?:.+)?"
)


def _pending(name):
    raise NotImplementedError(name)


def apply_discovery_patch(index, visuals, decisions, patch, policy):
    return _pending("apply_discovery_patch")


def persist_discovery_candidates(paths, candidates):
    _pending("persist_discovery_candidates")


def _update_target_symbol_alternatives(page, symbol_review, decisions, local_to_stable):
    _pending("_update_target_symbol_alternatives")


def _assert_discovery_targets_unreviewed(patch, decisions):
    _pending("_assert_discovery_targets_unreviewed")


def discovery_command(args): return _pending("discovery_command")
def freeze_command(args): return _pending("freeze_command")
def verify_command(args): return _pending("verify_command")
def build_parser(): return _pending("build_parser")
def main(argv=None): return _pending("main")
```

Expected: the command module imports before any handler is implemented; all
Task 3–6 public handlers are present as named stubs.

- [ ] **S3.B03 — Bootstrap only `tests/source_audit/test_transactions.py`.**

```python
import hashlib
import json
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from unittest.mock import patch

from scripts.source_audit.transactions import (
    _stage_bytes,
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
    write_json_transaction,
)


def _fail_at(real_replace, failure_position):
    calls = {"count": 0}

    def injected_replace(source, target):
        calls["count"] += 1
        if calls["count"] == failure_position:
            raise OSError("replace failed")
        return real_replace(source, target)

    return injected_replace


class TransactionFixture(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.first = self.root / "first.json"
        self.second = self.root / "second.json"
        self.third = self.root / "third.json"
        self.restore_original_fixtures()

    def restore_original_fixtures(self):
        for path, payload, mode in (
            (self.first, b"old-a", 0o640),
            (self.second, b"old-b", 0o600),
            (self.third, b"old-c", 0o644),
        ):
            path.write_bytes(payload)
            os.chmod(path, mode)

    def tearDown(self):
        self.temporary.cleanup()


class TransactionTests(TransactionFixture): pass
class TransactionRollbackTests(TransactionFixture): pass
```

Expected: unittest imports two concrete test classes sharing one test-only
temporary-file fixture with byte and mode restoration.

- [ ] **S3.B04 — Bootstrap only `tests/source_audit/test_prepare_review_batch.py`.**

```python
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
from tests.source_audit.editorial_fixtures import (
    discovery_cli_workspace,
    frozen_batch,
    sample_batch_manifest,
    sample_calibration_decisions,
    sample_calibration_index,
    sample_freeze_args,
    sample_policy,
    sample_verify_args,
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


class PrepareReviewBatchFreezeTests(unittest.TestCase): pass
class PrepareReviewBatchVerifyTests(unittest.TestCase): pass
class PrepareReviewBatchDiscoveryTests(unittest.TestCase): pass
class PrepareReviewBatchCliTests(unittest.TestCase): pass
```

Expected: unittest imports the module and discovers exactly these five classes;
later Task 3, 5, and 6 test blocks insert methods into them.

#### Transaction behavior cycles

- [ ] **T3.1 — Write `TransactionTests.test_deterministic_json_bytes_is_sorted_utf8_with_newline`.**

```python
class TransactionTests(unittest.TestCase):
    def test_deterministic_json_bytes_is_sorted_utf8_with_newline(self):
        payload = deterministic_json_bytes({"乙": 2, "a": 1})
        self.assertEqual(
            payload,
            b'{\n  "a": 1,\n  "\\u4e59": 2\n}\n'.replace(
                b"\\u4e59",
                "乙".encode("utf-8"),
            ),
        )
```

Expected: only `TransactionTests.test_deterministic_json_bytes_is_sorted_utf8_with_newline` is added in this action, and the shown Python block parses.

- [ ] **R3.1 — Run `TransactionTests.test_deterministic_json_bytes_is_sorted_utf8_with_newline` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_deterministic_json_bytes_is_sorted_utf8_with_newline -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `deterministic_json_bytes` and proves that exact function or branch contract is not yet present.

- [ ] **I3.1 — Implement only `deterministic_json_bytes`.**

```python
def deterministic_json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")
```

Expected: only `deterministic_json_bytes` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.1 — Re-run `TransactionTests.test_deterministic_json_bytes_is_sorted_utf8_with_newline` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_deterministic_json_bytes_is_sorted_utf8_with_newline -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.2 — Write `TransactionTests.test_sha256_json_hashes_deterministic_bytes`.**

```python
class TransactionTests(unittest.TestCase):
    def test_sha256_json_hashes_deterministic_bytes(self):
        value = {"b": 2, "a": 1}
        self.assertEqual(
            sha256_json(value),
            hashlib.sha256(deterministic_json_bytes(value)).hexdigest(),
        )
```

Expected: only `TransactionTests.test_sha256_json_hashes_deterministic_bytes` is added in this action, and the shown Python block parses.

- [ ] **R3.2 — Run `TransactionTests.test_sha256_json_hashes_deterministic_bytes` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_sha256_json_hashes_deterministic_bytes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `sha256_json` and proves that exact function or branch contract is not yet present.

- [ ] **I3.2 — Implement only `sha256_json`.**

```python
def sha256_json(value: object) -> str:
    return hashlib.sha256(deterministic_json_bytes(value)).hexdigest()
```

Expected: only `sha256_json` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.2 — Re-run `TransactionTests.test_sha256_json_hashes_deterministic_bytes` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_sha256_json_hashes_deterministic_bytes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.3 — Write `TransactionTests.test_temporary_files_are_staged_beside_target`.**

```python
class TransactionTests(unittest.TestCase):
    def test_temporary_files_are_staged_beside_target(self):
        target = self.root / "nested" / "state.json"
        temporary = _stage_bytes(target, b"payload", 0o640)
        try:
            self.assertEqual(temporary.parent, target.parent)
            self.assertEqual(temporary.read_bytes(), b"payload")
            self.assertEqual(stat.S_IMODE(temporary.stat().st_mode), 0o640)
        finally:
            temporary.unlink(missing_ok=True)
```

Expected: only `TransactionTests.test_temporary_files_are_staged_beside_target` is added in this action, and the shown Python block parses.

- [ ] **R3.3 — Run `TransactionTests.test_temporary_files_are_staged_beside_target` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_temporary_files_are_staged_beside_target -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_stage_bytes` and proves that exact function or branch contract is not yet present.

- [ ] **I3.3 — Implement only `_stage_bytes`.**

```python
def _stage_bytes(target: Path, payload: bytes, mode: int) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{target.name}.",
        suffix=".tmp",
        dir=target.parent,
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as staged:
            staged.write(payload)
            staged.flush()
            os.fsync(staged.fileno())
        os.chmod(temporary, mode)
        return temporary
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
```

Expected: only `_stage_bytes` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.3 — Re-run `TransactionTests.test_temporary_files_are_staged_beside_target` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_temporary_files_are_staged_beside_target -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.4 — Write `TransactionTests.test_failure_at_first_replace_touches_no_target`.**

```python
class TransactionTests(unittest.TestCase):
    def test_failure_at_first_replace_touches_no_target(self):
        before = {self.first: self.first.read_bytes(), self.second: self.second.read_bytes()}
        with patch(
            "scripts.source_audit.transactions.os.replace",
            side_effect=OSError("first replace failed"),
        ):
            with self.assertRaisesRegex(OSError, "first replace failed"):
                write_files_transaction({self.first: b"new-a", self.second: b"new-b"})
        self.assertEqual(
            {self.first: self.first.read_bytes(), self.second: self.second.read_bytes()},
            before,
        )
```

Expected: only `TransactionTests.test_failure_at_first_replace_touches_no_target` is added in this action, and the shown Python block parses.

- [ ] **R3.4 — Run `TransactionTests.test_failure_at_first_replace_touches_no_target` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_failure_at_first_replace_touches_no_target -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `write_files_transaction` and proves that exact function or branch contract is not yet present.

- [ ] **I3.4a — Add only transaction normalization helpers.**

```python
def _normalized_transaction_values(values_by_path):
    if not isinstance(values_by_path, dict):
        raise TypeError("values_by_path must be a dict")
    normalized = {}
    for raw_path, payload in values_by_path.items():
        path = Path(raw_path)
        if not isinstance(payload, bytes):
            raise TypeError(f"transaction payload must be bytes: {path}")
        if path.exists() and not path.is_file():
            raise AuditValidationError(
                f"transaction target must be a file: {path}"
            )
        normalized[path] = payload
    assert_distinct_paths({
        f"transaction-target-{position}": path
        for position, path in enumerate(normalized, start=1)
    })
    return normalized


def _ordered_transaction_paths(normalized):
    return sorted(
        normalized,
        key=lambda path: unicodedata.normalize(
            "NFC", str(path.resolve(strict=False))
        ).casefold(),
    )
```

Expected: input typing, alias rejection, and stable target ordering are
isolated without replacing the public writer yet.

- [ ] **I3.4b — Add only `_transaction_snapshots`.**

```python
def _transaction_snapshots(ordered):
    return {
        path: {
            "existed": path.exists(),
            "bytes": path.read_bytes() if path.exists() else b"",
            "mode": (
                stat.S_IMODE(path.stat().st_mode)
                if path.exists()
                else 0o644
            ),
        }
        for path in ordered
    }
```

Expected: this helper captures pre-transaction bytes and modes once.

- [ ] **I3.4c — Implement only `write_files_transaction` first replacement.**

```python
def write_files_transaction(values_by_path: dict[Path, bytes]) -> None:
    normalized = _normalized_transaction_values(values_by_path)
    ordered = _ordered_transaction_paths(normalized)
    snapshots = _transaction_snapshots(ordered)
    staged: dict[Path, Path] = {}
    committed: list[Path] = []
    try:
        for path in ordered:
            staged[path] = _stage_bytes(
                path, normalized[path], snapshots[path]["mode"]
            )
        for path in ordered:
            os.replace(staged[path], path)
            committed.append(path)
            staged.pop(path, None)
    except BaseException:
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)
        raise
    finally:
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)
```

Expected: the public writer stages beside each target and leaves every target
untouched when the first replacement fails.

- [ ] **G3.4 — Re-run `TransactionTests.test_failure_at_first_replace_touches_no_target` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_failure_at_first_replace_touches_no_target -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.5 — Write `TransactionRollbackTests.test_each_commit_failure_restores_bytes_and_modes`.**

```python
class TransactionRollbackTests(unittest.TestCase):
    def test_each_commit_failure_restores_bytes_and_modes(self):
        real_replace = os.replace
        for failure_position in (1, 2, 3):
            with self.subTest(failure_position=failure_position):
                self.restore_original_fixtures()
                before = {
                    path: (
                        path.read_bytes(),
                        stat.S_IMODE(path.stat().st_mode),
                    )
                    for path in (self.first, self.second, self.third)
                }
                with patch(
                    "scripts.source_audit.transactions.os.replace",
                    side_effect=_fail_at(real_replace, failure_position),
                ):
                    with self.assertRaisesRegex(OSError, "replace failed"):
                        write_files_transaction({
                            self.first: b"new-a",
                            self.second: b"new-b",
                            self.third: b"new-c",
                        })
                after = {
                    path: (
                        path.read_bytes(),
                        stat.S_IMODE(path.stat().st_mode),
                    )
                    for path in (self.first, self.second, self.third)
                }
                self.assertEqual(after, before)
```

Expected: only `TransactionRollbackTests.test_each_commit_failure_restores_bytes_and_modes` is added in this action, and the shown Python block parses.

- [ ] **R3.5 — Run `TransactionRollbackTests.test_each_commit_failure_restores_bytes_and_modes` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionRollbackTests.test_each_commit_failure_restores_bytes_and_modes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `write_files_transaction` and proves that exact function or branch contract is not yet present.

- [ ] **I3.5a — Add only `_restore_committed_paths`.**

```python
def _restore_committed_paths(committed, snapshots):
    rollback_error = None
    for path in reversed(committed):
        snapshot = snapshots[path]
        try:
            if snapshot["existed"]:
                restore = _stage_bytes(
                    path, snapshot["bytes"], snapshot["mode"]
                )
                try:
                    os.replace(restore, path)
                finally:
                    restore.unlink(missing_ok=True)
            else:
                # New-target removal is the next TDD branch.
                pass
        except BaseException as error:
            rollback_error = rollback_error or error
    return rollback_error
```

Expected: committed existing targets restore in reverse order; the new-target
branch intentionally remains RED for T3.6.

- [ ] **I3.5b — Replace only `write_files_transaction` rollback orchestration.**

```python
def write_files_transaction(values_by_path: dict[Path, bytes]) -> None:
    normalized = _normalized_transaction_values(values_by_path)
    ordered = _ordered_transaction_paths(normalized)
    snapshots = _transaction_snapshots(ordered)
    staged: dict[Path, Path] = {}
    committed: list[Path] = []
    try:
        for path in ordered:
            staged[path] = _stage_bytes(
                path, normalized[path], snapshots[path]["mode"]
            )
        for path in ordered:
            os.replace(staged[path], path)
            committed.append(path)
            staged.pop(path, None)
    except BaseException as original_error:
        rollback_error = _restore_committed_paths(
            committed, snapshots,
        )
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)
        if rollback_error is not None:
            raise RuntimeError(
                "transaction failed and rollback was incomplete"
            ) from rollback_error
        raise original_error
    finally:
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)
```

Expected: only public rollback orchestration changes; helper failures are
reported without hiding the original commit failure.

- [ ] **G3.5 — Re-run `TransactionRollbackTests.test_each_commit_failure_restores_bytes_and_modes` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionRollbackTests.test_each_commit_failure_restores_bytes_and_modes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.6 — Write `TransactionTests.test_rollback_removes_new_target_and_all_temp_files`.**

```python
class TransactionTests(unittest.TestCase):
    def test_rollback_removes_new_target_and_all_temp_files(self):
        new_target = self.root / "new.json"
        with patch(
            "scripts.source_audit.transactions.os.replace",
            side_effect=[None, OSError("second replace failed"), None],
        ):
            with self.assertRaisesRegex(OSError, "second replace failed"):
                write_files_transaction({new_target: b"new", self.second: b"changed"})
        self.assertFalse(new_target.exists())
        self.assertEqual(list(self.root.rglob("*.tmp")), [])
```

Expected: only `TransactionTests.test_rollback_removes_new_target_and_all_temp_files` is added in this action, and the shown Python block parses.

- [ ] **R3.6 — Run `TransactionTests.test_rollback_removes_new_target_and_all_temp_files` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_rollback_removes_new_target_and_all_temp_files -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `write_files_transaction` and proves that exact function or branch contract is not yet present.

- [ ] **I3.6 — Replace only `_restore_committed_paths` new-target branch.**

```python
def _restore_committed_paths(committed, snapshots):
    rollback_error = None
    for path in reversed(committed):
        snapshot = snapshots[path]
        try:
            if snapshot["existed"]:
                restore = _stage_bytes(
                    path, snapshot["bytes"], snapshot["mode"]
                )
                try:
                    os.replace(restore, path)
                finally:
                    restore.unlink(missing_ok=True)
            else:
                path.unlink(missing_ok=True)
        except BaseException as error:
            rollback_error = rollback_error or error
    return rollback_error
```

Expected: only the staged helper is replaced; committed new targets are now
removed while temporary cleanup remains owned by the public writer.

- [ ] **G3.6 — Re-run `TransactionTests.test_rollback_removes_new_target_and_all_temp_files` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_rollback_removes_new_target_and_all_temp_files -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.7 — Write `TransactionTests.test_write_json_transaction_uses_canonical_bytes`.**

```python
class TransactionTests(unittest.TestCase):
    def test_write_json_transaction_uses_canonical_bytes(self):
        write_json_transaction({self.first: {"b": 2, "a": 1}})
        self.assertEqual(
            self.first.read_bytes(),
            deterministic_json_bytes({"a": 1, "b": 2}),
        )
```

Expected: only `TransactionTests.test_write_json_transaction_uses_canonical_bytes` is added in this action, and the shown Python block parses.

- [ ] **R3.7 — Run `TransactionTests.test_write_json_transaction_uses_canonical_bytes` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_write_json_transaction_uses_canonical_bytes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `write_json_transaction` and proves that exact function or branch contract is not yet present.

- [ ] **I3.7 — Implement only `write_json_transaction`.**

```python
def write_json_transaction(values_by_path: dict[Path, object]) -> None:
    assert_distinct_paths({
        f"transaction-target-{position}": path
        for position, path in enumerate(values_by_path, start=1)
    })
    write_files_transaction({
        path: deterministic_json_bytes(value)
        for path, value in values_by_path.items()
    })
```

Expected: only `write_json_transaction` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.7 — Re-run `TransactionTests.test_write_json_transaction_uses_canonical_bytes` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions.TransactionTests.test_write_json_transaction_uses_canonical_bytes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.8 — Write `PrepareReviewBatchTests.test_discovery_assigns_append_only_visual_ids`.**

```python
class PrepareReviewBatchTests(unittest.TestCase):
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
        self.assertIn(
            "visual-p239-01",
            {item["sourceId"] for item in candidate_visuals},
        )
        self.assertEqual(
            next(row for row in candidate_decisions if row["sourceId"] == "visual-p239-01")["reviewState"],
            "unreviewed",
        )
```

Expected: only this method is inserted into the unique
`PrepareReviewBatchTests` class.

- [ ] **R3.8 — Run the exact discovery test before adding any discovery helper.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_assigns_append_only_visual_ids -v
```

Expected: unittest collects one test and fails with `apply_discovery_patch`; an
import, class-fixture, or syntax error is invalid RED.

#### Discovery schema and implementation helpers after RED

The frozen discovery schema example 1 is:

```json
{
  "pdfPage": 239,
  "reviewer": "visual-scanner-a",
  "attempt": 1,
  "numberedVisualIds": [],
  "visuals": [],
  "symbolReview": [
    {
      "symbol": "★",
      "observedCount": 2,
      "semanticAssignments": [{
        "targetRef": "experiment-8-1",
        "count": 2,
        "meaning": "实验难度：两星"
      }],
      "nonSemanticCount": 0,
      "note": "两枚星均表示实验难度"
    }
  ]
}
```

The frozen discovery schema example 2 is:

```json
[
  {
    "localId": "new-01",
    "region": {"x": 0.12, "y": 0.24, "width": 0.66, "height": 0.31},
    "semanticBrief": "上下文、模型与行动之间的关系示意",
    "discoveryEvidence": "全页视觉扫描；PDF 第239页中部"
  },
  {
    "sourceId": "visual-p239-01",
    "region": {"x": 0.12, "y": 0.24, "width": 0.66, "height": 0.31},
    "semanticBrief": "已登记对象的再次确认",
    "discoveryEvidence": "全页视觉扫描；PDF 第239页中部"
  }
]
```

- [ ] **S3.D01 — Add only discovery helper `_validated_page`.**

```python
def _validated_page(pdf_page, index):
    if type(pdf_page) is not int or pdf_page < 1:
        raise AuditValidationError(
            f"pdfPage must be a positive integer: {pdf_page!r}"
        )
    matches = [
        page
        for page in index.get("pages", [])
        if page.get("pdfPage") == pdf_page
    ]
    if len(matches) != 1:
        raise AuditValidationError(
            f"expected one catalog page for PDF page {pdf_page}"
        )
    page = matches[0]
    if (
        page.get("kind") != "page"
        or page.get("sourceId") != f"page-{pdf_page:03d}"
    ):
        raise AuditValidationError(
            f"invalid page identity for PDF page {pdf_page}"
        )
    return page
```

Expected: only `_validated_page` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S3.D02 — Add only discovery helper `_validate_numbered_visual_ids`.**

```python
def _validate_numbered_visual_ids(page, numbered_visual_ids, index):
    if not isinstance(numbered_visual_ids, list):
        raise AuditValidationError("numberedVisualIds must be a list")
    if (
        numbered_visual_ids != sorted(set(numbered_visual_ids))
        or any(
            not isinstance(source_id, str) or not source_id.strip()
            for source_id in numbered_visual_ids
        )
    ):
        raise AuditValidationError(
            "numberedVisualIds must be sorted and unique"
        )
    expected = sorted(
        item["sourceId"]
        for item in index.get("numberedItems", [])
        if item.get("pdfPage") == page["pdfPage"]
        and item.get("kind") in {"figure", "table"}
    )
    if numbered_visual_ids != expected:
        raise AuditValidationError(
            f"numberedVisualIds mismatch on page {page['pdfPage']}"
        )
```

Expected: only `_validate_numbered_visual_ids` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S3.D03 — Add only discovery helper `_validated_discovery_region`.**

```python
def _validated_discovery_region(label, region):
    if not isinstance(region, dict) or set(region) != {
        "x",
        "y",
        "width",
        "height",
    }:
        raise AuditValidationError(
            f"discovery region fields mismatch: {label}"
        )
    for field in ("x", "y", "width", "height"):
        value = region[field]
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise AuditValidationError(
                f"discovery region.{field} is invalid: {label}"
            )
    if (
        region["x"] < 0
        or region["y"] < 0
        or region["width"] <= 0
        or region["height"] <= 0
        or region["x"] + region["width"] > 1
        or region["y"] + region["height"] > 1
    ):
        raise AuditValidationError(
            f"discovery region is outside the page: {label}"
        )
```

Expected: only `_validated_discovery_region` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S3.D04 — Add only discovery helper `_validated_discovery_payload`.**

```python
def _validated_discovery_payload(item, pdf_page):
    if not isinstance(item, dict):
        raise AuditValidationError("discovery visual must be an object")
    identity_fields = set(item) & {"localId", "sourceId"}
    if identity_fields == {"localId"}:
        expected_fields = {
            "localId",
            "region",
            "semanticBrief",
            "discoveryEvidence",
        }
        identity = item["localId"]
    elif identity_fields == {"sourceId"}:
        expected_fields = {
            "sourceId",
            "region",
            "semanticBrief",
            "discoveryEvidence",
        }
        identity = item["sourceId"]
    else:
        raise AuditValidationError(
            "discovery visual requires exactly one of localId/sourceId"
        )
    if set(item) != expected_fields:
        raise AuditValidationError(
            f"discovery visual fields mismatch: {identity!r}"
        )
    if not isinstance(identity, str) or not identity.strip():
        raise AuditValidationError("discovery visual identity is blank")
    _validated_discovery_region(identity, item["region"])
    if (
        not isinstance(item["semanticBrief"], str)
        or not item["semanticBrief"].strip()
    ):
        raise AuditValidationError(
            f"semanticBrief must be non-blank: {identity}"
        )
    evidence = item["discoveryEvidence"]
    match = (
        DISCOVERY_EVIDENCE_VALUE.fullmatch(evidence)
        if isinstance(evidence, str)
        else None
    )
    if (
        match is None
        or not match.group(1).strip()
        or int(match.group(2)) != pdf_page
    ):
        raise AuditValidationError(
            f"discoveryEvidence page/method mismatch: {identity}"
        )
    return identity
```

Expected: only `_validated_discovery_payload` scaffold or schema unit is added, and its fenced block parses.

- [ ] **S3.D05a — Add only discovery helper `_current_visuals_on_page`.**

```python
def _current_visuals_on_page(page, candidate_visuals):
    if not isinstance(candidate_visuals, list):
        raise AuditValidationError("visual catalog must be a list")
    pdf_page = page["pdfPage"]
    current_on_page = {
        item["sourceId"]: item
        for item in candidate_visuals
        if item.get("pdfPage") == pdf_page
    }
    if len(current_on_page) != sum(
        item.get("pdfPage") == pdf_page for item in candidate_visuals
    ):
        raise AuditValidationError(
            f"duplicate catalog visual on page {pdf_page}"
        )
    catalog_ids = {
        item.get("sourceId") for item in candidate_visuals
    }
    return current_on_page, catalog_ids
```

Expected: the helper indexes the existing page inventory, rejects duplicate
on-page IDs, and returns the full catalog ID set.

- [ ] **S3.D05b — Add only discovery helper `_partition_discovery_visuals`.**

```python
def _partition_discovery_visuals(
    page,
    patch_visuals,
    current_on_page,
    catalog_ids,
):
    if not isinstance(patch_visuals, list):
        raise AuditValidationError("visuals must be a list")
    pdf_page = page["pdfPage"]
    seen_local_ids = set()
    seen_source_ids = set()
    reading_positions = []
    new_items = []
    for item in patch_visuals:
        identity = _validated_discovery_payload(item, pdf_page)
        reading_positions.append(
            (item["region"]["y"], item["region"]["x"])
        )
        if "sourceId" in item:
            if identity in seen_source_ids:
                raise AuditValidationError(
                    f"duplicate confirmed visual: {identity}"
                )
            seen_source_ids.add(identity)
            formal = current_on_page.get(identity)
            expected = (
                {
                    "sourceId": formal["sourceId"],
                    "region": formal["region"],
                    "semanticBrief": formal["semanticBrief"],
                    "discoveryEvidence": formal["discoveryEvidence"],
                }
                if formal is not None
                else None
            )
            if expected is None or item != expected:
                raise AuditValidationError(
                    f"existing visual confirmation mismatch: {identity}"
                )
        else:
            if (
                identity in seen_local_ids
                or identity in catalog_ids
            ):
                raise AuditValidationError(
                    f"duplicate or colliding localId: {identity}"
                )
            seen_local_ids.add(identity)
            new_items.append(item)
    if reading_positions != sorted(reading_positions):
        raise AuditValidationError(
            "visuals must use top-to-bottom, left-to-right order"
        )
    if seen_source_ids != set(current_on_page):
        missing = sorted(set(current_on_page) - seen_source_ids)
        extra = sorted(seen_source_ids - set(current_on_page))
        raise AuditValidationError(
            "full-page visual confirmation mismatch: "
            f"missing={missing}, extra={extra}"
        )
    return seen_source_ids, new_items
```

Expected: the helper validates full-page reading order and partitions confirmed
stable IDs from collision-free local discoveries.

- [ ] **S3.D05c — Add only discovery helper `_append_discovered_visuals`.**

```python
def _append_discovered_visuals(
    page,
    current_on_page,
    candidate_visuals,
    catalog_ids,
    new_items,
):
    pdf_page = page["pdfPage"]
    ordinals = []
    for source_id in current_on_page:
        match = STABLE_VISUAL_ID.fullmatch(source_id)
        if match is None or int(match.group(1)) != pdf_page:
            raise AuditValidationError(
                f"invalid stable visual ID: {source_id}"
            )
        ordinals.append(int(match.group(2)))
    next_ordinal = max(ordinals, default=0) + 1
    local_to_stable = {}
    for item in new_items:
        stable_id = stable_visual_id(pdf_page, next_ordinal)
        if stable_id in catalog_ids:
            raise AuditValidationError(
                f"stable visual ID collision: {stable_id}"
            )
        local_to_stable[item["localId"]] = stable_id
        candidate_visuals.append({
            "sourceId": stable_id,
            "kind": "visual",
            "pdfPage": pdf_page,
            "region": copy.deepcopy(item["region"]),
            "semanticBrief": item["semanticBrief"],
            "discoveryEvidence": item["discoveryEvidence"],
        })
        catalog_ids.add(stable_id)
        next_ordinal += 1
    candidate_visuals.sort(key=lambda item: item["sourceId"])
    return local_to_stable
```

Expected: the helper validates prior ordinals, appends stable IDs without
collision, and returns the local-to-stable mapping.

- [ ] **S3.D05d — Add only discovery helper `_merge_full_page_visual_inventory`.**

```python
def _merge_full_page_visual_inventory(
    page,
    patch_visuals,
    candidate_visuals,
):
    current_on_page, catalog_ids = _current_visuals_on_page(
        page, candidate_visuals,
    )
    seen_source_ids, new_items = _partition_discovery_visuals(
        page,
        patch_visuals,
        current_on_page,
        catalog_ids,
    )
    local_to_stable = _append_discovered_visuals(
        page,
        current_on_page,
        candidate_visuals,
        catalog_ids,
        new_items,
    )
    assigned = sorted([
        *seen_source_ids,
        *local_to_stable.values(),
    ])
    return assigned, local_to_stable
```

Expected: the orchestration helper returns the same complete assigned-ID list
and local mapping while delegating each validation slice exactly once.

- [ ] **S3.D06a — Add only discovery helper `_resolved_discovery_assignment`.**

```python
def _resolved_discovery_assignment(
    assignment,
    local_to_stable,
    seen_assignments,
):
    if not isinstance(assignment, dict) or set(assignment) != {
        "targetRef",
        "count",
        "meaning",
    }:
        raise AuditValidationError(
            "semantic assignment fields mismatch"
        )
    target_ref = assignment["targetRef"]
    count = assignment["count"]
    meaning = assignment["meaning"]
    if not isinstance(target_ref, str) or not target_ref.strip():
        raise AuditValidationError("targetRef must be non-blank")
    if type(count) is not int or count < 1:
        raise AuditValidationError(
            "semantic assignment count must be positive"
        )
    if not isinstance(meaning, str) or not meaning.strip():
        raise AuditValidationError(
            "semantic assignment meaning must be non-blank"
        )
    source_id = local_to_stable.get(target_ref, target_ref)
    key = (source_id, meaning)
    if key in seen_assignments:
        raise AuditValidationError(
            f"duplicate semantic assignment: {source_id}"
        )
    seen_assignments.add(key)
    return {
        "sourceId": source_id,
        "count": count,
        "meaning": meaning,
    }
```

Expected: the helper validates one local-or-stable target reference, resolves
it to a stable source ID, and rejects duplicate semantic meanings.

- [ ] **S3.D06b — Add only discovery helper `_resolved_symbol_review_row`.**

```python
def _resolved_symbol_review_row(
    row,
    local_to_stable,
    seen_symbols,
):
    if not isinstance(row, dict) or set(row) != {
            "symbol",
            "observedCount",
            "semanticAssignments",
            "nonSemanticCount",
            "note",
    }:
        raise AuditValidationError("symbolReview fields mismatch")
    glyph_order = {"✓": 0, "✗": 1, "△": 2, "★": 3}
    symbol = row["symbol"]
    if symbol not in glyph_order or symbol in seen_symbols:
        raise AuditValidationError(
            f"invalid or duplicate symbolReview symbol: {symbol!r}"
        )
    seen_symbols.add(symbol)
    observed = row["observedCount"]
    non_semantic = row["nonSemanticCount"]
    if type(observed) is not int or observed < 0:
        raise AuditValidationError("observedCount must be non-negative")
    if type(non_semantic) is not int or non_semantic < 0:
        raise AuditValidationError(
            "nonSemanticCount must be non-negative"
        )
    if not isinstance(row["note"], str):
        raise AuditValidationError("symbolReview note must be a string")
    raw_assignments = row["semanticAssignments"]
    if not isinstance(raw_assignments, list):
        raise AuditValidationError("semanticAssignments must be a list")
    seen_assignments = set()
    assignments = [
        _resolved_discovery_assignment(
            assignment, local_to_stable, seen_assignments,
        )
        for assignment in raw_assignments
    ]
    if sum(item["count"] for item in assignments) + non_semantic != observed:
        raise AuditValidationError(
            f"symbolReview count mismatch: {symbol}"
        )
    assignments.sort(
        key=lambda item: (
            item["sourceId"], item["meaning"], item["count"],
        )
    )
    return {
        "symbol": symbol,
        "observedCount": observed,
        "semanticAssignments": assignments,
        "nonSemanticCount": non_semantic,
        "note": row["note"],
    }
```

Expected: the helper validates one glyph row, resolves and sorts its
assignments, and proves exact observed-count arithmetic.

- [ ] **S3.D06c — Add only discovery helper `_resolve_symbol_target_refs`.**

```python
def _resolve_symbol_target_refs(
    symbol_review,
    local_to_stable,
):
    if not isinstance(symbol_review, list):
        raise AuditValidationError("symbolReview must be a list")
    glyph_order = {"✓": 0, "✗": 1, "△": 2, "★": 3}
    seen_symbols = set()
    resolved_rows = [
        _resolved_symbol_review_row(
            row, local_to_stable, seen_symbols,
        )
        for row in symbol_review
    ]
    return sorted(
        resolved_rows,
        key=lambda row: glyph_order[row["symbol"]],
    )
```

Expected: the orchestration helper validates the list, delegates each row once,
and returns canonical glyph order with stable target IDs.

- [ ] **S3.D07 — Add only discovery helper `_update_page_scan_decision`.**

```python
def _update_page_scan_decision(
    page,
    patch,
    assigned,
    resolved_symbol_review,
    decisions,
):
    reviewer = patch.get("reviewer")
    attempt = patch.get("attempt")
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise AuditValidationError("discovery reviewer must be non-blank")
    if type(attempt) is not int or attempt < 1 or attempt > 99:
        raise AuditValidationError(
            "discovery attempt must be an integer from 1 to 99"
        )
    if (
        assigned != sorted(set(assigned))
        or any(
            not isinstance(source_id, str) or not source_id.strip()
            for source_id in assigned
        )
    ):
        raise AuditValidationError(
            "assigned visual IDs must be sorted and unique"
        )
    decisions_by_id = {}
    for decision in decisions:
        source_id = decision.get("sourceId")
        if source_id in decisions_by_id:
            raise AuditValidationError(
                f"duplicate decision sourceId: {source_id}"
            )
        decisions_by_id[source_id] = decision
    page_decision = decisions_by_id.get(page["sourceId"])
    if page_decision is None:
        raise AuditValidationError(
            f"missing page decision: {page['sourceId']}"
        )
    page_decision["visualReviewState"] = "reviewed"
    page_decision["visualReviewer"] = reviewer
    page_decision["discoveredVisualIds"] = list(assigned)
    page_decision["symbolReview"] = copy.deepcopy(
        resolved_symbol_review
    )
```

Expected: only `_update_page_scan_decision` scaffold or schema unit is added, and its fenced block parses.

- [ ] **I3.8 — Implement only `apply_discovery_patch ID-assignment branch`.**

```python
def apply_discovery_patch(index, visuals, decisions, patch, policy):
    _assert_discovery_targets_unreviewed(patch, decisions)
    candidate_visuals = copy.deepcopy(visuals)
    candidate_decisions = copy.deepcopy(decisions)
    page = _validated_page(patch["pdfPage"], index)
    _validate_numbered_visual_ids(page, patch["numberedVisualIds"], index)
    assigned, local_to_stable = _merge_full_page_visual_inventory(
        page, patch["visuals"], candidate_visuals
    )
    candidate_decisions = upgrade_editorial_decisions(
        index, candidate_visuals, candidate_decisions
    )
    resolved_symbol_review = _resolve_symbol_target_refs(
        patch["symbolReview"], local_to_stable
    )
    _update_page_scan_decision(
        page, patch, assigned, resolved_symbol_review, candidate_decisions
    )
    _update_target_symbol_alternatives(
        page, patch["symbolReview"], candidate_decisions, local_to_stable
    )
    validate_editorial_decisions(
        index, candidate_visuals, candidate_decisions, policy
    )
    return candidate_visuals, candidate_decisions, local_to_stable
```

Expected: only `apply_discovery_patch` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.8 — Re-run `PrepareReviewBatchTests.test_discovery_assigns_append_only_visual_ids` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_assigns_append_only_visual_ids -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.9 — Write `PrepareReviewBatchTests.test_discovery_replaces_page_symbol_alternatives`.**

```python
class PrepareReviewBatchTests(unittest.TestCase):
    def test_discovery_replaces_page_symbol_alternatives(self):
        page = {"pdfPage": 239, "sourceId": "page-239"}
        decisions = sample_calibration_decisions()
        target = next(
            row for row in decisions
            if row["sourceId"] == "experiment-cal-239-01"
        )
        target["symbolTextAlternatives"] = [{
            "symbol": "★", "pdfPage": 239, "meaning": "stale",
        }]
        _update_target_symbol_alternatives(
            page,
            [{
                "symbol": "★",
                "observedCount": 2,
                "semanticAssignments": [{
                    "targetRef": "experiment-cal-239-01",
                    "count": 2,
                    "meaning": "实验难度：两星",
                }],
                "nonSemanticCount": 0,
                "note": "两枚星均表示实验难度",
            }],
            decisions,
            {},
        )
        self.assertEqual(target["symbolTextAlternatives"], [{
            "symbol": "★", "pdfPage": 239, "meaning": "实验难度：两星",
        }])
```

Expected: only `PrepareReviewBatchTests.test_discovery_replaces_page_symbol_alternatives` is added in this action, and the shown Python block parses.

- [ ] **R3.9 — Run `PrepareReviewBatchTests.test_discovery_replaces_page_symbol_alternatives` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_replaces_page_symbol_alternatives -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_update_target_symbol_alternatives` and proves that exact function or branch contract is not yet present.

- [ ] **I3.9 — Implement only `_update_target_symbol_alternatives`.**

```python
def _update_target_symbol_alternatives(
    page,
    symbol_review,
    decisions,
    local_to_stable,
):
    decisions_by_id = {
        decision["sourceId"]: decision for decision in decisions
    }
    for observed in symbol_review:
        for target in decisions_by_id.values():
            target["symbolTextAlternatives"] = [
                entry for entry in target["symbolTextAlternatives"]
                if not (
                    entry["pdfPage"] == page["pdfPage"]
                    and entry["symbol"] == observed["symbol"]
                )
            ]
        for assignment in observed["semanticAssignments"]:
            entry = {
                "symbol": observed["symbol"],
                "pdfPage": page["pdfPage"],
                "meaning": assignment["meaning"],
            }
            target_id = local_to_stable.get(
                assignment["targetRef"], assignment["targetRef"]
            )
            target = decisions_by_id[target_id]
            target["symbolTextAlternatives"].append(entry)
            target["symbolTextAlternatives"].sort(
                key=lambda value: (
                    value["pdfPage"],
                    value["symbol"],
                    value["meaning"],
                )
            )
```

Expected: only `_update_target_symbol_alternatives` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.9 — Re-run `PrepareReviewBatchTests.test_discovery_replaces_page_symbol_alternatives` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_replaces_page_symbol_alternatives -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.10 — Write `PrepareReviewBatchTests.test_discovery_rejects_reviewed_page_visual_or_target`.**

```python
class PrepareReviewBatchTests(unittest.TestCase):
    def test_discovery_rejects_reviewed_page_visual_or_target(self):
        decisions = sample_calibration_decisions()
        page = next(row for row in decisions if row["sourceId"] == "page-239")
        page["reviewState"] = "reviewed"
        patch = self.discovery_patch(pdf_page=239, visuals=[])
        with self.assertRaisesRegex(AuditValidationError, "reviewed"):
            _assert_discovery_targets_unreviewed(patch, decisions)
```

Expected: only `PrepareReviewBatchTests.test_discovery_rejects_reviewed_page_visual_or_target` is added in this action, and the shown Python block parses.

- [ ] **R3.10 — Run `PrepareReviewBatchTests.test_discovery_rejects_reviewed_page_visual_or_target` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_rejects_reviewed_page_visual_or_target -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_assert_discovery_targets_unreviewed` and proves that exact function or branch contract is not yet present.

- [ ] **I3.10 — Implement only `_assert_discovery_targets_unreviewed`.**

```python
def _assert_discovery_targets_unreviewed(
    patch,
    decisions,
):
    decisions_by_id = {
        decision["sourceId"]: decision for decision in decisions
    }
    local_ids = {
        item["localId"] for item in patch["visuals"]
        if "localId" in item
    }
    protected_ids = {f"page-{patch['pdfPage']:03d}"}
    protected_ids.update(
        item["sourceId"] for item in patch["visuals"]
        if "sourceId" in item
    )
    protected_ids.update(
        assignment["targetRef"]
        for observed in patch["symbolReview"]
        for assignment in observed["semanticAssignments"]
        if assignment["targetRef"] not in local_ids
    )
    already_reviewed = sorted(
        source_id for source_id in protected_ids
        if decisions_by_id[source_id]["reviewState"] != "unreviewed"
    )
    if already_reviewed:
        raise AuditValidationError(
            f"discovery cannot modify reviewed IDs: {already_reviewed}"
        )
```

Expected: only `_assert_discovery_targets_unreviewed` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.10 — Re-run `PrepareReviewBatchTests.test_discovery_rejects_reviewed_page_visual_or_target` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_rejects_reviewed_page_visual_or_target -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.11 — Write `PrepareReviewBatchTests.test_discovery_cli_failure_restores_visuals_decisions_and_ledger`.**

```python
class PrepareReviewBatchTests(unittest.TestCase):
    def test_discovery_cli_failure_restores_visuals_decisions_and_ledger(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = [
                root / "visuals.json",
                root / "decisions.json",
                root / "ledger.json",
            ]
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
            self.assertEqual(
                {path: path.read_bytes() for path in paths},
                before,
            )
```

Expected: only `PrepareReviewBatchTests.test_discovery_cli_failure_restores_visuals_decisions_and_ledger` is added in this action, and the shown Python block parses.

- [ ] **R3.11 — Run `PrepareReviewBatchTests.test_discovery_cli_failure_restores_visuals_decisions_and_ledger` and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_cli_failure_restores_visuals_decisions_and_ledger -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `persist_discovery_candidates` and proves that exact function or branch contract is not yet present.

- [ ] **I3.11 — Implement only `persist_discovery_candidates`.**

```python
def persist_discovery_candidates(
    visuals_path,
    decisions_path,
    ledger_path,
    candidate_visuals,
    candidate_decisions,
    candidate_ledger,
):
    write_json_transaction({
        Path(visuals_path): candidate_visuals,
        Path(decisions_path): candidate_decisions,
        Path(ledger_path): candidate_ledger,
    })
```

Expected: only `persist_discovery_candidates` is added or changed in this action, and the shown Python block parses.

- [ ] **G3.11 — Re-run `PrepareReviewBatchTests.test_discovery_cli_failure_restores_visuals_decisions_and_ledger` and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchTests.test_discovery_cli_failure_restores_visuals_decisions_and_ledger -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.12 — Write `PrepareReviewBatchCliTests.test_parser_matches_all_task10_subcommands`.**

```python
class PrepareReviewBatchCliTests(unittest.TestCase):
    def test_parser_matches_all_task10_subcommands(self):
        parser = build_parser()
        discover = parser.parse_args([
            "discover", "--patch", "p", "--index", "i",
            "--visuals", "v", "--decisions", "d",
            "--ledger", "l", "--policy", "e",
        ])
        freeze = parser.parse_args([
            "freeze", "--manifest", "m", "--pdf", "p", "--index", "i",
            "--visuals", "v", "--decisions", "d", "--ledger", "l",
            "--policy", "e", "--analysis", "a", "--course-outline", "c",
            "--output", "o",
        ])
        verify = parser.parse_args([
            "verify", "--freeze", "f", "--pdf", "p", "--index", "i",
            "--visuals", "v", "--decisions", "d", "--ledger", "l",
            "--policy", "e", "--analysis", "a", "--course-outline", "c",
            "--image-dir", "g", "--package-dir", "k",
        ])
        self.assertIs(discover.handler, discovery_command)
        self.assertIs(freeze.handler, freeze_command)
        self.assertIs(verify.handler, verify_command)
```

Expected: only this method is inserted into the unique CLI test class.

- [ ] **R3.12 — Run the parser test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchCliTests.test_parser_matches_all_task10_subcommands -v
```

Expected: unittest collects one test and fails with `build_parser`.

- [ ] **I3.12 — Replace only the `build_parser` stub.**

```python
def build_parser():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)

    discover = commands.add_parser("discover")
    for name in ("patch", "index", "visuals", "decisions", "ledger", "policy"):
        discover.add_argument(f"--{name.replace('_', '-')}", required=True)
    discover.set_defaults(handler=discovery_command)

    freeze = commands.add_parser("freeze")
    for name in (
        "manifest", "pdf", "index", "visuals", "decisions", "ledger",
        "policy", "analysis", "course_outline", "output",
    ):
        freeze.add_argument(f"--{name.replace('_', '-')}", required=True)
    freeze.set_defaults(handler=freeze_command)

    verify = commands.add_parser("verify")
    for name in (
        "freeze", "pdf", "index", "visuals", "decisions", "ledger",
        "policy", "analysis", "course_outline", "image_dir", "package_dir",
    ):
        verify.add_argument(f"--{name.replace('_', '-')}", required=True)
    verify.set_defaults(handler=verify_command)
    return parser
```

Expected: only the staged `build_parser` definition is replaced; every Task 10
argument spelling is present exactly once.

- [ ] **G3.12 — Re-run the parser test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchCliTests.test_parser_matches_all_task10_subcommands -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T3.13 — Write `PrepareReviewBatchCliTests.test_main_dispatches_and_serializes_success`.**

```python
class PrepareReviewBatchCliTests(unittest.TestCase):
    def test_main_dispatches_and_serializes_success(self):
        argv = [
            "discover", "--patch", "p", "--index", "i",
            "--visuals", "v", "--decisions", "d",
            "--ledger", "l", "--policy", "e",
        ]
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.discovery_command",
            return_value={"status": "ok"},
        ) as handler, mock.patch(
            "sys.stdout.write",
        ) as output:
            self.assertEqual(main(argv), 0)
        handler.assert_called_once()
        output.assert_called_once_with('{\n  "status": "ok"\n}\n')
```

Expected: only this method is inserted into the unique CLI test class.

- [ ] **R3.13 — Run the main-dispatch test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchCliTests.test_main_dispatches_and_serializes_success -v
```

Expected: unittest collects one test and fails with `main`.

- [ ] **I3.13 — Replace only `main` and add the module entry point.**

```python
def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        result = args.handler(args)
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2
    sys.stdout.write(
        deterministic_json_bytes(result).decode("utf-8")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

Expected: only the staged `main` definition is replaced and one entry-point
guard is added; success exits 0 and validation failure exits 2.

- [ ] **G3.13 — Re-run the main-dispatch test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchCliTests.test_main_dispatches_and_serializes_success -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **F3 — Run the Task 3 focused gate.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_transactions tests.source_audit.test_prepare_review_batch -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **A3 — Run the complete repository suite.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **C3 — Commit Task 3.**

```bash
git add scripts/source_audit/transactions.py scripts/source_audit/prepare_review_batch.py tests/source_audit/test_transactions.py tests/source_audit/test_prepare_review_batch.py
git commit -m "feat: add visual discovery transactions"
```

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 4: Full-text page bundles and deterministic batch manifests

**Files:**
- Create: `scripts/source_audit/build_review_packages.py`
- Create: `tests/source_audit/test_build_review_packages.py`
- Modify: `scripts/source_audit/render_review_pages.py`
- Modify: `tests/source_audit/test_render_review_pages.py`

**Interfaces:**
- Consumes: approved PDF, source index, visual catalog, decisions, policy,
  analysis Markdown, course-outline Markdown, and rendered page images.
- Produces:
  - `extract_full_page_text(pdf_path: Path) -> dict[int, str]`
  - `parse_markdown_sections(path: Path, project_relative_label: str) -> list[dict]`
  - `build_page_bundle(pdf_page: int, full_text: dict[int, str], index: dict, visuals: list[dict], decisions: list[dict], policy: dict, page_image: Path, page_image_label: str, page_image_sha256: str, evidence_hashes: dict[str, str], analysis_sections: list[dict], outline_sections: list[dict], must_keep_inventory: list[dict]) -> dict`
  - `select_batch_pages(mode: str, index: dict, visuals: list[dict], decisions: list[dict], policy: dict) -> tuple[list[int], list[str]]`
  - `build_batch_manifest(batch_id: str, mode: str, index: dict, visuals: list[dict], decisions: list[dict], policy: dict, package_hashes: dict[int, dict], policy_snapshot_label: str) -> dict`
  - `selection_only_command(args) -> int`
  - `all_page_numbers(index: dict) -> list[int]`
  - CLI `python3 -m scripts.source_audit.build_review_packages`.

- [ ] **S4.B01 — Bootstrap only `scripts/source_audit/build_review_packages.py`.**

```python
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path, PurePosixPath

from pypdf import PdfReader

from scripts.source_audit.catalog import (
    source_items_by_id,
    validate_unnumbered_visuals,
)
from scripts.source_audit.decisions import validate_editorial_decisions
from scripts.source_audit.must_keep import build_must_keep_inventory
from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    load_json,
    sha256_file,
    validate_index,
)
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
)


def _pending(name):
    raise NotImplementedError(name)


def extract_full_page_text(pdf_path): return _pending("extract_full_page_text")
def parse_markdown_sections(path, project_relative_label): return _pending("parse_markdown_sections")
def build_page_bundle(**kwargs): return _pending("build_page_bundle")
def select_batch_pages(mode, index, visuals, decisions, policy): return _pending("select_batch_pages")
def build_batch_manifest(**kwargs): return _pending("build_batch_manifest")
def selection_only_command(args): return _pending("selection_only_command")
def full_build_command(args): return _pending("full_build_command")
def _validate_build_paths(args): return _pending("_validate_build_paths")
def build_parser(): return _pending("build_parser")
def _select_cli_handler(parser, args): return _pending("_select_cli_handler")
def main(argv=None): return _pending("main")
```

Expected: this module imports with every Task 4 API and both CLI handlers
present as named stubs.

- [ ] **S4.B02 — Bootstrap only `tests/source_audit/test_build_review_packages.py`.**

```python
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


class ReviewPackageTextTests(unittest.TestCase): pass
class ReviewPackageMarkdownTests(unittest.TestCase): pass
class ReviewPackageBundleTests(unittest.TestCase): pass
class ReviewPackageSelectionTests(unittest.TestCase): pass
class ReviewPackageManifestTests(unittest.TestCase): pass
class ReviewPackageCliTests(unittest.TestCase): pass
```

Expected: unittest imports this module and discovers exactly these six classes;
later T4 blocks insert methods into them.

- [ ] **S4.B03 — Add only the Task 4 import and API stub to `scripts/source_audit/render_review_pages.py`.**

```python
from scripts.source_audit.models import validate_index


def all_page_numbers(index):
    raise NotImplementedError("all_page_numbers")
```

Expected: the import joins the existing model imports and the new stub is added
once; I4.7 later replaces that stub.

- [ ] **S4.B04 — Add only the Task 4 test import to `tests/source_audit/test_render_review_pages.py`.**

```python
from scripts.source_audit.render_review_pages import all_page_numbers
```

Expected: merge this name into the existing grouped import and keep the one
existing `RenderReviewPagesTests` class.

**Page-bundle contract:**

```json
{
  "pdfPage": 20,
  "pdfSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "sourceIndexSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "unnumberedVisualsSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "decisionsSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "editorialPolicySha256": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "analysisSha256": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "courseOutlineSha256": "1111111111111111111111111111111111111111111111111111111111111111",
  "pageImage": "tmp/pdfs/source-audit/page-020.png",
  "pageImageSha256": "2222222222222222222222222222222222222222222222222222222222222222",
  "text": "full extracted page text",
  "sourceItems": [],
  "unnumberedVisuals": [],
  "symbolCounts": {},
  "lessonCandidates": [],
  "analysisRefs": [],
  "outlineRefs": [],
  "analysisEvidence": [],
  "courseObjectiveEvidence": [],
  "mustKeepInventory": [],
  "sectionBoundaryEvidence": [],
  "riskFlags": []
}
```

The calibration selector starts with all policy-required pages and the first
three scan-complete queue-external candidates. The policy candidate order is
authoritative. Pages 15, 26, and 27 are considered in that order only after the
initial external pages and only while the source count is below 30. No required
page is removed to meet the 40-source maximum. Assigned `sourceIds` contain only
records whose frozen editorial `reviewState` is `unreviewed`; accepted records
remain read-only page context.

- [ ] **T4.1 — Write ReviewPackageTextTests.test_extract_full_page_text_returns_every_pdf_page**

```python
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
```

Expected: only `ReviewPackageTextTests.test_extract_full_page_text_returns_every_pdf_page` is added in this action, and the shown Python block parses.

- [ ] **R4.1 — Run ReviewPackageTextTests.test_extract_full_page_text_returns_every_pdf_page**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageTextTests.test_extract_full_page_text_returns_every_pdf_page -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `extract_full_page_text` and proves that exact function or branch contract is not yet present.

- [ ] **I4.1 — Implement extract_full_page_text**

```python
def extract_full_page_text(pdf_path: Path) -> dict[int, str]:
    pdf_path = Path(pdf_path)
    if not pdf_path.is_file():
        raise AuditValidationError(f"PDF is missing: {pdf_path}")
    executable = shutil.which("pdftotext")
    if executable is None:
        raise AuditValidationError("pdftotext is not available")
    try:
        completed = subprocess.run(
            [
                executable,
                "-layout",
                "-enc",
                "UTF-8",
                str(pdf_path),
                "-",
            ],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as error:
        detail = error.stderr.decode("utf-8", errors="replace").strip()
        raise AuditValidationError(
            f"pdftotext failed: {detail or error.returncode}"
        ) from error
    try:
        text = completed.stdout.decode("utf-8")
    except UnicodeDecodeError as error:
        raise AuditValidationError(
            "pdftotext output is not valid UTF-8"
        ) from error
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    pages = text.split("\f")
    if pages and pages[-1] == "":
        pages.pop()
    if not pages:
        raise AuditValidationError("pdftotext returned no pages")
    return {
        pdf_page: page_text.rstrip("\n")
        for pdf_page, page_text in enumerate(pages, start=1)
    }
```

Expected: only `extract_full_page_text` is added or changed in this action, and the shown Python block parses.

- [ ] **G4.1 — Run ReviewPackageTextTests.test_extract_full_page_text_returns_every_pdf_page**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageTextTests.test_extract_full_page_text_returns_every_pdf_page -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.2 — Write ReviewPackageMarkdownTests.test_parse_markdown_sections_preserves_exact_text_and_lines**

```python
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
```

Expected: only `ReviewPackageMarkdownTests.test_parse_markdown_sections_preserves_exact_text_and_lines` is added in this action, and the shown Python block parses.

- [ ] **R4.2 — Run ReviewPackageMarkdownTests.test_parse_markdown_sections_preserves_exact_text_and_lines**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageMarkdownTests.test_parse_markdown_sections_preserves_exact_text_and_lines -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `parse_markdown_sections` and proves that exact function or branch contract is not yet present.

- [ ] **I4.2 — Implement parse_markdown_sections**

```python
def parse_markdown_sections(
    path: Path,
    project_relative_label: str,
) -> list[dict]:
    label = PurePosixPath(project_relative_label)
    if label.is_absolute() or ".." in label.parts or not label.parts:
        raise AuditValidationError(
            "Markdown evidence label must be project-relative"
        )
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    heading_line = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
    headings = []
    for position, line in enumerate(lines, start=1):
        match = heading_line.match(line)
        if match:
            headings.append({
                "path": label.as_posix(),
                "heading": match.group(2),
                "headingLevel": len(match.group(1)),
                "startLine": position,
            })
    for index, section in enumerate(headings):
        end_line = len(lines)
        for candidate in headings[index + 1:]:
            if candidate["headingLevel"] <= section["headingLevel"]:
                end_line = candidate["startLine"] - 1
                break
        section["endLine"] = end_line
        section["text"] = "\n".join(
            lines[section["startLine"] - 1:end_line]
        )
    return headings
```

Expected: only `parse_markdown_sections` is added or changed in this action, and the shown Python block parses.

- [ ] **G4.2 — Run ReviewPackageMarkdownTests.test_parse_markdown_sections_preserves_exact_text_and_lines**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageMarkdownTests.test_parse_markdown_sections_preserves_exact_text_and_lines -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.3 — Write ReviewPackageBundleTests.test_build_page_bundle_carries_complete_page_evidence**

```python
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
```

Expected: only `ReviewPackageBundleTests.test_build_page_bundle_carries_complete_page_evidence` is added in this action, and the shown Python block parses.

- [ ] **R4.3 — Run ReviewPackageBundleTests.test_build_page_bundle_carries_complete_page_evidence**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageBundleTests.test_build_page_bundle_carries_complete_page_evidence -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_page_bundle` and proves that exact function or branch contract is not yet present.

- [ ] **I4.3a — Implement only `_validate_page_bundle_inputs`.**

```python
def _validate_page_bundle_inputs(
    pdf_page,
    full_text,
    index,
    visuals,
    decisions,
    page_image,
    page_image_label,
    page_image_sha256,
    evidence_hashes,
):
    validate_index(index)
    validate_unnumbered_visuals(index, visuals)
    required_hashes = {
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "decisionsSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
    }
    if set(evidence_hashes) != required_hashes:
        raise AuditValidationError(
            "page-bundle evidence hash fields mismatch"
        )
    if any(
        not isinstance(value, str)
        or re.fullmatch(r"[0-9a-f]{64}", value) is None
        for value in evidence_hashes.values()
    ):
        raise AuditValidationError("invalid page-bundle evidence hash")
    if pdf_page not in full_text:
        raise AuditValidationError(
            f"missing full text for page {pdf_page}"
        )
    if "\\" in page_image_label:
        raise AuditValidationError(
            "serialized path must use forward slashes"
        )
    image_label = PurePosixPath(page_image_label)
    if (
        image_label.is_absolute()
        or ".." in image_label.parts
        or not image_label.parts
        or image_label.name != Path(page_image).name
    ):
        raise AuditValidationError("invalid page image label")
    if (
        re.fullmatch(r"[0-9a-f]{64}", page_image_sha256) is None
        or sha256_file(page_image) != page_image_sha256
    ):
        raise AuditValidationError("page image SHA-256 mismatch")
    source_map = source_items_by_id(index, visuals)
    decision_map = {
        decision["sourceId"]: decision for decision in decisions
    }
    if set(decision_map) != set(source_map):
        raise AuditValidationError(
            "page bundle requires complete decisions"
        )
    page_rows = [
        item for item in index["pages"]
        if item["pdfPage"] == pdf_page
    ]
    if len(page_rows) != 1:
        raise AuditValidationError(
            f"expected one page record for page {pdf_page}"
        )
    return image_label, source_map, decision_map, page_rows[0]
```

Expected: only `_validate_page_bundle_inputs` is added in this action, and the shown Python block parses.

- [ ] **I4.3b — Implement only `_lesson_candidates_for_item`.**

```python
def _lesson_candidates_for_item(item, index, policy):
    candidates = copy.deepcopy(
        policy["chapterLessonCandidates"].get(
            str(item.get("chapter")),
            [],
        )
    )
    boundaries = []
    outline_positions = {
        row["sourceId"]: position
        for position, row in enumerate(index["outline"])
    }
    for title, routed in policy[
        "sectionLessonCandidates"
    ].items():
        matches = [
            (position, row)
            for position, row in enumerate(index["outline"])
            if row["title"] == title
        ]
        if len(matches) != 1:
            raise AuditValidationError(
                f"expected one source outline anchor: {title}"
            )
        position, start = matches[0]
        following = [
            (candidate_position, row)
            for candidate_position, row in enumerate(
                index["outline"][position + 1:],
                start=position + 1,
            )
            if row["depth"] <= start["depth"]
        ]
        next_position, next_start = (
            following[0]
            if following
            else (len(index["outline"]), None)
        )
        if item["kind"] == "outline":
            current = outline_positions[item["sourceId"]]
            if position <= current < next_position:
                candidates.extend(copy.deepcopy(routed))
            continue
        end_page = (
            next_start["pdfPage"]
            if next_start is not None
            else max(row["pdfPage"] for row in index["outline"]) + 1
        )
        if start["pdfPage"] <= item["pdfPage"] < end_page:
            candidates.extend(copy.deepcopy(routed))
        elif (
            next_start is not None
            and item["pdfPage"] == next_start["pdfPage"]
        ):
            boundaries.append({
                "riskFlag": "section-boundary",
                "previousSection": title,
                "nextSection": next_start["title"],
                "pdfPage": item["pdfPage"],
                "lessonCandidates": copy.deepcopy(routed),
            })
    role_order = {"primary": 0, "secondary": 1}
    by_lesson = {}
    for candidate in candidates:
        lesson_id = candidate["lessonId"]
        current = by_lesson.get(lesson_id)
        if (
            current is None
            or role_order[candidate["role"]]
            < role_order[current["role"]]
        ):
            by_lesson[lesson_id] = candidate
    return [by_lesson[key] for key in sorted(by_lesson)], boundaries
```

Expected: only `_lesson_candidates_for_item` is added in this action, and the shown Python block parses.

- [ ] **I4.3c — Implement only the Markdown-evidence helpers.**

```python
def _markdown_evidence_rows(sections):
    rows = {}
    for section in sections:
        reference = (
            f"{section['path']}:{section['startLine']}-"
            f"{section['endLine']}"
        )
        rows[reference] = {
            "ref": reference,
            "heading": section["heading"],
            "text": section["text"],
        }
    return rows


def _item_markdown_evidence(
    item,
    routes,
    analysis_sections,
    outline_sections,
    policy,
):
    chapter = item.get("chapter")
    chapter_rows = [
        section for section in analysis_sections
        if section["heading"].startswith(f"第{chapter}章 ")
    ] if chapter is not None else []
    if chapter is not None and len(chapter_rows) != 1:
        raise AuditValidationError(
            f"expected one analysis section for chapter {chapter}"
        )
    high_risk_headings = set(
        policy["analysisHeadingAnchors"].values()
    )
    high_risk_rows = [
        section for section in analysis_sections
        if section["heading"] in high_risk_headings
    ]
    if {
        section["heading"] for section in high_risk_rows
    } != high_risk_headings:
        raise AuditValidationError(
            "analysis heading anchor mismatch"
        )
    outline_rows = []
    for route in routes:
        matches = [
            section for section in outline_sections
            if section["heading"].startswith(
                route["lessonId"] + " "
            )
        ]
        if len(matches) != 1:
            raise AuditValidationError(
                "expected one outline heading for "
                + route["lessonId"]
            )
        outline_rows.append(matches[0])
    analysis = _markdown_evidence_rows([
        *chapter_rows,
        *high_risk_rows,
    ])
    outline = _markdown_evidence_rows(outline_rows)
    return analysis, outline
```

Expected: only `_markdown_evidence_rows` and `_item_markdown_evidence` are added in this action, and the shown Python block parses.

- [ ] **I4.3d — Implement only `_page_source_evidence`.**

```python
def _page_source_evidence(
    pdf_page,
    source_map,
    decision_map,
    index,
    policy,
    analysis_sections,
    outline_sections,
):
    source_items = []
    all_routes = []
    analysis_rows = {}
    outline_rows = {}
    boundary_rows = []
    risk_flags = set()
    conflict_ids = set(policy["captionConflictSourceIds"])
    for item in sorted(
        source_map.values(),
        key=lambda value: value["sourceId"],
    ):
        occurs = item["pdfPage"] == pdf_page or any(
            row["pdfPage"] == pdf_page
            for row in item.get("occurrences", [])
        )
        if not occurs:
            continue
        routes, boundaries = _lesson_candidates_for_item(
            item,
            index,
            policy,
        )
        analysis, outline = _item_markdown_evidence(
            item,
            routes,
            analysis_sections,
            outline_sections,
            policy,
        )
        decision = copy.deepcopy(decision_map[item["sourceId"]])
        source_items.append({
            **copy.deepcopy(item),
            "currentDecision": decision,
            "lessonCandidates": routes,
            "analysisRefs": sorted(analysis),
            "outlineRefs": sorted(outline),
            "sectionBoundaryEvidence": boundaries,
        })
        all_routes.extend(routes)
        analysis_rows.update(analysis)
        outline_rows.update(outline)
        boundary_rows.extend(boundaries)
        risk_flags.update(decision["riskFlags"])
        if item["sourceId"] in conflict_ids:
            risk_flags.add("caption-conflict")
    if pdf_page not in set(review_page_numbers(index)):
        risk_flags.add("queue-external")
    if boundary_rows:
        risk_flags.add("section-boundary")
    return (
        source_items,
        all_routes,
        analysis_rows,
        outline_rows,
        boundary_rows,
        risk_flags,
    )
```

Expected: only `_page_source_evidence` is added in this action, and the shown Python block parses.

- [ ] **I4.3e — Implement only `_deduplicated_lesson_routes`.**

```python
def _deduplicated_lesson_routes(routes):
    role_order = {"primary": 0, "secondary": 1}
    by_lesson = {}
    for route in routes:
        lesson_id = route["lessonId"]
        current = by_lesson.get(lesson_id)
        if (
            current is None
            or role_order[route["role"]]
            < role_order[current["role"]]
        ):
            by_lesson[lesson_id] = copy.deepcopy(route)
    return [by_lesson[key] for key in sorted(by_lesson)]
```

Expected: only `_deduplicated_lesson_routes` is added in this action, and the shown Python block parses.

- [ ] **I4.3f1 — Implement only `_page_bundle_payload`.**

```python
def _page_bundle_payload(
    pdf_page,
    full_text,
    visuals,
    image_label,
    page_image_sha256,
    evidence_hashes,
    must_keep_inventory,
    page_row,
    source_items,
    all_routes,
    analysis_rows,
    outline_rows,
    boundary_rows,
    risk_flags,
):
    return {
        "pdfPage": pdf_page,
        **{key: evidence_hashes[key] for key in sorted(evidence_hashes)},
        "pageImage": image_label.as_posix(),
        "pageImageSha256": page_image_sha256,
        "text": full_text[pdf_page],
        "sourceItems": source_items,
        "unnumberedVisuals": [
            copy.deepcopy(item)
            for item in visuals
            if item["pdfPage"] == pdf_page
        ],
        "symbolCounts": copy.deepcopy(page_row["symbolCounts"]),
        "lessonCandidates": _deduplicated_lesson_routes(all_routes),
        "analysisRefs": sorted(analysis_rows),
        "outlineRefs": sorted(outline_rows),
        "analysisEvidence": [
            analysis_rows[key] for key in sorted(analysis_rows)
        ],
        "courseObjectiveEvidence": [
            outline_rows[key] for key in sorted(outline_rows)
        ],
        "mustKeepInventory": sorted(
            copy.deepcopy(must_keep_inventory),
            key=lambda item: item["mustKeepId"],
        ),
        "sectionBoundaryEvidence": sorted(
            boundary_rows,
            key=lambda item: (
                item["pdfPage"],
                item["previousSection"],
                item["nextSection"],
            ),
        ),
        "riskFlags": sorted(risk_flags),
    }
```

Expected: only `_page_bundle_payload` is added, and the shown Python block
parses.

- [ ] **I4.3f2 — Implement only `build_page_bundle`.**

```python
def build_page_bundle(
    pdf_page, full_text, index, visuals, decisions, policy,
    page_image, page_image_label, page_image_sha256, evidence_hashes,
    analysis_sections, outline_sections, must_keep_inventory,
):
    image_label, source_map, decision_map, page_row = (
        _validate_page_bundle_inputs(
            pdf_page, full_text, index, visuals, decisions,
            page_image, page_image_label, page_image_sha256,
            evidence_hashes,
        )
    )
    evidence = _page_source_evidence(
        pdf_page,
        source_map,
        decision_map,
        index,
        policy,
        analysis_sections,
        outline_sections,
    )
    return _page_bundle_payload(
        pdf_page,
        full_text,
        visuals,
        image_label,
        page_image_sha256,
        evidence_hashes,
        must_keep_inventory,
        page_row,
        *evidence,
    )
```

Expected: only `build_page_bundle` is added; it validates inputs, derives
evidence, and delegates deterministic serialization.

- [ ] **G4.3 — Run ReviewPackageBundleTests.test_build_page_bundle_carries_complete_page_evidence**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageBundleTests.test_build_page_bundle_carries_complete_page_evidence -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.4 — Write ReviewPackageSelectionTests.test_select_batch_pages_respects_scan_and_source_bounds**

```python
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
```

Expected: only `ReviewPackageSelectionTests.test_select_batch_pages_respects_scan_and_source_bounds` is added in this action, and the shown Python block parses.

- [ ] **R4.4 — Run ReviewPackageSelectionTests.test_select_batch_pages_respects_scan_and_source_bounds**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageSelectionTests.test_select_batch_pages_respects_scan_and_source_bounds -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `select_batch_pages` and proves that exact function or branch contract is not yet present.

- [ ] **I4.4a — Implement only `_unreviewed_source_ids_for_pages`.**

```python
def _unreviewed_source_ids_for_pages(
    source_map,
    decisions_by_id,
    selected_pages,
):
    return sorted(
        source_id
        for source_id, item in source_map.items()
        if decisions_by_id[source_id]["reviewState"] == "unreviewed"
        and any(
            item["pdfPage"] == pdf_page
            or any(
                occurrence["pdfPage"] == pdf_page
                for occurrence in item.get("occurrences", [])
            )
            for pdf_page in selected_pages
        )
    )
```

Expected: only `_unreviewed_source_ids_for_pages` is added in this action, and the shown Python block parses.

- [ ] **I4.4b — Implement only `_initial_calibration_pages`.**

```python
def _initial_calibration_pages(
    calibration,
    decisions_by_id,
    risk_queue,
):
    required_pages = set(calibration["requiredPages"])
    missing_required = sorted(
        pdf_page
        for pdf_page in required_pages
        if (
            decisions_by_id[f"page-{pdf_page:03d}"][
                "visualReviewState"
            ] != "reviewed"
            or not decisions_by_id[f"page-{pdf_page:03d}"][
                "visualReviewer"
            ].strip()
        )
    )
    if missing_required:
        raise AuditValidationError(
            "required calibration pages are not scan-complete: "
            + str(missing_required)
        )
    selected_pages = set(required_pages)
    external_added = 0
    for pdf_page in calibration["queueExternalCandidates"]:
        if pdf_page in risk_queue:
            raise AuditValidationError(
                f"calibration external page is in risk queue: {pdf_page}"
            )
        decision = decisions_by_id[f"page-{pdf_page:03d}"]
        if (
            decision["visualReviewState"] == "reviewed"
            and decision["visualReviewer"].strip()
        ):
            selected_pages.add(pdf_page)
            external_added += 1
        if external_added == 3:
            break
    if external_added < 3:
        raise AuditValidationError(
            "fewer than three queue-external pages are scan-complete"
        )
    return selected_pages
```

Expected: only `_initial_calibration_pages` is added in this action, and the shown Python block parses.

- [ ] **I4.4c — Implement only `select_batch_pages`.**

```python
def select_batch_pages(
    mode,
    index,
    visuals,
    decisions,
    policy,
):
    validate_editorial_decisions(
        index,
        visuals,
        decisions,
        policy,
        require_complete=False,
    )
    if mode != "calibration":
        raise AuditValidationError(
            "normal batch boundaries are created by Plan 2"
        )
    decisions_by_id = {
        decision["sourceId"]: decision for decision in decisions
    }
    calibration = policy["calibration"]
    selected_pages = _initial_calibration_pages(
        calibration,
        decisions_by_id,
        set(review_page_numbers(index)),
    )
    source_map = source_items_by_id(index, visuals)
    source_ids = _unreviewed_source_ids_for_pages(
        source_map,
        decisions_by_id,
        selected_pages,
    )
    for pdf_page in calibration["queueExternalCandidates"]:
        if len(source_ids) >= calibration["minimumSourceItems"]:
            break
        if pdf_page in selected_pages:
            continue
        decision = decisions_by_id[f"page-{pdf_page:03d}"]
        if (
            decision["visualReviewState"] != "reviewed"
            or not decision["visualReviewer"].strip()
        ):
            continue
        selected_pages.add(pdf_page)
        source_ids = _unreviewed_source_ids_for_pages(
            source_map,
            decisions_by_id,
            selected_pages,
        )
    if len(source_ids) > calibration["maximumSourceItems"]:
        raise AuditValidationError(
            "calibration source count exceeds maximum"
        )
    return sorted(selected_pages), source_ids
```

Expected: only `select_batch_pages` is added or changed in this action, and the shown Python block parses.

- [ ] **G4.4 — Run ReviewPackageSelectionTests.test_select_batch_pages_respects_scan_and_source_bounds**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageSelectionTests.test_select_batch_pages_respects_scan_and_source_bounds -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.5 — Write ReviewPackageManifestTests.test_build_batch_manifest_is_hash_bound_and_deterministic**

```python
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
```

Expected: only `ReviewPackageManifestTests.test_build_batch_manifest_is_hash_bound_and_deterministic` is added in this action, and the shown Python block parses.

- [ ] **R4.5 — Run ReviewPackageManifestTests.test_build_batch_manifest_is_hash_bound_and_deterministic**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageManifestTests.test_build_batch_manifest_is_hash_bound_and_deterministic -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_batch_manifest` and proves that exact function or branch contract is not yet present.

- [ ] **I4.5a — Implement only `_project_relative_manifest_path`.**

```python
def _project_relative_manifest_path(label):
    if "\\" in label:
        raise AuditValidationError(
            "manifest path must use forward slashes"
        )
    path = PurePosixPath(label)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise AuditValidationError(
            "manifest path must be project-relative"
        )
    return path
```

Expected: only `_project_relative_manifest_path` is added in this action, and the shown Python block parses.

- [ ] **I4.5b — Implement only `_manifest_package_rows`.**

```python
def _manifest_package_rows(pages, package_hashes):
    if set(package_hashes) != set(pages):
        raise AuditValidationError(
            "package pages do not match selection"
        )
    evidence_fields = {
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "decisionsSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
    }
    page_bundles = []
    page_images = []
    shared_hashes = None
    for pdf_page in pages:
        record = package_hashes[pdf_page]
        if set(record) != {
            "bundlePath",
            "bundleSha256",
            "pageImage",
            "pageImageSha256",
            "evidenceHashes",
        }:
            raise AuditValidationError(
                f"package hash fields mismatch: page {pdf_page}"
            )
        current_hashes = record["evidenceHashes"]
        if set(current_hashes) != evidence_fields:
            raise AuditValidationError(
                f"package evidence mismatch: page {pdf_page}"
            )
        if shared_hashes is None:
            shared_hashes = current_hashes
        elif current_hashes != shared_hashes:
            raise AuditValidationError(
                f"package evidence drift: page {pdf_page}"
            )
        bundle_path = _project_relative_manifest_path(
            record["bundlePath"]
        )
        image_path = _project_relative_manifest_path(
            record["pageImage"]
        )
        page_bundles.append({
            "pdfPage": pdf_page,
            "path": bundle_path.as_posix(),
            "sha256": record["bundleSha256"],
        })
        page_images.append({
            "pdfPage": pdf_page,
            "path": image_path.as_posix(),
            "sha256": record["pageImageSha256"],
        })
    return page_bundles, page_images, dict(shared_hashes or {})
```

Expected: only `_manifest_package_rows` is added in this action, and the shown Python block parses.

- [ ] **I4.5c — Implement only `build_batch_manifest`.**

```python
def build_batch_manifest(
    batch_id,
    mode,
    index,
    visuals,
    decisions,
    policy,
    package_hashes,
    policy_snapshot_label,
):
    if (
        not isinstance(batch_id, str)
        or re.fullmatch(
            r"[a-z0-9][a-z0-9._-]{2,63}",
            batch_id,
        ) is None
    ):
        raise AuditValidationError("invalid batchId")
    pages, source_ids = select_batch_pages(
        mode,
        index,
        visuals,
        decisions,
        policy,
    )
    calibration = policy["calibration"]
    if not (
        calibration["minimumSourceItems"]
        <= len(source_ids)
        <= calibration["maximumSourceItems"]
    ):
        raise AuditValidationError(
            "calibration source count outside configured bounds"
        )
    page_bundles, page_images, shared_hashes = (
        _manifest_package_rows(pages, package_hashes)
    )
    snapshot_path = _project_relative_manifest_path(
        policy_snapshot_label
    )
    return {
        "schemaVersion": 1,
        "batchId": batch_id,
        "mode": mode,
        "pages": pages,
        "sourceIds": source_ids,
        "pageBundles": page_bundles,
        "pageImages": page_images,
        "policySnapshotPath": snapshot_path.as_posix(),
        "policySnapshotSha256": sha256_json(policy),
        **shared_hashes,
    }
```

Expected: only `build_batch_manifest` is added or changed in this action, and the shown Python block parses.

- [ ] **G4.5 — Run ReviewPackageManifestTests.test_build_batch_manifest_is_hash_bound_and_deterministic**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageManifestTests.test_build_batch_manifest_is_hash_bound_and_deterministic -v
```

The package directory contains deterministic page-bundle JSON, `manifest.json`,
and byte-identical `editorial-policy.snapshot.json`. Resolved paths are used only
for I/O. Serialized Markdown and image labels are project-relative. Every
protected input is alias-checked against the output directory for symlink,
hardlink, case-fold, and Unicode-normalization collisions.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.6 — Write ReviewPackageCliTests.test_selection_only_command_reports_shortfall_without_writes**

```python
class ReviewPackageCliTests(unittest.TestCase):
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
```

Expected: only `ReviewPackageCliTests.test_selection_only_command_reports_shortfall_without_writes` is added in this action, and the shown Python block parses.

- [ ] **R4.6 — Run ReviewPackageCliTests.test_selection_only_command_reports_shortfall_without_writes**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_selection_only_command_reports_shortfall_without_writes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `selection_only_command` and proves that exact function or branch contract is not yet present.

- [ ] **I4.6 — Implement selection_only_command**

```python
def selection_only_command(args) -> int:
    index = load_json(args.index)
    visuals = load_json(args.visuals)
    decisions = load_json(args.decisions)
    policy = load_json(args.policy)
    pages, source_ids = select_batch_pages(
        args.mode,
        index,
        visuals,
        decisions,
        policy,
    )
    sys.stdout.write(deterministic_json_bytes({
        "pages": pages,
        "sourceCount": len(source_ids),
    }).decode("utf-8"))
    minimum = policy["calibration"]["minimumSourceItems"]
    return 0 if len(source_ids) >= minimum else 3
```

Expected: only `selection_only_command` is added or changed in this action, and the shown Python block parses.

- [ ] **G4.6 — Run ReviewPackageCliTests.test_selection_only_command_reports_shortfall_without_writes**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_selection_only_command_reports_shortfall_without_writes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.6P — Write `ReviewPackageCliTests.test_build_paths_reject_every_protected_input_under_output`.**

```python
class ReviewPackageCliTests(unittest.TestCase):
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
```

Expected: only the protected-path test is added; it checks every PDF, JSON,
Markdown, and image input role rather than one representative path.

- [ ] **R4.6P — Run the protected-path test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_build_paths_reject_every_protected_input_under_output -v
```

Expected: unittest collects one test and fails with `_validate_build_paths`.

- [ ] **I4.6P — Implement only `_validate_build_paths`.**

```python
def _validate_build_paths(args):
    paths = {
        "pdf": Path(args.pdf),
        "index": Path(args.index),
        "visuals": Path(args.visuals),
        "decisions": Path(args.decisions),
        "policy": Path(args.policy),
        "analysis": Path(args.analysis),
        "course-outline": Path(args.course_outline),
        "image-dir": Path(args.image_dir),
        "output-dir": Path(args.output_dir),
    }
    assert_distinct_paths(paths)
    output_root = paths["output-dir"].resolve(strict=False)
    for name, path in paths.items():
        if name == "output-dir":
            continue
        try:
            path.resolve(strict=False).relative_to(output_root)
        except ValueError:
            continue
        raise AuditValidationError(
            f"path conflict: {name} is inside output-dir"
        )
```

Expected: all nine build roles are alias-checked and no protected input may
resolve inside the package output tree.

- [ ] **G4.6P — Re-run the protected-path test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_build_paths_reject_every_protected_input_under_output -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.6A — Write `ReviewPackageCliTests.test_full_build_writes_all_package_files`.**

```python
class ReviewPackageCliTests(unittest.TestCase):
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
```

Expected: only this method is inserted into the unique CLI test class.

- [ ] **R4.6A — Run the full-build handler test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_full_build_writes_all_package_files -v
```

Expected: unittest collects one test and fails with `full_build_command`.

- [ ] **I4.6A1 — Add only `_load_build_inputs`.**

```python
def _load_build_inputs(args):
    index = load_json(Path(args.index))
    visuals = load_json(Path(args.visuals))
    decisions = load_json(Path(args.decisions))
    policy = load_json(Path(args.policy))
    validate_index(index)
    validate_unnumbered_visuals(index, visuals)
    validate_editorial_decisions(index, visuals, decisions, policy)
    return {
        "index": index,
        "visuals": visuals,
        "decisions": decisions,
        "policy": policy,
        "fullText": extract_full_page_text(Path(args.pdf)),
        "analysisSections": parse_markdown_sections(
            Path(args.analysis), args.analysis,
        ),
        "outlineSections": parse_markdown_sections(
            Path(args.course_outline), args.course_outline,
        ),
    }
```

Expected: only `_load_build_inputs` is added and all protected inputs are
validated before package construction.

- [ ] **I4.6A2 — Add only `_package_evidence_hashes`.**

```python
def _package_evidence_hashes(args):
    return {
        "pdfSha256": sha256_file(Path(args.pdf)),
        "sourceIndexSha256": sha256_file(Path(args.index)),
        "unnumberedVisualsSha256": sha256_file(Path(args.visuals)),
        "decisionsSha256": sha256_file(Path(args.decisions)),
        "editorialPolicySha256": sha256_file(Path(args.policy)),
        "analysisSha256": sha256_file(Path(args.analysis)),
        "courseOutlineSha256": sha256_file(Path(args.course_outline)),
    }
```

Expected: only `_package_evidence_hashes` is added with the seven exact bundle
hash names.

- [ ] **I4.6A3 — Add only `_build_package_outputs`.**

```python
def _build_package_outputs(args):
    _validate_build_paths(args)
    inputs = _load_build_inputs(args)
    output_dir = Path(args.output_dir)
    image_dir = Path(args.image_dir)
    pages, source_ids = select_batch_pages(
        args.mode,
        inputs["index"],
        inputs["visuals"],
        inputs["decisions"],
        inputs["policy"],
    )
    evidence_hashes = _package_evidence_hashes(args)
    inventory = build_must_keep_inventory(
        inputs["policy"],
        inputs["analysisSections"],
        inputs["outlineSections"],
    )
    outputs = {}
    package_hashes = {}
    for pdf_page in pages:
        image = image_dir / f"page-{pdf_page:03d}.png"
        bundle_path = output_dir / f"page-{pdf_page:03d}.json"
        bundle = build_page_bundle(
            pdf_page=pdf_page,
            full_text=inputs["fullText"],
            index=inputs["index"],
            visuals=inputs["visuals"],
            decisions=inputs["decisions"],
            policy=inputs["policy"],
            page_image=image,
            page_image_label=image.as_posix(),
            page_image_sha256=sha256_file(image),
            evidence_hashes=evidence_hashes,
            analysis_sections=inputs["analysisSections"],
            outline_sections=inputs["outlineSections"],
            must_keep_inventory=inventory,
        )
        bundle_bytes = deterministic_json_bytes(bundle)
        outputs[bundle_path] = bundle_bytes
        package_hashes[pdf_page] = {
            "bundlePath": bundle_path.as_posix(),
            "bundleSha256": hashlib.sha256(bundle_bytes).hexdigest(),
            "pageImage": image.as_posix(),
            "pageImageSha256": sha256_file(image),
            "evidenceHashes": evidence_hashes,
        }
    snapshot = output_dir / "editorial-policy.snapshot.json"
    outputs[snapshot] = deterministic_json_bytes(inputs["policy"])
    manifest = build_batch_manifest(
        args.batch_id, args.mode, inputs["index"], inputs["visuals"],
        inputs["decisions"], inputs["policy"], package_hashes,
        snapshot.as_posix(),
    )
    outputs[output_dir / "manifest.json"] = deterministic_json_bytes(manifest)
    return outputs, {
        "batchId": args.batch_id,
        "pageCount": len(pages),
        "sourceCount": len(source_ids),
    }
```

Expected: only `_build_package_outputs` is added; every emitted bundle,
snapshot, and manifest byte string is part of one returned transaction map.

- [ ] **I4.6A4 — Replace only the `full_build_command` stub.**

```python
def full_build_command(args) -> int:
    outputs, summary = _build_package_outputs(args)
    write_files_transaction(outputs)
    sys.stdout.write(
        deterministic_json_bytes(summary).decode("utf-8")
    )
    return 0
```

Expected: only `full_build_command` is replaced; all package files commit in
one transaction and success returns 0.

- [ ] **G4.6A — Re-run the full-build handler test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_full_build_writes_all_package_files -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.6B — Write `ReviewPackageCliTests.test_main_parses_task10_full_and_selection_commands`.**

```python
class ReviewPackageCliTests(unittest.TestCase):
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
```

Expected: only this method is inserted into the unique CLI test class.

- [ ] **R4.6B — Run the parser test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_main_parses_task10_full_and_selection_commands -v
```

Expected: unittest collects one test and fails with `build_parser`.

- [ ] **I4.6B1 — Replace only the `build_parser` stub.**

```python
def build_parser():
    parser = argparse.ArgumentParser()
    for name in (
        "batch_id", "index", "visuals", "decisions", "policy", "mode",
    ):
        parser.add_argument(f"--{name.replace('_', '-')}", required=True)
    parser.add_argument("--selection-only", action="store_true")
    parser.add_argument("--pdf")
    parser.add_argument("--analysis")
    parser.add_argument("--course-outline", dest="course_outline")
    parser.add_argument("--image-dir", dest="image_dir")
    parser.add_argument("--output-dir", dest="output_dir")
    return parser
```

Expected: only `build_parser` is replaced and every Task 10 spelling is
accepted.

- [ ] **I4.6B2 — Add only `_select_cli_handler`.**

```python
def _select_cli_handler(parser, args):
    if args.selection_only:
        return selection_only_command
    missing = [
        name for name in (
            "pdf", "analysis", "course_outline", "image_dir", "output_dir",
        )
        if not getattr(args, name)
    ]
    if missing:
        parser.error(
            "full build requires " + ", ".join(
                f"--{name.replace('_', '-')}" for name in missing
            )
        )
    return full_build_command
```

Expected: only `_select_cli_handler` is added; selection mode never requires
full-build-only paths.

- [ ] **I4.6B3 — Replace only `main` and add the module entry point.**

```python
def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    args.handler = _select_cli_handler(parser, args)
    try:
        return args.handler(args)
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

Expected: only `main` is replaced and one entry-point guard is added; handler
exit codes propagate unchanged and validation failures return 2.

- [ ] **G4.6B — Re-run the parser test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages.ReviewPackageCliTests.test_main_parses_task10_full_and_selection_commands -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T4.7 — Write RenderReviewPagesTests.test_all_page_numbers_accepts_only_continuous_index_pages**

```python
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
```

Expected: only `RenderReviewPagesTests.test_all_page_numbers_accepts_only_continuous_index_pages` is added in this action, and the shown Python block parses.

- [ ] **R4.7 — Run RenderReviewPagesTests.test_all_page_numbers_accepts_only_continuous_index_pages**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_render_review_pages.RenderReviewPagesTests.test_all_page_numbers_accepts_only_continuous_index_pages -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `all_page_numbers` and proves that exact function or branch contract is not yet present.

- [ ] **I4.7 — Implement all_page_numbers**

```python
def all_page_numbers(index: dict) -> list[int]:
    pages = [item["pdfPage"] for item in index.get("pages", [])]
    expected = list(range(1, len(pages) + 1))
    if sorted(pages) != expected:
        raise AuditValidationError(
            "index pages must be continuous from 1"
        )
    return expected
```

Expected: only `all_page_numbers` is added or changed in this action, and the shown Python block parses.

- [ ] **G4.7 — Run RenderReviewPagesTests.test_all_page_numbers_accepts_only_continuous_index_pages**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_render_review_pages.RenderReviewPagesTests.test_all_page_numbers_accepts_only_continuous_index_pages -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **Task 4 focused gate**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_review_packages tests.source_audit.test_render_review_pages -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **Task 4 full-suite gate**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **Task 4 commit**

```bash
git add scripts/source_audit/build_review_packages.py scripts/source_audit/render_review_pages.py tests/source_audit/test_build_review_packages.py tests/source_audit/test_render_review_pages.py
git commit -m "feat: build page-grouped review packages"
```

---

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 5: Frozen batches and full-record review patches

**Files:**
- Create: `scripts/source_audit/review_batches.py`
- Create: `tests/source_audit/test_review_batches.py`
- Modify: `scripts/source_audit/prepare_review_batch.py`
- Modify: `tests/source_audit/test_prepare_review_batch.py`

**Interfaces:**
- Consumes: generated batch manifest, current formal inputs, and one reviewer
  patch.
- Produces:
  - `freeze_batch(manifest: dict, pdf_path: Path, index_path: Path, visuals_path: Path, decisions_path: Path, ledger_path: Path, policy_path: Path, analysis_path: Path, course_outline_path: Path) -> dict`
  - `validate_frozen_immutable_evidence(freeze: dict, current_evidence: dict[str, object]) -> None`
  - `validate_frozen_batch(freeze: dict, current_evidence: dict[str, object]) -> None`
  - `validate_review_patch(freeze: dict, patch: dict, source_map: dict[str, dict], assigned_source_ids: set[str], policy: dict) -> None`
  - `compare_review_patches(primary: dict, secondary: dict) -> list[dict]`
  - `freeze_command(args) -> dict`
  - `build_current_batch_evidence(freeze: dict, pdf_path: Path, index_path: Path, visuals_path: Path, decisions_path: Path, ledger_path: Path, policy_path: Path, analysis_path: Path, course_outline_path: Path, image_dir: Path, package_dir: Path) -> dict`
  - `verify_command(args) -> dict`
  - CLI subcommands `prepare_review_batch freeze` and
    `prepare_review_batch verify`.

- [ ] **S5.B01 — Bootstrap only `scripts/source_audit/review_batches.py`.**

```python
from __future__ import annotations

import copy
import re
from pathlib import Path, PurePosixPath

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import validate_editorial_record
from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
    sha256_file,
)
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
)


def _pending(name):
    raise NotImplementedError(name)


def compare_review_patches(primary, secondary): return _pending("compare_review_patches")
def freeze_batch(manifest, pdf_path, index_path, visuals_path, decisions_path, ledger_path, policy_path, analysis_path, course_outline_path): return _pending("freeze_batch")
def _verified_manifest_records(manifest, name, project_root): return _pending("_verified_manifest_records")
def _verified_policy_snapshot(manifest, project_root, editorial_policy_sha256): return _pending("_verified_policy_snapshot")
def validate_frozen_immutable_evidence(freeze, current_evidence): _pending("validate_frozen_immutable_evidence")
def validate_frozen_batch(freeze, current_evidence): _pending("validate_frozen_batch")
def validate_review_patch(freeze, patch, source_map, assigned_source_ids, policy): _pending("validate_review_patch")
def build_current_batch_evidence(freeze, pdf_path, index_path, visuals_path, decisions_path, ledger_path, policy_path, analysis_path, course_outline_path, image_dir, package_dir): return _pending("build_current_batch_evidence")
```

Expected: the new module imports with all six Task 5 APIs present as named
stubs; later I5 blocks replace them.

- [ ] **S5.B02 — Add only the Task 5 imports to `scripts/source_audit/prepare_review_batch.py`.**

```python
from scripts.source_audit.models import sha256_file
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    freeze_batch,
    validate_frozen_batch,
)
```

Expected: these imports are merged into the existing preamble; the three names
resolve because S5.B01 has already run.

- [ ] **S5.B03 — Bootstrap only `tests/source_audit/test_review_batches.py`.**

```python
import copy
import unittest
from pathlib import Path
from unittest import mock

from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
    sha256_file,
)
from scripts.source_audit.review_batches import (
    _verified_manifest_records,
    _verified_policy_snapshot,
    build_current_batch_evidence,
    compare_review_patches,
    freeze_batch,
    validate_frozen_batch,
    validate_frozen_immutable_evidence,
    validate_review_patch,
)
from scripts.source_audit.transactions import sha256_json
from tests.source_audit.editorial_fixtures import (
    current_batch_evidence,
    frozen_batch,
    frozen_batch_workspace,
    sample_policy,
    sample_review_patch,
    sample_review_record,
    sample_source_item,
)


class ReviewPatchComparisonTests(unittest.TestCase): pass
class FrozenBatchTests(unittest.TestCase): pass
class FrozenBatchValidationTests(unittest.TestCase): pass
class ReviewPatchValidationTests(unittest.TestCase): pass
class CurrentBatchEvidenceTests(unittest.TestCase): pass
```

Expected: unittest imports this module and discovers exactly these five classes;
later T5 blocks insert methods into them.

- [ ] **S5.B04 — Add only the Task 5 imports to `tests/source_audit/test_prepare_review_batch.py`.**

```python
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    validate_frozen_batch,
)
from tests.source_audit.editorial_fixtures import (
    current_batch_evidence,
    frozen_batch_workspace,
)
```

Expected: merge these names into the existing grouped imports without creating
a second test class or import block.

**Reviewer-patch contract:**

```json
{
  "batchId": "calibration-001",
  "reviewer": "reviewer-a",
  "reviewerTaskId": "/root/calibration_primary",
  "evidenceHashes": {
    "pdfSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "sourceIndexSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "unnumberedVisualsSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "baseDecisionsSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "baseLedgerSha256": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "editorialPolicySha256": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "analysisSha256": "1111111111111111111111111111111111111111111111111111111111111111",
    "courseOutlineSha256": "2222222222222222222222222222222222222222222222222222222222222222",
    "freezeSha256": "3333333333333333333333333333333333333333333333333333333333333333"
  },
  "changes": []
}
```

`changes` is a complete replacement for the assigned source-ID set, never a
merge. Every record has sorted `mustKeepIds`. Figure, table, and visual records
have `visualTextAlternative` and `visualHandlingNote`; reuse notes carry
`[复用依据]`, and decorative omissions carry `[装饰说明]`. Page scan fields are
byte-equivalent to `frozenPageDecisions`. Conflict membership comes from the
frozen hash-matched policy ID set rather than a mutable index flag.

- [ ] **T5.1 — Write ReviewPatchComparisonTests.test_compare_review_patches_reports_exact_changed_fields**

```python
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
```

Expected: only `ReviewPatchComparisonTests.test_compare_review_patches_reports_exact_changed_fields` is added in this action, and the shown Python block parses.

- [ ] **R5.1 — Run ReviewPatchComparisonTests.test_compare_review_patches_reports_exact_changed_fields**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.ReviewPatchComparisonTests.test_compare_review_patches_reports_exact_changed_fields -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `compare_review_patches` and proves that exact function or branch contract is not yet present.

- [ ] **I5.1 — Implement compare_review_patches**

```python
def compare_review_patches(
    primary: dict,
    secondary: dict,
) -> list[dict]:
    primary_by_id = {}
    for record in primary["changes"]:
        source_id = record["sourceId"]
        if source_id in primary_by_id:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        primary_by_id[source_id] = record
    secondary_by_id = {}
    for record in secondary["changes"]:
        source_id = record["sourceId"]
        if source_id in secondary_by_id:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        secondary_by_id[source_id] = record
    disagreements = []
    shared_ids = primary_by_id.keys() & secondary_by_id.keys()
    for source_id in sorted(shared_ids):
        fields = sorted(
            field
            for field in (
                set(primary_by_id[source_id])
                | set(secondary_by_id[source_id])
            )
            if primary_by_id[source_id].get(field)
            != secondary_by_id[source_id].get(field)
        )
        if fields:
            disagreements.append({
                "sourceId": source_id,
                "fields": fields,
            })
    return disagreements
```

Expected: only `compare_review_patches` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.1 — Run ReviewPatchComparisonTests.test_compare_review_patches_reports_exact_changed_fields**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.ReviewPatchComparisonTests.test_compare_review_patches_reports_exact_changed_fields -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.2 — Write FrozenBatchTests.test_freeze_batch_captures_complete_immutable_evidence**

```python
class FrozenBatchTests(unittest.TestCase):
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
            self.assertEqual(
                [item["pdfPage"] for item in freeze["pageImages"]],
                manifest["pages"],
            )
            self.assertEqual(
                freeze["policySnapshotPath"],
                manifest["policySnapshotPath"],
            )
            self.assertEqual(
                freeze["freezeSha256"],
                sha256_json({
                    key: value for key, value in freeze.items()
                    if key != "freezeSha256"
                }),
            )
            self.assertTrue(freeze["frozenPageDecisions"])
```

Expected: only `FrozenBatchTests.test_freeze_batch_captures_complete_immutable_evidence` is added in this action, and the shown Python block parses.

- [ ] **R5.2 — Run FrozenBatchTests.test_freeze_batch_captures_complete_immutable_evidence**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchTests.test_freeze_batch_captures_complete_immutable_evidence -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `freeze_batch` and proves that exact function or branch contract is not yet present.

- [ ] **I5.2a — Implement only `_validate_manifest_selection`.**

```python
def _validate_manifest_selection(
    manifest,
    index,
    visuals,
    decisions,
    ledger,
    policy,
):
    if any(
        entry.get("batchId") == manifest["batchId"]
        for entry in ledger
    ):
        raise AuditValidationError(
            f"duplicate batchId: {manifest['batchId']}"
        )
    for name in ("pages", "sourceIds"):
        if manifest[name] != sorted(set(manifest[name])):
            raise AuditValidationError(
                f"manifest {name} must be sorted and unique"
            )
    source_map = source_items_by_id(index, visuals)
    decisions_by_id = {
        item["sourceId"]: item for item in decisions
    }
    selected_pages = set(manifest["pages"])
    expected_source_ids = sorted(
        source_id
        for source_id, item in source_map.items()
        if decisions_by_id[source_id]["reviewState"] == "unreviewed"
        and any(
            item["pdfPage"] == page
            or any(
                occurrence["pdfPage"] == page
                for occurrence in item.get("occurrences", [])
            )
            for page in selected_pages
        )
    )
    if manifest["sourceIds"] != expected_source_ids:
        raise AuditValidationError(
            "manifest omits or adds assigned unreviewed sources"
        )
    if manifest["mode"] == "calibration":
        required = set(policy["calibration"]["requiredPages"])
        if not required <= selected_pages:
            raise AuditValidationError(
                "calibration manifest omits a required page"
            )
        external = selected_pages - set(review_page_numbers(index))
        if len(external) < 3:
            raise AuditValidationError(
                "calibration manifest has fewer than three external pages"
            )
    return source_map, decisions_by_id
```

Expected: only `_validate_manifest_selection` is added in this action, and the shown Python block parses.

- [ ] **I5.2b — Implement only the frozen-path and evidence-hash helpers.**

```python
def _project_relative_frozen_path(label, field):
    if not isinstance(label, str) or "\\" in label:
        raise AuditValidationError(
            f"{field} must be a project-relative POSIX path"
        )
    path = PurePosixPath(label)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise AuditValidationError(
            f"{field} must be project-relative"
        )
    return path


def _freeze_evidence_hashes(manifest, paths):
    evidence = {
        "pdfSha256": sha256_file(paths["pdf"]),
        "sourceIndexSha256": sha256_file(paths["index"]),
        "unnumberedVisualsSha256": sha256_file(paths["visuals"]),
        "baseDecisionsSha256": sha256_file(paths["decisions"]),
        "baseLedgerSha256": sha256_file(paths["ledger"]),
        "editorialPolicySha256": sha256_file(paths["policy"]),
        "analysisSha256": sha256_file(paths["analysis"]),
        "courseOutlineSha256": sha256_file(
            paths["course_outline"]
        ),
    }
    manifest_mapping = {
        "pdfSha256": "pdfSha256",
        "sourceIndexSha256": "sourceIndexSha256",
        "unnumberedVisualsSha256": "unnumberedVisualsSha256",
        "decisionsSha256": "baseDecisionsSha256",
        "editorialPolicySha256": "editorialPolicySha256",
        "analysisSha256": "analysisSha256",
        "courseOutlineSha256": "courseOutlineSha256",
    }
    for manifest_key, evidence_key in manifest_mapping.items():
        if manifest.get(manifest_key) != evidence[evidence_key]:
            raise AuditValidationError(
                f"manifest evidence mismatch: {manifest_key}"
            )
    return evidence
```

Expected: only `_project_relative_frozen_path` and `_freeze_evidence_hashes` are added in this action, and the shown Python block parses.

- [ ] **I5.2c — Implement only `_validated_manifest_records`.**

```python
def _validated_manifest_records(manifest, name):
    records = manifest[name]
    if not isinstance(records, list):
        raise AuditValidationError(f"{name} must be a list")
    seen_pages = set()
    seen_paths = set()
    validated = []
    for position, record in enumerate(records):
        if (
            not isinstance(record, dict)
            or set(record) != {"pdfPage", "path", "sha256"}
        ):
            raise AuditValidationError(
                f"{name} fields mismatch at position {position}"
            )
        _project_relative_frozen_path(record["path"], f"{name}.path")
        pdf_page = record["pdfPage"]
        if (
            type(pdf_page) is not int
            or pdf_page < 1
            or pdf_page in seen_pages
        ):
            raise AuditValidationError(
                f"{name} pdfPage is invalid"
            )
        if record["path"] in seen_paths:
            raise AuditValidationError(
                f"{name} path is duplicated"
            )
        if re.fullmatch(r"[0-9a-f]{64}", record["sha256"]) is None:
            raise AuditValidationError(
                f"{name} SHA-256 is invalid"
            )
        seen_pages.add(pdf_page)
        seen_paths.add(record["path"])
        validated.append(copy.deepcopy(record))
    validated.sort(
        key=lambda item: (item["pdfPage"], item["path"])
    )
    if [
        item["pdfPage"] for item in validated
    ] != manifest["pages"]:
        raise AuditValidationError(
            f"{name} do not cover manifest pages"
        )
    return validated
```

Expected: only `_validated_manifest_records` is added in this action, and the shown Python block parses.

- [ ] **T5.2F — Write `FrozenBatchTests.test_verified_manifest_records_reject_page_artifact_drift`.**

```python
class FrozenBatchTests(unittest.TestCase):
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
```

Expected: the direct helper test independently mutates both a page image and a
page bundle and requires each manifest hash check to fail.

- [ ] **R5.2F — Run the page-artifact verification test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchTests.test_verified_manifest_records_reject_page_artifact_drift -v
```

Expected: unittest collects one test and fails with
`_verified_manifest_records`.

- [ ] **I5.2F — Implement confined manifest-record verification.**

```python
def _confined_frozen_file(project_root, label, field):
    relative = _project_relative_frozen_path(label, field)
    root = Path(project_root).resolve()
    path = (root / Path(*relative.parts)).resolve(strict=False)
    try:
        path.relative_to(root)
    except ValueError as error:
        raise AuditValidationError(
            f"{field} escapes project root"
        ) from error
    if not path.is_file():
        raise AuditValidationError(f"{field} is not a file")
    return path


def _verified_manifest_records(manifest, name, project_root):
    records = _validated_manifest_records(manifest, name)
    for record in records:
        path = _confined_frozen_file(
            project_root,
            record["path"],
            f"{name}.path",
        )
        if sha256_file(path) != record["sha256"]:
            raise AuditValidationError(
                f"{name} artifact hash mismatch: {record['path']}"
            )
    return records
```

Expected: every page-image and page-bundle path is project-confined, resolves
to a real file, and is re-hashed against its manifest record.

- [ ] **G5.2F — Re-run the page-artifact verification test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchTests.test_verified_manifest_records_reject_page_artifact_drift -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.2S — Write `FrozenBatchTests.test_verified_policy_snapshot_rejects_snapshot_drift`.**

```python
class FrozenBatchTests(unittest.TestCase):
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
```

Expected: the snapshot test mutates the actual frozen policy copy and requires
recomputed-byte verification, not trust in the manifest hash field.

- [ ] **R5.2S — Run the policy-snapshot verification test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchTests.test_verified_policy_snapshot_rejects_snapshot_drift -v
```

Expected: unittest collects one test and fails with
`_verified_policy_snapshot`.

- [ ] **I5.2S — Implement only `_verified_policy_snapshot`.**

```python
def _verified_policy_snapshot(
    manifest,
    project_root,
    editorial_policy_sha256,
):
    label = manifest.get("policySnapshotPath")
    path = _confined_frozen_file(
        project_root,
        label,
        "policySnapshotPath",
    )
    actual = sha256_file(path)
    if actual != manifest.get("policySnapshotSha256"):
        raise AuditValidationError(
            "policy snapshot manifest hash mismatch"
        )
    if actual != editorial_policy_sha256:
        raise AuditValidationError(
            "policy snapshot source hash mismatch"
        )
    return label, actual
```

Expected: the policy snapshot is confined and re-hashed, and its bytes must
match both the manifest and the current editorial-policy source.

- [ ] **G5.2S — Re-run the policy-snapshot verification test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchTests.test_verified_policy_snapshot_rejects_snapshot_drift -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **I5.2d — Implement only `_frozen_page_decisions`.**

```python
def _frozen_page_decisions(pages, decisions_by_id):
    frozen = []
    required_fields = {
        "visualReviewState",
        "visualReviewer",
        "discoveredVisualIds",
        "symbolReview",
    }
    for pdf_page in pages:
        source_id = f"page-{pdf_page:03d}"
        decision = decisions_by_id.get(source_id)
        if decision is None:
            raise AuditValidationError(
                f"missing frozen page decision: {source_id}"
            )
        if not required_fields <= set(decision):
            raise AuditValidationError(
                f"page decision scan fields are incomplete: {source_id}"
            )
        if (
            decision["visualReviewState"] != "reviewed"
            or not decision["visualReviewer"].strip()
        ):
            raise AuditValidationError(
                f"page scan incomplete: {source_id}"
            )
        frozen.append(copy.deepcopy(decision))
    return frozen
```

Expected: only `_frozen_page_decisions` is added in this action, and the shown Python block parses.

- [ ] **I5.2e — Implement only `freeze_batch`.**

```python
def freeze_batch(
    manifest,
    pdf_path,
    index_path,
    visuals_path,
    decisions_path,
    ledger_path,
    policy_path,
    analysis_path,
    course_outline_path,
):
    index = load_json(index_path)
    visuals = load_json(visuals_path)
    decisions = load_json(decisions_path)
    ledger = load_json(ledger_path)
    policy = load_json(policy_path)
    source_map, decisions_by_id = _validate_manifest_selection(
        manifest,
        index,
        visuals,
        decisions,
        ledger,
        policy,
    )
    paths = {
        "pdf": pdf_path,
        "index": index_path,
        "visuals": visuals_path,
        "decisions": decisions_path,
        "ledger": ledger_path,
        "policy": policy_path,
        "analysis": analysis_path,
        "course_outline": course_outline_path,
    }
    evidence_hashes = _freeze_evidence_hashes(manifest, paths)
    project_root = Path.cwd()
    snapshot_label, snapshot_hash = _verified_policy_snapshot(
        manifest,
        project_root,
        evidence_hashes["editorialPolicySha256"],
    )
    freeze = {
        "schemaVersion": 1,
        "batchId": manifest["batchId"],
        "mode": manifest["mode"],
        "pages": list(manifest["pages"]),
        "sourceIds": list(manifest["sourceIds"]),
        "catalogSourceIds": sorted(source_map),
        "baseReviewStates": {
            item["sourceId"]: item["reviewState"]
            for item in decisions
        },
        "pageImages": _verified_manifest_records(
            manifest,
            "pageImages",
            project_root,
        ),
        "pageBundles": _verified_manifest_records(
            manifest,
            "pageBundles",
            project_root,
        ),
        "policySnapshotPath": snapshot_label,
        "policySnapshotSha256": snapshot_hash,
        "frozenPageDecisions": _frozen_page_decisions(
            manifest["pages"],
            decisions_by_id,
        ),
        **evidence_hashes,
    }
    freeze["freezeSha256"] = sha256_json(freeze)
    return freeze
```

Expected: only `freeze_batch` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.2 — Run FrozenBatchTests.test_freeze_batch_captures_complete_immutable_evidence**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchTests.test_freeze_batch_captures_complete_immutable_evidence -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.3 — Write FrozenBatchValidationTests.test_validate_frozen_immutable_evidence_rejects_bundle_drift**

```python
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
```

Expected: only `FrozenBatchValidationTests.test_validate_frozen_immutable_evidence_rejects_bundle_drift` is added in this action, and the shown Python block parses.

- [ ] **R5.3 — Run FrozenBatchValidationTests.test_validate_frozen_immutable_evidence_rejects_bundle_drift**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchValidationTests.test_validate_frozen_immutable_evidence_rejects_bundle_drift -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_frozen_immutable_evidence` and proves that exact function or branch contract is not yet present.

- [ ] **I5.3a — Implement only `_validate_freeze_identity`.**

```python
def _validate_freeze_identity(freeze):
    stored_hash = freeze.get("freezeSha256")
    unhashed = {
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    }
    if sha256_json(unhashed) != stored_hash:
        raise AuditValidationError("freezeSha256 mismatch")
    for name in ("pages", "sourceIds", "catalogSourceIds"):
        values = freeze[name]
        if values != sorted(set(values)):
            raise AuditValidationError(
                f"freeze {name} must be sorted and unique"
            )
    if not set(freeze["sourceIds"]) <= set(
        freeze["catalogSourceIds"]
    ):
        raise AuditValidationError(
            "freeze sourceIds are outside catalog"
        )
    if set(freeze["baseReviewStates"]) != set(
        freeze["catalogSourceIds"]
    ):
        raise AuditValidationError(
            "baseReviewStates do not cover frozen catalog"
        )
    assigned_reviewed = sorted(
        source_id for source_id in freeze["sourceIds"]
        if freeze["baseReviewStates"][source_id] != "unreviewed"
    )
    if assigned_reviewed:
        raise AuditValidationError(
            f"freeze assigns reviewed IDs: {assigned_reviewed}"
        )
```

Expected: only `_validate_freeze_identity` is added in this action, and the shown Python block parses.

- [ ] **I5.3b — Implement only `_validate_frozen_hash_records`.**

```python
def _validate_frozen_hash_records(
    name,
    records,
    pages,
    current_records,
):
    if records != sorted(
        records,
        key=lambda item: (item["pdfPage"], item["path"]),
    ):
        raise AuditValidationError(
            f"{name} must use stable order"
        )
    if [record["pdfPage"] for record in records] != pages:
        raise AuditValidationError(
            f"{name} do not exactly cover freeze pages"
        )
    for record in records:
        if set(record) != {"pdfPage", "path", "sha256"}:
            raise AuditValidationError(
                f"{name} record fields are invalid"
            )
        _project_relative_frozen_path(
            record["path"],
            f"{name}.path",
        )
        if re.fullmatch(
            r"[0-9a-f]{64}",
            record["sha256"],
        ) is None:
            raise AuditValidationError(
                f"{name} record SHA-256 is invalid"
            )
    if current_records != records:
        raise AuditValidationError(f"{name} mismatch")
```

Expected: only `_validate_frozen_hash_records` is added in this action, and the shown Python block parses.

- [ ] **I5.3c — Implement only `validate_frozen_immutable_evidence`.**

```python
def validate_frozen_immutable_evidence(
    freeze,
    current_evidence,
):
    _validate_freeze_identity(freeze)
    for name in ("pageImages", "pageBundles"):
        _validate_frozen_hash_records(
            name,
            freeze[name],
            freeze["pages"],
            current_evidence[name],
        )
    frozen_page_ids = sorted(
        item["sourceId"]
        for item in freeze["frozenPageDecisions"]
    )
    expected_page_ids = [
        f"page-{pdf_page:03d}" for pdf_page in freeze["pages"]
    ]
    if frozen_page_ids != expected_page_ids:
        raise AuditValidationError(
            "frozenPageDecisions do not match pages"
        )
    _project_relative_frozen_path(
        freeze["policySnapshotPath"],
        "policySnapshotPath",
    )
    if (
        current_evidence["policySnapshotPath"]
        != freeze["policySnapshotPath"]
    ):
        raise AuditValidationError("policySnapshotPath mismatch")
    immutable_hashes = (
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
        "policySnapshotSha256",
    )
    for key in immutable_hashes:
        if current_evidence[key] != freeze[key]:
            raise AuditValidationError(f"{key} mismatch")
    if (
        current_evidence["catalogSourceIds"]
        != freeze["catalogSourceIds"]
    ):
        raise AuditValidationError("catalogSourceIds mismatch")
```

Expected: only `validate_frozen_immutable_evidence` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.3 — Run FrozenBatchValidationTests.test_validate_frozen_immutable_evidence_rejects_bundle_drift**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchValidationTests.test_validate_frozen_immutable_evidence_rejects_bundle_drift -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.4 — Write FrozenBatchValidationTests.test_validate_frozen_batch_rejects_mutable_baseline_drift**

```python
class FrozenBatchValidationTests(unittest.TestCase):
    def test_validate_frozen_batch_rejects_mutable_baseline_drift(self):
        freeze = frozen_batch()
        current = current_batch_evidence(freeze)
        current["baseDecisionsSha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError,
            "baseDecisionsSha256",
        ):
            validate_frozen_batch(freeze, current)
```

Expected: only `FrozenBatchValidationTests.test_validate_frozen_batch_rejects_mutable_baseline_drift` is added in this action, and the shown Python block parses.

- [ ] **R5.4 — Run FrozenBatchValidationTests.test_validate_frozen_batch_rejects_mutable_baseline_drift**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchValidationTests.test_validate_frozen_batch_rejects_mutable_baseline_drift -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_frozen_batch` and proves that exact function or branch contract is not yet present.

- [ ] **I5.4 — Implement validate_frozen_batch**

```python
def validate_frozen_batch(freeze, current_evidence):
    validate_frozen_immutable_evidence(freeze, current_evidence)
    for key in (
        "baseDecisionsSha256",
        "baseLedgerSha256",
    ):
        if current_evidence[key] != freeze[key]:
            raise AuditValidationError(f"{key} mismatch")
    if (
        current_evidence["baseReviewStates"]
        != freeze["baseReviewStates"]
    ):
        raise AuditValidationError("baseReviewStates mismatch")
```

Expected: only `validate_frozen_batch` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.4 — Run FrozenBatchValidationTests.test_validate_frozen_batch_rejects_mutable_baseline_drift**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.FrozenBatchValidationTests.test_validate_frozen_batch_rejects_mutable_baseline_drift -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.5 — Write ReviewPatchValidationTests.test_validate_review_patch_requires_complete_frozen_conflict_record**

```python
class ReviewPatchValidationTests(unittest.TestCase):
    def test_validate_review_patch_requires_complete_frozen_conflict_record(self):
        freeze = frozen_batch(source_ids=["figure-1-2"])
        source_map = {
            "figure-1-2": sample_source_item(
                sourceId="figure-1-2",
                kind="figure",
                captionConflict=False,
            )
        }
        patch = sample_review_patch(
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    omit_fields={"captionConflictNote"},
                )
            ]
        )
        policy = sample_policy(
            captionConflictSourceIds=["figure-1-2"]
        )
        with self.assertRaisesRegex(
            AuditValidationError,
            "complete record fields",
        ):
            validate_review_patch(
                freeze,
                patch,
                source_map,
                {"figure-1-2"},
                policy,
            )
```

Expected: only `ReviewPatchValidationTests.test_validate_review_patch_requires_complete_frozen_conflict_record` is added in this action, and the shown Python block parses.

- [ ] **R5.5 — Run ReviewPatchValidationTests.test_validate_review_patch_requires_complete_frozen_conflict_record**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.ReviewPatchValidationTests.test_validate_review_patch_requires_complete_frozen_conflict_record -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_review_patch` and proves that exact function or branch contract is not yet present.

- [ ] **I5.5a — Implement only `_validate_review_patch_envelope`.**

```python
def _validate_review_patch_envelope(
    freeze,
    patch,
    assigned_source_ids,
):
    if set(patch) != {
        "batchId",
        "reviewer",
        "reviewerTaskId",
        "evidenceHashes",
        "changes",
    }:
        raise AuditValidationError(
            "review patch fields mismatch"
        )
    if patch["batchId"] != freeze["batchId"]:
        raise AuditValidationError(
            "review patch batchId mismatch"
        )
    for field in ("reviewer", "reviewerTaskId"):
        if (
            not isinstance(patch[field], str)
            or not patch[field].strip()
        ):
            raise AuditValidationError(
                f"{field} must be non-blank"
            )
    evidence_fields = (
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "baseDecisionsSha256",
        "baseLedgerSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
        "freezeSha256",
    )
    expected_evidence = {
        key: freeze[key] for key in evidence_fields
    }
    if patch["evidenceHashes"] != expected_evidence:
        raise AuditValidationError(
            "review patch evidence hash mismatch"
        )
    if not isinstance(assigned_source_ids, set):
        raise AuditValidationError(
            "assigned_source_ids must be a set"
        )
    if not assigned_source_ids <= set(freeze["sourceIds"]):
        raise AuditValidationError(
            "patch assignment is outside freeze"
        )
```

Expected: only `_validate_review_patch_envelope` is added in this action, and the shown Python block parses.

- [ ] **I5.5b — Implement only the patch-record shape helpers.**

```python
def _patch_changes_by_id(records, assigned_source_ids):
    changes = {}
    for record in records:
        source_id = record["sourceId"]
        if source_id in changes:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        changes[source_id] = record
    if set(changes) != assigned_source_ids:
        raise AuditValidationError(
            "patch changes do not match assignment"
        )
    return changes


def _expected_patch_fields(item, source_id, conflicts):
    fields = {
        "sourceId",
        "disposition",
        "reason",
        "lessonIds",
        "markdownRefs",
        "visualClass",
        "visualHandling",
        "reviewState",
        "riskFlags",
        "mustKeepIds",
        "symbolTextAlternatives",
    }
    if item["kind"] in {"figure", "table", "visual"}:
        fields.update({
            "visualTextAlternative",
            "visualHandlingNote",
        })
    if item["kind"] == "page":
        fields.update({
            "visualReviewState",
            "visualReviewer",
            "discoveredVisualIds",
            "symbolReview",
        })
    if source_id in conflicts:
        fields.update({
            "captionConflictResolved",
            "captionConflictNote",
        })
    return fields
```

Expected: only `_patch_changes_by_id` and `_expected_patch_fields` are added in this action, and the shown Python block parses.

- [ ] **I5.5c — Implement only `_validate_patch_record_order`.**

```python
def _validate_patch_record_order(source_id, record):
    for field in (
        "lessonIds",
        "markdownRefs",
        "riskFlags",
        "mustKeepIds",
        "symbolTextAlternatives",
    ):
        expected_order = sorted(
            record[field],
            key=lambda value: (
                deterministic_json_bytes(value)
                if isinstance(value, dict)
                else value
            ),
        )
        if record[field] != expected_order:
            raise AuditValidationError(
                f"{field} must use stable order: {source_id}"
            )
    if len(record["mustKeepIds"]) != len(
        set(record["mustKeepIds"])
    ):
        raise AuditValidationError(
            f"duplicate mustKeepIds: {source_id}"
        )
```

Expected: only `_validate_patch_record_order` is added in this action, and the shown Python block parses.

- [ ] **I5.5d — Implement only `_validate_patch_special_fields`.**

```python
def _validate_patch_special_fields(
    source_id,
    item,
    record,
    frozen_pages,
    conflicts,
):
    page_fields = (
        "visualReviewState",
        "visualReviewer",
        "discoveredVisualIds",
        "symbolReview",
    )
    if item["kind"] == "page":
        if source_id not in frozen_pages:
            raise AuditValidationError(
                f"missing frozen page evidence: {source_id}"
            )
        for field in page_fields:
            if record[field] != frozen_pages[source_id][field]:
                raise AuditValidationError(
                    "frozen page evidence changed: "
                    f"{source_id}.{field}"
                )
    if source_id in conflicts and (
        record["captionConflictResolved"] is not True
        or not isinstance(record["captionConflictNote"], str)
        or not record["captionConflictNote"].strip()
    ):
        raise AuditValidationError(
            f"caption conflict unresolved: {source_id}"
        )
```

Expected: only `_validate_patch_special_fields` is added in this action, and the shown Python block parses.

- [ ] **I5.5e — Implement only `validate_review_patch`.**

```python
def validate_review_patch(
    freeze,
    patch,
    source_map,
    assigned_source_ids,
    policy,
):
    _validate_review_patch_envelope(
        freeze,
        patch,
        assigned_source_ids,
    )
    changes = _patch_changes_by_id(
        patch["changes"],
        assigned_source_ids,
    )
    conflicts = set(policy["captionConflictSourceIds"])
    frozen_pages = {
        item["sourceId"]: item
        for item in freeze["frozenPageDecisions"]
    }
    for source_id in sorted(changes):
        if source_id not in source_map:
            raise AuditValidationError(
                f"unknown patch sourceId: {source_id}"
            )
        item = source_map[source_id]
        record = changes[source_id]
        if set(record) != _expected_patch_fields(
            item,
            source_id,
            conflicts,
        ):
            raise AuditValidationError(
                f"complete record fields mismatch: {source_id}"
            )
        if record["reviewState"] != "reviewed":
            raise AuditValidationError(
                f"patch record must be reviewed: {source_id}"
            )
        _validate_patch_record_order(source_id, record)
        _validate_patch_special_fields(
            source_id,
            item,
            record,
            frozen_pages,
            conflicts,
        )
        validate_editorial_record(item, record, policy)
```

Expected: only `validate_review_patch` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.5 — Run ReviewPatchValidationTests.test_validate_review_patch_requires_complete_frozen_conflict_record**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.ReviewPatchValidationTests.test_validate_review_patch_requires_complete_frozen_conflict_record -v
```

Freeze creation resolves the manifest, all eight protected inputs, and output,
then alias-checks every input/output pair. The freeze handler writes only after
validation succeeds and uses `write_json_transaction`. Duplicate batch IDs,
reviewed assigned IDs, incomplete page scans, and incomplete source sets fail
before serialization.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.6 — Write PrepareReviewBatchFreezeTests.test_freeze_command_commits_one_validated_freeze**

```python
class PrepareReviewBatchFreezeTests(unittest.TestCase):
    def test_freeze_command_commits_one_validated_freeze(self):
        args = sample_freeze_args()
        expected = frozen_batch()
        with mock.patch(
            "scripts.source_audit.prepare_review_batch.load_json",
            return_value=sample_batch_manifest(),
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
```

Expected: only `PrepareReviewBatchFreezeTests.test_freeze_command_commits_one_validated_freeze` is added in this action, and the shown Python block parses.

- [ ] **R5.6 — Run PrepareReviewBatchFreezeTests.test_freeze_command_commits_one_validated_freeze**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchFreezeTests.test_freeze_command_commits_one_validated_freeze -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `freeze_command` and proves that exact function or branch contract is not yet present.

- [ ] **I5.6 — Implement freeze_command**

```python
def freeze_command(args) -> dict:
    manifest = load_json(args.manifest)
    output = Path(args.output)
    assert_distinct_paths({
        "manifest": Path(args.manifest),
        "pdf": Path(args.pdf),
        "index": Path(args.index),
        "visuals": Path(args.visuals),
        "decisions": Path(args.decisions),
        "ledger": Path(args.ledger),
        "policy": Path(args.policy),
        "analysis": Path(args.analysis),
        "course-outline": Path(args.course_outline),
        "output": output,
    })
    freeze = freeze_batch(
        manifest,
        Path(args.pdf),
        Path(args.index),
        Path(args.visuals),
        Path(args.decisions),
        Path(args.ledger),
        Path(args.policy),
        Path(args.analysis),
        Path(args.course_outline),
    )
    write_json_transaction({output: freeze})
    return freeze
```

Expected: only `freeze_command` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.6 — Run PrepareReviewBatchFreezeTests.test_freeze_command_commits_one_validated_freeze**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchFreezeTests.test_freeze_command_commits_one_validated_freeze -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.7 — Write CurrentBatchEvidenceTests.test_build_current_batch_evidence_hashes_only_confined_files**

```python
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
```

Expected: only `CurrentBatchEvidenceTests.test_build_current_batch_evidence_hashes_only_confined_files` is added in this action, and the shown Python block parses.

- [ ] **R5.7 — Run CurrentBatchEvidenceTests.test_build_current_batch_evidence_hashes_only_confined_files**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.CurrentBatchEvidenceTests.test_build_current_batch_evidence_hashes_only_confined_files -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_current_batch_evidence` and proves that exact function or branch contract is not yet present.

- [ ] **I5.7a — Implement only `_hash_confined_frozen_records`.**

```python
def _hash_confined_frozen_records(
    records,
    project_root,
    confined_root,
    field,
):
    hashed = []
    confined_labels = set()
    for record in records:
        relative = _project_relative_frozen_path(
            record["path"],
            f"{field}.path",
        )
        path = (project_root / relative).resolve()
        try:
            confined = path.relative_to(confined_root)
        except ValueError as error:
            raise AuditValidationError(
                f"frozen path escapes {field} root: {record['path']}"
            ) from error
        confined_labels.add(confined.as_posix())
        hashed.append({
            **record,
            "sha256": sha256_file(path),
        })
    return hashed, confined_labels
```

Expected: only `_hash_confined_frozen_records` is added in this action, and the shown Python block parses.

- [ ] **I5.7b — Implement only `_resolve_frozen_policy_snapshot`.**

```python
def _resolve_frozen_policy_snapshot(
    freeze,
    project_root,
    package_root,
):
    relative = _project_relative_frozen_path(
        freeze["policySnapshotPath"],
        "policySnapshotPath",
    )
    path = (project_root / relative).resolve()
    try:
        confined = path.relative_to(package_root)
    except ValueError as error:
        raise AuditValidationError(
            "frozen policySnapshotPath escapes package root"
        ) from error
    return path, confined.as_posix()
```

Expected: only `_resolve_frozen_policy_snapshot` is added in this action, and the shown Python block parses.

- [ ] **I5.7c — Implement only `build_current_batch_evidence`.**

```python
def build_current_batch_evidence(
    freeze,
    pdf_path,
    index_path,
    visuals_path,
    decisions_path,
    ledger_path,
    policy_path,
    analysis_path,
    course_outline_path,
    image_dir,
    package_dir,
):
    project_root = Path.cwd().resolve()
    image_root = Path(image_dir).resolve()
    package_root = Path(package_dir).resolve()
    index = load_json(index_path)
    visuals = load_json(visuals_path)
    decisions = load_json(decisions_path)
    page_images, _ = _hash_confined_frozen_records(
        freeze["pageImages"],
        project_root,
        image_root,
        "image",
    )
    page_bundles, bundle_labels = _hash_confined_frozen_records(
        freeze["pageBundles"],
        project_root,
        package_root,
        "package",
    )
    snapshot_path, snapshot_label = (
        _resolve_frozen_policy_snapshot(
            freeze,
            project_root,
            package_root,
        )
    )
    expected_package_files = {
        "manifest.json",
        snapshot_label,
        *bundle_labels,
    }
    actual_package_files = {
        path.relative_to(package_root).as_posix()
        for path in package_root.rglob("*")
        if path.is_file()
    }
    if actual_package_files != expected_package_files:
        raise AuditValidationError(
            "package directory contains missing or extra files"
        )
    return {
        "pdfSha256": sha256_file(pdf_path),
        "sourceIndexSha256": sha256_file(index_path),
        "unnumberedVisualsSha256": sha256_file(visuals_path),
        "baseDecisionsSha256": sha256_file(decisions_path),
        "baseLedgerSha256": sha256_file(ledger_path),
        "editorialPolicySha256": sha256_file(policy_path),
        "analysisSha256": sha256_file(analysis_path),
        "courseOutlineSha256": sha256_file(course_outline_path),
        "policySnapshotPath": freeze["policySnapshotPath"],
        "policySnapshotSha256": sha256_file(snapshot_path),
        "pageImages": page_images,
        "pageBundles": page_bundles,
        "catalogSourceIds": sorted(
            source_items_by_id(index, visuals)
        ),
        "baseReviewStates": {
            item["sourceId"]: item["reviewState"]
            for item in decisions
        },
    }
```

Expected: only `build_current_batch_evidence` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.7 — Run CurrentBatchEvidenceTests.test_build_current_batch_evidence_hashes_only_confined_files**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches.CurrentBatchEvidenceTests.test_build_current_batch_evidence_hashes_only_confined_files -v
```

The verify path is read-only: it never calls a transaction helper and exits on
the first hash, self-hash, package-membership, or baseline-state mismatch.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T5.8 — Write PrepareReviewBatchVerifyTests.test_verify_command_returns_summary_without_writing**

```python
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
```

Expected: only `PrepareReviewBatchVerifyTests.test_verify_command_returns_summary_without_writing` is added in this action, and the shown Python block parses.

- [ ] **R5.8 — Run PrepareReviewBatchVerifyTests.test_verify_command_returns_summary_without_writing**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchVerifyTests.test_verify_command_returns_summary_without_writing -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `verify_command` and proves that exact function or branch contract is not yet present.

- [ ] **I5.8 — Implement verify_command**

```python
def verify_command(args) -> dict:
    freeze = load_json(args.freeze)
    current_evidence = build_current_batch_evidence(
        freeze=freeze,
        pdf_path=Path(args.pdf),
        index_path=Path(args.index),
        visuals_path=Path(args.visuals),
        decisions_path=Path(args.decisions),
        ledger_path=Path(args.ledger),
        policy_path=Path(args.policy),
        analysis_path=Path(args.analysis),
        course_outline_path=Path(args.course_outline),
        image_dir=Path(args.image_dir),
        package_dir=Path(args.package_dir),
    )
    validate_frozen_batch(freeze, current_evidence)
    return {
        "batchId": freeze["batchId"],
        "pageCount": len(freeze["pages"]),
        "sourceCount": len(freeze["sourceIds"]),
        "freezeSha256": freeze["freezeSha256"],
    }
```

Expected: only `verify_command` is added or changed in this action, and the shown Python block parses.

- [ ] **G5.8 — Run PrepareReviewBatchVerifyTests.test_verify_command_returns_summary_without_writing**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchVerifyTests.test_verify_command_returns_summary_without_writing -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **Task 5 focused gate**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_batches tests.source_audit.test_prepare_review_batch -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **Task 5 full-suite gate**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **Task 5 commit**

```bash
git add scripts/source_audit/review_batches.py scripts/source_audit/prepare_review_batch.py tests/source_audit/test_review_batches.py tests/source_audit/test_prepare_review_batch.py
git commit -m "feat: freeze editorial review batches"
```

---

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 6: Independent-review ledger and escalation rules

**Files:**
- Create: `scripts/source_audit/review_ledger.py`
- Create: `tests/source_audit/test_review_ledger.py`
- Modify: `scripts/source_audit/prepare_review_batch.py`
- Modify: `tests/source_audit/test_prepare_review_batch.py`

**Interfaces:**
- Consumes: source map, final decisions, prior ledger, and batch evidence.
- Produces:
  - `required_second_review_reasons(item: dict, decision: dict, policy: dict) -> list[str]`
  - `required_secondary_source_ids(freeze: dict, primary_patch: dict, source_map: dict[str, dict], policy: dict) -> set[str]`
  - `build_genesis_ledger_entry(decisions_sha256: str, source_count: int) -> dict`
  - `build_discovery_ledger_entry(pdf_page: int, attempt: int, reviewer: str, added_visual_ids: list[str], base_decisions_sha256: str, accepted_decisions_sha256: str) -> dict`
  - `required_after_escalation(freeze: dict, required_secondary_ids: set[str], disagreements: list[dict], critical_omissions: list[dict], source_map: dict[str, dict]) -> set[str]`
  - `build_review_ledger_entry(freeze: dict, primary_patch: dict, secondary_patch: dict, resolutions: dict, source_map: dict[str, dict], candidate_decisions: list[dict], policy: dict, accepted_decisions_sha256: str, input_fingerprint: str) -> dict`
  - `validate_review_ledger(index: dict, visuals: list[dict], decisions: list[dict], ledger: list[dict], policy: dict, current_decisions_sha256: str, require_complete: bool = False) -> None`
  - `discovery_command(args) -> dict`

- [ ] **S6.B01 — Bootstrap only `scripts/source_audit/review_ledger.py`.**

```python
from __future__ import annotations

import hashlib
import math
import re

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import derived_risk_flags
from scripts.source_audit.models import AuditValidationError


def _pending(name):
    raise NotImplementedError(name)


def required_second_review_reasons(item, decision, policy):
    return _pending("required_second_review_reasons")


def required_secondary_source_ids(freeze, primary_patch, source_map, policy):
    return _pending("required_secondary_source_ids")


def build_genesis_ledger_entry(decisions_sha256, source_count):
    return _pending("build_genesis_ledger_entry")


def build_discovery_ledger_entry(pdf_page, attempt, reviewer, added_visual_ids, base_decisions_sha256, accepted_decisions_sha256):
    return _pending("build_discovery_ledger_entry")


def required_after_escalation(freeze, required_secondary_ids, disagreements, critical_omissions, source_map):
    return _pending("required_after_escalation")


def build_review_ledger_entry(freeze, primary_patch, secondary_patch, resolutions, source_map, candidate_decisions, policy, accepted_decisions_sha256, input_fingerprint):
    return _pending("build_review_ledger_entry")


def _validate_ledger_genesis(genesis): return _pending("_validate_ledger_genesis")
def _validate_discovery_ledger_entry(entry, source_map, attempts, discovered_visual_ids): return _pending("_validate_discovery_ledger_entry")
def _validate_review_entry_identity(entry, source_map, decisions_by_id, batch_ids, reviewed_source_ids): return _pending("_validate_review_entry_identity")
def _validated_disagreement_ids(entry, double_reviewed): return _pending("_validated_disagreement_ids")
def _validate_review_strata(entry, populations, mandatory_ids, initial_secondary, disagreement_ids, escalations): return _pending("_validate_review_strata")
def _validate_review_ledger_entry(entry, source_map, decisions_by_id, policy, batch_ids, reviewed_source_ids): return _pending("_validate_review_ledger_entry")


def validate_review_ledger(index, visuals, decisions, ledger, policy, current_decisions_sha256, require_complete=False):
    _pending("validate_review_ledger")
```

Expected: this new module imports and exposes all seven ledger APIs as named
stubs; later I6 blocks replace them.

- [ ] **S6.B02 — Bootstrap only `tests/source_audit/test_review_ledger.py`.**

```python
import hashlib
import unittest

from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.review_ledger import (
    _validate_discovery_ledger_entry,
    _validate_ledger_genesis,
    _validate_review_entry_identity,
    _validate_review_ledger_entry,
    _validate_review_strata,
    _validated_disagreement_ids,
    build_discovery_ledger_entry,
    build_genesis_ledger_entry,
    build_review_ledger_entry,
    required_after_escalation,
    required_secondary_source_ids,
    required_second_review_reasons,
    validate_review_ledger,
)
from scripts.source_audit.transactions import sha256_json
from tests.source_audit.editorial_fixtures import (
    frozen_batch,
    sample_complete_ledger,
    sample_decisions,
    sample_page20_index,
    sample_policy,
    sample_review_entry,
    sample_review_patch,
    sample_review_record,
    sample_sampling_source_map,
    sample_source_item,
    sample_visual,
)


class ReviewLedgerRiskTests(unittest.TestCase): pass
class ReviewLedgerSamplingTests(unittest.TestCase): pass
class ReviewLedgerGenesisTests(unittest.TestCase): pass
class ReviewLedgerDiscoveryTests(unittest.TestCase): pass
class ReviewLedgerEscalationTests(unittest.TestCase): pass
class ReviewLedgerEntryTests(unittest.TestCase): pass
class ReviewLedgerValidationTests(unittest.TestCase): pass
```

Expected: unittest imports this module and discovers exactly these seven
classes; later T6 blocks insert methods into them.

- [ ] **S6.B03 — Add only the Task 6 import to `scripts/source_audit/prepare_review_batch.py`.**

```python
from scripts.source_audit.review_ledger import (
    build_discovery_ledger_entry,
    validate_review_ledger,
)
```

Expected: this import is merged into the existing preamble and resolves before
I6.8 replaces the `discovery_command` stub.

**Independent-review rules:**

Calibration batches double-review every assigned source. Normal batches
double-review every mandatory-risk source plus a deterministic chapter-by-kind
sample. Each non-mandatory stratum samples
`min(population, max(5, ceil(population * 0.2)))`. The sample rank is SHA-256 of
`batchId`, a NUL byte, and `sourceId`. A critical omission or a source-level
disagreement rate strictly greater than `0.02` expands the complete stratum.
Reviewer IDs and reviewer task IDs are non-empty and pairwise different.

The ledger starts with exactly one genesis entry:

```json
{
  "entryType": "genesis",
  "genesisId": "editorial-baseline-834",
  "sourceCount": 834,
  "baseDecisionsSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "acceptedDecisionsSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Every later entry continues the decisions-hash chain. Discovery entries contain
page, attempt, reviewer, and added visual IDs, but no editorial disposition.
Review entries contain the exact source populations, mandatory reasons,
deterministic samples, disagreements, non-empty resolution notes, expansions,
reviewer identities, task identities, input fingerprint, and accepted hash.
Only the last accepted hash equals the current decisions hash.

- [ ] **T6.1 — Write ReviewLedgerRiskTests.test_required_second_review_reasons_combines_derived_and_manual_risks**

```python
class ReviewLedgerRiskTests(unittest.TestCase):
    def test_required_second_review_reasons_combines_derived_and_manual_risks(self):
        item = sample_source_item(
            sourceId="figure-1-2",
            kind="figure",
        )
        decision = sample_review_record(
            sourceId="figure-1-2",
            riskFlags=[
                "critical-number",
                "experiment-conclusion",
                "lesson-1-1",
                "scope-boundary",
            ],
            mustKeepIds=["analysis-high-risk-missing-path"],
        )
        self.assertEqual(
            required_second_review_reasons(
                item,
                decision,
                sample_policy(),
            ),
            [
                "analysis-high-risk",
                "critical-number",
                "experiment-conclusion",
                "lesson-1-1",
                "scope-boundary",
                "visual",
            ],
        )
```

Expected: only `ReviewLedgerRiskTests.test_required_second_review_reasons_combines_derived_and_manual_risks` is added in this action, and the shown Python block parses.

- [ ] **R6.1 — Run ReviewLedgerRiskTests.test_required_second_review_reasons_combines_derived_and_manual_risks**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerRiskTests.test_required_second_review_reasons_combines_derived_and_manual_risks -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `required_second_review_reasons` and proves that exact function or branch contract is not yet present.

- [ ] **I6.1 — Implement required_second_review_reasons**

```python
def required_second_review_reasons(item, decision, policy):
    manual_risk_flags = {
        "critical-number",
        "experiment-conclusion",
        "scope-boundary",
    }
    manual = set(decision["riskFlags"]) & manual_risk_flags
    derived = set(derived_risk_flags(item, decision, policy))
    if any(
        must_keep_id.startswith("analysis-high-risk-")
        for must_keep_id in decision["mustKeepIds"]
    ):
        derived.add("analysis-high-risk")
    return sorted(derived | manual)
```

Expected: only `required_second_review_reasons` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.1 — Run ReviewLedgerRiskTests.test_required_second_review_reasons_combines_derived_and_manual_risks**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerRiskTests.test_required_second_review_reasons_combines_derived_and_manual_risks -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T6.2 — Write ReviewLedgerSamplingTests.test_required_secondary_source_ids_uses_mandatory_and_ranked_strata**

```python
class ReviewLedgerSamplingTests(unittest.TestCase):
    def test_required_secondary_source_ids_uses_mandatory_and_ranked_strata(self):
        freeze = frozen_batch(
            mode="normal",
            batch_id="normal-001",
            source_ids=[
                "experiment-1-1",
                "experiment-1-2",
                "experiment-1-3",
                "experiment-1-4",
                "experiment-1-5",
                "experiment-1-6",
                "figure-1-2",
            ],
        )
        source_map = sample_sampling_source_map(
            freeze["sourceIds"]
        )
        primary = sample_review_patch(
            batchId="normal-001",
            changes=[
                sample_review_record(
                    sourceId=source_id,
                    riskFlags=(
                        ["lesson-1-1"]
                        if source_id == "figure-1-2"
                        else []
                    ),
                )
                for source_id in freeze["sourceIds"]
            ],
        )
        required = required_secondary_source_ids(
            freeze,
            primary,
            source_map,
            sample_policy(),
        )
        ranked_experiments = sorted(
            freeze["sourceIds"][:-1],
            key=lambda source_id: hashlib.sha256(
                (
                    "normal-001"
                    + "\0"
                    + source_id
                ).encode("utf-8")
            ).hexdigest(),
        )[:5]
        self.assertEqual(
            required,
            {"figure-1-2", *ranked_experiments},
        )
```

Expected: only `ReviewLedgerSamplingTests.test_required_secondary_source_ids_uses_mandatory_and_ranked_strata` is added in this action, and the shown Python block parses.

- [ ] **R6.2 — Run ReviewLedgerSamplingTests.test_required_secondary_source_ids_uses_mandatory_and_ranked_strata**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerSamplingTests.test_required_secondary_source_ids_uses_mandatory_and_ranked_strata -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `required_secondary_source_ids` and proves that exact function or branch contract is not yet present.

- [ ] **I6.2 — Implement required_secondary_source_ids**

```python
def required_secondary_source_ids(
    freeze,
    primary_patch,
    source_map,
    policy,
):
    primary = {}
    for record in primary_patch["changes"]:
        source_id = record["sourceId"]
        if source_id in primary:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        primary[source_id] = record
    if set(primary) != set(freeze["sourceIds"]):
        raise AuditValidationError(
            "primary patch does not cover frozen sources"
        )
    if freeze["mode"] == "calibration":
        return set(freeze["sourceIds"])
    mandatory = {
        source_id
        for source_id, decision in primary.items()
        if required_second_review_reasons(
            source_map[source_id],
            decision,
            policy,
        )
    }
    strata = {}
    for source_id in sorted(freeze["sourceIds"]):
        item = source_map[source_id]
        chapter = (
            str(item["chapter"])
            if item.get("chapter") is not None
            else "none"
        )
        key = f"chapter-{chapter}|kind-{item['kind']}"
        strata.setdefault(key, []).append(source_id)
    sampled = set()
    for key in sorted(strata):
        eligible = sorted(set(strata[key]) - mandatory)
        count = min(
            len(eligible),
            max(5, math.ceil(len(eligible) * 0.2)),
        )
        sampled.update(
            sorted(
                eligible,
                key=lambda source_id: hashlib.sha256(
                    (
                        freeze["batchId"]
                        + "\0"
                        + source_id
                    ).encode("utf-8")
                ).hexdigest(),
            )[:count]
        )
    return mandatory | sampled
```

Expected: only `required_secondary_source_ids` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.2 — Run ReviewLedgerSamplingTests.test_required_secondary_source_ids_uses_mandatory_and_ranked_strata**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerSamplingTests.test_required_secondary_source_ids_uses_mandatory_and_ranked_strata -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T6.3 — Write ReviewLedgerGenesisTests.test_build_genesis_ledger_entry_anchors_the_migrated_baseline**

```python
class ReviewLedgerGenesisTests(unittest.TestCase):
    def test_build_genesis_ledger_entry_anchors_the_migrated_baseline(self):
        digest = "a" * 64
        self.assertEqual(
            build_genesis_ledger_entry(digest, 834),
            {
                "entryType": "genesis",
                "genesisId": "editorial-baseline-834",
                "sourceCount": 834,
                "baseDecisionsSha256": digest,
                "acceptedDecisionsSha256": digest,
            },
        )
```

Expected: only `ReviewLedgerGenesisTests.test_build_genesis_ledger_entry_anchors_the_migrated_baseline` is added in this action, and the shown Python block parses.

- [ ] **R6.3 — Run ReviewLedgerGenesisTests.test_build_genesis_ledger_entry_anchors_the_migrated_baseline**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerGenesisTests.test_build_genesis_ledger_entry_anchors_the_migrated_baseline -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_genesis_ledger_entry` and proves that exact function or branch contract is not yet present.

- [ ] **I6.3 — Implement build_genesis_ledger_entry**

```python
def build_genesis_ledger_entry(decisions_sha256, source_count):
    if re.fullmatch(
        r"[0-9a-f]{64}",
        decisions_sha256,
    ) is None:
        raise AuditValidationError(
            "invalid genesis decisions SHA-256"
        )
    if type(source_count) is not int or source_count < 1:
        raise AuditValidationError(
            "invalid genesis source count"
        )
    return {
        "entryType": "genesis",
        "genesisId": f"editorial-baseline-{source_count}",
        "sourceCount": source_count,
        "baseDecisionsSha256": decisions_sha256,
        "acceptedDecisionsSha256": decisions_sha256,
    }
```

Expected: only `build_genesis_ledger_entry` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.3 — Run ReviewLedgerGenesisTests.test_build_genesis_ledger_entry_anchors_the_migrated_baseline**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerGenesisTests.test_build_genesis_ledger_entry_anchors_the_migrated_baseline -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T6.4 — Write ReviewLedgerDiscoveryTests.test_build_discovery_ledger_entry_records_sorted_visual_ids**

```python
class ReviewLedgerDiscoveryTests(unittest.TestCase):
    def test_build_discovery_ledger_entry_records_sorted_visual_ids(self):
        entry = build_discovery_ledger_entry(
            pdf_page=239,
            attempt=1,
            reviewer="visual-scanner-a",
            added_visual_ids=["visual-p239-01"],
            base_decisions_sha256="a" * 64,
            accepted_decisions_sha256="b" * 64,
        )
        self.assertEqual(
            entry,
            {
                "entryType": "discovery",
                "discoveryId": "discovery-p239-01",
                "pdfPage": 239,
                "attempt": 1,
                "reviewer": "visual-scanner-a",
                "addedVisualIds": ["visual-p239-01"],
                "baseDecisionsSha256": "a" * 64,
                "acceptedDecisionsSha256": "b" * 64,
            },
        )
```

Expected: only `ReviewLedgerDiscoveryTests.test_build_discovery_ledger_entry_records_sorted_visual_ids` is added in this action, and the shown Python block parses.

- [ ] **R6.4 — Run ReviewLedgerDiscoveryTests.test_build_discovery_ledger_entry_records_sorted_visual_ids**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerDiscoveryTests.test_build_discovery_ledger_entry_records_sorted_visual_ids -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_discovery_ledger_entry` and proves that exact function or branch contract is not yet present.

- [ ] **I6.4 — Implement build_discovery_ledger_entry**

```python
def build_discovery_ledger_entry(
    pdf_page,
    attempt,
    reviewer,
    added_visual_ids,
    base_decisions_sha256,
    accepted_decisions_sha256,
):
    if type(pdf_page) is not int or pdf_page < 1:
        raise AuditValidationError(
            "invalid discovery pdfPage"
        )
    if type(attempt) is not int or not 1 <= attempt <= 99:
        raise AuditValidationError(
            "invalid discovery attempt"
        )
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise AuditValidationError(
            "discovery reviewer must be non-blank"
        )
    if added_visual_ids != sorted(set(added_visual_ids)):
        raise AuditValidationError(
            "addedVisualIds must be sorted and unique"
        )
    for field, value in (
        ("baseDecisionsSha256", base_decisions_sha256),
        ("acceptedDecisionsSha256", accepted_decisions_sha256),
    ):
        if re.fullmatch(r"[0-9a-f]{64}", value) is None:
            raise AuditValidationError(f"invalid {field}")
    return {
        "entryType": "discovery",
        "discoveryId": (
            f"discovery-p{pdf_page:03d}-{attempt:02d}"
        ),
        "pdfPage": pdf_page,
        "attempt": attempt,
        "reviewer": reviewer,
        "addedVisualIds": added_visual_ids,
        "baseDecisionsSha256": base_decisions_sha256,
        "acceptedDecisionsSha256": accepted_decisions_sha256,
    }
```

Expected: only `build_discovery_ledger_entry` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.4 — Run ReviewLedgerDiscoveryTests.test_build_discovery_ledger_entry_records_sorted_visual_ids**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerDiscoveryTests.test_build_discovery_ledger_entry_records_sorted_visual_ids -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.
- [ ] **T6.5 — Write ReviewLedgerEscalationTests.test_required_after_escalation_expands_every_triggered_stratum**

```python
class ReviewLedgerEscalationTests(unittest.TestCase):
    def test_required_after_escalation_expands_every_triggered_stratum(self):
        freeze = frozen_batch(
            mode="normal",
            source_ids=[
                "experiment-1-1",
                "experiment-1-2",
                "experiment-1-3",
                "experiment-1-4",
                "experiment-1-5",
                "experiment-1-6",
            ],
        )
        source_map = sample_sampling_source_map(
            freeze["sourceIds"]
        )
        required = {
            "experiment-1-1",
            "experiment-1-2",
            "experiment-1-3",
            "experiment-1-4",
            "experiment-1-5",
        }
        expanded = required_after_escalation(
            freeze,
            required,
            [{
                "sourceId": "experiment-1-1",
                "fields": ["disposition"],
            }],
            [],
            source_map,
        )
        self.assertEqual(expanded, set(freeze["sourceIds"]))
```

Expected: only `ReviewLedgerEscalationTests.test_required_after_escalation_expands_every_triggered_stratum` is added in this action, and the shown Python block parses.

- [ ] **R6.5 — Run ReviewLedgerEscalationTests.test_required_after_escalation_expands_every_triggered_stratum**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerEscalationTests.test_required_after_escalation_expands_every_triggered_stratum -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `required_after_escalation` and proves that exact function or branch contract is not yet present.

- [ ] **I6.5 — Implement required_after_escalation**

```python
def required_after_escalation(
    freeze,
    required_secondary_ids,
    disagreements,
    critical_omissions,
    source_map,
):
    required = set(required_secondary_ids)
    disagreement_ids = {
        item["sourceId"] for item in disagreements
    }
    critical_ids = {
        item["sourceId"] for item in critical_omissions
    }
    strata = {}
    for source_id in sorted(freeze["sourceIds"]):
        item = source_map[source_id]
        chapter = (
            str(item["chapter"])
            if item.get("chapter") is not None
            else "none"
        )
        key = f"chapter-{chapter}|kind-{item['kind']}"
        strata.setdefault(key, []).append(source_id)
    for key in sorted(strata):
        population = strata[key]
        population_set = set(population)
        reviewed = population_set & set(
            required_secondary_ids
        )
        rate = (
            len(disagreement_ids & reviewed) / len(reviewed)
            if reviewed
            else 0.0
        )
        if critical_ids & population_set or rate > 0.02:
            required.update(population)
    return required
```

Expected: only `required_after_escalation` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.5 — Run ReviewLedgerEscalationTests.test_required_after_escalation_expands_every_triggered_stratum**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerEscalationTests.test_required_after_escalation_expands_every_triggered_stratum -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

The serialized review entry uses this exact field set and stores complete ID
lists rather than count-only summaries:

```json
{
  "entryType": "review",
  "batchId": "calibration-001",
  "mode": "calibration",
  "sourceIds": ["figure-1-2"],
  "primaryReviewer": "reviewer-a",
  "primaryTaskId": "/root/calibration_primary",
  "secondaryReviewer": "reviewer-b",
  "secondaryTaskId": "/root/calibration_secondary",
  "doubleReviewedSourceIds": ["figure-1-2"],
  "mandatoryReviews": [
    {
      "sourceId": "figure-1-2",
      "reasons": ["lesson-1-1", "visual"]
    }
  ],
  "strata": [
    {
      "key": "chapter-1|kind-figure",
      "populationSourceIds": ["figure-1-2"],
      "mandatorySourceIds": ["figure-1-2"],
      "sampledSourceIds": [],
      "doubleReviewedSourceIds": ["figure-1-2"],
      "disagreementSourceIds": [],
      "sourceDisagreementRate": 0.0,
      "expanded": false
    }
  ],
  "disagreements": [],
  "resolvedSourceIds": [],
  "sourceDisagreementRate": 0.0,
  "escalations": [],
  "inputFingerprint": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "baseDecisionsSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "acceptedDecisionsSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

- [ ] **T6.6 — Write ReviewLedgerEntryTests.test_build_review_ledger_entry_persists_resolution_rationale**

```python
class ReviewLedgerEntryTests(unittest.TestCase):
    def test_build_review_ledger_entry_persists_resolution_rationale(self):
        freeze = frozen_batch(
            mode="calibration",
            source_ids=["figure-1-2"],
        )
        source_map = {
            "figure-1-2": sample_source_item(
                sourceId="figure-1-2",
                kind="figure",
                chapter=1,
            )
        }
        primary = sample_review_patch(
            reviewer="reviewer-a",
            reviewerTaskId="/root/calibration_primary",
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    disposition="redraw",
                )
            ],
        )
        secondary = sample_review_patch(
            reviewer="reviewer-b",
            reviewerTaskId="/root/calibration_secondary",
            changes=[
                sample_review_record(
                    sourceId="figure-1-2",
                    disposition="text-alt",
                )
            ],
        )
        resolutions = {
            "resolutions": [{
                "sourceId": "figure-1-2",
                "resolutionNote": "Redraw preserves the source relation.",
            }],
            "criticalOmissions": [],
        }
        candidate = [
            sample_review_record(
                sourceId="figure-1-2",
                disposition="redraw",
            )
        ]
        entry = build_review_ledger_entry(
            freeze,
            primary,
            secondary,
            resolutions,
            source_map,
            candidate,
            sample_policy(),
            "b" * 64,
            "c" * 64,
        )
        self.assertEqual(
            entry["disagreements"],
            [{
                "sourceId": "figure-1-2",
                "fields": ["disposition"],
                "resolutionNote": (
                    "Redraw preserves the source relation."
                ),
            }],
        )
        self.assertEqual(
            entry["doubleReviewedSourceIds"],
            ["figure-1-2"],
        )
```

Expected: only `ReviewLedgerEntryTests.test_build_review_ledger_entry_persists_resolution_rationale` is added in this action, and the shown Python block parses.

- [ ] **R6.6 — Run ReviewLedgerEntryTests.test_build_review_ledger_entry_persists_resolution_rationale**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerEntryTests.test_build_review_ledger_entry_persists_resolution_rationale -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_review_ledger_entry` and proves that exact function or branch contract is not yet present.

- [ ] **I6.6a — Implement only `_records_by_source_id`.**

```python
def _records_by_source_id(records, label):
    by_id = {}
    for record in records:
        source_id = record["sourceId"]
        if source_id in by_id:
            raise AuditValidationError(
                f"duplicate {label} sourceId: {source_id}"
            )
        by_id[source_id] = record
    return by_id
```

Expected: only `_records_by_source_id` is added in this action, and the shown Python block parses.

- [ ] **I6.6b — Implement only `_resolved_disagreements`.**

```python
def _resolved_disagreements(
    primary_records,
    secondary_records,
    resolution_rows,
):
    primary = _records_by_source_id(primary_records, "primary")
    secondary = _records_by_source_id(
        secondary_records,
        "secondary",
    )
    raw = []
    for source_id in sorted(primary.keys() & secondary.keys()):
        fields = sorted(
            field
            for field in set(primary[source_id]) | set(secondary[source_id])
            if primary[source_id].get(field)
            != secondary[source_id].get(field)
        )
        if fields:
            raw.append({
                "sourceId": source_id,
                "fields": fields,
            })
    resolution_by_id = _records_by_source_id(
        resolution_rows,
        "resolution",
    )
    disagreement_ids = {
        item["sourceId"] for item in raw
    }
    if set(resolution_by_id) != disagreement_ids:
        raise AuditValidationError(
            "resolution set does not match disagreements"
        )
    durable = []
    for disagreement in raw:
        source_id = disagreement["sourceId"]
        note = resolution_by_id[source_id]["resolutionNote"]
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError(
                "resolutionNote must be non-blank"
            )
        durable.append({
            **disagreement,
            "resolutionNote": note,
        })
    return secondary, raw, durable, disagreement_ids
```

Expected: only `_resolved_disagreements` is added in this action, and the shown Python block parses.

- [ ] **I6.6c — Implement only the review-population helpers.**

```python
def _mandatory_review_rows(
    source_ids,
    source_map,
    decisions_by_id,
    policy,
):
    rows = []
    mandatory_ids = set()
    for source_id in source_ids:
        reasons = required_second_review_reasons(
            source_map[source_id],
            decisions_by_id[source_id],
            policy,
        )
        if reasons:
            mandatory_ids.add(source_id)
            rows.append({
                "sourceId": source_id,
                "reasons": reasons,
            })
    return rows, mandatory_ids


def _review_populations(source_ids, source_map):
    populations = {}
    for source_id in sorted(source_ids):
        item = source_map[source_id]
        chapter = (
            str(item["chapter"])
            if item.get("chapter") is not None
            else "none"
        )
        key = f"chapter-{chapter}|kind-{item['kind']}"
        populations.setdefault(key, []).append(source_id)
    return populations
```

Expected: only `_mandatory_review_rows` and `_review_populations` are added in this action, and the shown Python block parses.

- [ ] **I6.6d — Implement only `_review_stratum_summary`.**

```python
def _review_stratum_summary(
    key,
    population,
    initial_required,
    double_reviewed,
    mandatory_ids,
    disagreement_ids,
    critical_ids,
):
    population_set = set(population)
    initial = population_set & initial_required
    disagreements = sorted(
        disagreement_ids
        & set(double_reviewed)
        & population_set
    )
    trigger_rate = (
        len(disagreement_ids & initial) / len(initial)
        if initial
        else 0.0
    )
    reasons = []
    if critical_ids & population_set:
        reasons.append("critical-omission")
    if trigger_rate > 0.02:
        reasons.append("disagreement-rate-over-0.02")
    final_reviewed = set(double_reviewed) & population_set
    final_rate = (
        len(disagreements) / len(final_reviewed)
        if final_reviewed
        else 0.0
    )
    row = {
        "key": key,
        "populationSourceIds": population,
        "mandatorySourceIds": sorted(
            mandatory_ids & population_set
        ),
        "sampledSourceIds": sorted(
            (initial_required - mandatory_ids) & population_set
        ),
        "doubleReviewedSourceIds": sorted(final_reviewed),
        "disagreementSourceIds": disagreements,
        "sourceDisagreementRate": final_rate,
        "expanded": bool(reasons),
    }
    escalation = None
    if reasons:
        escalation = {
            "stratumKey": key,
            "reasons": reasons,
            "expandedSourceIds": population,
        }
    return row, escalation
```

Expected: only `_review_stratum_summary` is added in this action, and the shown Python block parses.

- [ ] **I6.6e — Implement only `_review_strata_and_escalations`.**

```python
def _review_strata_and_escalations(
    populations,
    initial_required,
    double_reviewed,
    mandatory_ids,
    disagreement_ids,
    critical_ids,
):
    strata = []
    escalations = []
    for key in sorted(populations):
        row, escalation = _review_stratum_summary(
            key,
            populations[key],
            initial_required,
            double_reviewed,
            mandatory_ids,
            disagreement_ids,
            critical_ids,
        )
        strata.append(row)
        if escalation is not None:
            escalations.append(escalation)
    return strata, escalations
```

Expected: only `_review_strata_and_escalations` is added in this action, and the shown Python block parses.

- [ ] **I6.6f — Implement only `_review_ledger_entry_payload`.**

```python
def _review_ledger_entry_payload(
    freeze,
    primary_patch,
    secondary_patch,
    double_reviewed,
    mandatory_reviews,
    strata,
    durable_disagreements,
    disagreement_ids,
    overall_rate,
    escalations,
    input_fingerprint,
    accepted_decisions_sha256,
):
    return {
        "entryType": "review",
        "batchId": freeze["batchId"],
        "mode": freeze["mode"],
        "sourceIds": freeze["sourceIds"],
        "primaryReviewer": primary_patch["reviewer"],
        "primaryTaskId": primary_patch["reviewerTaskId"],
        "secondaryReviewer": secondary_patch["reviewer"],
        "secondaryTaskId": secondary_patch["reviewerTaskId"],
        "doubleReviewedSourceIds": double_reviewed,
        "mandatoryReviews": mandatory_reviews,
        "strata": strata,
        "disagreements": durable_disagreements,
        "resolvedSourceIds": sorted(disagreement_ids),
        "sourceDisagreementRate": overall_rate,
        "escalations": escalations,
        "inputFingerprint": input_fingerprint,
        "baseDecisionsSha256": freeze["baseDecisionsSha256"],
        "acceptedDecisionsSha256": accepted_decisions_sha256,
    }
```

Expected: only `_review_ledger_entry_payload` is added in this action, and the shown Python block parses.

- [ ] **I6.6g — Implement only the review-entry validation helpers.**

```python
def _validated_candidate_decisions(freeze, candidate_decisions):
    by_id = _records_by_source_id(
        candidate_decisions,
        "candidate",
    )
    if not set(freeze["sourceIds"]) <= set(by_id):
        raise AuditValidationError(
            "candidate decisions omit frozen source IDs"
        )
    return by_id


def _validate_review_entry_hashes(
    accepted_decisions_sha256,
    input_fingerprint,
):
    for field, value in (
        ("inputFingerprint", input_fingerprint),
        ("acceptedDecisionsSha256", accepted_decisions_sha256),
    ):
        if re.fullmatch(r"[0-9a-f]{64}", value) is None:
            raise AuditValidationError(f"invalid {field}")
```

Expected: only `_validated_candidate_decisions` and `_validate_review_entry_hashes` are added in this action, and the shown Python block parses.

- [ ] **I6.6h — Implement only `build_review_ledger_entry`.**

```python
def build_review_ledger_entry(
    freeze,
    primary_patch,
    secondary_patch,
    resolutions,
    source_map,
    candidate_decisions,
    policy,
    accepted_decisions_sha256,
    input_fingerprint,
):
    candidate_by_id = _validated_candidate_decisions(
        freeze,
        candidate_decisions,
    )
    secondary, raw, durable, disagreement_ids = (
        _resolved_disagreements(
            primary_patch["changes"],
            secondary_patch["changes"],
            resolutions["resolutions"],
        )
    )
    double_reviewed = sorted(secondary)
    initial_required = required_secondary_source_ids(
        freeze,
        primary_patch,
        source_map,
        policy,
    )
    mandatory_reviews, mandatory_ids = _mandatory_review_rows(
        freeze["sourceIds"],
        source_map,
        candidate_by_id,
        policy,
    )
    critical_ids = {
        row["sourceId"] for row in resolutions["criticalOmissions"]
    }
    strata, escalations = _review_strata_and_escalations(
        _review_populations(freeze["sourceIds"], source_map),
        initial_required,
        double_reviewed,
        mandatory_ids,
        disagreement_ids,
        critical_ids,
    )
    required_final = required_after_escalation(
        freeze,
        initial_required,
        raw,
        resolutions["criticalOmissions"],
        source_map,
    )
    if set(double_reviewed) != required_final:
        raise AuditValidationError(
            "secondary patch does not match final review requirement"
        )
    _validate_review_entry_hashes(
        accepted_decisions_sha256,
        input_fingerprint,
    )
    overall_rate = (
        len(disagreement_ids) / len(double_reviewed)
        if double_reviewed
        else 0.0
    )
    return _review_ledger_entry_payload(
        freeze,
        primary_patch,
        secondary_patch,
        double_reviewed,
        mandatory_reviews,
        strata,
        durable,
        disagreement_ids,
        overall_rate,
        escalations,
        input_fingerprint,
        accepted_decisions_sha256,
    )
```

Expected: only `build_review_ledger_entry` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.6 — Run ReviewLedgerEntryTests.test_build_review_ledger_entry_persists_resolution_rationale**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerEntryTests.test_build_review_ledger_entry_persists_resolution_rationale -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

Direct validator fixtures cover missing genesis, a deleted chain prefix,
duplicate batch IDs, overlapping reviewed sources, missing or blank resolution
notes, stale mandatory reasons, wrong ranked samples, an unexpanded rate above
2%, duplicate discovery visual IDs, a visual on the wrong page, and a visual
catalog ID absent from all discovery entries.

- [ ] **T6.7 — Write ReviewLedgerValidationTests.test_validate_review_ledger_rejects_a_broken_hash_prefix**

```python
class ReviewLedgerValidationTests(unittest.TestCase):
    def test_validate_review_ledger_rejects_a_broken_hash_prefix(self):
        index = sample_page20_index()
        visuals = [
            sample_visual(
                pdfPage=20,
                sourceId="visual-p020-01",
            )
        ]
        decisions = sample_decisions(
            index=index,
            visuals=visuals,
            reviewState="reviewed",
        )
        ledger = sample_complete_ledger(
            index=index,
            visuals=visuals,
            decisions=decisions,
        )
        ledger[1]["baseDecisionsSha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError,
            "hash chain",
        ):
            validate_review_ledger(
                index,
                visuals,
                decisions,
                ledger,
                sample_policy(),
                sha256_json(decisions),
                require_complete=True,
            )
```

Expected: only `ReviewLedgerValidationTests.test_validate_review_ledger_rejects_a_broken_hash_prefix` is added in this action, and the shown Python block parses.

- [ ] **R6.7 — Run ReviewLedgerValidationTests.test_validate_review_ledger_rejects_a_broken_hash_prefix**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_validate_review_ledger_rejects_a_broken_hash_prefix -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `validate_review_ledger` and proves that exact function or branch contract is not yet present.

- [ ] **I6.7a — Add only the ledger field-set constants.**

```python
GENESIS_FIELDS = {
    "entryType",
    "genesisId",
    "sourceCount",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
DISCOVERY_FIELDS = {
    "entryType",
    "discoveryId",
    "pdfPage",
    "attempt",
    "reviewer",
    "addedVisualIds",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
REVIEW_FIELDS = {
    "entryType",
    "batchId",
    "mode",
    "sourceIds",
    "primaryReviewer",
    "primaryTaskId",
    "secondaryReviewer",
    "secondaryTaskId",
    "doubleReviewedSourceIds",
    "mandatoryReviews",
    "strata",
    "disagreements",
    "resolvedSourceIds",
    "sourceDisagreementRate",
    "escalations",
    "inputFingerprint",
    "baseDecisionsSha256",
    "acceptedDecisionsSha256",
}
STRATUM_FIELDS = {
    "key",
    "populationSourceIds",
    "mandatorySourceIds",
    "sampledSourceIds",
    "doubleReviewedSourceIds",
    "disagreementSourceIds",
    "sourceDisagreementRate",
    "expanded",
}
```

Expected: only the four exact ledger field-set constants are added in this
action, and the shown Python block parses.

- [ ] **T6.7B — Write `ReviewLedgerValidationTests.test_validate_ledger_genesis_rejects_missing_genesis`.**

```python
class ReviewLedgerValidationTests(unittest.TestCase):
    def test_validate_ledger_genesis_rejects_missing_genesis(self):
        with self.assertRaisesRegex(
            AuditValidationError,
            "genesis",
        ):
            _validate_ledger_genesis({
                "entryType": "review",
            })
```

Expected: only the direct genesis-validator test is added.

- [ ] **R6.7B — Run the genesis-validator test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_validate_ledger_genesis_rejects_missing_genesis -v
```

Expected: unittest collects one test and fails with `_validate_ledger_genesis`.

- [ ] **I6.7b — Implement only `_validate_ledger_genesis`.**

```python
def _validate_ledger_genesis(genesis):
    if set(genesis) != GENESIS_FIELDS:
        raise AuditValidationError(
            "genesis fields mismatch"
        )
    if (
        genesis["entryType"] != "genesis"
        or genesis["genesisId"] != "editorial-baseline-834"
        or genesis["sourceCount"] != 834
        or genesis["baseDecisionsSha256"]
        != genesis["acceptedDecisionsSha256"]
    ):
        raise AuditValidationError(
            "genesis anchor mismatch"
        )
    accepted = genesis["acceptedDecisionsSha256"]
    if re.fullmatch(r"[0-9a-f]{64}", accepted) is None:
        raise AuditValidationError(
            "invalid genesis acceptedDecisionsSha256"
        )
    return accepted
```

Expected: only `_validate_ledger_genesis` is added in this action, and the
shown Python block parses.

- [ ] **G6.7B — Re-run the genesis-validator test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_validate_ledger_genesis_rejects_missing_genesis -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T6.7C — Write `ReviewLedgerValidationTests.test_discovery_validator_rejects_duplicate_and_wrong_page_visuals`.**

```python
class ReviewLedgerValidationTests(unittest.TestCase):
    def test_discovery_validator_rejects_duplicate_and_wrong_page_visuals(self):
        visual = sample_visual(
            pdfPage=20,
            sourceId="visual-p020-01",
        )
        source_map = {visual["sourceId"]: visual}
        entry = build_discovery_ledger_entry(
            10, 1, "scanner-a", [visual["sourceId"]],
            "a" * 64, "a" * 64,
        )
        for discovered in (set(), {visual["sourceId"]}):
            with self.subTest(discovered=bool(discovered)), self.assertRaisesRegex(
                AuditValidationError,
                "invalid discovered visual",
            ):
                _validate_discovery_ledger_entry(
                    entry,
                    source_map,
                    {},
                    discovered,
                )
```

Expected: one direct test independently reaches the wrong-page and duplicate
visual branches with a structurally valid visual fixture.

- [ ] **R6.7C — Run the discovery-validator test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_discovery_validator_rejects_duplicate_and_wrong_page_visuals -v
```

Expected: unittest collects one test and fails with
`_validate_discovery_ledger_entry`.

- [ ] **I6.7c — Implement only `_validate_discovery_ledger_entry`.**

```python
def _validate_discovery_ledger_entry(
    entry,
    source_map,
    attempts,
    discovered_visual_ids,
):
    if set(entry) != DISCOVERY_FIELDS:
        raise AuditValidationError(
            "discovery ledger fields mismatch"
        )
    pdf_page = entry["pdfPage"]
    attempt = entry["attempt"]
    expected_attempt = attempts.get(pdf_page, 0) + 1
    if attempt != expected_attempt:
        raise AuditValidationError(
            f"discovery attempt gap on page {pdf_page}"
        )
    attempts[pdf_page] = attempt
    expected_id = f"discovery-p{pdf_page:03d}-{attempt:02d}"
    if entry["discoveryId"] != expected_id:
        raise AuditValidationError("discoveryId mismatch")
    if (
        not isinstance(entry["reviewer"], str)
        or not entry["reviewer"].strip()
    ):
        raise AuditValidationError(
            "discovery reviewer must be non-blank"
        )
    added = entry["addedVisualIds"]
    if added != sorted(set(added)):
        raise AuditValidationError(
            "addedVisualIds must be sorted unique"
        )
    for source_id in added:
        if (
            source_id in discovered_visual_ids
            or source_id not in source_map
            or source_map[source_id]["kind"] != "visual"
            or source_map[source_id]["pdfPage"] != pdf_page
        ):
            raise AuditValidationError(
                f"invalid discovered visual: {source_id}"
            )
        discovered_visual_ids.add(source_id)
```

Expected: only `_validate_discovery_ledger_entry` is added in this action, and
the shown Python block parses.

- [ ] **G6.7C — Re-run the discovery-validator test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_discovery_validator_rejects_duplicate_and_wrong_page_visuals -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T6.7D — Write `ReviewLedgerValidationTests.test_review_identity_rejects_duplicate_batch_and_source_overlap`.**

```python
class ReviewLedgerValidationTests(unittest.TestCase):
    def test_review_identity_rejects_duplicate_batch_and_source_overlap(self):
        entry = sample_review_entry()
        source = sample_source_item()
        source_map = {source["sourceId"]: source}
        decisions = {
            source["sourceId"]: {"reviewState": "reviewed"},
        }
        cases = (
            ({entry["batchId"]}, set(), "duplicate reviewed batchId"),
            (set(), {source["sourceId"]}, "multiple batches"),
        )
        for batch_ids, reviewed_ids, message in cases:
            with self.subTest(message=message), self.assertRaisesRegex(
                AuditValidationError,
                message,
            ):
                _validate_review_entry_identity(
                    entry,
                    source_map,
                    decisions,
                    batch_ids,
                    reviewed_ids,
                )
```

Expected: one direct identity test reaches duplicate-batch and overlapping
source ownership as separate subtests.

- [ ] **R6.7D — Run the review-identity test and confirm RED.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_review_identity_rejects_duplicate_batch_and_source_overlap -v
```

Expected: unittest collects one test and fails with
`_validate_review_entry_identity`.

- [ ] **I6.7d1 — Implement only `_validate_reviewer_identity`.**

```python
def _validate_reviewer_identity(entry):
    identity_fields = (
        "primaryReviewer",
        "primaryTaskId",
        "secondaryReviewer",
        "secondaryTaskId",
    )
    for field in identity_fields:
        if not isinstance(entry[field], str) or not entry[field].strip():
            raise AuditValidationError(f"{field} must be non-blank")
    if (
        entry["primaryReviewer"] == entry["secondaryReviewer"]
        or entry["primaryTaskId"] == entry["secondaryTaskId"]
    ):
        raise AuditValidationError(
            "double review requires distinct reviewers and tasks"
        )
```

Expected: only reviewer and task identity validation is added.

- [ ] **I6.7d2 — Implement only `_validate_review_source_ids`.**

```python
def _validate_review_source_ids(
    entry,
    source_map,
    decisions_by_id,
    reviewed_source_ids,
):
    source_ids = entry["sourceIds"]
    double_reviewed = entry["doubleReviewedSourceIds"]
    for name, values in (
        ("sourceIds", source_ids),
        ("doubleReviewedSourceIds", double_reviewed),
    ):
        if values != sorted(set(values)):
            raise AuditValidationError(f"{name} must be sorted unique")
    if not set(double_reviewed) <= set(source_ids):
        raise AuditValidationError(
            "double-reviewed IDs are outside review batch"
        )
    if entry["mode"] == "calibration" and double_reviewed != source_ids:
        raise AuditValidationError(
            "calibration must be 100% double reviewed"
        )
    overlap = reviewed_source_ids & set(source_ids)
    if overlap:
        raise AuditValidationError(
            "source reviewed by multiple batches: " + str(sorted(overlap))
        )
    for source_id in source_ids:
        if source_id not in source_map:
            raise AuditValidationError(
                "review source is outside catalog: " + source_id
            )
        if decisions_by_id[source_id]["reviewState"] != "reviewed":
            raise AuditValidationError(
                "ledgered source is not reviewed: " + source_id
            )
    return source_ids, double_reviewed
```

Expected: only sortedness, containment, ownership, and reviewed-state checks
for review source IDs are added.

- [ ] **I6.7d3 — Implement only `_validate_review_entry_identity`.**

```python
def _validate_review_entry_identity(
    entry,
    source_map,
    decisions_by_id,
    batch_ids,
    reviewed_source_ids,
):
    if set(entry) != REVIEW_FIELDS:
        raise AuditValidationError("review ledger fields mismatch")
    batch_id = entry["batchId"]
    if re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,63}", batch_id) is None:
        raise AuditValidationError("invalid review batchId")
    if batch_id in batch_ids:
        raise AuditValidationError(
            f"duplicate reviewed batchId: {batch_id}"
        )
    if entry["mode"] not in {"calibration", "normal"}:
        raise AuditValidationError("invalid review mode")
    _validate_reviewer_identity(entry)
    source_ids, double_reviewed = _validate_review_source_ids(
        entry,
        source_map,
        decisions_by_id,
        reviewed_source_ids,
    )
    batch_ids.add(batch_id)
    return source_ids, double_reviewed
```

Expected: only `_validate_review_entry_identity` is added in this action, and
the shown Python block parses.

- [ ] **G6.7D — Re-run the review-identity test and confirm GREEN.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_review_identity_rejects_duplicate_batch_and_source_overlap -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **I6.7e — Implement only `_expected_initial_secondary`.**

```python
def _expected_initial_secondary(
    entry,
    source_map,
    decisions_by_id,
    policy,
):
    source_ids = entry["sourceIds"]
    mandatory_reviews, mandatory_ids = _mandatory_review_rows(
        source_ids,
        source_map,
        decisions_by_id,
        policy,
    )
    populations = _review_populations(source_ids, source_map)
    if entry["mode"] == "calibration":
        return (
            mandatory_reviews,
            mandatory_ids,
            populations,
            set(source_ids),
        )
    initial_secondary = set(mandatory_ids)
    for key in sorted(populations):
        eligible = sorted(
            set(populations[key]) - mandatory_ids
        )
        count = min(
            len(eligible),
            max(5, math.ceil(len(eligible) * 0.2)),
        )
        ranked = sorted(
            eligible,
            key=lambda source_id: hashlib.sha256(
                (
                    entry["batchId"]
                    + "\0"
                    + source_id
                ).encode("utf-8")
            ).hexdigest(),
        )
        initial_secondary.update(ranked[:count])
    return (
        mandatory_reviews,
        mandatory_ids,
        populations,
        initial_secondary,
    )
```

Expected: only `_expected_initial_secondary` is added in this action, and the
shown Python block parses.

- [ ] **I6.7f — Implement only `_validated_disagreement_ids`.**

```python
def _validated_disagreement_ids(entry, double_reviewed):
    by_id = {}
    for row in entry["disagreements"]:
        if set(row) != {
            "sourceId",
            "fields",
            "resolutionNote",
        }:
            raise AuditValidationError(
                "ledger disagreement fields mismatch"
            )
        source_id = row["sourceId"]
        if source_id in by_id:
            raise AuditValidationError(
                "duplicate ledger disagreement: " + source_id
            )
        if source_id not in set(double_reviewed):
            raise AuditValidationError(
                "disagreement source was not double reviewed"
            )
        if (
            row["fields"] != sorted(set(row["fields"]))
            or not row["fields"]
        ):
            raise AuditValidationError(
                "invalid disagreement fields: " + source_id
            )
        if (
            not isinstance(row["resolutionNote"], str)
            or not row["resolutionNote"].strip()
        ):
            raise AuditValidationError(
                "blank resolutionNote: " + source_id
            )
        by_id[source_id] = row
    disagreement_ids = set(by_id)
    if entry["resolvedSourceIds"] != sorted(disagreement_ids):
        raise AuditValidationError(
            "resolvedSourceIds mismatch"
        )
    expected_rate = (
        len(disagreement_ids) / len(double_reviewed)
        if double_reviewed
        else 0.0
    )
    if entry["sourceDisagreementRate"] != expected_rate:
        raise AuditValidationError(
            "sourceDisagreementRate mismatch"
        )
    return disagreement_ids
```

Expected: only `_validated_disagreement_ids` is added in this action, and the
shown Python block parses.

- [ ] **I6.7g — Implement only `_validated_escalations`.**

```python
def _validated_escalations(entry, populations):
    by_key = {}
    for row in entry["escalations"]:
        if set(row) != {
            "stratumKey",
            "reasons",
            "expandedSourceIds",
        }:
            raise AuditValidationError(
                "escalation fields mismatch"
            )
        key = row["stratumKey"]
        if key in by_key or key not in populations:
            raise AuditValidationError(
                f"invalid escalation stratum: {key}"
            )
        reasons = row["reasons"]
        if (
            reasons != sorted(set(reasons))
            or not reasons
            or not set(reasons) <= {
                "critical-omission",
                "disagreement-rate-over-0.02",
            }
        ):
            raise AuditValidationError(
                f"invalid escalation reasons: {key}"
            )
        if row["expandedSourceIds"] != populations[key]:
            raise AuditValidationError(
                f"escalation expansion mismatch: {key}"
            )
        by_key[key] = row
    return by_key
```

Expected: only `_validated_escalations` is added in this action, and the shown
Python block parses.

- [ ] **I6.7h — Implement only `_expected_validated_stratum`.**

```python
def _expected_validated_stratum(
    key,
    population,
    mandatory_ids,
    initial_secondary,
    disagreement_ids,
    double_reviewed,
    escalation,
):
    population_set = set(population)
    initial = population_set & initial_secondary
    disagreements = sorted(
        disagreement_ids & population_set
    )
    trigger_rate = (
        len(set(disagreements) & initial) / len(initial)
        if initial
        else 0.0
    )
    disagreement_reason = "disagreement-rate-over-0.02"
    if trigger_rate > 0.02 and (
        escalation is None
        or disagreement_reason not in escalation["reasons"]
    ):
        raise AuditValidationError(
            "missing disagreement escalation: " + key
        )
    if (
        escalation is not None
        and disagreement_reason in escalation["reasons"]
        and trigger_rate <= 0.02
    ):
        raise AuditValidationError(
            "spurious disagreement escalation: " + key
        )
    final_reviewed = set(double_reviewed) & population_set
    final_rate = (
        len(disagreements) / len(final_reviewed)
        if final_reviewed
        else 0.0
    )
    return {
        "key": key,
        "populationSourceIds": population,
        "mandatorySourceIds": sorted(
            mandatory_ids & population_set
        ),
        "sampledSourceIds": sorted(
            (initial_secondary - mandatory_ids) & population_set
        ),
        "doubleReviewedSourceIds": sorted(final_reviewed),
        "disagreementSourceIds": disagreements,
        "sourceDisagreementRate": final_rate,
        "expanded": escalation is not None,
    }
```

Expected: only `_expected_validated_stratum` is added in this action, and the
shown Python block parses.

- [ ] **I6.7i — Implement only `_validate_review_strata`.**

```python
def _validate_review_strata(
    entry,
    populations,
    mandatory_ids,
    initial_secondary,
    disagreement_ids,
    escalations,
):
    strata = {}
    for row in entry["strata"]:
        if set(row) != STRATUM_FIELDS:
            raise AuditValidationError(
                "stratum fields mismatch"
            )
        key = row["key"]
        if key in strata:
            raise AuditValidationError(
                f"duplicate stratum: {key}"
            )
        strata[key] = row
    if set(strata) != set(populations):
        raise AuditValidationError(
            "strata coverage mismatch"
        )
    double_reviewed = entry["doubleReviewedSourceIds"]
    expected_double = set(initial_secondary)
    for key in sorted(populations):
        escalation = escalations.get(key)
        expected = _expected_validated_stratum(
            key,
            populations[key],
            mandatory_ids,
            initial_secondary,
            disagreement_ids,
            double_reviewed,
            escalation,
        )
        if strata[key] != expected:
            raise AuditValidationError(
                f"stratum mismatch: {key}"
            )
        if escalation is not None:
            expected_double.update(populations[key])
    if set(double_reviewed) != expected_double:
        raise AuditValidationError(
            "double review does not match sample and escalation"
        )
```

Expected: only `_validate_review_strata` is added in this action, and the shown
Python block parses.

- [ ] **I6.7j — Implement only `_validate_review_ledger_entry`.**

```python
def _validate_review_ledger_entry(
    entry,
    source_map,
    decisions_by_id,
    policy,
    batch_ids,
    reviewed_source_ids,
):
    source_ids, double_reviewed = (
        _validate_review_entry_identity(
            entry,
            source_map,
            decisions_by_id,
            batch_ids,
            reviewed_source_ids,
        )
    )
    (
        mandatory_reviews,
        mandatory_ids,
        populations,
        initial_secondary,
    ) = _expected_initial_secondary(
        entry,
        source_map,
        decisions_by_id,
        policy,
    )
    if entry["mandatoryReviews"] != mandatory_reviews:
        raise AuditValidationError(
            "mandatoryReviews mismatch"
        )
    disagreement_ids = _validated_disagreement_ids(
        entry,
        double_reviewed,
    )
    escalations = _validated_escalations(
        entry,
        populations,
    )
    _validate_review_strata(
        entry,
        populations,
        mandatory_ids,
        initial_secondary,
        disagreement_ids,
        escalations,
    )
    for field in (
        "inputFingerprint",
        "baseDecisionsSha256",
        "acceptedDecisionsSha256",
    ):
        if re.fullmatch(
            r"[0-9a-f]{64}",
            entry[field],
        ) is None:
            raise AuditValidationError(
                f"invalid {field}"
            )
    reviewed_source_ids.update(source_ids)
```

Expected: only `_validate_review_ledger_entry` is added in this action, and the
shown Python block parses.

- [ ] **I6.7k — Implement only `validate_review_ledger`.**

```python
def validate_review_ledger(
    index,
    visuals,
    decisions,
    ledger,
    policy,
    current_decisions_sha256,
    require_complete=False,
):
    source_map = source_items_by_id(index, visuals)
    decisions_by_id = _records_by_source_id(
        decisions,
        "decision",
    )
    if set(decisions_by_id) != set(source_map):
        raise AuditValidationError(
            "ledger validation requires complete decisions"
        )
    if not isinstance(ledger, list) or not ledger:
        raise AuditValidationError(
            "review ledger must be non-empty"
        )
    previous_hash = _validate_ledger_genesis(ledger[0])
    attempts = {}
    discovered_visual_ids = set()
    reviewed_source_ids = set()
    batch_ids = set()
    for entry in ledger[1:]:
        if entry.get("baseDecisionsSha256") != previous_hash:
            raise AuditValidationError(
                "ledger hash chain is broken"
            )
        entry_type = entry.get("entryType")
        if entry_type == "discovery":
            _validate_discovery_ledger_entry(
                entry,
                source_map,
                attempts,
                discovered_visual_ids,
            )
        elif entry_type == "review":
            _validate_review_ledger_entry(
                entry,
                source_map,
                decisions_by_id,
                policy,
                batch_ids,
                reviewed_source_ids,
            )
        else:
            raise AuditValidationError(
                f"unknown ledger entryType: {entry_type}"
            )
        accepted = entry["acceptedDecisionsSha256"]
        if re.fullmatch(r"[0-9a-f]{64}", accepted) is None:
            raise AuditValidationError(
                "invalid acceptedDecisionsSha256"
            )
        previous_hash = accepted
    if previous_hash != current_decisions_sha256:
        raise AuditValidationError(
            "ledger tail does not match current decisions"
        )
    expected_visual_ids = {
        item["sourceId"] for item in visuals
    }
    if discovered_visual_ids != expected_visual_ids:
        raise AuditValidationError(
            "discovery ledger does not exactly cover visual catalog"
        )
    if require_complete and reviewed_source_ids != set(source_map):
        raise AuditValidationError(
            "complete ledger does not cover every source"
        )
```

Expected: only `validate_review_ledger` is added or changed in this action, and
the shown Python block parses.

- [ ] **G6.7 — Run ReviewLedgerValidationTests.test_validate_review_ledger_rejects_a_broken_hash_prefix**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger.ReviewLedgerValidationTests.test_validate_review_ledger_rejects_a_broken_hash_prefix -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

The discovery CLI path-role set is `patch`, `index`, `policy`,
`visuals-target`, `decisions-target`, and `ledger-target`. Only each declared
in-place target may refer to its own input file; every cross-role symlink,
hardlink, case-fold alias, or Unicode-normalization alias is rejected before
loading. Visuals, decisions, and the appended discovery entry are one
three-target transaction. An empty visual addition still records the page scan
and its accepted decisions hash.

- [ ] **T6.8 — Write PrepareReviewBatchDiscoveryTests.test_discovery_command_rolls_back_all_three_targets_at_every_failure_position**

```python
class PrepareReviewBatchDiscoveryTests(unittest.TestCase):
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
```

Expected: only `PrepareReviewBatchDiscoveryTests.test_discovery_command_rolls_back_all_three_targets_at_every_failure_position` is added in this action, and the shown Python block parses.

- [ ] **R6.8 — Run PrepareReviewBatchDiscoveryTests.test_discovery_command_rolls_back_all_three_targets_at_every_failure_position**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchDiscoveryTests.test_discovery_command_rolls_back_all_three_targets_at_every_failure_position -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `discovery_command` and proves that exact function or branch contract is not yet present.

- [ ] **I6.8 — Implement discovery_command**

```python
def discovery_command(args) -> dict:
    paths = {
        "patch": Path(args.patch).resolve(),
        "index": Path(args.index).resolve(),
        "policy": Path(args.policy).resolve(),
        "visuals-target": Path(args.visuals).resolve(),
        "decisions-target": Path(args.decisions).resolve(),
        "ledger-target": Path(args.ledger).resolve(),
    }
    assert_distinct_paths(paths)
    patch = load_json(paths["patch"])
    index = load_json(paths["index"])
    policy = load_json(paths["policy"])
    visuals = load_json(paths["visuals-target"])
    decisions = load_json(paths["decisions-target"])
    ledger = load_json(paths["ledger-target"])
    base_decisions_sha256 = sha256_json(decisions)
    candidate_visuals, candidate_decisions, local_to_stable = (
        apply_discovery_patch(
            index,
            visuals,
            decisions,
            patch,
            policy,
        )
    )
    accepted_decisions_sha256 = sha256_json(
        candidate_decisions
    )
    previous_visual_ids = {
        item["sourceId"] for item in visuals
    }
    accepted_visual_ids = {
        item["sourceId"] for item in candidate_visuals
    }
    added_visual_ids = sorted(
        accepted_visual_ids - previous_visual_ids
    )
    entry = build_discovery_ledger_entry(
        pdf_page=patch["pdfPage"],
        attempt=patch["attempt"],
        reviewer=patch["reviewer"],
        added_visual_ids=added_visual_ids,
        base_decisions_sha256=base_decisions_sha256,
        accepted_decisions_sha256=(
            accepted_decisions_sha256
        ),
    )
    candidate_ledger = [
        *copy.deepcopy(ledger),
        entry,
    ]
    validate_review_ledger(
        index,
        candidate_visuals,
        candidate_decisions,
        candidate_ledger,
        policy,
        accepted_decisions_sha256,
        require_complete=False,
    )
    write_json_transaction({
        paths["visuals-target"]: candidate_visuals,
        paths["decisions-target"]: candidate_decisions,
        paths["ledger-target"]: candidate_ledger,
    })
    return {
        "pdfPage": patch["pdfPage"],
        "attempt": patch["attempt"],
        "addedVisualIds": added_visual_ids,
        "localToStable": {
            key: local_to_stable[key]
            for key in sorted(local_to_stable)
        },
        "baseDecisionsSha256": base_decisions_sha256,
        "acceptedDecisionsSha256": (
            accepted_decisions_sha256
        ),
    }
```

Expected: only `discovery_command` is added or changed in this action, and the shown Python block parses.

- [ ] **G6.8 — Run PrepareReviewBatchDiscoveryTests.test_discovery_command_rolls_back_all_three_targets_at_every_failure_position**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_prepare_review_batch.PrepareReviewBatchDiscoveryTests.test_discovery_command_rolls_back_all_three_targets_at_every_failure_position -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **Task 6 focused gate**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_review_ledger tests.source_audit.test_prepare_review_batch -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **Task 6 full-suite gate**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **Task 6 commit**

```bash
git add scripts/source_audit/review_ledger.py scripts/source_audit/prepare_review_batch.py tests/source_audit/test_review_ledger.py tests/source_audit/test_prepare_review_batch.py
git commit -m "feat: validate editorial review ledger"
```

Expected: one local Task commit is created with the stated message; no remote write occurs.

**Static validation report:**
- Frozen source SHA-256 matched:
  `c83ebe2c8d980813a5f9f2d376af51751df7a7155314d90ba3762acd301c19e7`.
- Anchor coverage: Task 6 heading inclusive through Task 7 heading exclusive.
- Eight strict T/R/I/G cycles and three separate end gates.
- 35 executable checkboxes and 37 fenced code blocks.
- 16 Python blocks pass `ast.parse`.
- 2 JSON blocks pass `json.loads`.
- 19 Bash blocks pass `bash -n`.
- Every T label names one class-qualified unittest method and its immediate
  Python block defines exactly that method.
- Every R and G step contains one class-qualified unittest command and an
  explicit `Expected:` result.
- Every I label names one function and its immediate Python block defines
  exactly one matching top-level function.
- Every T, R, I, G, gate, and commit action has an explicit `Expected:`
  result.
- No unclosed fence, placeholder, ellipsis, prose-only test directive, or
  chained commit command remains.

### Task 7: Atomic batch integration and recovery

**Files:**
- Create: `scripts/source_audit/integrate_review_batch.py`
- Create: `tests/source_audit/test_integrate_review_batch.py`
- Modify: `scripts/source_audit/build_reports.py`
- Modify: `tests/source_audit/test_build_reports.py`

**Interfaces:**
- Consumes: frozen batch, primary patch, secondary patch, explicit resolution,
  current formal files, current immutable evidence hashes.
- Produces:
  - `integrate_review_batch(index: dict, visuals: list[dict], decisions: list[dict], ledger: list[dict], policy: dict, must_keep_inventory: list[dict], freeze: dict, current_evidence_hashes: dict[str, object], primary_patch: dict, secondary_patch: dict, resolution: dict) -> dict[str, object]`
  - `review_input_fingerprint(freeze: dict, primary_patch: dict, secondary_patch: dict, resolution: dict) -> str`
  - `build_comparison_artifacts(freeze: dict, primary_patch: dict, secondary_patch: dict, source_map: dict[str, dict], policy: dict) -> tuple[dict, dict]`
  - CLI `python3 -m scripts.source_audit.integrate_review_batch` with
    `compare`, `validate-resolution`, and `apply` subcommands.

#### Executable module scaffolds

- [ ] **S7.0A — Create the complete production imports and module constants.**

```python
from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import unicodedata
from pathlib import Path

from scripts.source_audit.build_reports import (
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.build_review_packages import (
    parse_markdown_sections,
)
from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import validate_editorial_decisions
from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
)
from scripts.source_audit.must_keep import (
    build_must_keep_inventory,
    validate_must_keep_coverage,
)
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    compare_review_patches,
    validate_frozen_batch,
    validate_frozen_immutable_evidence,
    validate_review_patch,
)
from scripts.source_audit.review_ledger import (
    build_review_ledger_entry,
    required_after_escalation,
    required_secondary_source_ids,
    validate_review_ledger,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
    write_json_transaction,
)
```

Expected: `scripts/source_audit/integrate_review_batch.py` imports every symbol
used below, and importing the module raises no warning or exception.

- [ ] **S7.0B — Stage every public and test-imported API as an import-safe stub.**

```python

def _pending(name): raise NotImplementedError(name)
def _accepted_retry(*args, **kwargs): return _pending("_accepted_retry")
def _apply_command(*args, **kwargs): return _pending("_apply_command")
def _assert_unreviewed_delta(*args, **kwargs): return _pending("_assert_unreviewed_delta")
def _build_parser(*args, **kwargs): return _pending("_build_parser")
def _compare_command(*args, **kwargs): return _pending("_compare_command")
def _disagreement_ledger_rows(*args, **kwargs): return _pending("_disagreement_ledger_rows")
def _load_common_inputs(*args, **kwargs): return _pending("_load_common_inputs")
def _records_by_source_id(*args, **kwargs): return _pending("_records_by_source_id")
def _render_accepted_reports(*args, **kwargs): return _pending("_render_accepted_reports")
def _replace_records_preserving_order(*args, **kwargs): return _pending("_replace_records_preserving_order")
def _require_agreed_fields_unchanged(*args, **kwargs): return _pending("_require_agreed_fields_unchanged")
def _require_exact_secondary_expansion(*args, **kwargs): return _pending("_require_exact_secondary_expansion")
def _require_resolution_batch_id(*args, **kwargs): return _pending("_require_resolution_batch_id")
def _require_resolution_final_records(*args, **kwargs): return _pending("_require_resolution_final_records")
def _require_resolution_notes(*args, **kwargs): return _pending("_require_resolution_notes")
def _require_secondary_coverage(*args, **kwargs): return _pending("_require_secondary_coverage")
def _require_unique_resolution_ids(*args, **kwargs): return _pending("_require_unique_resolution_ids")
def _resolve_complete_records(*args, **kwargs): return _pending("_resolve_complete_records")
def _role_paths(*args, **kwargs): return _pending("_role_paths")
def _validate_accepted_retry(*args, **kwargs): return _pending("_validate_accepted_retry")
def _validate_candidate_state(*args, **kwargs): return _pending("_validate_candidate_state")
def _validate_critical_omissions(*args, **kwargs): return _pending("_validate_critical_omissions")
def _validate_current_evidence(*args, **kwargs): return _pending("_validate_current_evidence")
def _validate_disagreement_ledger_rows(*args, **kwargs): return _pending("_validate_disagreement_ledger_rows")
def _validate_integration_paths(*args, **kwargs): return _pending("_validate_integration_paths")
def _validate_resolution_command(*args, **kwargs): return _pending("_validate_resolution_command")
def _validate_retry_reports(*args, **kwargs): return _pending("_validate_retry_reports")
def _write_apply_outputs(*args, **kwargs): return _pending("_write_apply_outputs")
def _write_comparison_outputs(*args, **kwargs): return _pending("_write_comparison_outputs")
def build_comparison_artifacts(*args, **kwargs): return _pending("build_comparison_artifacts")
def integrate_review_batch(*args, **kwargs): return _pending("integrate_review_batch")
def main(*args, **kwargs): return _pending("main")
def review_input_fingerprint(*args, **kwargs): return _pending("review_input_fingerprint")
```

Expected: every test-imported API exists before any RED step imports the module;
calling a not-yet-implemented API raises its own named `NotImplementedError`.

- [ ] **S7.1A — Create the complete integration test imports.**

```python
from __future__ import annotations

import copy
import json
import os
import pathlib
import tempfile
import unittest
from unittest import mock

from scripts.source_audit.integrate_review_batch import (
    _accepted_retry,
    _apply_command,
    _assert_unreviewed_delta,
    _build_parser,
    _compare_command,
    _disagreement_ledger_rows,
    _records_by_source_id,
    _render_accepted_reports,
    _replace_records_preserving_order,
    _role_paths,
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
    _validate_resolution_command,
    _load_common_inputs,
    _write_apply_outputs,
    _write_comparison_outputs,
    build_comparison_artifacts,
    integrate_review_batch,
    main,
    review_input_fingerprint,
)
from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.review_batches import compare_review_patches
from scripts.source_audit.review_ledger import (
    required_secondary_source_ids,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
)
from tests.source_audit.editorial_fixtures import (
    sample_calibration_decisions,
    sample_integration_case as _raw_integration_case,
)
```

Expected: every production helper and fixture used by Task 7 tests is imported
explicitly.

- [ ] **S7.1B — Add the failure helper and ten test-class scaffolds.**

```python
def _fail_at(real_replace, failure_position):
    calls = 0

    def replace(source, target):
        nonlocal calls
        calls += 1
        if calls == failure_position:
            raise OSError("injected replacement failure")
        return real_replace(source, target)

    return replace


class IntegrationResolutionTests(unittest.TestCase):
    pass


class IntegrationRejectionTests(unittest.TestCase):
    pass


class IntegrationRecoveryTests(unittest.TestCase):
    pass


class IntegrationLedgerDurabilityTests(unittest.TestCase):
    pass


class IntegrationPartialReviewTests(unittest.TestCase):
    pass


class IntegrationComparisonTests(unittest.TestCase):
    pass


class IntegrationTransactionTests(unittest.TestCase):
    pass


class IntegrationPathSafetyTests(unittest.TestCase):
    pass


class IntegrationCliTests(unittest.TestCase):
    pass


class IntegrationReportTests(unittest.TestCase):
    pass
```

Expected: `tests.source_audit.test_integrate_review_batch` exposes the
one-shot failure helper and all ten classes before their methods are added.

- [ ] **S7.2 — Add the Task 7 fixture adapter and partial-secondary fixture.**

```python
def sample_integration_case(variant=None):
    case = _raw_integration_case(variant)
    arguments = case["arguments"]
    source_map = source_items_by_id(
        arguments["index"], arguments["visuals"]
    )
    return {
        **case,
        **arguments,
        "primaryPatch": arguments["primary_patch"],
        "secondaryPatch": arguments["secondary_patch"],
        "currentEvidence": arguments["current_evidence_hashes"],
        "mustKeepInventory": arguments["must_keep_inventory"],
        "sourceMap": source_map,
        "expectedExpandedSecondaryIds": list(
            arguments["freeze"]["sourceIds"]
        ),
    }


def sample_partial_secondary_case():
    case = sample_integration_case()
    primary = copy.deepcopy(case["primaryPatch"])
    secondary = copy.deepcopy(case["secondaryPatch"])
    if len(primary["changes"]) < 2:
        raise AssertionError(
            "partial-secondary fixture requires two primary records"
        )
    unsampled = primary["changes"][-1]["sourceId"]
    secondary["changes"] = [
        row
        for row in secondary["changes"]
        if row["sourceId"] != unsampled
    ]
    required = sorted(
        row["sourceId"] for row in secondary["changes"]
    )
    return {
        **case,
        "primaryPatch": primary,
        "secondaryPatch": secondary,
        "disagreements": [],
        "requiredSecondaryIds": required,
        "unsampledSourceId": unsampled,
    }
```

Expected: both fixtures expose exactly the names used by Task 7 tests; the raw
Task 1 fixture remains unchanged.

- [ ] **S7.3 — Add `_records_by_source_id`.**

```python
def _records_by_source_id(patch):
    records = {}
    for record in patch["changes"]:
        source_id = record["sourceId"]
        if source_id in records:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        records[source_id] = record
    return records
```

Expected: duplicate patch `sourceId` values are rejected before comparison.

- [ ] **S7.4 — Add `review_input_fingerprint`.**

```python
def review_input_fingerprint(
    freeze,
    primary_patch,
    secondary_patch,
    resolution,
):
    return sha256_json({
        "freezeSha256": freeze["freezeSha256"],
        "primaryPatchSha256": sha256_json(primary_patch),
        "secondaryPatchSha256": sha256_json(secondary_patch),
        "resolutionSha256": sha256_json(resolution),
    })
```

Expected: identical review inputs always produce the same fingerprint.

- [ ] **S7.5 — Add canonical path and containment identities.**

```python
def _canonical_path_text(path):
    return unicodedata.normalize(
        "NFC", str(Path(path).resolve(strict=False))
    ).casefold()


def canonical_path_identity(path):
    candidate = Path(path)
    normalized = _canonical_path_text(candidate)
    tokens = {("path", normalized)}
    if candidate.exists():
        stat_result = candidate.stat()
        tokens.add(
            ("inode", stat_result.st_dev, stat_result.st_ino)
        )
    return frozenset(tokens)


def _path_is_within(candidate, root):
    candidate_text = _canonical_path_text(candidate)
    root_text = _canonical_path_text(root).rstrip(os.sep)
    return (
        candidate_text != root_text
        and candidate_text.startswith(root_text + os.sep)
    )
```

Expected: hardlinks share an inode token and textual identities are Unicode
normalized and case folded; containment uses the same normalized identity.

The resolution document has this exact schema:

```json
{
  "batchId": "calibration-001",
  "resolutions": [
    {
      "sourceId": "figure-1-2",
      "fields": ["visualHandling"],
      "finalRecord": {
        "sourceId": "figure-1-2",
        "disposition": "compressed",
        "reason": "保留上下文消融结论，压缩技术字段",
        "lessonIds": ["1-1"],
        "markdownRefs": ["reference/book-analysis.md:52-78"],
        "visualClass": "semantic-core",
        "visualHandling": "redraw",
        "visualHandlingNote": "",
        "visualTextAlternative": "无关上下文会挤占有限窗口并降低任务表现",
        "riskFlags": ["lesson-1-1", "visual"],
        "mustKeepIds": ["course-objective-1-1"],
        "symbolTextAlternatives": [],
        "reviewState": "reviewed"
      },
      "resolutionNote": "原貌不是证据，按统一网页风格重绘"
    }
  ],
  "criticalOmissions": []
}
```

Each `criticalOmissions` row has exactly `sourceId` and non-blank `note`.
Its source must belong to the batch and must have been double reviewed.
Duplicate critical-omission IDs are invalid.

- [ ] **T7.1 — `IntegrationResolutionTests.test_resolution_rejects_wrong_batch_id_before_candidates`**

```python
class IntegrationResolutionTests(unittest.TestCase):
    def test_resolution_rejects_wrong_batch_id_before_candidates(self):
        case = sample_integration_case()
        case["resolution"]["batchId"] = "calibration-999"
        with self.assertRaisesRegex(
            AuditValidationError, "batchId mismatch"
        ):
            _require_resolution_batch_id(
                case["freeze"], case["resolution"]
            )
```

Expected: only `IntegrationResolutionTests.test_resolution_rejects_wrong_batch_id_before_candidates` is added in this action, and the shown Python block parses.

- [ ] **R7.1 — Run `IntegrationResolutionTests.test_resolution_rejects_wrong_batch_id_before_candidates` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_wrong_batch_id_before_candidates -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_resolution_batch_id` and proves that exact function or branch contract is not yet present.

- [ ] **I7.1 — Implement `_require_resolution_batch_id`**

```python
def _require_resolution_batch_id(freeze, resolution):
    if not isinstance(resolution, dict):
        raise AuditValidationError("resolution must be an object")
    if resolution.get("batchId") != freeze["batchId"]:
        raise AuditValidationError("resolution batchId mismatch")
```

Expected: only `_require_resolution_batch_id` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.1 — Run `IntegrationResolutionTests.test_resolution_rejects_wrong_batch_id_before_candidates` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_wrong_batch_id_before_candidates -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.2 — `IntegrationResolutionTests.test_resolution_rejects_duplicate_source_id`**

```python
class IntegrationResolutionTests(unittest.TestCase):
    def test_resolution_rejects_duplicate_source_id(self):
        case = sample_integration_case()
        duplicate = copy.deepcopy(
            case["resolution"]["resolutions"][0]
        )
        case["resolution"]["resolutions"].append(duplicate)
        with self.assertRaisesRegex(
            AuditValidationError, "duplicate resolution sourceId"
        ):
            _require_unique_resolution_ids(case["resolution"])
```

Expected: only `IntegrationResolutionTests.test_resolution_rejects_duplicate_source_id` is added in this action, and the shown Python block parses.

- [ ] **R7.2 — Run `IntegrationResolutionTests.test_resolution_rejects_duplicate_source_id` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_duplicate_source_id -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_unique_resolution_ids` and proves that exact function or branch contract is not yet present.

- [ ] **I7.2 — Implement `_require_unique_resolution_ids`**

```python
def _require_unique_resolution_ids(resolution):
    seen = set()
    for row in resolution.get("resolutions", []):
        source_id = row.get("sourceId")
        if source_id in seen:
            raise AuditValidationError(
                f"duplicate resolution sourceId: {source_id}"
            )
        seen.add(source_id)
```

Expected: only `_require_unique_resolution_ids` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.2 — Run `IntegrationResolutionTests.test_resolution_rejects_duplicate_source_id` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_duplicate_source_id -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.3 — `IntegrationResolutionTests.test_resolution_rejects_unfilled_final_record`**

```python
class IntegrationResolutionTests(unittest.TestCase):
    def test_resolution_rejects_unfilled_final_record(self):
        case = sample_integration_case()
        case["resolution"]["resolutions"][0]["finalRecord"] = None
        with self.assertRaisesRegex(
            AuditValidationError, "finalRecord must be an object"
        ):
            _require_resolution_final_records(case["resolution"])
```

Expected: only `IntegrationResolutionTests.test_resolution_rejects_unfilled_final_record` is added in this action, and the shown Python block parses.

- [ ] **R7.3 — Run `IntegrationResolutionTests.test_resolution_rejects_unfilled_final_record` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_unfilled_final_record -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_resolution_final_records` and proves that exact function or branch contract is not yet present.

- [ ] **I7.3 — Implement `_require_resolution_final_records`**

```python
def _require_resolution_final_records(resolution):
    for row in resolution.get("resolutions", []):
        final_record = row.get("finalRecord")
        if not isinstance(final_record, dict):
            raise AuditValidationError(
                "resolution finalRecord must be an object"
            )
        if final_record.get("sourceId") != row.get("sourceId"):
            raise AuditValidationError(
                "resolution finalRecord sourceId mismatch"
            )
```

Expected: only `_require_resolution_final_records` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.3 — Run `IntegrationResolutionTests.test_resolution_rejects_unfilled_final_record` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_unfilled_final_record -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.4 — `IntegrationResolutionTests.test_resolution_rejects_blank_note`**

```python
class IntegrationResolutionTests(unittest.TestCase):
    def test_resolution_rejects_blank_note(self):
        case = sample_integration_case()
        case["resolution"]["resolutions"][0]["resolutionNote"] = " "
        with self.assertRaisesRegex(
            AuditValidationError, "requires note"
        ):
            _require_resolution_notes(case["resolution"])
```

Expected: only `IntegrationResolutionTests.test_resolution_rejects_blank_note` is added in this action, and the shown Python block parses.

- [ ] **R7.4 — Run `IntegrationResolutionTests.test_resolution_rejects_blank_note` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_blank_note -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_resolution_notes` and proves that exact function or branch contract is not yet present.

- [ ] **I7.4 — Implement `_require_resolution_notes`**

```python
def _require_resolution_notes(resolution):
    for row in resolution.get("resolutions", []):
        note = row.get("resolutionNote")
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError(
                f"resolution requires note: {row.get('sourceId')}"
            )
```

Expected: only `_require_resolution_notes` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.4 — Run `IntegrationResolutionTests.test_resolution_rejects_blank_note` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_blank_note -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.5 — `IntegrationResolutionTests.test_resolution_rejects_agreed_field_change`**

```python
class IntegrationResolutionTests(unittest.TestCase):
    def test_resolution_rejects_agreed_field_change(self):
        for inflate_fields in (False, True):
            with self.subTest(inflate_fields=inflate_fields):
                case = sample_integration_case()
                primary = _records_by_source_id(
                    case["primaryPatch"]
                )
                secondary = _records_by_source_id(
                    case["secondaryPatch"]
                )
                row = case["resolution"]["resolutions"][0]
                row["finalRecord"]["reason"] = "双方未同意的额外改写"
                if inflate_fields:
                    row["fields"] = sorted([
                        *row["fields"], "reason",
                    ])
                with self.assertRaisesRegex(
                    AuditValidationError,
                    "changed agreed field|fields do not match",
                ):
                    _require_agreed_fields_unchanged(
                        row,
                        primary[row["sourceId"]],
                        secondary[row["sourceId"]],
                    )
```

Expected: only `IntegrationResolutionTests.test_resolution_rejects_agreed_field_change` is added in this action, and the shown Python block parses.

- [ ] **R7.5 — Run `IntegrationResolutionTests.test_resolution_rejects_agreed_field_change` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_agreed_field_change -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_agreed_fields_unchanged` and proves that exact function or branch contract is not yet present.

- [ ] **I7.5 — Implement `_require_agreed_fields_unchanged`**

```python
def _require_agreed_fields_unchanged(row, primary_record, secondary_record):
    all_fields = set(primary_record) | set(secondary_record)
    actual_changes = {
        field
        for field in all_fields
        if primary_record.get(field) != secondary_record.get(field)
    }
    allowed_changes = set(row["fields"])
    if (
        row["fields"] != sorted(allowed_changes)
        or allowed_changes != actual_changes
    ):
        raise AuditValidationError(
            "resolution fields do not match disagreement: "
            f"{row['sourceId']}"
        )
    final_record = row["finalRecord"]
    all_fields |= set(final_record)
    for field in all_fields - allowed_changes:
        agreed = primary_record.get(field)
        if (
            secondary_record.get(field) != agreed
            or final_record.get(field) != agreed
        ):
            raise AuditValidationError(
                "resolution changed agreed field: "
                f"{row['sourceId']}.{field}"
            )
```

Expected: only `_require_agreed_fields_unchanged` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.5 — Run `IntegrationResolutionTests.test_resolution_rejects_agreed_field_change` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_resolution_rejects_agreed_field_change -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.6 — `IntegrationRejectionTests.test_rejects_missing_mandatory_secondary_id`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_missing_mandatory_secondary_id(self):
        case = sample_integration_case("missing-secondary")
        secondary_ids = set(
            _records_by_source_id(case["secondaryPatch"])
        )
        required_ids = required_secondary_source_ids(
            case["freeze"],
            case["primaryPatch"],
            case["sourceMap"],
            case["policy"],
        )
        with self.assertRaisesRegex(
            AuditValidationError,
            "secondary patch missing required IDs",
        ):
            _require_secondary_coverage(required_ids, secondary_ids)
```

Expected: only `IntegrationRejectionTests.test_rejects_missing_mandatory_secondary_id` is added in this action, and the shown Python block parses.

- [ ] **R7.6 — Run `IntegrationRejectionTests.test_rejects_missing_mandatory_secondary_id` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_missing_mandatory_secondary_id -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_secondary_coverage` and proves that exact function or branch contract is not yet present.

- [ ] **I7.6 — Implement `_require_secondary_coverage`**

```python
def _require_secondary_coverage(required_ids, secondary_ids):
    missing = sorted(set(required_ids) - set(secondary_ids))
    if missing:
        raise AuditValidationError(
            f"secondary patch missing required IDs: {missing}"
        )
```

Expected: only `_require_secondary_coverage` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.6 — Run `IntegrationRejectionTests.test_rejects_missing_mandatory_secondary_id` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_missing_mandatory_secondary_id -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.7 — `IntegrationRejectionTests.test_rejects_unexpanded_disagreement_stratum`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_unexpanded_disagreement_stratum(self):
        case = sample_integration_case("unexpanded-stratum")
        expected = set(case["expectedExpandedSecondaryIds"])
        actual = set(_records_by_source_id(case["secondaryPatch"]))
        with self.assertRaisesRegex(
            AuditValidationError, "secondary expansion mismatch"
        ):
            _require_exact_secondary_expansion(expected, actual)
```

Expected: only `IntegrationRejectionTests.test_rejects_unexpanded_disagreement_stratum` is added in this action, and the shown Python block parses.

- [ ] **R7.7 — Run `IntegrationRejectionTests.test_rejects_unexpanded_disagreement_stratum` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_unexpanded_disagreement_stratum -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_exact_secondary_expansion` and proves that exact function or branch contract is not yet present.

- [ ] **I7.7 — Implement `_require_exact_secondary_expansion`**

```python
def _require_exact_secondary_expansion(expected_ids, actual_ids):
    expected = set(expected_ids)
    actual = set(actual_ids)
    if actual != expected:
        raise AuditValidationError(
            "secondary expansion mismatch: "
            f"missing={sorted(expected - actual)}, "
            f"extra={sorted(actual - expected)}"
        )
```

Expected: only `_require_exact_secondary_expansion` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.7 — Run `IntegrationRejectionTests.test_rejects_unexpanded_disagreement_stratum` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_unexpanded_disagreement_stratum -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.8 — `IntegrationRejectionTests.test_rejects_wrong_unreviewed_delta`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_wrong_unreviewed_delta(self):
        before = sample_calibration_decisions()
        after = copy.deepcopy(before)
        after[0]["reviewState"] = "reviewed"
        with self.assertRaisesRegex(
            AuditValidationError, "unreviewed delta mismatch"
        ):
            _assert_unreviewed_delta(before, after, {})
```

Expected: only `IntegrationRejectionTests.test_rejects_wrong_unreviewed_delta` is added in this action, and the shown Python block parses.

- [ ] **R7.8 — Run `IntegrationRejectionTests.test_rejects_wrong_unreviewed_delta` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_wrong_unreviewed_delta -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_assert_unreviewed_delta` and proves that exact function or branch contract is not yet present.

- [ ] **I7.8 — Implement `_assert_unreviewed_delta`**

```python
def _assert_unreviewed_delta(before, after, replacements):
    before_by_id = {
        item["sourceId"]: item for item in before
    }
    reviewed_ids = sorted(
        source_id
        for source_id in replacements
        if before_by_id[source_id]["reviewState"] != "unreviewed"
    )
    if reviewed_ids:
        raise AuditValidationError(
            f"batch cannot overwrite reviewed IDs: {reviewed_ids}"
        )
    before_unreviewed = {
        item["sourceId"]
        for item in before
        if item["reviewState"] == "unreviewed"
    }
    after_unreviewed = {
        item["sourceId"]
        for item in after
        if item["reviewState"] == "unreviewed"
    }
    expected_removed = before_unreviewed & set(replacements)
    if before_unreviewed - after_unreviewed != expected_removed:
        raise AuditValidationError("unreviewed delta mismatch")
```

Expected: only `_assert_unreviewed_delta` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.8 — Run `IntegrationRejectionTests.test_rejects_wrong_unreviewed_delta` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_wrong_unreviewed_delta -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.9 — `IntegrationRejectionTests.test_rejects_reviewed_id_from_another_batch`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_reviewed_id_from_another_batch(self):
        before = sample_calibration_decisions()
        before[0]["reviewState"] = "reviewed"
        replacements = {
            before[0]["sourceId"]: {
                **before[0],
                "reason": "不允许覆盖既有审核结论",
            }
        }
        after = _replace_records_preserving_order(
            before, replacements
        )
        with self.assertRaisesRegex(
            AuditValidationError, "cannot overwrite reviewed IDs"
        ):
            _assert_unreviewed_delta(before, after, replacements)
```

Expected: only `IntegrationRejectionTests.test_rejects_reviewed_id_from_another_batch` is added in this action, and the shown Python block parses.

- [ ] **R7.9 — Run `IntegrationRejectionTests.test_rejects_reviewed_id_from_another_batch` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_reviewed_id_from_another_batch -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_replace_records_preserving_order` and proves that exact function or branch contract is not yet present.

- [ ] **I7.9 — Implement `_replace_records_preserving_order`**

```python
def _replace_records_preserving_order(decisions, replacements):
    return [
        copy.deepcopy(replacements.get(item["sourceId"], item))
        for item in decisions
    ]
```

Expected: only `_replace_records_preserving_order` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.9 — Run `IntegrationRejectionTests.test_rejects_reviewed_id_from_another_batch` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_reviewed_id_from_another_batch -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.10 — `IntegrationRejectionTests.test_rejects_stale_static_evidence`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_stale_static_evidence(self):
        case = sample_integration_case()
        case["currentEvidence"]["pdfSha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError, "pdfSha256 mismatch"
        ):
            _validate_current_evidence(
                case["freeze"], case["currentEvidence"]
            )
```

Expected: only `IntegrationRejectionTests.test_rejects_stale_static_evidence` is added in this action, and the shown Python block parses.

- [ ] **R7.10 — Run `IntegrationRejectionTests.test_rejects_stale_static_evidence` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_stale_static_evidence -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_current_evidence` and proves that exact function or branch contract is not yet present.

- [ ] **I7.10 — Implement `_validate_current_evidence`**

```python
def _validate_current_evidence(freeze, current_evidence):
    validate_frozen_immutable_evidence(freeze, current_evidence)
```

Expected: only `_validate_current_evidence` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.10 — Run `IntegrationRejectionTests.test_rejects_stale_static_evidence` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_stale_static_evidence -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.11 — `IntegrationRejectionTests.test_rejects_invalid_ledger_candidate`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_invalid_ledger_candidate(self):
        case = sample_integration_case("invalid-ledger")
        with self.assertRaisesRegex(
            AuditValidationError, "genesis|ledger"
        ):
            _validate_candidate_state(
                case["index"],
                case["visuals"],
                case["decisions"],
                case["ledger"],
                case["policy"],
                case["mustKeepInventory"],
            )
```

Expected: only `IntegrationRejectionTests.test_rejects_invalid_ledger_candidate` is added in this action, and the shown Python block parses.

- [ ] **R7.11 — Run `IntegrationRejectionTests.test_rejects_invalid_ledger_candidate` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_invalid_ledger_candidate -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_candidate_state` and proves that exact function or branch contract is not yet present.

- [ ] **I7.11 — Implement the `ledger` branch of `_validate_candidate_state`**

```python
def _validate_candidate_state(
    index,
    visuals,
    decisions,
    ledger,
    policy,
    must_keep_inventory,
):
    validate_editorial_decisions(
        index, visuals, decisions, policy
    )
    validate_review_ledger(
        index,
        visuals,
        decisions,
        ledger,
        policy,
        sha256_json(decisions),
    )
```

Expected: the staged function validates editorial decisions and the ledger
only; invalid must-keep routing remains the intended RED for T7.12.

- [ ] **G7.11 — Run `IntegrationRejectionTests.test_rejects_invalid_ledger_candidate` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_invalid_ledger_candidate -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.12 — `IntegrationRejectionTests.test_rejects_invalid_must_keep_candidate`**

```python
class IntegrationRejectionTests(unittest.TestCase):
    def test_rejects_invalid_must_keep_candidate(self):
        case = sample_integration_case("invalid-must-keep-coverage")
        candidate = _replace_records_preserving_order(
            case["decisions"],
            _records_by_source_id(case["primaryPatch"]),
        )
        with self.assertRaisesRegex(
            AuditValidationError, "mustKeep|route"
        ):
            _validate_candidate_state(
                case["index"],
                case["visuals"],
                candidate,
                case["ledger"],
                case["policy"],
                case["mustKeepInventory"],
            )
```

Expected: only `IntegrationRejectionTests.test_rejects_invalid_must_keep_candidate` is added in this action, and the shown Python block parses.

- [ ] **R7.12 — Run `IntegrationRejectionTests.test_rejects_invalid_must_keep_candidate` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_invalid_must_keep_candidate -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_candidate_state` and proves that exact function or branch contract is not yet present.

- [ ] **I7.12 — Implement the `must-keep-route` branch of `_validate_candidate_state`**

```python
def _validate_candidate_state(
    index,
    visuals,
    decisions,
    ledger,
    policy,
    must_keep_inventory,
):
    source_map = source_items_by_id(index, visuals)
    validate_editorial_decisions(
        index, visuals, decisions, policy
    )
    validate_must_keep_coverage(
        must_keep_inventory,
        decisions,
        source_map,
        index["outline"],
        policy,
        require_complete=False,
    )
    validate_review_ledger(
        index,
        visuals,
        decisions,
        ledger,
        policy,
        sha256_json(decisions),
    )
```

Expected: only `_validate_candidate_state` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.12 — Run `IntegrationRejectionTests.test_rejects_invalid_must_keep_candidate` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRejectionTests.test_rejects_invalid_must_keep_candidate -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.13 — `IntegrationRecoveryTests.test_same_batch_with_changed_input_fingerprint_fails`**

```python
class IntegrationRecoveryTests(unittest.TestCase):
    def test_same_batch_with_changed_input_fingerprint_fails(self):
        case = sample_integration_case()
        fingerprint = review_input_fingerprint(
            case["freeze"],
            case["primaryPatch"],
            case["secondaryPatch"],
            case["resolution"],
        )
        ledger = [{
            "entryType": "review",
            "batchId": case["freeze"]["batchId"],
            "inputFingerprint": "f" * 64,
        }]
        with self.assertRaisesRegex(
            AuditValidationError, "inputFingerprint mismatch"
        ):
            _accepted_retry(
                ledger, case["freeze"]["batchId"], fingerprint
            )
```

Expected: only `IntegrationRecoveryTests.test_same_batch_with_changed_input_fingerprint_fails` is added in this action, and the shown Python block parses.

- [ ] **R7.13 — Run `IntegrationRecoveryTests.test_same_batch_with_changed_input_fingerprint_fails` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_same_batch_with_changed_input_fingerprint_fails -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_accepted_retry` and proves that exact function or branch contract is not yet present.

- [ ] **I7.13 — Implement `_accepted_retry`**

```python
def _accepted_retry(ledger, batch_id, input_fingerprint):
    matches = [
        entry
        for entry in ledger
        if entry.get("entryType") == "review"
        and entry.get("batchId") == batch_id
    ]
    if not matches:
        return None
    if len(matches) != 1:
        raise AuditValidationError(
            f"duplicate accepted batchId: {batch_id}"
        )
    entry = matches[0]
    if entry.get("inputFingerprint") != input_fingerprint:
        raise AuditValidationError("inputFingerprint mismatch")
    return entry
```

Expected: only `_accepted_retry` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.13 — Run `IntegrationRecoveryTests.test_same_batch_with_changed_input_fingerprint_fails` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_same_batch_with_changed_input_fingerprint_fails -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.14 — `IntegrationRecoveryTests.test_accepted_retry_still_revalidates_immutable_evidence`**

```python
class IntegrationRecoveryTests(unittest.TestCase):
    def test_accepted_retry_still_revalidates_immutable_evidence(self):
        case = sample_integration_case()
        current = copy.deepcopy(case["currentEvidence"])
        current["pageImages"][0]["sha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError, "pageImages"
        ):
            _validate_accepted_retry(
                case["freeze"],
                current,
                case["index"],
                case["visuals"],
                case["decisions"],
                case["ledger"],
                case["policy"],
            )
```

Expected: only `IntegrationRecoveryTests.test_accepted_retry_still_revalidates_immutable_evidence` is added in this action, and the shown Python block parses.

- [ ] **R7.14 — Run `IntegrationRecoveryTests.test_accepted_retry_still_revalidates_immutable_evidence` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_accepted_retry_still_revalidates_immutable_evidence -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_accepted_retry` and proves that exact function or branch contract is not yet present.

- [ ] **I7.14 — Implement `_validate_accepted_retry`**

```python
def _validate_accepted_retry(
    freeze,
    current_evidence,
    index,
    visuals,
    decisions,
    ledger,
    policy,
):
    validate_frozen_immutable_evidence(freeze, current_evidence)
    validate_review_ledger(
        index,
        visuals,
        decisions,
        ledger,
        policy,
        sha256_json(decisions),
    )
```

Expected: only `_validate_accepted_retry` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.14 — Run `IntegrationRecoveryTests.test_accepted_retry_still_revalidates_immutable_evidence` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_accepted_retry_still_revalidates_immutable_evidence -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.15 — `IntegrationLedgerDurabilityTests.test_success_persists_exact_resolution_note_in_ledger`**

```python
class IntegrationLedgerDurabilityTests(unittest.TestCase):
    def test_success_persists_exact_resolution_note_in_ledger(self):
        case = sample_integration_case()
        rows = _disagreement_ledger_rows(
            case["resolution"]["resolutions"]
        )
        self.assertEqual(
            rows,
            [{
                "sourceId": "figure-1-2",
                "fields": ["visualHandling"],
                "resolutionNote": (
                    case["resolution"]["resolutions"][0][
                        "resolutionNote"
                    ]
                ),
            }],
        )
```

Expected: only `IntegrationLedgerDurabilityTests.test_success_persists_exact_resolution_note_in_ledger` is added in this action, and the shown Python block parses.

- [ ] **R7.15 — Run `IntegrationLedgerDurabilityTests.test_success_persists_exact_resolution_note_in_ledger` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationLedgerDurabilityTests.test_success_persists_exact_resolution_note_in_ledger -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_disagreement_ledger_rows` and proves that exact function or branch contract is not yet present.

- [ ] **I7.15 — Implement `_disagreement_ledger_rows`**

```python
def _disagreement_ledger_rows(resolution_rows):
    return [
        {
            "sourceId": row["sourceId"],
            "fields": list(row["fields"]),
            "resolutionNote": row["resolutionNote"],
        }
        for row in resolution_rows
    ]
```

Expected: only `_disagreement_ledger_rows` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.15 — Run `IntegrationLedgerDurabilityTests.test_success_persists_exact_resolution_note_in_ledger` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationLedgerDurabilityTests.test_success_persists_exact_resolution_note_in_ledger -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.16 — `IntegrationLedgerDurabilityTests.test_ledger_rejects_blank_resolution_note`**

```python
class IntegrationLedgerDurabilityTests(unittest.TestCase):
    def test_ledger_rejects_blank_resolution_note(self):
        rows = [{
            "sourceId": "figure-1-2",
            "fields": ["visualHandling"],
            "resolutionNote": " ",
        }]
        with self.assertRaisesRegex(
            AuditValidationError, "blank resolutionNote"
        ):
            _validate_disagreement_ledger_rows(rows)
```

Expected: only `IntegrationLedgerDurabilityTests.test_ledger_rejects_blank_resolution_note` is added in this action, and the shown Python block parses.

- [ ] **R7.16 — Run `IntegrationLedgerDurabilityTests.test_ledger_rejects_blank_resolution_note` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationLedgerDurabilityTests.test_ledger_rejects_blank_resolution_note -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_disagreement_ledger_rows` and proves that exact function or branch contract is not yet present.

- [ ] **I7.16 — Implement `_validate_disagreement_ledger_rows`**

```python
def _validate_disagreement_ledger_rows(rows):
    for row in rows:
        if set(row) != {
            "sourceId", "fields", "resolutionNote",
        }:
            raise AuditValidationError(
                "disagreement fields mismatch"
            )
        note = row["resolutionNote"]
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError("blank resolutionNote")
```

Expected: only `_validate_disagreement_ledger_rows` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.16 — Run `IntegrationLedgerDurabilityTests.test_ledger_rejects_blank_resolution_note` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationLedgerDurabilityTests.test_ledger_rejects_blank_resolution_note -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.17 — `IntegrationPartialReviewTests.test_unsampled_ids_use_primary_records`**

```python
class IntegrationPartialReviewTests(unittest.TestCase):
    def test_unsampled_ids_use_primary_records(self):
        case = sample_partial_secondary_case()
        result = _resolve_complete_records(
            case["freeze"],
            case["primaryPatch"],
            case["secondaryPatch"],
            case["resolution"],
            case["disagreements"],
            set(case["requiredSecondaryIds"]),
        )
        unsampled_id = case["unsampledSourceId"]
        primary = _records_by_source_id(case["primaryPatch"])
        self.assertEqual(result[unsampled_id], primary[unsampled_id])
```

Expected: only `IntegrationPartialReviewTests.test_unsampled_ids_use_primary_records` is added in this action, and the shown Python block parses.

- [ ] **R7.17 — Run `IntegrationPartialReviewTests.test_unsampled_ids_use_primary_records` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationPartialReviewTests.test_unsampled_ids_use_primary_records -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_resolve_complete_records` and proves that exact function or branch contract is not yet present.

- [ ] **I7.17 — Implement `_resolve_complete_records`**

```python
def _resolve_complete_records(
    freeze,
    primary_patch,
    secondary_patch,
    resolution,
    disagreements,
    required_secondary_ids,
):
    primary = _records_by_source_id(primary_patch)
    secondary = _records_by_source_id(secondary_patch)
    disagreement_fields = {
        row["sourceId"]: row["fields"] for row in disagreements
    }
    resolution_map = {
        row["sourceId"]: row for row in resolution["resolutions"]
    }
    final_records = {}
    for source_id in freeze["sourceIds"]:
        if source_id not in required_secondary_ids:
            final_records[source_id] = primary[source_id]
        elif primary[source_id] == secondary[source_id]:
            final_records[source_id] = primary[source_id]
        else:
            if source_id not in disagreement_fields:
                raise AuditValidationError(
                    f"unresolved disagreement: {source_id}"
                )
            row = resolution_map.get(source_id)
            if row is None:
                raise AuditValidationError(
                    f"unresolved disagreement: {source_id}"
                )
            if row["fields"] != disagreement_fields[source_id]:
                raise AuditValidationError(
                    "resolution fields do not match disagreement: "
                    f"{source_id}"
                )
            _require_agreed_fields_unchanged(
                row, primary[source_id], secondary[source_id]
            )
            final_records[source_id] = copy.deepcopy(
                row["finalRecord"]
            )
    return final_records
```

Expected: only `_resolve_complete_records` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.17 — Run `IntegrationPartialReviewTests.test_unsampled_ids_use_primary_records` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationPartialReviewTests.test_unsampled_ids_use_primary_records -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.18 — `IntegrationComparisonTests.test_comparison_artifacts_are_deterministic_and_unfilled`**

```python
class IntegrationComparisonTests(unittest.TestCase):
    def test_comparison_artifacts_are_deterministic_and_unfilled(self):
        case = sample_integration_case()
        first = build_comparison_artifacts(
            case["freeze"],
            case["primaryPatch"],
            case["secondaryPatch"],
            case["sourceMap"],
            case["policy"],
        )
        second = build_comparison_artifacts(
            case["freeze"],
            case["primaryPatch"],
            case["secondaryPatch"],
            case["sourceMap"],
            case["policy"],
        )
        self.assertEqual(
            deterministic_json_bytes(first[0]),
            deterministic_json_bytes(second[0]),
        )
        self.assertEqual(
            deterministic_json_bytes(first[1]),
            deterministic_json_bytes(second[1]),
        )
        self.assertTrue(
            all(
                row["finalRecord"] is None
                and row["resolutionNote"] == ""
                for row in first[1]["resolutions"]
            )
        )
```

Expected: only `IntegrationComparisonTests.test_comparison_artifacts_are_deterministic_and_unfilled` is added in this action, and the shown Python block parses.

- [ ] **R7.18 — Run `IntegrationComparisonTests.test_comparison_artifacts_are_deterministic_and_unfilled` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationComparisonTests.test_comparison_artifacts_are_deterministic_and_unfilled -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `build_comparison_artifacts` and proves that exact function or branch contract is not yet present.

- [ ] **I7.18 — Implement `build_comparison_artifacts`**

```python
def build_comparison_artifacts(
    freeze,
    primary_patch,
    secondary_patch,
    source_map,
    policy,
):
    validate_review_patch(
        freeze,
        primary_patch,
        source_map,
        set(freeze["sourceIds"]),
        policy,
    )
    secondary_ids = set(
        _records_by_source_id(secondary_patch)
    )
    required_ids = required_secondary_source_ids(
        freeze, primary_patch, source_map, policy
    )
    _require_secondary_coverage(required_ids, secondary_ids)
    validate_review_patch(
        freeze,
        secondary_patch,
        source_map,
        secondary_ids,
        policy,
    )
    disagreements = compare_review_patches(
        primary_patch, secondary_patch
    )
    report = {
        "batchId": freeze["batchId"],
        "disagreements": disagreements,
    }
    template = {
        "batchId": freeze["batchId"],
        "resolutions": [
            {
                "sourceId": row["sourceId"],
                "fields": row["fields"],
                "finalRecord": None,
                "resolutionNote": "",
            }
            for row in disagreements
        ],
        "criticalOmissions": [],
    }
    return report, template
```

Expected: only `build_comparison_artifacts` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.18 — Run `IntegrationComparisonTests.test_comparison_artifacts_are_deterministic_and_unfilled` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationComparisonTests.test_comparison_artifacts_are_deterministic_and_unfilled -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.19 — `IntegrationTransactionTests.test_compare_rolls_back_both_outputs`**

```python
class IntegrationTransactionTests(unittest.TestCase):
    def test_compare_rolls_back_both_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            report_path = root / "disagreements.json"
            template_path = root / "resolution.json"
            originals = {
                report_path: b"old-report\n",
                template_path: b"old-template\n",
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
                            _write_comparison_outputs(
                                report_path,
                                template_path,
                                {
                                    "batchId": "calibration-001",
                                    "disagreements": [],
                                },
                                {
                                    "batchId": "calibration-001",
                                    "resolutions": [],
                                    "criticalOmissions": [],
                                },
                            )
                    self.assertEqual(
                        {
                            path: path.read_bytes()
                            for path in originals
                        },
                        originals,
                    )
```

Expected: only `IntegrationTransactionTests.test_compare_rolls_back_both_outputs` is added in this action, and the shown Python block parses.

- [ ] **R7.19 — Run `IntegrationTransactionTests.test_compare_rolls_back_both_outputs` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationTransactionTests.test_compare_rolls_back_both_outputs -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_write_comparison_outputs` and proves that exact function or branch contract is not yet present.

- [ ] **I7.19 — Implement `_write_comparison_outputs`**

```python
def _write_comparison_outputs(
    report_path,
    template_path,
    report,
    template,
):
    write_json_transaction({
        Path(report_path): report,
        Path(template_path): template,
    })
```

Expected: only `_write_comparison_outputs` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.19 — Run `IntegrationTransactionTests.test_compare_rolls_back_both_outputs` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationTransactionTests.test_compare_rolls_back_both_outputs -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.20 — `IntegrationTransactionTests.test_apply_rolls_back_four_formal_targets`**

```python
class IntegrationTransactionTests(unittest.TestCase):
    def test_apply_rolls_back_four_formal_targets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            paths = [
                root / "decisions.json",
                root / "ledger.json",
                root / "coverage.md",
                root / "visual.md",
            ]
            original = [
                b"old-decisions\n",
                b"old-ledger\n",
                b"old-coverage\n",
                b"old-visual\n",
            ]
            real_replace = os.replace
            for failure_position in (1, 2, 3, 4):
                with self.subTest(failure_position=failure_position):
                    for path, content in zip(
                        paths, original, strict=True
                    ):
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
                            _write_apply_outputs(
                                paths,
                                [{"sourceId": "page-001"}],
                                [{"entryType": "genesis"}],
                                "# coverage\n",
                                "# visual\n",
                            )
                    self.assertEqual(
                        [path.read_bytes() for path in paths],
                        original,
                    )
```

Expected: only `IntegrationTransactionTests.test_apply_rolls_back_four_formal_targets` is added in this action, and the shown Python block parses.

- [ ] **R7.20 — Run `IntegrationTransactionTests.test_apply_rolls_back_four_formal_targets` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationTransactionTests.test_apply_rolls_back_four_formal_targets -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_write_apply_outputs` and proves that exact function or branch contract is not yet present.

- [ ] **I7.20 — Implement `_write_apply_outputs`**

```python
def _write_apply_outputs(
    paths,
    decisions,
    ledger,
    coverage,
    visual,
):
    payloads = [
        deterministic_json_bytes(decisions),
        deterministic_json_bytes(ledger),
        coverage.encode("utf-8"),
        visual.encode("utf-8"),
    ]
    write_files_transaction({
        Path(path): payload
        for path, payload in zip(paths, payloads, strict=True)
    })
```

Expected: only `_write_apply_outputs` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.20 — Run `IntegrationTransactionTests.test_apply_rolls_back_four_formal_targets` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationTransactionTests.test_apply_rolls_back_four_formal_targets -v
```

Path identity is resolved before any input is loaded. Both compare outputs must
be distinct from each other and from every input. Apply permits only the
declared decisions-to-decisions and ledger-to-ledger in-place pairs. Coverage
and visual reports are output-only. Symlink, hardlink, case-fold, and Unicode
normalization aliases are rejected across protected inputs and formal targets.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.21 — `IntegrationPathSafetyTests.test_cross_role_alias_is_rejected_before_read`**

```python
class IntegrationPathSafetyTests(unittest.TestCase):
    def test_cross_role_alias_is_rejected_before_read(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            freeze = root / "freeze.json"
            freeze.write_text("not-json", encoding="utf-8")
            alias = root / "decisions.json"
            alias.symlink_to(freeze)
            roles = {
                "freeze": freeze,
                "decisionsInput": alias,
                "decisionsOutput": alias,
                "ledgerInput": root / "ledger.json",
                "ledgerOutput": root / "ledger.json",
                "coverageOutput": root / "coverage.md",
                "visualOutput": root / "visual.md",
            }
            with self.assertRaisesRegex(
                AuditValidationError, "path alias"
            ):
                _validate_integration_paths("apply", roles)
            package = root / "package"
            package.mkdir()
            nested_roles = {
                "package_dir": package,
                "image_dir": root / "images",
                "coverageOutput": package / "coverage.md",
            }
            with self.assertRaisesRegex(
                AuditValidationError,
                "inside frozen evidence root",
            ):
                _validate_integration_paths(
                    "apply", nested_roles
                )
```

Expected: only `IntegrationPathSafetyTests.test_cross_role_alias_is_rejected_before_read` is added in this action, and the shown Python block parses.

- [ ] **R7.21 — Run `IntegrationPathSafetyTests.test_cross_role_alias_is_rejected_before_read` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationPathSafetyTests.test_cross_role_alias_is_rejected_before_read -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_integration_paths` and proves that exact function or branch contract is not yet present.

- [ ] **I7.21 — Implement `_validate_integration_paths`**

```python
def _validate_integration_paths(mode, role_paths):
    allowed_pairs = set()
    if mode == "apply":
        allowed_pairs = {
            frozenset({"decisionsInput", "decisionsOutput"}),
            frozenset({"ledgerInput", "ledgerOutput"}),
        }
    roles = sorted(role_paths)
    identities = {
        role: canonical_path_identity(path)
        for role, path in role_paths.items()
    }
    for offset, left in enumerate(roles):
        for right in roles[offset + 1:]:
            if identities[left].isdisjoint(identities[right]):
                continue
            if frozenset({left, right}) in allowed_pairs:
                continue
            raise AuditValidationError(
                f"path alias: {left} and {right}"
            )
    evidence_roots = {
        role: path
        for role, path in role_paths.items()
        if role in {"image_dir", "package_dir"}
    }
    outputs = {
        role: path
        for role, path in role_paths.items()
        if role.endswith("Output")
    }
    for output_role, output_path in outputs.items():
        for root_role, root_path in evidence_roots.items():
            if _path_is_within(output_path, root_path):
                raise AuditValidationError(
                    f"{output_role} is inside frozen evidence root "
                    f"{root_role}"
                )
```

Expected: `_validate_integration_paths` rejects aliases and any compare/apply
output nested below `image_dir` or `package_dir` before content loading.

- [ ] **G7.21 — Run `IntegrationPathSafetyTests.test_cross_role_alias_is_rejected_before_read` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationPathSafetyTests.test_cross_role_alias_is_rejected_before_read -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.22 — `IntegrationResolutionTests.test_critical_omissions_require_exact_double_reviewed_rows`**

```python
class IntegrationResolutionTests(unittest.TestCase):
    def test_critical_omissions_require_exact_double_reviewed_rows(self):
        case = sample_integration_case()
        source_id = case["freeze"]["sourceIds"][0]
        valid = {
            "batchId": case["freeze"]["batchId"],
            "resolutions": [],
            "criticalOmissions": [{
                "sourceId": source_id,
                "note": "二审确认正文遗漏了关键限制条件",
            }],
        }
        _validate_critical_omissions(
            case["freeze"], valid, {source_id}
        )
        mutations = (
            {"sourceId": source_id, "note": " ", "extra": True},
            {"sourceId": source_id, "note": ""},
            {"sourceId": "outside-batch", "note": "遗漏"},
        )
        for row in mutations:
            with self.subTest(row=row):
                broken = copy.deepcopy(valid)
                broken["criticalOmissions"] = [row]
                with self.assertRaises(AuditValidationError):
                    _validate_critical_omissions(
                        case["freeze"], broken, set()
                    )
        duplicate = copy.deepcopy(valid)
        duplicate["criticalOmissions"] *= 2
        with self.assertRaisesRegex(
            AuditValidationError, "duplicate critical omission"
        ):
            _validate_critical_omissions(
                case["freeze"], duplicate, {source_id}
            )
```

Expected: only
`IntegrationResolutionTests.test_critical_omissions_require_exact_double_reviewed_rows`
is added; it covers exact fields, non-blank notes, batch membership, double
review, and duplicate rejection.

- [ ] **R7.22 — Run the critical-omission contract test and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_critical_omissions_require_exact_double_reviewed_rows -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `_validate_critical_omissions`.

- [ ] **I7.22 — Implement `_validate_critical_omissions`**

```python
def _validate_critical_omissions(
    freeze,
    resolution,
    double_reviewed_ids,
):
    if set(resolution) != {
        "batchId", "resolutions", "criticalOmissions",
    }:
        raise AuditValidationError("resolution fields mismatch")
    rows = resolution["criticalOmissions"]
    if not isinstance(rows, list):
        raise AuditValidationError(
            "criticalOmissions must be a list"
        )
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {
            "sourceId", "note",
        }:
            raise AuditValidationError(
                "critical omission fields mismatch"
            )
        source_id = row["sourceId"]
        note = row["note"]
        if source_id in seen:
            raise AuditValidationError(
                f"duplicate critical omission: {source_id}"
            )
        if source_id not in freeze["sourceIds"]:
            raise AuditValidationError(
                f"critical omission outside batch: {source_id}"
            )
        if source_id not in double_reviewed_ids:
            raise AuditValidationError(
                f"critical omission not double reviewed: {source_id}"
            )
        if not isinstance(note, str) or not note.strip():
            raise AuditValidationError(
                f"critical omission note is blank: {source_id}"
            )
        seen.add(source_id)
```

Expected: `_validate_critical_omissions` enforces the complete frozen schema
before escalation logic reads a critical omission.

- [ ] **G7.22 — Re-run the critical-omission contract test and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationResolutionTests.test_critical_omissions_require_exact_double_reviewed_rows -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T7.23 — `IntegrationRecoveryTests.test_retry_rejects_stale_report_bytes`**

```python
class IntegrationRecoveryTests(unittest.TestCase):
    def test_retry_rejects_stale_report_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            coverage = root / "coverage.md"
            visual = root / "visual.md"
            coverage.write_bytes(b"# stale\n")
            visual.write_bytes(b"# visual\n")
            with self.assertRaisesRegex(
                AuditValidationError, "coverage report bytes"
            ):
                _validate_retry_reports(
                    coverage,
                    visual,
                    "# coverage\n",
                    "# visual\n",
                )
```

Expected: only
`IntegrationRecoveryTests.test_retry_rejects_stale_report_bytes` is added and
proves accepted retries compare persisted bytes, not merely in-memory values.

- [ ] **R7.23 — Run the stale-report retry test and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_retry_rejects_stale_report_bytes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `_validate_retry_reports`.

- [ ] **I7.23 — Implement `_validate_retry_reports`**

```python
def _validate_retry_reports(
    coverage_path,
    visual_path,
    expected_coverage,
    expected_visual,
):
    expected = {
        "coverage report bytes": expected_coverage.encode("utf-8"),
        "visual report bytes": expected_visual.encode("utf-8"),
    }
    actual = {
        "coverage report bytes": Path(coverage_path).read_bytes(),
        "visual report bytes": Path(visual_path).read_bytes(),
    }
    for label in expected:
        if actual[label] != expected[label]:
            raise AuditValidationError(f"{label} mismatch")
```

Expected: the helper performs exact byte comparison for both formal reports.

- [ ] **G7.23 — Re-run the stale-report retry test and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_retry_rejects_stale_report_bytes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S7.12 — Add `_validate_new_review_inputs`**

```python
def _validate_new_review_inputs(
    freeze,
    current_evidence,
    primary_patch,
    secondary_patch,
    resolution,
    source_map,
    policy,
):
    validate_frozen_batch(freeze, current_evidence)
    validate_review_patch(
        freeze,
        primary_patch,
        source_map,
        set(freeze["sourceIds"]),
        policy,
    )
    required_secondary = required_secondary_source_ids(
        freeze, primary_patch, source_map, policy
    )
    secondary_ids = set(_records_by_source_id(secondary_patch))
    _require_secondary_coverage(
        required_secondary, secondary_ids
    )
    validate_review_patch(
        freeze,
        secondary_patch,
        source_map,
        secondary_ids,
        policy,
    )
    _require_resolution_batch_id(freeze, resolution)
    _require_unique_resolution_ids(resolution)
    _require_resolution_final_records(resolution)
    _require_resolution_notes(resolution)
    _validate_critical_omissions(
        freeze,
        resolution,
        set(_records_by_source_id(primary_patch))
        & secondary_ids,
    )
    disagreements = compare_review_patches(
        primary_patch, secondary_patch
    )
    sampled = [
        row
        for row in disagreements
        if row["sourceId"] in required_secondary
    ]
    expanded = required_after_escalation(
        freeze,
        required_secondary,
        sampled,
        resolution["criticalOmissions"],
        source_map,
    )
    _require_exact_secondary_expansion(expanded, secondary_ids)
    return disagreements, expanded
```

Expected: all new-batch input validation and escalation completes in one
read-only helper before candidate construction.

- [ ] **S7.13 — Add `_candidate_decisions`**

```python
def _candidate_decisions(
    decisions,
    freeze,
    primary_patch,
    secondary_patch,
    resolution,
    disagreements,
    expanded,
):
    final_records = _resolve_complete_records(
        freeze,
        primary_patch,
        secondary_patch,
        resolution,
        disagreements,
        expanded,
    )
    candidate = _replace_records_preserving_order(
        decisions, final_records
    )
    _assert_unreviewed_delta(decisions, candidate, final_records)
    return candidate
```

Expected: decision replacement and the exact review-state delta are one
isolated, side-effect-free action.

- [ ] **S7.13B — Add the legacy-compatible accepted-report adapter.**

```python
def _render_accepted_reports(
    index,
    decisions,
    visuals,
    ledger,
    policy,
    must_keep_inventory,
    pdf_sha256,
):
    del visuals, ledger, policy, must_keep_inventory, pdf_sha256
    return {
        "coverage": render_coverage_matrix(index, decisions),
        "visual": render_visual_asset_index(index, decisions),
    }
```

Expected: Task 7 can render both reports through the existing two-argument
renderer interface; Task 8 replaces only this adapter after its expanded
renderers are green.

- [ ] **S7.14 — Add `_acceptance_result`**

```python
def _acceptance_result(
    index,
    visuals,
    candidate_decisions,
    ledger,
    policy,
    must_keep_inventory,
    freeze,
    primary_patch,
    secondary_patch,
    resolution,
    source_map,
    input_fingerprint,
):
    accepted_hash = sha256_json(candidate_decisions)
    entry = build_review_ledger_entry(
        freeze,
        primary_patch,
        secondary_patch,
        resolution,
        source_map,
        candidate_decisions,
        policy,
        accepted_hash,
        input_fingerprint,
    )
    entry["disagreements"] = _disagreement_ledger_rows(
        resolution["resolutions"]
    )
    candidate_ledger = [*ledger, entry]
    _validate_candidate_state(
        index,
        visuals,
        candidate_decisions,
        candidate_ledger,
        policy,
        must_keep_inventory,
    )
    reports = _render_accepted_reports(
        index,
        candidate_decisions,
        visuals,
        candidate_ledger,
        policy,
        must_keep_inventory,
        freeze["pdfSha256"],
    )
    return {
        "status": "accepted",
        "decisions": candidate_decisions,
        "ledger": candidate_ledger,
        **reports,
    }
```

Expected: ledger construction, full candidate validation, and deterministic
legacy-compatible report rendering are isolated from command-line writes.

- [ ] **T7.24 — `IntegrationRecoveryTests.test_identical_retry_is_read_only_and_returns_existing_entry`**

```python
class IntegrationRecoveryTests(unittest.TestCase):
    def test_identical_retry_is_read_only_and_returns_existing_entry(self):
        case = sample_integration_case()
        accepted = integrate_review_batch(**case["arguments"])
        retry_arguments = {
            **case["arguments"],
            "decisions": accepted["decisions"],
            "ledger": accepted["ledger"],
        }
        retry = integrate_review_batch(**retry_arguments)
        self.assertEqual(retry["status"], "already-accepted")
        self.assertEqual(retry["entry"], accepted["ledger"][-1])
```

Expected: only `IntegrationRecoveryTests.test_identical_retry_is_read_only_and_returns_existing_entry` is added in this action, and the shown Python block parses.

- [ ] **R7.24 — Run `IntegrationRecoveryTests.test_identical_retry_is_read_only_and_returns_existing_entry` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_identical_retry_is_read_only_and_returns_existing_entry -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `integrate_review_batch` and proves that exact function or branch contract is not yet present.

- [ ] **I7.24 — Implement `integrate_review_batch`**

```python
def integrate_review_batch(
    index,
    visuals,
    decisions,
    ledger,
    policy,
    must_keep_inventory,
    freeze,
    current_evidence_hashes,
    primary_patch,
    secondary_patch,
    resolution,
):
    source_map = source_items_by_id(index, visuals)
    input_fingerprint = review_input_fingerprint(
        freeze, primary_patch, secondary_patch, resolution
    )
    accepted = _accepted_retry(
        ledger, freeze["batchId"], input_fingerprint
    )
    if accepted is not None:
        _validate_accepted_retry(
            freeze,
            current_evidence_hashes,
            index,
            visuals,
            decisions,
            ledger,
            policy,
        )
        return {"status": "already-accepted", "entry": accepted}
    disagreements, expanded = _validate_new_review_inputs(
        freeze,
        current_evidence_hashes,
        primary_patch,
        secondary_patch,
        resolution,
        source_map,
        policy,
    )
    candidate_decisions = _candidate_decisions(
        decisions,
        freeze,
        primary_patch,
        secondary_patch,
        resolution,
        disagreements,
        expanded,
    )
    return _acceptance_result(
        index,
        visuals,
        candidate_decisions,
        ledger,
        policy,
        must_keep_inventory,
        freeze,
        primary_patch,
        secondary_patch,
        resolution,
        source_map,
        input_fingerprint,
    )
```

Expected: only `integrate_review_batch` is added or changed in this action, and the shown Python block parses.

- [ ] **G7.24 — Run `IntegrationRecoveryTests.test_identical_retry_is_read_only_and_returns_existing_entry` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationRecoveryTests.test_identical_retry_is_read_only_and_returns_existing_entry -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S7.6 — Add `_add_common_arguments`**

```python
def _add_common_arguments(parser):
    for name in (
        "freeze",
        "primary-patch",
        "secondary-patch",
        "pdf",
        "index",
        "visuals",
        "decisions",
        "ledger",
        "policy",
        "analysis",
        "course-outline",
        "image-dir",
        "package-dir",
    ):
        parser.add_argument(f"--{name}", required=True)
```

Expected: all three integration subcommands share one exact set of required
formal and immutable-evidence inputs.

- [ ] **S7.7 — Add `_role_paths`**

```python
def _role_paths(args):
    roles = {
        name: Path(getattr(args, name))
        for name in (
            "freeze",
            "primary_patch",
            "secondary_patch",
            "pdf",
            "index",
            "visuals",
            "decisions",
            "ledger",
            "policy",
            "analysis",
            "course_outline",
            "image_dir",
            "package_dir",
        )
    }
    if hasattr(args, "resolution"):
        roles["resolution"] = Path(args.resolution)
    if args.command == "compare":
        roles["disagreementsOutput"] = Path(
            args.disagreements_output
        )
        roles["resolutionOutput"] = Path(args.resolution_output)
    if args.command == "apply":
        roles["decisionsInput"] = roles.pop("decisions")
        roles["decisionsOutput"] = Path(args.decisions)
        roles["ledgerInput"] = roles.pop("ledger")
        roles["ledgerOutput"] = Path(args.ledger)
        roles["coverageOutput"] = Path(args.coverage_report)
        roles["visualOutput"] = Path(args.visual_report)
    return roles
```

Expected: role identities are complete before any CLI input is loaded; apply
declares only its two intentional in-place pairs.

- [ ] **S7.8 — Add `_load_common_inputs`**

```python
def _load_common_inputs(args):
    freeze = load_json(args.freeze)
    index = load_json(args.index)
    visuals = load_json(args.visuals)
    decisions = load_json(args.decisions)
    ledger = load_json(args.ledger)
    policy = load_json(args.policy)
    analysis_sections = parse_markdown_sections(
        Path(args.analysis), args.analysis
    )
    outline_sections = parse_markdown_sections(
        Path(args.course_outline), args.course_outline
    )
    must_keep_inventory = build_must_keep_inventory(
        policy, analysis_sections, outline_sections
    )
    current_evidence = build_current_batch_evidence(
        freeze,
        args.pdf,
        args.index,
        args.visuals,
        args.decisions,
        args.ledger,
        args.policy,
        args.analysis,
        args.course_outline,
        args.image_dir,
        args.package_dir,
    )
    context = {
        "index": index,
        "visuals": visuals,
        "decisions": decisions,
        "ledger": ledger,
        "policy": policy,
        "must_keep_inventory": must_keep_inventory,
        "freeze": freeze,
        "current_evidence_hashes": current_evidence,
        "primary_patch": load_json(args.primary_patch),
        "secondary_patch": load_json(args.secondary_patch),
    }
    if hasattr(args, "resolution"):
        context["resolution"] = load_json(args.resolution)
    return context
```

Expected: the common loader returns the exact keyword shape consumed by the
pure integration function and derives current evidence from real files.

- [ ] **T7.25 — `IntegrationCliTests.test_parser_accepts_all_three_task10_commands`**

```python
class IntegrationCliTests(unittest.TestCase):
    def test_parser_accepts_all_three_task10_commands(self):
        common = [
            "--freeze", "freeze.json",
            "--primary-patch", "primary.json",
            "--secondary-patch", "secondary.json",
            "--pdf", "source.pdf",
            "--index", "index.json",
            "--visuals", "visuals.json",
            "--decisions", "decisions.json",
            "--ledger", "ledger.json",
            "--policy", "policy.json",
            "--analysis", "analysis.md",
            "--course-outline", "outline.md",
            "--image-dir", "images",
            "--package-dir", "package",
        ]
        cases = {
            "compare": [
                "--disagreements-output", "disagreements.json",
                "--resolution-output", "resolution.json",
            ],
            "validate-resolution": [
                "--resolution", "resolution.json", "--json",
            ],
            "apply": [
                "--resolution", "resolution.json",
                "--coverage-report", "coverage.md",
                "--visual-report", "visual.md",
            ],
        }
        parser = _build_parser()
        for command, extra in cases.items():
            with self.subTest(command=command):
                parsed = parser.parse_args(
                    [command, *common, *extra]
                )
                self.assertEqual(parsed.command, command)
```

Expected: only
`IntegrationCliTests.test_parser_accepts_all_three_task10_commands` is added;
all three Task 10 invocations parse without undocumented flags.

- [ ] **R7.25 — Run the three-subcommand parser test and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationCliTests.test_parser_accepts_all_three_task10_commands -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `_build_parser`.

- [ ] **I7.25 — Implement `_build_parser`**

```python
def _build_parser():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(
        dest="command", required=True
    )
    compare = subparsers.add_parser("compare")
    _add_common_arguments(compare)
    compare.add_argument(
        "--disagreements-output", required=True
    )
    compare.add_argument("--resolution-output", required=True)

    validate = subparsers.add_parser("validate-resolution")
    _add_common_arguments(validate)
    validate.add_argument("--resolution", required=True)
    validate.add_argument("--json", action="store_true")

    apply = subparsers.add_parser("apply")
    _add_common_arguments(apply)
    apply.add_argument("--resolution", required=True)
    apply.add_argument("--coverage-report", required=True)
    apply.add_argument("--visual-report", required=True)
    return parser
```

Expected: `_build_parser` declares the exact Task 10 command-line contract.

- [ ] **G7.25 — Re-run the three-subcommand parser test and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationCliTests.test_parser_accepts_all_three_task10_commands -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S7.9 — Add `_compare_command`**

```python
def _compare_command(args, context):
    source_map = source_items_by_id(
        context["index"], context["visuals"]
    )
    report, template = build_comparison_artifacts(
        context["freeze"],
        context["primary_patch"],
        context["secondary_patch"],
        source_map,
        context["policy"],
    )
    _write_comparison_outputs(
        args.disagreements_output,
        args.resolution_output,
        report,
        template,
    )
    return {
        "status": "compared",
        "batchId": context["freeze"]["batchId"],
        "disagreementCount": len(report["disagreements"]),
    }
```

Expected: compare validates in memory and performs exactly one two-target
transaction.

- [ ] **S7.10 — Add `_validate_resolution_command`**

```python
def _validate_resolution_command(args, context):
    result = integrate_review_batch(**context)
    return {
        "status": "valid",
        "integrationStatus": result["status"],
        "batchId": context["freeze"]["batchId"],
        "disagreementCount": len(compare_review_patches(
            context["primary_patch"],
            context["secondary_patch"],
        )),
        "criticalOmissionCount": len(
            context["resolution"]["criticalOmissions"]
        ),
    }
```

Expected: validate-resolution runs the full candidate path without writing a
formal or temporary output.

- [ ] **S7.11 — Add `_apply_command`**

```python
def _apply_command(args, context):
    result = integrate_review_batch(**context)
    if result["status"] == "accepted":
        _write_apply_outputs(
            [
                args.decisions,
                args.ledger,
                args.coverage_report,
                args.visual_report,
            ],
            result["decisions"],
            result["ledger"],
            result["coverage"],
            result["visual"],
        )
    else:
        expected_reports = _render_accepted_reports(
            context["index"],
            context["decisions"],
            context["visuals"],
            context["ledger"],
            context["policy"],
            context["must_keep_inventory"],
            context["freeze"]["pdfSha256"],
        )
        _validate_retry_reports(
            args.coverage_report,
            args.visual_report,
            expected_reports["coverage"],
            expected_reports["visual"],
        )
    return {
        "status": result["status"],
        "batchId": context["freeze"]["batchId"],
    }
```

Expected: accepted batches use one four-target transaction; accepted retries
are read-only and regenerate both expected reports through the same adapter,
including the verified PDF hash once Task 8 expands that adapter.

- [ ] **T7.26 — `IntegrationCliTests.test_main_dispatches_each_command_and_uses_exit_2_for_validation`**

```python
class IntegrationCliTests(unittest.TestCase):
    def test_main_dispatches_each_command_and_uses_exit_2_for_validation(self):
        common = [
            "--freeze", "freeze.json",
            "--primary-patch", "primary.json",
            "--secondary-patch", "secondary.json",
            "--pdf", "source.pdf",
            "--index", "index.json",
            "--visuals", "visuals.json",
            "--decisions", "decisions.json",
            "--ledger", "ledger.json",
            "--policy", "policy.json",
            "--analysis", "analysis.md",
            "--course-outline", "outline.md",
            "--image-dir", "images",
            "--package-dir", "package",
        ]
        commands = {
            "compare": [
                "--disagreements-output", "diff.json",
                "--resolution-output", "resolution.json",
            ],
            "validate-resolution": [
                "--resolution", "resolution.json", "--json",
            ],
            "apply": [
                "--resolution", "resolution.json",
                "--coverage-report", "coverage.md",
                "--visual-report", "visual.md",
            ],
        }
        with mock.patch(
            "scripts.source_audit.integrate_review_batch."
            "_validate_integration_paths"
        ), mock.patch(
            "scripts.source_audit.integrate_review_batch."
            "_load_common_inputs",
            return_value={},
        ):
            for command, extra in commands.items():
                target = (
                    "scripts.source_audit.integrate_review_batch."
                    f"_{command.replace('-', '_')}_command"
                )
                with self.subTest(command=command), mock.patch(
                    target,
                    return_value={"status": "ok"},
                ) as handler:
                    self.assertEqual(
                        main([command, *common, *extra]), 0
                    )
                    handler.assert_called_once()
        with mock.patch(
            "scripts.source_audit.integrate_review_batch."
            "_validate_integration_paths",
            side_effect=AuditValidationError("bad input"),
        ):
            self.assertEqual(
                main(["compare", *common, *commands["compare"]]),
                2,
            )
```

Expected: only
`IntegrationCliTests.test_main_dispatches_each_command_and_uses_exit_2_for_validation`
is added; all three handlers dispatch and validation errors return exit 2.

- [ ] **R7.26 — Run the CLI dispatch and exit-code test and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationCliTests.test_main_dispatches_each_command_and_uses_exit_2_for_validation -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `main`.

- [ ] **I7.26 — Implement `main`**

```python
def main(argv=None):
    args = _build_parser().parse_args(argv)
    handlers = {
        "compare": _compare_command,
        "validate-resolution": _validate_resolution_command,
        "apply": _apply_command,
    }
    try:
        _validate_integration_paths(
            args.command, _role_paths(args)
        )
        context = _load_common_inputs(args)
        result = handlers[args.command](args, context)
        if getattr(args, "json", False):
            print(json.dumps(
                result, ensure_ascii=False, sort_keys=True
            ))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

Expected: `main` validates path roles before reads, dispatches every declared
subcommand, emits stable JSON on request, and maps validation failures to 2.

- [ ] **G7.26 — Re-run the CLI dispatch and exit-code test and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationCliTests.test_main_dispatches_each_command_and_uses_exit_2_for_validation -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

The `compare` branch resolves all inputs and its two output paths before reading,
validates both patches, computes disagreement JSON and the unfilled resolution
template in memory, and performs one two-file JSON transaction. The
`validate-resolution` branch is read-only and runs all resolution, secondary
coverage, escalation, and agreed-field checks. The `apply` branch computes and
validates all four candidates before one four-file transaction. Injected
replacement failures at compare positions 1 and 2 and apply positions 1 through
4 must restore every original byte. Repeating accepted inputs validates current
immutable evidence, current ledger tail, and both current report bytes before it
returns `already-accepted`.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **Task 7 focused gate — run the integration module**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch tests.source_audit.test_build_reports -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **Task 7 full-suite gate — preserve all prior assertions**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **Task 7 commit — record atomic integration**

```bash
git add scripts/source_audit/integrate_review_batch.py scripts/source_audit/build_reports.py tests/source_audit/test_integrate_review_batch.py tests/source_audit/test_build_reports.py
git commit -m "feat: integrate editorial review batches"
```

---

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 8: Expanded reports and Stage A automatic gate

**Files:**
- Create: `scripts/source_audit/verify_calibration_acceptance.py`
- Create: `tests/source_audit/test_verify_calibration_acceptance.py`
- Modify: `scripts/source_audit/build_reports.py`
- Modify: `scripts/source_audit/integrate_review_batch.py`
- Modify: `tests/source_audit/test_build_reports.py`
- Modify: `tests/source_audit/test_integrate_review_batch.py`
- Modify: `reference/source-audit/source-coverage-matrix.md`
- Modify: `reference/source-audit/visual-asset-index.md`

**Interfaces:**
- Consumes: complete catalog, decisions, policy, review ledger, must-keep
  inventory, and current immutable evidence.
- Produces:
  - `render_coverage_matrix(index: dict, decisions: list[dict], visuals: list[dict] | None = None, ledger: list[dict] | None = None, policy: dict | None = None, must_keep_inventory: list[dict] | None = None, pdf_sha256: str | None = None) -> str`
  - `render_visual_asset_index(index: dict, decisions: list[dict], visuals: list[dict] | None = None, ledger: list[dict] | None = None, policy: dict | None = None, must_keep_inventory: list[dict] | None = None) -> str`
  - `run_stage_a_gate(pdf_sha256: str, index: dict, visuals: list[dict], decisions: list[dict], ledger: list[dict], policy: dict, must_keep_inventory: list[dict]) -> None`
  - `verify_calibration_acceptance(freeze: dict, current_immutable_evidence_hashes: dict[str, object], index: dict, visuals: list[dict], decisions: list[dict], ledger: list[dict], policy: dict, must_keep_inventory: list[dict]) -> dict[str, object]`

The final renderer definitions replace the legacy definitions in place. Do not
append duplicate renderers. Their defaulted arguments retain the original
two-argument Python interface.

#### Executable module scaffolds

- [ ] **S8.0A — Replace the `build_reports.py` preamble with its complete final imports**

```python
from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from scripts.source_audit.build_review_packages import (
    parse_markdown_sections,
)
from scripts.source_audit.catalog import all_editorial_source_items
from scripts.source_audit.decisions import (
    initial_editorial_decision,
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    AuditValidationError,
    all_source_items,
    assert_distinct_paths,
    load_json,
    sha256_file,
    write_json_deterministic,
)
from scripts.source_audit.must_keep import build_must_keep_inventory
from scripts.source_audit.review_ledger import validate_review_ledger
from scripts.source_audit.transactions import (
    sha256_json,
    write_files_transaction,
)


def _pending(name): raise NotImplementedError(name)
def _build_parser(*args, **kwargs): return _pending("_build_parser")
```

Expected: `scripts.source_audit.build_reports` has every standard-library and
project import used by retained helpers, final renderers, and CLI; `_build_parser`
is importable before its focused RED and the preamble remains unique.

- [ ] **S8.0B — Create the complete `verify_calibration_acceptance.py` preamble**

```python
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

from scripts.source_audit.build_reports import (
    _caption_conflict_is_resolved,
    _decision_by_source_id,
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.build_review_packages import (
    parse_markdown_sections,
)
from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import (
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    load_json,
)
from scripts.source_audit.must_keep import (
    build_must_keep_inventory,
    validate_must_keep_coverage,
)
from scripts.source_audit.review_batches import (
    build_current_batch_evidence,
    validate_frozen_immutable_evidence,
)
from scripts.source_audit.review_ledger import (
    validate_review_ledger,
)
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.transactions import (
    sha256_json,
    write_files_transaction,
)


def _pending(name): raise NotImplementedError(name)
def _build_parser(*args, **kwargs): return _pending("_build_parser")
def _gate_acceptance_integrity(*args, **kwargs): return _pending("_gate_acceptance_integrity")
def _gate_boundary_matrix(*args, **kwargs): return _pending("_gate_boundary_matrix")
def _gate_caption_conflicts(*args, **kwargs): return _pending("_gate_caption_conflicts")
def _gate_complete_decisions(*args, **kwargs): return _pending("_gate_complete_decisions")
def _gate_course_placement(*args, **kwargs): return _pending("_gate_course_placement")
def _gate_missing_item_lessons(*args, **kwargs): return _pending("_gate_missing_item_lessons")
def _gate_must_keep(*args, **kwargs): return _pending("_gate_must_keep")
def _gate_page_scans(*args, **kwargs): return _pending("_gate_page_scans")
def _gate_pdf_hash(*args, **kwargs): return _pending("_gate_pdf_hash")
def _gate_report_determinism(*args, **kwargs): return _pending("_gate_report_determinism")
def _gate_review_ledger(*args, **kwargs): return _pending("_gate_review_ledger")
def _gate_visual_metadata(*args, **kwargs): return _pending("_gate_visual_metadata")
def _require_calibration_pages(*args, **kwargs): return _pending("_require_calibration_pages")
def _require_calibration_source_count(*args, **kwargs): return _pending("_require_calibration_source_count")
def _require_complete_double_review(*args, **kwargs): return _pending("_require_complete_double_review")
def _require_complete_resolutions(*args, **kwargs): return _pending("_require_complete_resolutions")
def _require_frozen_discovery_unchanged(*args, **kwargs): return _pending("_require_frozen_discovery_unchanged")
def _require_frozen_page_snapshot(*args, **kwargs): return _pending("_require_frozen_page_snapshot")
def _require_independent_reviewers(*args, **kwargs): return _pending("_require_independent_reviewers")
def _require_review_tail(*args, **kwargs): return _pending("_require_review_tail")
def _require_unreviewed_calibration_base(*args, **kwargs): return _pending("_require_unreviewed_calibration_base")
def main(*args, **kwargs): return _pending("main")
def run_stage_a_gate(*args, **kwargs): return _pending("run_stage_a_gate")
def verify_calibration_acceptance(*args, **kwargs): return _pending("verify_calibration_acceptance")
```

Expected: the verifier imports every helper used by rules 1–10, calibration
invariants, persisted determinism, and its CLI; every test-imported API exists
as a named RED stub before behavior is added.

- [ ] **S8.0C — Extend `test_build_reports.py` with complete Task 8 imports and class scaffold**

```python
import pathlib
import tempfile
import unittest
from unittest import mock

from scripts.source_audit.build_reports import (
    _build_parser as build_reports_parser,
    main as build_reports_main,
    render_coverage_matrix,
    render_visual_asset_index,
)
from scripts.source_audit.models import AuditValidationError
from tests.source_audit.editorial_fixtures import (
    sample_decisions,
    sample_index,
    sample_ledger,
    sample_must_keep_inventory,
    sample_policy,
    sample_visual,
)


class BuildReportContentTests(unittest.TestCase):
    pass


class BuildReportCliTests(unittest.TestCase):
    pass
```

Expected: both Task 8 build-report test classes import before methods are
added; all fixtures referenced below are explicit.

- [ ] **S8.0D — Create the complete verifier test imports**

```python
from __future__ import annotations

import copy
import pathlib
import tempfile
import unittest
from unittest import mock

from scripts.source_audit.build_reports import _decision_by_source_id
from scripts.source_audit.models import AuditValidationError
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.verify_calibration_acceptance import (
    _build_parser as verifier_parser,
    _gate_acceptance_integrity,
    _gate_boundary_matrix,
    _gate_caption_conflicts,
    _gate_complete_decisions,
    _gate_course_placement,
    _gate_missing_item_lessons,
    _gate_must_keep,
    _gate_page_scans,
    _gate_pdf_hash,
    _gate_report_determinism,
    _gate_review_ledger,
    _gate_visual_metadata,
    _require_calibration_pages,
    _require_calibration_source_count,
    _require_complete_double_review,
    _require_complete_resolutions,
    _require_frozen_discovery_unchanged,
    _require_frozen_page_snapshot,
    _require_independent_reviewers,
    _require_review_tail,
    _require_unreviewed_calibration_base,
    main as verifier_main,
    run_stage_a_gate,
    verify_calibration_acceptance,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
)
from tests.source_audit.editorial_fixtures import (
    valid_calibration_case,
    valid_stage_a_case as _raw_stage_a_case,
)
```

Expected: every verifier helper and fixture used below is imported explicitly.

- [ ] **S8.0E — Add the Stage A fixture adapter**

```python
def valid_stage_a_case():
    case = _raw_stage_a_case()
    source_map = {
        row["sourceId"]: row
        for row in [
            *case["index"]["pages"],
            *case["index"]["outline"],
            *case["index"]["numberedItems"],
            *case["visuals"],
        ]
    }
    by_chapter = {}
    for source_id, item in source_map.items():
        by_chapter.setdefault(item.get("chapter"), source_id)
    return {
        **case,
        "pdfSha256": case["pdf_sha256"],
        "mustKeepInventory": case["must_keep_inventory"],
        "missingSourceId": by_chapter[1],
        "chapterFiveSourceId": by_chapter[5],
        "chapterSevenSourceId": by_chapter[7],
        "chapterNineSourceId": by_chapter[9],
    }
```

Expected: the adapter exposes the exact camel-case fields used by Stage A tests
without mutating the shared fixture.

- [ ] **S8.0F — Add the five verifier test-class scaffolds**

```python
class StageAGateRuleTests(unittest.TestCase):
    pass


class StageAGateCompositionTests(unittest.TestCase):
    pass


class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    pass


class CalibrationEvidenceTests(unittest.TestCase):
    pass


class VerifierCliTests(unittest.TestCase):
    pass
```

Expected: every Task 8 verifier test class imports before methods are added.

- [ ] **S8.0G — Replace the retained initial-decision shape test.**

```python
class BuildReportsTests(unittest.TestCase):
    def test_initial_decision_uses_the_unreviewed_record_shape(self):
        decision = initial_decision(
            self.index["pages"][0]
        )
        self.assertEqual(
            decision,
            {
                "sourceId": "page-001",
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
                "visualReviewState": "unreviewed",
                "visualReviewer": "",
                "discoveredVisualIds": [],
                "symbolReview": [],
            },
        )
```

Expected: the existing method is replaced in place and asserts the final
editorial page shape; no duplicate `BuildReportsTests` class or method remains.

- [ ] **S8.1A — Add `_coverage_header_lines`**

```python
def _coverage_header_lines(
    index,
    catalog,
    decisions,
    ledger,
    policy,
    visual_count,
    pdf_sha256,
):
    decision_map = _decision_by_source_id(decisions)
    baseline = (
        len(index.get("pages", []))
        + len(index.get("outline", []))
        + len(index.get("numberedItems", []))
    )
    scanned = sum(
        decision_map[item["sourceId"]].get("visualReviewState")
        == "reviewed"
        for item in catalog
        if item["kind"] == "page"
    )
    incomplete = sum(
        _is_unreviewed(_decision_for(item, decision_map))
        for item in catalog
    )
    flags = Counter(
        flag
        for decision in decisions
        for flag in decision.get("riskFlags", [])
    )
    risk_summary = "；".join(
        f"{flag}：{flags[flag]}" for flag in sorted(flags)
    ) or "无"
    conflict_ids = _report_conflict_ids(index, policy)
    unresolved = sum(
        not _caption_conflict_is_resolved(
            decision_map.get(source_id, {})
        )
        for source_id in conflict_ids
    )
    return [
        "# 来源覆盖矩阵", "", "## 覆盖概览", "",
        f"PDF 指纹：{pdf_sha256 or _pdf_fingerprint(index)}",
        "来源总数：{total}（初始基线：{baseline}；"
        "新增未编号视觉：{added}）".format(
            total=len(catalog),
            baseline=baseline,
            added=visual_count,
        ),
        f"视觉扫描：{scanned}/{len(index.get('pages', []))} 页",
        f"未检查：{incomplete}",
        f"风险汇总：{risk_summary}",
        f"标题冲突：{len(conflict_ids)}；未解决：{unresolved}",
        "",
        "## 来源决定",
        "",
        "| 来源 ID | 类型 | PDF 页 | 标题/摘要 | 处置 | "
        "审核状态 | 课时 | Markdown 引用 | 风险 | 必保留项 | "
        "符号文字替代 |",
        "| --- | --- | ---: | --- | --- | --- | --- | "
        "--- | --- | --- | --- |",
    ]
```

Expected: overview metrics and the source-table header are rendered without
mutating inputs.

- [ ] **S8.1B — Add `_coverage_source_rows`**

```python
def _coverage_source_rows(catalog, decisions):
    decision_map = _decision_by_source_id(decisions)
    rows = []
    for item in catalog:
        decision = _decision_for(item, decision_map)
        symbols = [
            "{symbol}@PDF {page}：{meaning}".format(
                symbol=row["symbol"],
                page=row["pdfPage"],
                meaning=row["meaning"],
            )
            for row in decision.get("symbolTextAlternatives", [])
        ]
        rows.append(
            "| {source_id} | {kind} | {page} | {title} | "
            "{disposition} | {state} | {lessons} | {refs} | "
            "{risks} | {keeps} | {symbols} |".format(
                source_id=_escape_markdown(item["sourceId"]),
                kind=_escape_markdown(item["kind"]),
                page=_escape_markdown(item.get("pdfPage")),
                title=_escape_markdown(
                    item.get("title")
                    or item.get("semanticBrief")
                    or "—"
                ),
                disposition=_escape_markdown(
                    decision.get("disposition")
                ),
                state=_escape_markdown(
                    decision.get("reviewState")
                ),
                lessons=_join_markdown(
                    decision.get("lessonIds", [])
                ),
                refs=_join_markdown(
                    decision.get("markdownRefs", [])
                ),
                risks=_join_markdown(
                    decision.get("riskFlags", [])
                ),
                keeps=_join_markdown(
                    decision.get("mustKeepIds", [])
                ),
                symbols=_join_markdown(symbols),
            )
        )
    return rows
```

Expected: every catalog source produces one stable Markdown row.

- [ ] **S8.1C — Add `_coverage_tail_lines`**

```python
def _coverage_tail_lines(
    decisions,
    ledger,
    must_keep_inventory,
):
    review_count = sum(
        row.get("entryType") == "review"
        for row in (ledger or [])
    )
    lines = [
        "", "## 复核与升级", "",
        f"复核批次：{review_count}",
        "", "## 必保留项", "",
        "| 必保留 ID | 状态 | 原文 | 声明来源 | 目标课时 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for keep in sorted(
        must_keep_inventory or [],
        key=lambda row: row["mustKeepId"],
    ):
        claim_ids = sorted(
            row["sourceId"]
            for row in decisions
            if keep["mustKeepId"] in row.get("mustKeepIds", [])
        )
        lesson_ids = sorted({
            lesson_id
            for row in decisions
            if row["sourceId"] in claim_ids
            for lesson_id in row.get("lessonIds", [])
        })
        lines.append(
            "| {keep_id} | {status} | {text} | {claims} | "
            "{lessons} |".format(
                keep_id=_escape_markdown(keep["mustKeepId"]),
                status=(
                    "当前版"
                    if keep["versionStatus"] == "current"
                    else "未来版"
                ),
                text=_escape_markdown(keep["text"]),
                claims=_join_markdown(claim_ids),
                lessons=_join_markdown(lesson_ids),
            )
        )
    return lines
```

Expected: review and must-keep sections render from the validated formal
ledger and inventory.

- [ ] **S8.1D — Add the policy-and-index conflict-ID adapter.**

```python
def _report_conflict_ids(index, policy):
    indexed = {
        item["sourceId"]
        for item in index.get("numberedItems", [])
        if item.get("captionConflict") is True
    }
    frozen = set(
        (policy or {}).get("captionConflictSourceIds", [])
    )
    return indexed | frozen
```

Expected: default two-argument report calls retain indexed caption conflicts,
while formal calls also include the frozen policy set.

- [ ] **T8.1 — `BuildReportContentTests.test_coverage_report_includes_complete_dynamic_catalog`**

```python
class BuildReportContentTests(unittest.TestCase):
    def test_coverage_report_includes_complete_dynamic_catalog(self):
        visual = sample_visual()
        decisions = sample_decisions(visuals=[visual])
        pdf_sha256 = "a" * 64
        report = render_coverage_matrix(
            sample_index(),
            decisions,
            [visual],
            sample_ledger(decisions, visuals=[visual]),
            sample_policy(),
            sample_must_keep_inventory(),
            pdf_sha256,
        )
        self.assertIn(f"PDF 指纹：{pdf_sha256}", report)
        self.assertIn(
            "来源总数：3（初始基线：2；新增未编号视觉：1）",
            report,
        )
        self.assertIn("视觉扫描：1/2 页", report)
        self.assertIn("风险汇总：", report)
        self.assertIn("## 复核与升级", report)
        self.assertIn("## 必保留项", report)
```

Expected: only `BuildReportContentTests.test_coverage_report_includes_complete_dynamic_catalog` is added in this action, and the shown Python block parses.

- [ ] **R8.1 — Run `BuildReportContentTests.test_coverage_report_includes_complete_dynamic_catalog` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportContentTests.test_coverage_report_includes_complete_dynamic_catalog -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `render_coverage_matrix` and proves that exact function or branch contract is not yet present.

- [ ] **I8.1 — Implement `render_coverage_matrix`**

```python
def render_coverage_matrix(
    index: dict,
    decisions: list[dict],
    visuals: list[dict] | None = None,
    ledger: list[dict] | None = None,
    policy: dict | None = None,
    must_keep_inventory: list[dict] | None = None,
    pdf_sha256: str | None = None,
) -> str:
    visual_items = list(visuals or [])
    catalog = all_editorial_source_items(index, visual_items)
    lines = _coverage_header_lines(
        index,
        catalog,
        decisions,
        ledger,
        policy,
        len(visual_items),
        pdf_sha256,
    )
    lines.extend(_coverage_source_rows(catalog, decisions))
    lines.extend(["", *_caption_conflict_section(
        index,
        _decision_by_source_id(decisions),
    )])
    lines.extend(_coverage_tail_lines(
        decisions, ledger, must_keep_inventory
    ))
    return "\n".join(lines).rstrip() + "\n"
```

Expected: only `render_coverage_matrix` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.1 — Run `BuildReportContentTests.test_coverage_report_includes_complete_dynamic_catalog` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportContentTests.test_coverage_report_includes_complete_dynamic_catalog -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S8.2A — Add `_visual_asset_row`**

```python
def _visual_asset_row(item, decision, scanner, conflict_ids):
    visual_class = decision.get("visualClass")
    allowed = {
        "semantic-core": ("redraw", "reuse"),
        "evidence": ("text-alt", "reuse"),
        "decorative": ("omit",),
    }.get(visual_class, ())
    evidence = [
        value
        for value in (
            item.get("discoveryEvidence"),
            f"扫描员：{scanner}" if scanner else None,
        )
        if value
    ]
    symbols = [
        "{symbol}@PDF {page}：{meaning}".format(
            symbol=row["symbol"],
            page=row["pdfPage"],
            meaning=row["meaning"],
        )
        for row in decision.get("symbolTextAlternatives", [])
    ]
    legacy_symbols = _symbol_text(item.get("symbolCounts"))
    if legacy_symbols != "—":
        symbols.insert(0, legacy_symbols)
    conflict = "—"
    if item["sourceId"] in conflict_ids:
        conflict = (
            "已解决"
            if _caption_conflict_is_resolved(decision)
            else "未解决"
        )
    return (
        "| {source_id} | {kind} | {page} | {title} | "
        "{visual_class} | {allowed} | {handling} | {note} | "
        "{alternative} | {lessons} | {evidence} | {symbols} | "
        "{risks} | {conflict} |"
    ).format(
        source_id=_escape_markdown(item["sourceId"]),
        kind=_escape_markdown(item["kind"]),
        page=_escape_markdown(item.get("pdfPage")),
        title=_escape_markdown(
            item.get("title")
            or item.get("semanticBrief")
            or "—"
        ),
        visual_class=_escape_markdown(visual_class),
        allowed=_join_markdown(allowed),
        handling=_escape_markdown(
            decision.get("visualHandling")
        ),
        note=_escape_markdown(
            decision.get("visualHandlingNote")
        ),
        alternative=_escape_markdown(
            decision.get("visualTextAlternative")
        ),
        lessons=_join_markdown(decision.get("lessonIds", [])),
        evidence=_join_markdown(evidence),
        symbols=_join_markdown(symbols),
        risks=_join_markdown(decision.get("riskFlags", [])),
        conflict=_escape_markdown(conflict),
    )
```

Expected: one validated visual source renders to one stable Markdown row.

- [ ] **T8.2 — `BuildReportContentTests.test_visual_report_includes_unnumbered_visual_and_text_alternative`**

```python
class BuildReportContentTests(unittest.TestCase):
    def test_visual_report_includes_unnumbered_visual_and_text_alternative(
        self,
    ):
        visual = sample_visual()
        decisions = sample_decisions(visuals=[visual])
        report = render_visual_asset_index(
            sample_index(),
            decisions,
            [visual],
            sample_ledger(decisions, visuals=[visual]),
            sample_policy(),
            sample_must_keep_inventory(),
        )
        self.assertIn("visual-p010-01", report)
        self.assertIn("文字替代", report)
        self.assertIn("允许处理", report)
        self.assertIn("扫描证据", report)
```

Expected: only `BuildReportContentTests.test_visual_report_includes_unnumbered_visual_and_text_alternative` is added in this action, and the shown Python block parses.

- [ ] **R8.2 — Run `BuildReportContentTests.test_visual_report_includes_unnumbered_visual_and_text_alternative` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportContentTests.test_visual_report_includes_unnumbered_visual_and_text_alternative -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `render_visual_asset_index` and proves that exact function or branch contract is not yet present.

- [ ] **I8.2 — Implement `render_visual_asset_index`**

```python
def render_visual_asset_index(
    index: dict,
    decisions: list[dict],
    visuals: list[dict] | None = None,
    ledger: list[dict] | None = None,
    policy: dict | None = None,
    must_keep_inventory: list[dict] | None = None,
) -> str:
    del must_keep_inventory
    catalog = all_editorial_source_items(index, list(visuals or []))
    decision_map = _decision_by_source_id(decisions)
    assets = [
        item
        for item in catalog
        if item["kind"] in {"figure", "table", "visual"}
    ]
    page_scanners = {
        item["pdfPage"]: decision_map[item["sourceId"]].get(
            "visualReviewer"
        )
        for item in catalog
        if item["kind"] == "page"
    }
    conflict_ids = _report_conflict_ids(index, policy)
    lines = [
        "# 视觉资产索引", "", "## 视觉概览", "",
        f"视觉总数：{len(assets)}",
        "复核批次："
        + str(sum(
            row.get("entryType") == "review"
            for row in (ledger or [])
        )),
        ""
    ]
    lines.extend(
        _caption_conflict_section(
            index, decision_map, visual_only=True
        )
    )
    lines.extend([
        "## 资产明细",
        "",
        "| 来源 ID | 类型 | PDF 页 | 标题/语义摘要 | 视觉类别 | "
        "允许处理 | 实际处理 | 处理说明 | 文字替代 | 目标课时 | "
        "扫描证据 | 符号文字替代 | 风险 | 标题冲突 |",
        "| --- | --- | ---: | --- | --- | --- | --- | --- | --- | "
        "--- | --- | --- | --- | --- |",
    ])
    for item in assets:
        decision = _decision_for(item, decision_map)
        lines.append(
            _visual_asset_row(
                item,
                decision,
                page_scanners.get(item["pdfPage"]),
                conflict_ids,
            )
        )
    return "\n".join(lines).rstrip() + "\n"
```

Expected: only `render_visual_asset_index` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.2 — Run `BuildReportContentTests.test_visual_report_includes_unnumbered_visual_and_text_alternative` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportContentTests.test_visual_report_includes_unnumbered_visual_and_text_alternative -v
```

Stage A has ten independent automatic rules. The 1-1 source-pack content
judgment remains manual until the full-review plan creates that artifact.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.2B — Add `IntegrationReportTests.test_expanded_renderers_receive_full_context`.**

```python
class IntegrationReportTests(unittest.TestCase):
    def test_expanded_renderers_receive_full_context(self):
        values = (
            {"pages": []},
            [{"sourceId": "page-001"}],
            [],
            [{"entryType": "genesis"}],
            {"lessonIds": []},
            [{"mustKeepId": "course-objective-0-1"}],
            "a" * 64,
        )
        with mock.patch(
            "scripts.source_audit.integrate_review_batch."
            "render_coverage_matrix",
            return_value="# coverage\n",
        ) as coverage, mock.patch(
            "scripts.source_audit.integrate_review_batch."
            "render_visual_asset_index",
            return_value="# visual\n",
        ) as visual:
            reports = _render_accepted_reports(*values)
        coverage.assert_called_once_with(*values)
        visual.assert_called_once_with(*values[:-1])
        self.assertEqual(
            set(reports), {"coverage", "visual"}
        )
```

Expected: the existing `IntegrationReportTests` class gains one method that
requires the expanded coverage renderer to receive the verified PDF hash and
all editorial context.

- [ ] **R8.2B — Run the expanded integration-report adapter test and confirm red.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationReportTests.test_expanded_renderers_receive_full_context -v
```

Expected: output contains `Ran 1 test` and `FAILED`; the mock assertion shows
the Task 7 adapter still called the legacy two-argument renderer.

- [ ] **I8.2B — Replace `_render_accepted_reports` with the expanded adapter.**

```python
def _render_accepted_reports(
    index,
    decisions,
    visuals,
    ledger,
    policy,
    must_keep_inventory,
    pdf_sha256,
):
    return {
        "coverage": render_coverage_matrix(
            index,
            decisions,
            visuals,
            ledger,
            policy,
            must_keep_inventory,
            pdf_sha256,
        ),
        "visual": render_visual_asset_index(
            index,
            decisions,
            visuals,
            ledger,
            policy,
            must_keep_inventory,
        ),
    }
```

Expected: only the staged Task 7 report adapter is replaced; accepted batches
now render from full formal context without changing integration ordering.

- [ ] **G8.2B — Re-run the expanded integration-report adapter test.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_integrate_review_batch.IntegrationReportTests.test_expanded_renderers_receive_full_context -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.3 — `StageAGateRuleTests.test_rule_1_rejects_incomplete_decisions`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_1_rejects_incomplete_decisions(self):
        case = valid_stage_a_case()
        case["decisions"][0]["reviewState"] = "unreviewed"
        with self.assertRaisesRegex(
            AuditValidationError, "reviewState|complete"
        ):
            _gate_complete_decisions(case)
```

Expected: only `StageAGateRuleTests.test_rule_1_rejects_incomplete_decisions` is added in this action, and the shown Python block parses.

- [ ] **R8.3 — Run `StageAGateRuleTests.test_rule_1_rejects_incomplete_decisions` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_1_rejects_incomplete_decisions -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_complete_decisions` and proves that exact function or branch contract is not yet present.

- [ ] **I8.3 — Implement `_gate_complete_decisions`**

```python
def _gate_complete_decisions(case):
    validate_editorial_decisions(
        case["index"],
        case["visuals"],
        case["decisions"],
        case["policy"],
        require_complete=True,
    )
```

Expected: only `_gate_complete_decisions` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.3 — Run `StageAGateRuleTests.test_rule_1_rejects_incomplete_decisions` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_1_rejects_incomplete_decisions -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.4 — `StageAGateRuleTests.test_rule_2_rejects_incomplete_page_scan`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_2_rejects_incomplete_page_scan(self):
        case = valid_stage_a_case()
        page = next(
            row
            for row in case["decisions"]
            if row["sourceId"].startswith("page-")
        )
        page["visualReviewState"] = "unreviewed"
        with self.assertRaisesRegex(
            AuditValidationError, "visualReviewState|scan"
        ):
            _gate_page_scans(case)
```

Expected: only `StageAGateRuleTests.test_rule_2_rejects_incomplete_page_scan` is added in this action, and the shown Python block parses.

- [ ] **R8.4 — Run `StageAGateRuleTests.test_rule_2_rejects_incomplete_page_scan` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_2_rejects_incomplete_page_scan -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_page_scans` and proves that exact function or branch contract is not yet present.

- [ ] **I8.4 — Implement `_gate_page_scans`**

```python
def _gate_page_scans(case):
    decision_map = _decision_by_source_id(case["decisions"])
    for page in case["index"]["pages"]:
        decision = decision_map[page["sourceId"]]
        if (
            decision.get("visualReviewState") != "reviewed"
            or not decision.get("visualReviewer")
        ):
            raise AuditValidationError(
                f"page scan incomplete: {page['sourceId']}"
            )
```

Expected: only `_gate_page_scans` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.4 — Run `StageAGateRuleTests.test_rule_2_rejects_incomplete_page_scan` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_2_rejects_incomplete_page_scan -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.5 — `StageAGateRuleTests.test_rule_3_rejects_incomplete_visual_metadata`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_3_rejects_incomplete_visual_metadata(self):
        case = valid_stage_a_case()
        visual = next(
            row
            for row in case["decisions"]
            if row.get("visualClass") in {
                "semantic-core", "evidence",
            }
        )
        visual["visualTextAlternative"] = ""
        with self.assertRaisesRegex(
            AuditValidationError, "visualTextAlternative|visual"
        ):
            _gate_visual_metadata(case)
```

Expected: only `StageAGateRuleTests.test_rule_3_rejects_incomplete_visual_metadata` is added in this action, and the shown Python block parses.

- [ ] **R8.5 — Run `StageAGateRuleTests.test_rule_3_rejects_incomplete_visual_metadata` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_3_rejects_incomplete_visual_metadata -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_visual_metadata` and proves that exact function or branch contract is not yet present.

- [ ] **I8.5 — Implement `_gate_visual_metadata`**

```python
def _gate_visual_metadata(case):
    source_map = source_items_by_id(
        case["index"], case["visuals"]
    )
    decision_map = _decision_by_source_id(case["decisions"])
    for source_id, item in source_map.items():
        if item["kind"] not in {"figure", "table", "visual"}:
            continue
        decision = decision_map[source_id]
        visual_class = decision.get("visualClass")
        if not visual_class or not decision.get("visualHandling"):
            raise AuditValidationError(
                f"visual metadata incomplete: {source_id}"
            )
        if (
            visual_class in {"semantic-core", "evidence"}
            and not decision.get("visualTextAlternative")
        ):
            raise AuditValidationError(
                f"visual metadata incomplete: {source_id}"
            )
        if (
            decision.get("disposition")
            in {"included", "compressed", "missing"}
            and not decision.get("lessonIds")
        ):
            raise AuditValidationError(
                f"visual destination incomplete: {source_id}"
            )
```

Expected: only `_gate_visual_metadata` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.5 — Run `StageAGateRuleTests.test_rule_3_rejects_incomplete_visual_metadata` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_3_rejects_incomplete_visual_metadata -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.6 — `StageAGateRuleTests.test_rule_4_rejects_unresolved_caption_conflict`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_4_rejects_unresolved_caption_conflict(self):
        case = valid_stage_a_case()
        source_id = case["policy"]["captionConflictSourceIds"][0]
        decision = _decision_by_source_id(
            case["decisions"]
        )[source_id]
        decision["captionConflictNote"] = ""
        with self.assertRaisesRegex(
            AuditValidationError, "caption conflict"
        ):
            _gate_caption_conflicts(case)
```

Expected: only `StageAGateRuleTests.test_rule_4_rejects_unresolved_caption_conflict` is added in this action, and the shown Python block parses.

- [ ] **R8.6 — Run `StageAGateRuleTests.test_rule_4_rejects_unresolved_caption_conflict` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_4_rejects_unresolved_caption_conflict -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_caption_conflicts` and proves that exact function or branch contract is not yet present.

- [ ] **I8.6 — Implement `_gate_caption_conflicts`**

```python
def _gate_caption_conflicts(case):
    decision_map = _decision_by_source_id(case["decisions"])
    conflict_ids = case["policy"]["captionConflictSourceIds"]
    for source_id in conflict_ids:
        if not _caption_conflict_is_resolved(
            decision_map.get(source_id, {})
        ):
            raise AuditValidationError(
                f"caption conflict unresolved: {source_id}"
            )
```

Expected: only `_gate_caption_conflicts` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.6 — Run `StageAGateRuleTests.test_rule_4_rejects_unresolved_caption_conflict` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_4_rejects_unresolved_caption_conflict -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.7 — `StageAGateRuleTests.test_rule_5_rejects_unclaimed_must_keep_id`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_5_rejects_unclaimed_must_keep_id(self):
        case = valid_stage_a_case()
        keep_id = case["mustKeepInventory"][0]["mustKeepId"]
        for decision in case["decisions"]:
            decision["mustKeepIds"] = [
                value
                for value in decision.get("mustKeepIds", [])
                if value != keep_id
            ]
        with self.assertRaisesRegex(
            AuditValidationError, "mustKeep|coverage"
        ):
            _gate_must_keep(case)
```

Expected: only `StageAGateRuleTests.test_rule_5_rejects_unclaimed_must_keep_id` is added in this action, and the shown Python block parses.

- [ ] **R8.7 — Run `StageAGateRuleTests.test_rule_5_rejects_unclaimed_must_keep_id` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_5_rejects_unclaimed_must_keep_id -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_must_keep` and proves that exact function or branch contract is not yet present.

- [ ] **I8.7 — Implement `_gate_must_keep`**

```python
def _gate_must_keep(case):
    source_map = source_items_by_id(
        case["index"], case["visuals"]
    )
    validate_must_keep_coverage(
        case["mustKeepInventory"],
        case["decisions"],
        source_map,
        case["index"]["outline"],
        case["policy"],
        require_complete=True,
    )
```

Expected: only `_gate_must_keep` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.7 — Run `StageAGateRuleTests.test_rule_5_rejects_unclaimed_must_keep_id` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_5_rejects_unclaimed_must_keep_id -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.8 — `StageAGateRuleTests.test_rule_6_rejects_missing_item_without_lesson`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_6_rejects_missing_item_without_lesson(self):
        case = valid_stage_a_case()
        missing = _decision_by_source_id(case["decisions"])[
            case["missingSourceId"]
        ]
        missing.update({
            "disposition": "missing",
            "lessonIds": [],
        })
        with self.assertRaisesRegex(
            AuditValidationError, "missing.*lesson"
        ):
            _gate_missing_item_lessons(case)
```

Expected: only `StageAGateRuleTests.test_rule_6_rejects_missing_item_without_lesson` is added in this action, and the shown Python block parses.

- [ ] **R8.8 — Run `StageAGateRuleTests.test_rule_6_rejects_missing_item_without_lesson` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_6_rejects_missing_item_without_lesson -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_missing_item_lessons` and proves that exact function or branch contract is not yet present.

- [ ] **I8.8 — Implement `_gate_missing_item_lessons`**

```python
def _gate_missing_item_lessons(case):
    for decision in case["decisions"]:
        if (
            decision.get("disposition") == "missing"
            and not decision.get("lessonIds")
        ):
            raise AuditValidationError(
                "missing item has no lesson: "
                f"{decision['sourceId']}"
            )
```

Expected: only `_gate_missing_item_lessons` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.8 — Run `StageAGateRuleTests.test_rule_6_rejects_missing_item_without_lesson` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_6_rejects_missing_item_without_lesson -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.9 — `StageAGateRuleTests.test_rule_7_rejects_invalid_course_placement`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_7_rejects_invalid_course_placement(self):
        case = valid_stage_a_case()
        chapter_five = next(
            row
            for row in case["decisions"]
            if row["sourceId"] == case["chapterFiveSourceId"]
        )
        chapter_five.update({
            "disposition": "included",
            "reason": "错误纳入当前版",
            "lessonIds": ["1-1"],
            "riskFlags": sorted({
                *chapter_five["riskFlags"],
                "lesson-1-1",
            }),
        })
        with self.assertRaisesRegex(
            AuditValidationError, "version boundary"
        ):
            _gate_course_placement(case)
```

Expected: only `StageAGateRuleTests.test_rule_7_rejects_invalid_course_placement` is added in this action, and the shown Python block parses.

- [ ] **R8.9 — Run `StageAGateRuleTests.test_rule_7_rejects_invalid_course_placement` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_7_rejects_invalid_course_placement -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_course_placement` and proves that exact function or branch contract is not yet present.

- [ ] **I8.9 — Implement `_gate_course_placement`**

```python
def _gate_course_placement(case):
    validate_editorial_decisions(
        case["index"],
        case["visuals"],
        case["decisions"],
        case["policy"],
        require_complete=True,
    )
```

Expected: only `_gate_course_placement` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.9 — Run `StageAGateRuleTests.test_rule_7_rejects_invalid_course_placement` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_7_rejects_invalid_course_placement -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.10 — `StageAGateRuleTests.test_rule_8_rejects_invalid_review_ledger`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_8_rejects_invalid_review_ledger(self):
        case = valid_stage_a_case()
        case["ledger"][0]["acceptedDecisionsSha256"] = "f" * 64
        with self.assertRaisesRegex(
            AuditValidationError, "genesis|ledger"
        ):
            _gate_review_ledger(case)
```

Expected: only `StageAGateRuleTests.test_rule_8_rejects_invalid_review_ledger` is added in this action, and the shown Python block parses.

- [ ] **R8.10 — Run `StageAGateRuleTests.test_rule_8_rejects_invalid_review_ledger` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_8_rejects_invalid_review_ledger -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_review_ledger` and proves that exact function or branch contract is not yet present.

- [ ] **I8.10 — Implement `_gate_review_ledger`**

```python
def _gate_review_ledger(case):
    validate_review_ledger(
        case["index"],
        case["visuals"],
        case["decisions"],
        case["ledger"],
        case["policy"],
        sha256_json(case["decisions"]),
        require_complete=True,
    )
```

Expected: only `_gate_review_ledger` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.10 — Run `StageAGateRuleTests.test_rule_8_rejects_invalid_review_ledger` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_8_rejects_invalid_review_ledger -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.11 — `StageAGateRuleTests.test_rule_9_rejects_unapproved_pdf_hash`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_9_rejects_unapproved_pdf_hash(self):
        with self.assertRaisesRegex(
            AuditValidationError, "approved PDF SHA-256 mismatch"
        ):
            _gate_pdf_hash("f" * 64)
```

Expected: only `StageAGateRuleTests.test_rule_9_rejects_unapproved_pdf_hash` is added in this action, and the shown Python block parses.

- [ ] **R8.11 — Run `StageAGateRuleTests.test_rule_9_rejects_unapproved_pdf_hash` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_9_rejects_unapproved_pdf_hash -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_pdf_hash` and proves that exact function or branch contract is not yet present.

- [ ] **I8.11 — Implement `_gate_pdf_hash`**

```python
def _gate_pdf_hash(pdf_sha256):
    approved = (
        "27dba7a82ce46fbaa60c27a99e633a029"
        "db455ec2ccec08c79466c57f317b4ac"
    )
    if pdf_sha256 != approved:
        raise AuditValidationError(
            "approved PDF SHA-256 mismatch"
        )
```

Expected: only `_gate_pdf_hash` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.11 — Run `StageAGateRuleTests.test_rule_9_rejects_unapproved_pdf_hash` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_9_rejects_unapproved_pdf_hash -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.12 — `StageAGateRuleTests.test_rule_10_rejects_nondeterministic_reports`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rule_10_rejects_nondeterministic_reports(self):
        first = (b"coverage-a\n", b"visual\n")
        second = (b"coverage-b\n", b"visual\n")
        with self.assertRaisesRegex(
            AuditValidationError, "report determinism"
        ):
            _gate_report_determinism(first, second)
```

Expected: only `StageAGateRuleTests.test_rule_10_rejects_nondeterministic_reports` is added in this action, and the shown Python block parses.
The assertion must execute two real write/read passes in isolated directories.

- [ ] **R8.12 — Run `StageAGateRuleTests.test_rule_10_rejects_nondeterministic_reports` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_10_rejects_nondeterministic_reports -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_gate_report_determinism` and proves that exact function or branch contract is not yet present.

- [ ] **I8.12 — Implement `_gate_report_determinism`**

```python
def _gate_report_determinism(first_outputs, second_outputs):
    persisted = []
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for pass_number, outputs in enumerate(
            (first_outputs, second_outputs), start=1
        ):
            pass_root = root / f"pass-{pass_number}"
            pass_root.mkdir()
            paths = (
                pass_root / "coverage.md",
                pass_root / "visual.md",
            )
            write_files_transaction({
                path: payload
                for path, payload in zip(
                    paths, outputs, strict=True
                )
            })
            persisted.append(
                tuple(path.read_bytes() for path in paths)
            )
    if persisted[0] != persisted[1]:
        raise AuditValidationError("report determinism mismatch")
```

Expected: only `_gate_report_determinism` is added or changed; it compares
bytes read back from two separately persisted report sets.

- [ ] **G8.12 — Run `StageAGateRuleTests.test_rule_10_rejects_nondeterministic_reports` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rule_10_rejects_nondeterministic_reports -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.13 — `StageAGateCompositionTests.test_valid_complete_state_passes_stage_a_gate`**

```python
class StageAGateCompositionTests(unittest.TestCase):
    def test_valid_complete_state_passes_stage_a_gate(self):
        case = valid_stage_a_case()
        run_stage_a_gate(
            case["pdfSha256"],
            case["index"],
            case["visuals"],
            case["decisions"],
            case["ledger"],
            case["policy"],
            case["mustKeepInventory"],
        )
```

Expected: only `StageAGateCompositionTests.test_valid_complete_state_passes_stage_a_gate` is added in this action, and the shown Python block parses.

- [ ] **R8.13 — Run `StageAGateCompositionTests.test_valid_complete_state_passes_stage_a_gate` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateCompositionTests.test_valid_complete_state_passes_stage_a_gate -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `run_stage_a_gate` and proves that exact function or branch contract is not yet present.

- [ ] **I8.13 — Implement `run_stage_a_gate`**

```python
def run_stage_a_gate(
    pdf_sha256,
    index,
    visuals,
    decisions,
    ledger,
    policy,
    must_keep_inventory,
):
    case = {
        "pdfSha256": pdf_sha256,
        "index": index,
        "visuals": visuals,
        "decisions": decisions,
        "ledger": ledger,
        "policy": policy,
        "mustKeepInventory": must_keep_inventory,
    }
    _gate_pdf_hash(pdf_sha256)
    _gate_complete_decisions(case)
    _gate_page_scans(case)
    _gate_visual_metadata(case)
    _gate_caption_conflicts(case)
    _gate_must_keep(case)
    _gate_missing_item_lessons(case)
    _gate_course_placement(case)
    _gate_review_ledger(case)
    first = (
        render_coverage_matrix(
            index,
            decisions,
            visuals,
            ledger,
            policy,
            must_keep_inventory,
            pdf_sha256,
        ).encode("utf-8"),
        render_visual_asset_index(
            index,
            decisions,
            visuals,
            ledger,
            policy,
            must_keep_inventory,
        ).encode("utf-8"),
    )
    second = (
        render_coverage_matrix(
            index,
            decisions,
            visuals,
            ledger,
            policy,
            must_keep_inventory,
            pdf_sha256,
        ).encode("utf-8"),
        render_visual_asset_index(
            index,
            decisions,
            visuals,
            ledger,
            policy,
            must_keep_inventory,
        ).encode("utf-8"),
    )
    _gate_report_determinism(first, second)
```

Expected: only `run_stage_a_gate` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.13 — Run `StageAGateCompositionTests.test_valid_complete_state_passes_stage_a_gate` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateCompositionTests.test_valid_complete_state_passes_stage_a_gate -v
```

The report CLI resolves PDF, index, visuals, decisions, ledger, policy,
analysis, course outline, and both outputs before reading. It rejects every
cross-role symlink, hardlink, case-fold, and Unicode-normalization alias.
Without `--pdf`, it resolves `index["pdfPath"]`; with `--pdf`, it fingerprints
the explicit path. Normal mode may render incomplete work.
`--require-complete` runs `run_stage_a_gate` before the two-file report
transaction and exits with code 2 plus the failed rule name without changing
either report.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.14 — `CalibrationAcceptanceInvariantTests.test_rejects_calibration_below_30_sources`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_calibration_below_30_sources(self):
        freeze = {"sourceIds": [f"page-{value:03d}" for value in range(29)]}
        with self.assertRaisesRegex(
            AuditValidationError, "outside 30..40"
        ):
            _require_calibration_source_count(freeze)
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_calibration_below_30_sources` is added in this action, and the shown Python block parses.

- [ ] **R8.14 — Run `CalibrationAcceptanceInvariantTests.test_rejects_calibration_below_30_sources` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_calibration_below_30_sources -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_calibration_source_count` and proves that exact function or branch contract is not yet present.

- [ ] **I8.14 — Implement the `minimum` branch of `_require_calibration_source_count`**

```python
def _require_calibration_source_count(freeze):
    count = len(freeze["sourceIds"])
    if count < 30:
        raise AuditValidationError(
            "calibration source count outside 30..40"
        )
```

Expected: only the lower-bound branch is implemented; a 41-source freeze
remains the intended RED for T8.15.

- [ ] **G8.14 — Run `CalibrationAcceptanceInvariantTests.test_rejects_calibration_below_30_sources` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_calibration_below_30_sources -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.15 — `CalibrationAcceptanceInvariantTests.test_rejects_calibration_above_40_sources`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_calibration_above_40_sources(self):
        freeze = {"sourceIds": [f"page-{value:03d}" for value in range(41)]}
        with self.assertRaisesRegex(
            AuditValidationError, "outside 30..40"
        ):
            _require_calibration_source_count(freeze)
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_calibration_above_40_sources` is added in this action, and the shown Python block parses.

- [ ] **R8.15 — Run `CalibrationAcceptanceInvariantTests.test_rejects_calibration_above_40_sources` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_calibration_above_40_sources -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_calibration_source_count` and proves that exact function or branch contract is not yet present.

- [ ] **I8.15 — Implement the `maximum` branch of `_require_calibration_source_count`**

```python
def _require_calibration_source_count(freeze):
    count = len(freeze["sourceIds"])
    if count < 30 or count > 40:
        raise AuditValidationError(
            "calibration source count outside 30..40"
        )
```

Expected: only `_require_calibration_source_count` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.15 — Run `CalibrationAcceptanceInvariantTests.test_rejects_calibration_above_40_sources` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_calibration_above_40_sources -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.16 — `CalibrationAcceptanceInvariantTests.test_rejects_required_page_gap`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_required_page_gap(self):
        case = valid_calibration_case()
        required = case["policy"]["calibration"]["requiredPages"]
        case["freeze"]["pages"].remove(required[0])
        with self.assertRaisesRegex(
            AuditValidationError, "omits a required page"
        ):
            _require_calibration_pages(
                case["freeze"], case["index"], case["policy"]
            )
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_required_page_gap` is added in this action, and the shown Python block parses.

- [ ] **R8.16 — Run `CalibrationAcceptanceInvariantTests.test_rejects_required_page_gap` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_required_page_gap -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_calibration_pages` and proves that exact function or branch contract is not yet present.

- [ ] **I8.16 — Implement the `required-pages` branch of `_require_calibration_pages`**

```python
def _require_calibration_pages(freeze, index, policy):
    required = set(policy["calibration"]["requiredPages"])
    pages = set(freeze["pages"])
    if not required <= pages:
        raise AuditValidationError(
            "calibration freeze omits a required page"
        )
```

Expected: only required-page coverage is implemented; external-page coverage
remains the intended RED for T8.17.

- [ ] **G8.16 — Run `CalibrationAcceptanceInvariantTests.test_rejects_required_page_gap` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_required_page_gap -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.17 — `CalibrationAcceptanceInvariantTests.test_rejects_external_page_gap`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_external_page_gap(self):
        case = valid_calibration_case()
        risk_pages = set(review_page_numbers(case["index"]))
        external = sorted(set(case["freeze"]["pages"]) - risk_pages)
        case["freeze"]["pages"] = sorted(
            set(case["freeze"]["pages"]) - set(external[2:])
        )
        with self.assertRaisesRegex(
            AuditValidationError, "fewer than three external pages"
        ):
            _require_calibration_pages(
                case["freeze"], case["index"], case["policy"]
            )
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_external_page_gap` is added in this action, and the shown Python block parses.

- [ ] **R8.17 — Run `CalibrationAcceptanceInvariantTests.test_rejects_external_page_gap` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_external_page_gap -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_calibration_pages` and proves that exact function or branch contract is not yet present.

- [ ] **I8.17 — Implement the `external-pages` branch of `_require_calibration_pages`**

```python
def _require_calibration_pages(freeze, index, policy):
    required = set(policy["calibration"]["requiredPages"])
    pages = set(freeze["pages"])
    if not required <= pages:
        raise AuditValidationError(
            "calibration freeze omits a required page"
        )
    external = pages - set(review_page_numbers(index))
    if len(external) < 3:
        raise AuditValidationError(
            "calibration freeze has fewer than three external pages"
        )
```

Expected: only `_require_calibration_pages` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.17 — Run `CalibrationAcceptanceInvariantTests.test_rejects_external_page_gap` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_external_page_gap -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.18 — `CalibrationAcceptanceInvariantTests.test_rejects_incomplete_frozen_page_snapshot`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_incomplete_frozen_page_snapshot(self):
        case = valid_calibration_case()
        case["freeze"]["frozenPageDecisions"].pop()
        with self.assertRaisesRegex(
            AuditValidationError, "frozen page decisions"
        ):
            _require_frozen_page_snapshot(case["freeze"])
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_incomplete_frozen_page_snapshot` is added in this action, and the shown Python block parses.

- [ ] **R8.18 — Run `CalibrationAcceptanceInvariantTests.test_rejects_incomplete_frozen_page_snapshot` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_incomplete_frozen_page_snapshot -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_frozen_page_snapshot` and proves that exact function or branch contract is not yet present.

- [ ] **I8.18 — Implement `_require_frozen_page_snapshot`**

```python
def _require_frozen_page_snapshot(freeze):
    expected = {
        f"page-{pdf_page:03d}" for pdf_page in freeze["pages"]
    }
    actual = {
        row["sourceId"]
        for row in freeze["frozenPageDecisions"]
    }
    if actual != expected:
        raise AuditValidationError(
            "frozen page decisions do not match calibration pages"
        )
```

Expected: only `_require_frozen_page_snapshot` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.18 — Run `CalibrationAcceptanceInvariantTests.test_rejects_incomplete_frozen_page_snapshot` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_incomplete_frozen_page_snapshot -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.19 — `CalibrationAcceptanceInvariantTests.test_rejects_non_unreviewed_assignment`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_non_unreviewed_assignment(self):
        case = valid_calibration_case()
        source_id = case["freeze"]["sourceIds"][0]
        case["freeze"]["baseReviewStates"][source_id] = "reviewed"
        with self.assertRaisesRegex(
            AuditValidationError, "non-unreviewed"
        ):
            _require_unreviewed_calibration_base(case["freeze"])
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_non_unreviewed_assignment` is added in this action, and the shown Python block parses.

- [ ] **R8.19 — Run `CalibrationAcceptanceInvariantTests.test_rejects_non_unreviewed_assignment` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_non_unreviewed_assignment -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_unreviewed_calibration_base` and proves that exact function or branch contract is not yet present.

- [ ] **I8.19 — Implement `_require_unreviewed_calibration_base`**

```python
def _require_unreviewed_calibration_base(freeze):
    if set(freeze["baseReviewStates"]) != set(
        freeze["catalogSourceIds"]
    ):
        raise AuditValidationError(
            "calibration baseReviewStates do not cover catalog"
        )
    invalid = sorted(
        source_id
        for source_id in freeze["sourceIds"]
        if freeze["baseReviewStates"].get(source_id) != "unreviewed"
    )
    if invalid:
        raise AuditValidationError(
            f"calibration assigned non-unreviewed IDs: {invalid}"
        )
```

Expected: only `_require_unreviewed_calibration_base` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.19 — Run `CalibrationAcceptanceInvariantTests.test_rejects_non_unreviewed_assignment` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_non_unreviewed_assignment -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.20 — `CalibrationAcceptanceInvariantTests.test_rejects_partial_secondary_coverage`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_partial_secondary_coverage(self):
        case = valid_calibration_case()
        entry = case["ledger"][-1]
        entry["doubleReviewedSourceIds"].pop()
        with self.assertRaisesRegex(
            AuditValidationError, "100% double reviewed"
        ):
            _require_complete_double_review(
                case["freeze"], entry
            )
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_partial_secondary_coverage` is added in this action, and the shown Python block parses.

- [ ] **R8.20 — Run `CalibrationAcceptanceInvariantTests.test_rejects_partial_secondary_coverage` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_partial_secondary_coverage -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_complete_double_review` and proves that exact function or branch contract is not yet present.

- [ ] **I8.20 — Implement `_require_complete_double_review`**

```python
def _require_complete_double_review(freeze, entry):
    if set(entry["doubleReviewedSourceIds"]) != set(
        freeze["sourceIds"]
    ):
        raise AuditValidationError(
            "calibration is not 100% double reviewed"
        )
```

Expected: only `_require_complete_double_review` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.20 — Run `CalibrationAcceptanceInvariantTests.test_rejects_partial_secondary_coverage` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_partial_secondary_coverage -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.21 — `CalibrationAcceptanceInvariantTests.test_rejects_same_reviewer_or_task`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_same_reviewer_or_task(self):
        case = valid_calibration_case()
        entry = case["ledger"][-1]
        entry["secondaryReviewer"] = entry["primaryReviewer"]
        with self.assertRaisesRegex(
            AuditValidationError, "not independent"
        ):
            _require_independent_reviewers(entry)
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_same_reviewer_or_task` is added in this action, and the shown Python block parses.

- [ ] **R8.21 — Run `CalibrationAcceptanceInvariantTests.test_rejects_same_reviewer_or_task` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_same_reviewer_or_task -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_independent_reviewers` and proves that exact function or branch contract is not yet present.

- [ ] **I8.21 — Implement `_require_independent_reviewers`**

```python
def _require_independent_reviewers(entry):
    if (
        entry["primaryReviewer"] == entry["secondaryReviewer"]
        or entry["primaryTaskId"] == entry["secondaryTaskId"]
    ):
        raise AuditValidationError(
            "calibration reviewers are not independent"
        )
```

Expected: only `_require_independent_reviewers` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.21 — Run `CalibrationAcceptanceInvariantTests.test_rejects_same_reviewer_or_task` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_same_reviewer_or_task -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.22 — `CalibrationAcceptanceInvariantTests.test_rejects_missing_resolution`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_missing_resolution(self):
        case = valid_calibration_case()
        entry = case["ledger"][-1]
        entry["resolvedSourceIds"].pop()
        with self.assertRaisesRegex(
            AuditValidationError, "resolutions are incomplete"
        ):
            _require_complete_resolutions(entry)
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_missing_resolution` is added in this action, and the shown Python block parses.

- [ ] **R8.22 — Run `CalibrationAcceptanceInvariantTests.test_rejects_missing_resolution` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_missing_resolution -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_complete_resolutions` and proves that exact function or branch contract is not yet present.

- [ ] **I8.22 — Implement `_require_complete_resolutions`**

```python
def _require_complete_resolutions(entry):
    disagreement_ids = {
        row["sourceId"] for row in entry["disagreements"]
    }
    if set(entry["resolvedSourceIds"]) != disagreement_ids:
        raise AuditValidationError(
            "calibration resolutions are incomplete"
        )
```

Expected: only `_require_complete_resolutions` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.22 — Run `CalibrationAcceptanceInvariantTests.test_rejects_missing_resolution` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_missing_resolution -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.23 — `CalibrationAcceptanceInvariantTests.test_rejects_post_review_discovery_tail`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_post_review_discovery_tail(self):
        case = valid_calibration_case()
        review_entry = case["ledger"][-1]
        case["ledger"].append({
            "entryType": "discovery",
            "previousEntrySha256": sha256_json(review_entry),
        })
        with self.assertRaisesRegex(
            AuditValidationError, "must be ledger tail"
        ):
            _require_review_tail(case["ledger"], review_entry)
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_post_review_discovery_tail` is added in this action, and the shown Python block parses.

- [ ] **R8.23 — Run `CalibrationAcceptanceInvariantTests.test_rejects_post_review_discovery_tail` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_post_review_discovery_tail -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_review_tail` and proves that exact function or branch contract is not yet present.

- [ ] **I8.23 — Implement `_require_review_tail`**

```python
def _require_review_tail(ledger, review_entry):
    if not ledger or ledger[-1] is not review_entry:
        raise AuditValidationError(
            "calibration review entry must be ledger tail"
        )
```

Expected: only `_require_review_tail` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.23 — Run `CalibrationAcceptanceInvariantTests.test_rejects_post_review_discovery_tail` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_post_review_discovery_tail -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.24 — `CalibrationAcceptanceInvariantTests.test_rejects_changed_page_discovery_evidence`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_rejects_changed_page_discovery_evidence(self):
        case = valid_calibration_case()
        frozen = case["freeze"]["frozenPageDecisions"][0]
        current = _decision_by_source_id(
            case["decisions"]
        )[frozen["sourceId"]]
        current["visualReviewer"] = "changed-reviewer"
        with self.assertRaisesRegex(
            AuditValidationError, "page discovery changed"
        ):
            _require_frozen_discovery_unchanged(
                case["freeze"], case["decisions"]
            )
```

Expected: only `CalibrationAcceptanceInvariantTests.test_rejects_changed_page_discovery_evidence` is added in this action, and the shown Python block parses.

- [ ] **R8.24 — Run `CalibrationAcceptanceInvariantTests.test_rejects_changed_page_discovery_evidence` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_changed_page_discovery_evidence -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_require_frozen_discovery_unchanged` and proves that exact function or branch contract is not yet present.

- [ ] **I8.24 — Implement `_require_frozen_discovery_unchanged`**

```python
def _require_frozen_discovery_unchanged(freeze, decisions):
    decision_map = _decision_by_source_id(decisions)
    fields = (
        "visualReviewState",
        "visualReviewer",
        "discoveredVisualIds",
        "symbolReview",
    )
    for frozen_page in freeze["frozenPageDecisions"]:
        current = decision_map[frozen_page["sourceId"]]
        for field in fields:
            if current[field] != frozen_page[field]:
                raise AuditValidationError(
                    "page discovery changed after freeze: "
                    f"{frozen_page['sourceId']}"
                )
```

Expected: only `_require_frozen_discovery_unchanged` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.24 — Run `CalibrationAcceptanceInvariantTests.test_rejects_changed_page_discovery_evidence` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_rejects_changed_page_discovery_evidence -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S8.25A — Add `_validate_calibration_base`**

```python
def _validate_calibration_base(
    freeze,
    current_evidence,
    index,
    visuals,
    decisions,
    policy,
    must_keep_inventory,
):
    validate_frozen_immutable_evidence(
        freeze, current_evidence
    )
    _gate_pdf_hash(current_evidence["pdfSha256"])
    if freeze["mode"] != "calibration":
        raise AuditValidationError(
            "freeze mode is not calibration"
        )
    _require_calibration_source_count(freeze)
    _require_calibration_pages(freeze, index, policy)
    _require_frozen_page_snapshot(freeze)
    _require_unreviewed_calibration_base(freeze)
    source_map = source_items_by_id(index, visuals)
    validate_editorial_decisions(
        index,
        visuals,
        decisions,
        policy,
        require_complete=False,
    )
    validate_must_keep_coverage(
        must_keep_inventory,
        decisions,
        source_map,
        index["outline"],
        policy,
        require_complete=False,
    )
    if sorted(source_map) != freeze["catalogSourceIds"]:
        raise AuditValidationError(
            "catalog changed after freeze"
        )
```

Expected: frozen evidence, calibration shape, catalog, decision, and
must-keep preconditions are validated before ledger acceptance checks.

- [ ] **S8.25B — Add `_one_calibration_entry`**

```python
def _one_calibration_entry(freeze, ledger):
    entries = [
        row
        for row in ledger
        if row.get("entryType") == "review"
        and row.get("batchId") == freeze["batchId"]
    ]
    if len(entries) != 1:
        raise AuditValidationError(
            "expected one calibration review entry"
        )
    entry = entries[0]
    _require_review_tail(ledger, entry)
    entry_position = ledger.index(entry)
    if (
        sha256_json(ledger[:entry_position])
        != freeze["baseLedgerSha256"]
    ):
        raise AuditValidationError(
            "frozen baseLedgerSha256 mismatch"
        )
    if (
        entry["mode"] != "calibration"
        or entry["sourceIds"] != freeze["sourceIds"]
        or entry["baseDecisionsSha256"]
        != freeze["baseDecisionsSha256"]
    ):
        raise AuditValidationError(
            "calibration review entry mismatch"
        )
    return entry
```

Expected: exactly one matching calibration review must be the ledger tail and
the deterministic hash of its complete ledger prefix must equal the frozen
`baseLedgerSha256`.

- [ ] **S8.25C — Add `_validate_calibration_result`**

```python
def _validate_calibration_result(
    freeze,
    index,
    visuals,
    decisions,
    ledger,
    policy,
    entry,
):
    _require_frozen_discovery_unchanged(freeze, decisions)
    _require_complete_double_review(freeze, entry)
    _require_independent_reviewers(entry)
    _require_complete_resolutions(entry)
    decisions_by_id = _decision_by_source_id(decisions)
    changed = {
        source_id
        for source_id, before in freeze["baseReviewStates"].items()
        if decisions_by_id[source_id]["reviewState"] != before
    }
    expected_changed = set(freeze["sourceIds"])
    if changed != expected_changed:
        raise AuditValidationError(
            "calibration review-state delta mismatch"
        )
    current_hash = sha256_json(decisions)
    validate_review_ledger(
        index,
        visuals,
        decisions,
        ledger,
        policy,
        current_hash,
    )
    if entry["acceptedDecisionsSha256"] != current_hash:
        raise AuditValidationError(
            "ledger tail does not match decisions"
        )
    return expected_changed
```

Expected: the accepted result has an exact review-state delta, complete
double review and resolutions, and a ledger tail matching current decisions.

- [ ] **T8.25 — `CalibrationAcceptanceInvariantTests.test_valid_calibration_returns_deterministic_summary`**

```python
class CalibrationAcceptanceInvariantTests(unittest.TestCase):
    def test_valid_calibration_returns_deterministic_summary(self):
        case = valid_calibration_case()
        first = verify_calibration_acceptance(**case)
        second = verify_calibration_acceptance(**case)
        self.assertEqual(first, second)
        self.assertEqual(first["reviewEntryCount"], 1)
        self.assertEqual(
            first["doubleReviewedCount"], first["sourceCount"]
        )
        wrong_pdf = valid_calibration_case()
        wrong_pdf["freeze"]["pdfSha256"] = "f" * 64
        wrong_pdf["current_immutable_evidence_hashes"][
            "pdfSha256"
        ] = "f" * 64
        wrong_pdf["freeze"]["freezeSha256"] = sha256_json({
            key: value
            for key, value in wrong_pdf["freeze"].items()
            if key != "freezeSha256"
        })
        with self.assertRaisesRegex(
            AuditValidationError, "approved PDF SHA-256"
        ):
            verify_calibration_acceptance(**wrong_pdf)

        wrong_prefix = valid_calibration_case()
        wrong_prefix["freeze"]["baseLedgerSha256"] = "f" * 64
        wrong_prefix["freeze"]["freezeSha256"] = sha256_json({
            key: value
            for key, value in wrong_prefix["freeze"].items()
            if key != "freezeSha256"
        })
        with self.assertRaisesRegex(
            AuditValidationError, "baseLedgerSha256"
        ):
            verify_calibration_acceptance(**wrong_prefix)
```

Expected: the public verifier is deterministic for a valid calibration and
rejects both a self-consistent unapproved PDF and a frozen-ledger-prefix
mismatch.

- [ ] **R8.25 — Run `CalibrationAcceptanceInvariantTests.test_valid_calibration_returns_deterministic_summary` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_valid_calibration_returns_deterministic_summary -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `verify_calibration_acceptance` and proves that exact function or branch contract is not yet present.

- [ ] **I8.25 — Implement `verify_calibration_acceptance`**

```python
def verify_calibration_acceptance(
    freeze,
    current_immutable_evidence_hashes,
    index,
    visuals,
    decisions,
    ledger,
    policy,
    must_keep_inventory,
):
    _validate_calibration_base(
        freeze,
        current_immutable_evidence_hashes,
        index,
        visuals,
        decisions,
        policy,
        must_keep_inventory,
    )
    entry = _one_calibration_entry(freeze, ledger)
    expected_changed = _validate_calibration_result(
        freeze,
        index,
        visuals,
        decisions,
        ledger,
        policy,
        entry,
    )
    return {
        "sourceCount": len(freeze["sourceIds"]),
        "doubleReviewedCount": len(
            entry["doubleReviewedSourceIds"]
        ),
        "reviewedDelta": len(expected_changed),
        "sourceDisagreementRate": entry[
            "sourceDisagreementRate"
        ],
        "reviewEntryCount": 1,
        "discoveryEntryCount": sum(
            row.get("entryType") == "discovery" for row in ledger
        ),
    }
```

Expected: only `verify_calibration_acceptance` is added or changed in this action, and the shown Python block parses.

- [ ] **G8.25 — Run `CalibrationAcceptanceInvariantTests.test_valid_calibration_returns_deterministic_summary` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationAcceptanceInvariantTests.test_valid_calibration_returns_deterministic_summary -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.26 — `CalibrationEvidenceTests.test_rejects_broken_chain_and_each_frozen_evidence_family`**

```python
class CalibrationEvidenceTests(unittest.TestCase):
    def test_rejects_broken_chain_and_each_frozen_evidence_family(self):
        def replace_frozen_hash(case, field, value):
            case["freeze"][field] = value
            case["freeze"]["freezeSha256"] = sha256_json({
                key: item
                for key, item in case["freeze"].items()
                if key != "freezeSha256"
            })

        def replace_pdf_hash(case):
            replace_frozen_hash(
                case, "pdfSha256", "f" * 64
            )
            case["current_immutable_evidence_hashes"][
                "pdfSha256"
            ] = "f" * 64

        mutations = {
            "ledger-chain": lambda case: case["ledger"][1].update({
                "baseDecisionsSha256": "f" * 64,
            }),
            "top-level-hash": lambda case: (
                case["current_immutable_evidence_hashes"].update({
                    "sourceIndexSha256": "f" * 64,
                })
            ),
            "page-image": lambda case: (
                case["current_immutable_evidence_hashes"][
                    "pageImages"
                ][0].update({"sha256": "f" * 64})
            ),
            "page-bundle": lambda case: (
                case["current_immutable_evidence_hashes"][
                    "pageBundles"
                ][0].update({"sha256": "f" * 64})
            ),
            "policy": lambda case: (
                case["current_immutable_evidence_hashes"].update({
                    "editorialPolicySha256": "f" * 64,
                })
            ),
            "policy-snapshot-hash": lambda case: (
                case["current_immutable_evidence_hashes"].update({
                    "policySnapshotSha256": "f" * 64,
                })
            ),
            "policy-snapshot-path": lambda case: (
                case["current_immutable_evidence_hashes"].update({
                    "policySnapshotPath": "wrong/policy.json",
                })
            ),
            "approved-pdf": replace_pdf_hash,
            "base-ledger-prefix": lambda case: (
                replace_frozen_hash(
                    case, "baseLedgerSha256", "f" * 64
                )
            ),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                case = valid_calibration_case()
                mutate(case)
                with self.assertRaises(AuditValidationError):
                    _gate_acceptance_integrity(case)
```

Expected: one executable regression covers the approved PDF, frozen ledger
prefix, current ledger chain, stale immutable hashes, page-image and
page-bundle bytes, formal policy, and both policy-snapshot identity fields.

- [ ] **R8.26 — Run the complete acceptance-integrity matrix and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationEvidenceTests.test_rejects_broken_chain_and_each_frozen_evidence_family -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `_gate_acceptance_integrity`.

- [ ] **I8.26 — Implement `_gate_acceptance_integrity`**

```python
def _gate_acceptance_integrity(case):
    validate_frozen_immutable_evidence(
        case["freeze"],
        case["current_immutable_evidence_hashes"],
    )
    _gate_pdf_hash(
        case["current_immutable_evidence_hashes"][
            "pdfSha256"
        ]
    )
    _one_calibration_entry(
        case["freeze"], case["ledger"]
    )
    validate_review_ledger(
        case["index"],
        case["visuals"],
        case["decisions"],
        case["ledger"],
        case["policy"],
        sha256_json(case["decisions"]),
    )
```

Expected: the helper checks both the complete immutable-evidence snapshot and
the complete persisted ledger chain.

- [ ] **G8.26 — Re-run the complete acceptance-integrity matrix and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.CalibrationEvidenceTests.test_rejects_broken_chain_and_each_frozen_evidence_family -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T8.27 — `StageAGateRuleTests.test_rejects_null_visual_excluded_chapters_and_missing_must_keep`**

```python
class StageAGateRuleTests(unittest.TestCase):
    def test_rejects_null_visual_excluded_chapters_and_missing_must_keep(self):
        def null_visual(case):
            decision = next(
                row
                for row in case["decisions"]
                if row.get("visualClass") is not None
            )
            decision["visualClass"] = None

        def current_course(case, key):
            decision = _decision_by_source_id(case["decisions"])[
                case[key]
            ]
            decision.update({
                "disposition": "included",
                "reason": "错误纳入当前版",
                "lessonIds": ["1-1"],
                "riskFlags": sorted({
                    *decision["riskFlags"],
                    "lesson-1-1",
                }),
            })

        def missing_must_keep(case):
            keep_id = case["mustKeepInventory"][0]["mustKeepId"]
            for row in case["decisions"]:
                row["mustKeepIds"] = [
                    value
                    for value in row.get("mustKeepIds", [])
                    if value != keep_id
                ]

        baseline = valid_stage_a_case()
        _gate_boundary_matrix(baseline)
        mutations = {
            "null-visual": (
                null_visual, "visual metadata incomplete",
            ),
            "chapter-5": (
                lambda case: current_course(
                    case, "chapterFiveSourceId"
                ),
                "version boundary",
            ),
            "chapter-7": (
                lambda case: current_course(
                    case, "chapterSevenSourceId"
                ),
                "version boundary",
            ),
            "chapter-9": (
                lambda case: current_course(
                    case, "chapterNineSourceId"
                ),
                "version boundary",
            ),
            "must-keep": (
                missing_must_keep,
                "mustKeep|coverage|unclaimed",
            ),
        }
        for label, (mutate, pattern) in mutations.items():
            with self.subTest(label=label):
                case = valid_stage_a_case()
                mutate(case)
                with self.assertRaisesRegex(
                    AuditValidationError, pattern
                ):
                    _gate_boundary_matrix(case)
```

Expected: the unmodified baseline passes first; each mutation then fails with
its own gate-specific error rather than an unrelated earlier exception.

- [ ] **R8.27 — Run the boundary-matrix test and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rejects_null_visual_excluded_chapters_and_missing_must_keep -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `_gate_boundary_matrix`.

- [ ] **I8.27 — Implement `_gate_boundary_matrix`**

```python
def _gate_boundary_matrix(case):
    _gate_visual_metadata(case)
    _gate_course_placement(case)
    _gate_must_keep(case)
```

Expected: the helper composes the three independent Stage A boundary gates
without weakening their original error contracts.

- [ ] **G8.27 — Re-run the boundary-matrix test and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.StageAGateRuleTests.test_rejects_null_visual_excluded_chapters_and_missing_must_keep -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S8.28A — Add the complete `build_reports` parser**

```python
def _build_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf")
    parser.add_argument("--index", required=True)
    parser.add_argument("--unnumbered-visuals", required=True)
    parser.add_argument("--decisions", required=True)
    parser.add_argument("--review-ledger", required=True)
    parser.add_argument("--policy", required=True)
    parser.add_argument("--analysis", required=True)
    parser.add_argument("--course-outline", required=True)
    parser.add_argument("--coverage-report", required=True)
    parser.add_argument("--visual-report", required=True)
    parser.add_argument(
        "--require-complete", action="store_true"
    )
    return parser
```

Expected: the final report parser accepts every Task 9 flag and preserves the
optional `--pdf` fallback.

- [ ] **S8.28B — Add `_report_role_paths`**

```python
def _report_role_paths(args):
    roles = {
        "index": Path(args.index),
        "visuals": Path(args.unnumbered_visuals),
        "decisions": Path(args.decisions),
        "ledger": Path(args.review_ledger),
        "policy": Path(args.policy),
        "analysis": Path(args.analysis),
        "courseOutline": Path(args.course_outline),
        "coverageOutput": Path(args.coverage_report),
        "visualOutput": Path(args.visual_report),
    }
    if args.pdf is not None:
        roles["pdf"] = Path(args.pdf)
    return roles
```

Expected: all explicitly declared report roles are available for alias checks
before content loading.

- [ ] **S8.28C — Add `_load_report_case`**

```python
def _load_report_case(args):
    index = load_json(args.index)
    pdf_path = Path(args.pdf or index["pdfPath"])
    roles = _report_role_paths(args)
    roles["pdf"] = pdf_path
    assert_distinct_paths(roles)
    visuals = load_json(args.unnumbered_visuals)
    decisions = load_json(args.decisions)
    ledger = load_json(args.review_ledger)
    policy = load_json(args.policy)
    inventory = build_must_keep_inventory(
        policy,
        parse_markdown_sections(
            Path(args.analysis), args.analysis
        ),
        parse_markdown_sections(
            Path(args.course_outline), args.course_outline
        ),
    )
    validate_editorial_decisions(
        index,
        visuals,
        decisions,
        policy,
        require_complete=False,
    )
    validate_review_ledger(
        index,
        visuals,
        decisions,
        ledger,
        policy,
        sha256_json(decisions),
    )
    return {
        "pdfSha256": sha256_file(pdf_path),
        "index": index,
        "visuals": visuals,
        "decisions": decisions,
        "ledger": ledger,
        "policy": policy,
        "mustKeepInventory": inventory,
    }
```

Expected: the loader resolves the fallback PDF, rechecks it against every role,
and returns all report and gate inputs.

- [ ] **S8.28D — Add `_run_report_command`**

```python
def _run_report_command(args, case):
    if args.require_complete:
        from scripts.source_audit.verify_calibration_acceptance import (
            run_stage_a_gate,
        )
        run_stage_a_gate(
            case["pdfSha256"],
            case["index"],
            case["visuals"],
            case["decisions"],
            case["ledger"],
            case["policy"],
            case["mustKeepInventory"],
        )
    coverage = render_coverage_matrix(
        case["index"],
        case["decisions"],
        case["visuals"],
        case["ledger"],
        case["policy"],
        case["mustKeepInventory"],
        case["pdfSha256"],
    )
    visual = render_visual_asset_index(
        case["index"],
        case["decisions"],
        case["visuals"],
        case["ledger"],
        case["policy"],
        case["mustKeepInventory"],
    )
    write_files_transaction({
        Path(args.coverage_report): coverage.encode("utf-8"),
        Path(args.visual_report): visual.encode("utf-8"),
    })
```

Expected: both candidate reports and the optional Stage A gate complete before
one two-file transaction.

- [ ] **T8.28 — `BuildReportCliTests.test_task9_parser_and_validation_exit_code`**

```python
class BuildReportCliTests(unittest.TestCase):
    def test_task9_parser_and_validation_exit_code(self):
        argv = [
            "--pdf", "source.pdf",
            "--index", "index.json",
            "--unnumbered-visuals", "visuals.json",
            "--decisions", "decisions.json",
            "--review-ledger", "ledger.json",
            "--policy", "policy.json",
            "--analysis", "analysis.md",
            "--course-outline", "outline.md",
            "--coverage-report", "coverage.md",
            "--visual-report", "visual.md",
        ]
        parsed = build_reports_parser().parse_args(argv)
        self.assertEqual(parsed.review_ledger, "ledger.json")
        with mock.patch(
            "scripts.source_audit.build_reports."
            "assert_distinct_paths",
            side_effect=AuditValidationError("path alias"),
        ):
            self.assertEqual(build_reports_main(argv), 2)
```

Expected: the real Task 9 argument vector parses and a pre-read path error
returns exit 2 without writing either report.

- [ ] **R8.28 — Run the build-report CLI contract and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportCliTests.test_task9_parser_and_validation_exit_code -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `main`.

- [ ] **I8.28 — Implement the final `build_reports.main`**

```python
def main(argv=None):
    args = _build_parser().parse_args(argv)
    try:
        assert_distinct_paths(_report_role_paths(args))
        case = _load_report_case(args)
        _run_report_command(args, case)
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

Expected: report path aliases fail before reads, successful calls commit both
reports atomically, and validation failures return 2.

- [ ] **G8.28 — Re-run the build-report CLI contract and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports.BuildReportCliTests.test_task9_parser_and_validation_exit_code -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S8.29A — Add the complete verifier parser**

```python
def _build_parser():
    parser = argparse.ArgumentParser()
    for name in (
        "freeze",
        "pdf",
        "index",
        "visuals",
        "decisions",
        "ledger",
        "policy",
        "analysis",
        "course-outline",
        "image-dir",
        "package-dir",
    ):
        parser.add_argument(f"--{name}", required=True)
    parser.add_argument("--json", action="store_true")
    return parser
```

Expected: the verifier parser exactly matches the Task 10 invocation.

- [ ] **S8.29B — Add `_verifier_role_paths`**

```python
def _verifier_role_paths(args):
    return {
        name: Path(getattr(args, name))
        for name in (
            "freeze",
            "pdf",
            "index",
            "visuals",
            "decisions",
            "ledger",
            "policy",
            "analysis",
            "course_outline",
            "image_dir",
            "package_dir",
        )
    }
```

Expected: every verifier input, including confined evidence roots, is checked
for cross-role aliases before reads.

- [ ] **S8.29C — Add `_load_verifier_case`**

```python
def _load_verifier_case(args):
    freeze = load_json(args.freeze)
    index = load_json(args.index)
    visuals = load_json(args.visuals)
    decisions = load_json(args.decisions)
    ledger = load_json(args.ledger)
    policy = load_json(args.policy)
    inventory = build_must_keep_inventory(
        policy,
        parse_markdown_sections(
            Path(args.analysis), args.analysis
        ),
        parse_markdown_sections(
            Path(args.course_outline), args.course_outline
        ),
    )
    current = build_current_batch_evidence(
        freeze,
        args.pdf,
        args.index,
        args.visuals,
        args.decisions,
        args.ledger,
        args.policy,
        args.analysis,
        args.course_outline,
        args.image_dir,
        args.package_dir,
    )
    return {
        "freeze": freeze,
        "current_immutable_evidence_hashes": current,
        "index": index,
        "visuals": visuals,
        "decisions": decisions,
        "ledger": ledger,
        "policy": policy,
        "must_keep_inventory": inventory,
    }
```

Expected: the loader constructs the exact keyword contract for
`verify_calibration_acceptance` from real disk evidence.

- [ ] **T8.29 — `VerifierCliTests.test_task10_parser_dispatch_and_exit_codes`**

```python
class VerifierCliTests(unittest.TestCase):
    def test_task10_parser_dispatch_and_exit_codes(self):
        argv = [
            "--freeze", "freeze.json",
            "--pdf", "source.pdf",
            "--index", "index.json",
            "--visuals", "visuals.json",
            "--decisions", "decisions.json",
            "--ledger", "ledger.json",
            "--policy", "policy.json",
            "--analysis", "analysis.md",
            "--course-outline", "outline.md",
            "--image-dir", "images",
            "--package-dir", "package",
            "--json",
        ]
        self.assertTrue(verifier_parser().parse_args(argv).json)
        with mock.patch(
            "scripts.source_audit.verify_calibration_acceptance."
            "assert_distinct_paths",
            side_effect=AuditValidationError("path alias"),
        ):
            self.assertEqual(verifier_main(argv), 2)
```

Expected: the full Task 10 vector parses and validation failures return 2
before any verifier input is loaded.

- [ ] **R8.29 — Run the verifier CLI contract and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.VerifierCliTests.test_task10_parser_dispatch_and_exit_codes -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names verifier `main`.

- [ ] **I8.29 — Implement verifier `main`**

```python
def main(argv=None):
    args = _build_parser().parse_args(argv)
    try:
        assert_distinct_paths(_verifier_role_paths(args))
        summary = verify_calibration_acceptance(
            **_load_verifier_case(args)
        )
        if args.json:
            print(json.dumps(
                summary, ensure_ascii=False, sort_keys=True
            ))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

Expected: verifier `main` is read-only, prints deterministic JSON only when
requested, returns 0 on acceptance, and returns 2 on any invariant failure.

- [ ] **G8.29 — Re-run the verifier CLI contract and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_verify_calibration_acceptance.VerifierCliTests.test_task10_parser_dispatch_and_exit_codes -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **Task 8 focused gate — run report and calibration verifier modules**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_build_reports tests.source_audit.test_integrate_review_batch tests.source_audit.test_verify_calibration_acceptance -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **Task 8 full-suite gate — preserve and increase the original assertion count**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **Task 8 commit — record expanded reports and automatic gates**

```bash
git add scripts/source_audit/build_reports.py scripts/source_audit/integrate_review_batch.py scripts/source_audit/verify_calibration_acceptance.py tests/source_audit/test_build_reports.py tests/source_audit/test_integrate_review_batch.py tests/source_audit/test_verify_calibration_acceptance.py reference/source-audit/source-coverage-matrix.md reference/source-audit/visual-asset-index.md
git commit -m "feat: expand editorial audit reports"
```

---

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 9: Migrate and verify the real 834-item baseline

**Files:**
- Create: `scripts/source_audit/migrate_editorial_baseline.py`
- Create: `tests/source_audit/test_migrate_editorial_baseline.py`
- Create: `reference/source-audit/unnumbered-visuals.json`
- Create: `reference/source-audit/review-ledger.json`
- Create: `docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md`
- Temporary: `tmp/source-audit/baseline-migration-report-pass-one.sha256`
- Modify: `reference/source-audit/coverage-decisions.json`
- Modify: `reference/source-audit/source-coverage-matrix.md`
- Modify: `reference/source-audit/visual-asset-index.md`

**Interfaces:**
- Consumes: the current 834 decisions, approved catalog, and approved policy.
- Produces:
  - `migrate(index: dict, visuals: list[dict], decisions: list[dict]) -> list[dict]`
  - `migrate_with_genesis(index: dict, visuals: list[dict], decisions: list[dict], ledger: list[dict], policy: dict) -> tuple[list[dict], list[dict]]`
  - a schema-complete but entirely unreviewed formal baseline;
  - CLI `python3 -m scripts.source_audit.migrate_editorial_baseline`.

The CLI requires these exact values:

```text
--index reference/source-audit/source-index.json
--visuals reference/source-audit/unnumbered-visuals.json
--decisions reference/source-audit/coverage-decisions.json
--ledger reference/source-audit/review-ledger.json
--policy reference/source-audit/editorial-policy.json
--expected-source-count 834
--expected-unreviewed-count 834
```

#### Executable module scaffolds

- [ ] **S9.0 — Create the complete import-safe migration module bootstrap**

```python
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

from scripts.source_audit.decisions import (
    upgrade_editorial_decisions,
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
    paths_conflict,
)
from scripts.source_audit.review_ledger import (
    build_genesis_ledger_entry,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
)


def _pending(name):
    raise NotImplementedError(f"{name} not implemented")

def _assert_preserved_fields(old, new):
    return _pending("_assert_preserved_fields")

def _build_parser():
    return _pending("_build_parser")

def _migration_role_paths(args):
    return _pending("_migration_role_paths")

def _run_migration_command(args):
    return _pending("_run_migration_command")

def _validate_migration_paths(role_paths):
    return _pending("_validate_migration_paths")

def _validate_migration_preconditions(
    visuals,
    decisions,
    expected_source_count,
    expected_unreviewed_count,
):
    return _pending("_validate_migration_preconditions")

def _write_migration_outputs(
    decisions_path,
    ledger_path,
    decisions,
    ledger,
):
    return _pending("_write_migration_outputs")

def main(argv=None):
    return _pending("main")

def migrate(index, visuals, decisions):
    return _pending("migrate")

def migrate_with_genesis(
    index,
    visuals,
    decisions,
    ledger,
    policy,
):
    return _pending("migrate_with_genesis")
```

Expected: `migrate_editorial_baseline.py` imports every dependency and defines
every name imported by S9.1. Importing either module succeeds; calling any
not-yet-implemented target raises `NotImplementedError` naming that exact
target. Each later implementation block replaces its corresponding stub.

- [ ] **S9.1 — Create the complete migration test imports and class scaffolds**

```python
from __future__ import annotations

import copy
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
from scripts.source_audit.transactions import sha256_json
from tests.source_audit.editorial_fixtures import (
    sample_index,
    sample_legacy_decisions,
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


class MigrationContractTests(unittest.TestCase):
    pass


class MigrationPreconditionTests(unittest.TestCase):
    pass


class MigrationPathSafetyTests(unittest.TestCase):
    pass


class MigrationTransactionTests(unittest.TestCase):
    pass


class MigrationCliTests(unittest.TestCase):
    pass
```

Expected: all five test classes and the one-shot replacement failure helper
exist before Task 9 methods are added.

- [ ] **T9.1 — `MigrationContractTests.test_migration_adds_schema_without_making_editorial_decisions`**

```python
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
```

Expected: only `MigrationContractTests.test_migration_adds_schema_without_making_editorial_decisions` is added in this action, and the shown Python block parses.

- [ ] **R9.1 — Run `MigrationContractTests.test_migration_adds_schema_without_making_editorial_decisions` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_adds_schema_without_making_editorial_decisions -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `migrate` and proves that exact function or branch contract is not yet present.

- [ ] **I9.1 — Implement only the legacy-input branch of `migrate`**

```python
def migrate(index, visuals, decisions):
    before = copy.deepcopy(decisions)
    if any("riskFlags" in row for row in before):
        raise AuditValidationError(
            "migrate already-upgraded branch not implemented"
        )
    migrated = upgrade_editorial_decisions(
        index, visuals, copy.deepcopy(decisions)
    )
    if len(before) != len(migrated):
        raise AuditValidationError(
            "migration changed decision count"
        )
    for old, new in zip(before, migrated, strict=True):
        for field, value in old.items():
            if new.get(field) != value:
                raise AuditValidationError(
                    f"migration overwrote {field}: "
                    f"{old['sourceId']}"
                )
        if (
            new["reviewState"] != "unreviewed"
            or new["disposition"] != "unreviewed"
        ):
            raise AuditValidationError(
                "migration made editorial decision: "
                f"{new['sourceId']}"
            )
    return migrated
```

Expected: the legacy 834-record shape migrates without an editorial decision;
an already-upgraded input still fails inside `migrate`, preserving a genuine
RED for T9.3. Only the staged `migrate` stub is replaced.

- [ ] **G9.1 — Run `MigrationContractTests.test_migration_adds_schema_without_making_editorial_decisions` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_adds_schema_without_making_editorial_decisions -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.2 — `MigrationContractTests.test_migration_preserves_existing_editorial_fields`**

```python
class MigrationContractTests(unittest.TestCase):
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
```

Expected: only `MigrationContractTests.test_migration_preserves_existing_editorial_fields` is added in this action, and the shown Python block parses.

- [ ] **R9.2 — Run `MigrationContractTests.test_migration_preserves_existing_editorial_fields` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_preserves_existing_editorial_fields -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_assert_preserved_fields` and proves that exact function or branch contract is not yet present.

- [ ] **I9.2 — Implement `_assert_preserved_fields`**

```python
def _assert_preserved_fields(old, new):
    for field, value in old.items():
        if new.get(field) != value:
            raise AuditValidationError(
                f"migration overwrote {field}: {old['sourceId']}"
            )
```

Expected: only `_assert_preserved_fields` is added or changed in this action, and the shown Python block parses.

- [ ] **G9.2 — Run `MigrationContractTests.test_migration_preserves_existing_editorial_fields` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_preserves_existing_editorial_fields -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.3 — `MigrationContractTests.test_migration_is_idempotent`**

```python
class MigrationContractTests(unittest.TestCase):
    def test_migration_is_idempotent(self):
        first = migrate(
            sample_index(), [], sample_legacy_decisions()
        )
        second = migrate(sample_index(), [], first)
        self.assertEqual(second, first)
```

Expected: only `MigrationContractTests.test_migration_is_idempotent` is added in this action, and the shown Python block parses.

- [ ] **R9.3 — Run `MigrationContractTests.test_migration_is_idempotent` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_is_idempotent -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `migrate` and proves that exact function or branch contract is not yet present.

- [ ] **I9.3 — Implement the `already-upgraded` branch of `migrate`**

```python
def migrate(index, visuals, decisions):
    before = copy.deepcopy(decisions)
    migrated = upgrade_editorial_decisions(
        index, visuals, copy.deepcopy(decisions)
    )
    if len(before) != len(migrated):
        raise AuditValidationError(
            "migration changed decision count"
        )
    for old, new in zip(before, migrated, strict=True):
        _assert_preserved_fields(old, new)
        if (
            new["reviewState"] != "unreviewed"
            or new["disposition"] != "unreviewed"
        ):
            raise AuditValidationError(
                "migration made editorial decision: "
                f"{new['sourceId']}"
            )
    if migrated == before:
        return before
    return migrated
```

Expected: this replacement removes the deliberate legacy-only rejection,
returns an unchanged schema-complete input through the explicit
`already-upgraded` branch, and keeps all preservation and unreviewed checks.

- [ ] **G9.3 — Run `MigrationContractTests.test_migration_is_idempotent` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_is_idempotent -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.4 — `MigrationContractTests.test_migration_creates_one_fixed_genesis_and_is_idempotent`**

```python
class MigrationContractTests(unittest.TestCase):
    def test_migration_creates_one_fixed_genesis_and_is_idempotent(
        self,
    ):
        decisions, ledger = migrate_with_genesis(
            sample_index(),
            [],
            sample_legacy_decisions(),
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
                sample_index(),
                [],
                decisions,
                ledger,
                sample_policy(),
            ),
            (decisions, ledger),
        )
```

Expected: only `MigrationContractTests.test_migration_creates_one_fixed_genesis_and_is_idempotent` is added in this action, and the shown Python block parses.

- [ ] **R9.4 — Run `MigrationContractTests.test_migration_creates_one_fixed_genesis_and_is_idempotent` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_creates_one_fixed_genesis_and_is_idempotent -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `migrate_with_genesis` and proves that exact function or branch contract is not yet present.

- [ ] **I9.4 — Implement `migrate_with_genesis`**

```python
def migrate_with_genesis(
    index,
    visuals,
    decisions,
    ledger,
    policy,
):
    migrated = migrate(index, visuals, decisions)
    baseline_hash = sha256_json(migrated)
    expected = [
        build_genesis_ledger_entry(
            baseline_hash, len(migrated)
        )
    ]
    if ledger not in ([], expected):
        raise AuditValidationError(
            "ledger is not empty or matching genesis"
        )
    validate_editorial_decisions(
        index, visuals, migrated, policy
    )
    return migrated, expected
```

Expected: only `migrate_with_genesis` is added or changed in this action, and the shown Python block parses.

- [ ] **G9.4 — Run `MigrationContractTests.test_migration_creates_one_fixed_genesis_and_is_idempotent` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationContractTests.test_migration_creates_one_fixed_genesis_and_is_idempotent -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.5 — `MigrationPreconditionTests.test_rejects_nonempty_visual_catalog`**

```python
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
```

Expected: only `MigrationPreconditionTests.test_rejects_nonempty_visual_catalog` is added in this action, and the shown Python block parses.

- [ ] **R9.5 — Run `MigrationPreconditionTests.test_rejects_nonempty_visual_catalog` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPreconditionTests.test_rejects_nonempty_visual_catalog -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_migration_preconditions` and proves that exact function or branch contract is not yet present.

- [ ] **I9.5 — Implement the `empty-visual-catalog` branch of `_validate_migration_preconditions`**

```python
def _validate_migration_preconditions(
    visuals,
    decisions,
    expected_source_count,
    expected_unreviewed_count,
):
    if visuals:
        raise AuditValidationError(
            "visual catalog must be empty for baseline migration"
        )
```

Expected: only the empty-visual-catalog branch replaces the bootstrap stub;
wrong source counts and reviewed records still pass this helper, preserving the
next two intended RED states.

- [ ] **G9.5 — Run `MigrationPreconditionTests.test_rejects_nonempty_visual_catalog` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPreconditionTests.test_rejects_nonempty_visual_catalog -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.6 — `MigrationPreconditionTests.test_rejects_wrong_source_count`**

```python
class MigrationPreconditionTests(unittest.TestCase):
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
```

Expected: only `MigrationPreconditionTests.test_rejects_wrong_source_count` is added in this action, and the shown Python block parses.

- [ ] **R9.6 — Run `MigrationPreconditionTests.test_rejects_wrong_source_count` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPreconditionTests.test_rejects_wrong_source_count -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_migration_preconditions` and proves that exact function or branch contract is not yet present.

- [ ] **I9.6 — Implement the `source-count` branch of `_validate_migration_preconditions`**

```python
def _validate_migration_preconditions(
    visuals,
    decisions,
    expected_source_count,
    expected_unreviewed_count,
):
    if visuals:
        raise AuditValidationError(
            "visual catalog must be empty for baseline migration"
        )
    if len(decisions) != expected_source_count:
        raise AuditValidationError(
            "expected source count mismatch"
        )
```

Expected: the source-count branch is now enforced, while a reviewed record with
the correct total still passes this helper and leaves T9.7 genuinely RED.

- [ ] **G9.6 — Run `MigrationPreconditionTests.test_rejects_wrong_source_count` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPreconditionTests.test_rejects_wrong_source_count -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.7 — `MigrationPreconditionTests.test_rejects_reviewed_baseline_record`**

```python
class MigrationPreconditionTests(unittest.TestCase):
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
```

Expected: only `MigrationPreconditionTests.test_rejects_reviewed_baseline_record` is added in this action, and the shown Python block parses.

- [ ] **R9.7 — Run `MigrationPreconditionTests.test_rejects_reviewed_baseline_record` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPreconditionTests.test_rejects_reviewed_baseline_record -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_migration_preconditions` and proves that exact function or branch contract is not yet present.

- [ ] **I9.7 — Implement the `unreviewed-count` branch of `_validate_migration_preconditions`**

```python
def _validate_migration_preconditions(
    visuals,
    decisions,
    expected_source_count,
    expected_unreviewed_count,
):
    if visuals:
        raise AuditValidationError(
            "visual catalog must be empty for baseline migration"
        )
    if len(decisions) != expected_source_count:
        raise AuditValidationError(
            "expected source count mismatch"
        )
    unreviewed = sum(
        row.get("reviewState", "unreviewed") == "unreviewed"
        for row in decisions
    )
    if unreviewed != expected_unreviewed_count:
        raise AuditValidationError(
            "expected unreviewed count mismatch"
        )
```

Expected: the final staged replacement adds only the unreviewed-count branch;
the three preconditions are now complete and the shown Python block parses.

- [ ] **G9.7 — Run `MigrationPreconditionTests.test_rejects_reviewed_baseline_record` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPreconditionTests.test_rejects_reviewed_baseline_record -v
```

Migration path identity is resolved before content loading. The decisions and
ledger in-place self-pairs are the only permitted aliases. Every cross-file
symlink, hardlink, case-fold, and Unicode-normalization alias is rejected.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.8 — `MigrationPathSafetyTests.test_rejects_cross_file_alias_before_read`**

```python
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
```

Expected: only `MigrationPathSafetyTests.test_rejects_cross_file_alias_before_read` is added in this action, and the shown Python block parses.

- [ ] **R9.8 — Run `MigrationPathSafetyTests.test_rejects_cross_file_alias_before_read` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPathSafetyTests.test_rejects_cross_file_alias_before_read -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_validate_migration_paths` and proves that exact function or branch contract is not yet present.

- [ ] **I9.8 — Implement `_validate_migration_paths`**

```python
def _validate_migration_paths(role_paths):
    allowed_pairs = {
        frozenset({"decisionsInput", "decisionsOutput"}),
        frozenset({"ledgerInput", "ledgerOutput"}),
    }
    roles = sorted(role_paths)
    for offset, left in enumerate(roles):
        for right in roles[offset + 1:]:
            if not paths_conflict(
                Path(role_paths[left]),
                Path(role_paths[right]),
            ):
                continue
            if frozenset({left, right}) in allowed_pairs:
                continue
            raise AuditValidationError(
                f"path alias: {left} and {right}"
            )
```

Expected: only `_validate_migration_paths` is added or changed in this action, and the shown Python block parses.

- [ ] **G9.8 — Run `MigrationPathSafetyTests.test_rejects_cross_file_alias_before_read` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationPathSafetyTests.test_rejects_cross_file_alias_before_read -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **T9.9 — `MigrationTransactionTests.test_two_file_migration_rolls_back`**

```python
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
```

Expected: only `MigrationTransactionTests.test_two_file_migration_rolls_back` is added in this action, and the shown Python block parses.

- [ ] **R9.9 — Run `MigrationTransactionTests.test_two_file_migration_rolls_back` and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationTransactionTests.test_two_file_migration_rolls_back -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the failing assertion or traceback names `_write_migration_outputs` and proves that exact function or branch contract is not yet present.

- [ ] **I9.9 — Implement `_write_migration_outputs`**

```python
def _write_migration_outputs(
    decisions_path,
    ledger_path,
    decisions,
    ledger,
):
    write_files_transaction({
        Path(decisions_path): deterministic_json_bytes(decisions),
        Path(ledger_path): deterministic_json_bytes(ledger),
    })
```

Expected: only `_write_migration_outputs` is added or changed in this action, and the shown Python block parses.

- [ ] **G9.9 — Run `MigrationTransactionTests.test_two_file_migration_rolls_back` and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationTransactionTests.test_two_file_migration_rolls_back -v
```

The CLI validates all path identities and both expected counts before content
migration. It computes decisions and the fixed genesis in memory, validates
both candidates, and replaces both formal files with one transaction. Failure
in replacement position 1 or 2 restores both original files byte-for-byte.

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **S9.10A — Add the complete migration parser**

```python
def _build_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True)
    parser.add_argument("--visuals", required=True)
    parser.add_argument("--decisions", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--policy", required=True)
    parser.add_argument(
        "--expected-source-count", required=True, type=int
    )
    parser.add_argument(
        "--expected-unreviewed-count", required=True, type=int
    )
    return parser
```

Expected: the parser exactly matches O9.4 and converts both guard counts to
integers.

- [ ] **S9.10B — Add `_migration_role_paths`**

```python
def _migration_role_paths(args):
    return {
        "index": Path(args.index),
        "visuals": Path(args.visuals),
        "policy": Path(args.policy),
        "decisionsInput": Path(args.decisions),
        "decisionsOutput": Path(args.decisions),
        "ledgerInput": Path(args.ledger),
        "ledgerOutput": Path(args.ledger),
    }
```

Expected: only the two declared in-place input/output pairs share identities.

- [ ] **S9.10C — Add `_run_migration_command`**

```python
def _run_migration_command(args):
    index = load_json(args.index)
    visuals = load_json(args.visuals)
    decisions = load_json(args.decisions)
    ledger = load_json(args.ledger)
    policy = load_json(args.policy)
    _validate_migration_preconditions(
        visuals,
        decisions,
        args.expected_source_count,
        args.expected_unreviewed_count,
    )
    migrated, genesis = migrate_with_genesis(
        index, visuals, decisions, ledger, policy
    )
    _write_migration_outputs(
        args.decisions,
        args.ledger,
        migrated,
        genesis,
    )
    return {
        "status": "migrated",
        "sourceCount": len(migrated),
        "unreviewedCount": sum(
            row["reviewState"] == "unreviewed"
            for row in migrated
        ),
        "decisionsSha256": sha256_json(migrated),
    }
```

Expected: both count guards and both candidate validators run before one
two-target transaction.

- [ ] **T9.10 — `MigrationCliTests.test_o94_parser_dispatch_and_validation_exit_code`**

```python
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
```

Expected: the exact O9.4 vector parses and a pre-read path validation error
returns exit 2.

- [ ] **R9.10 — Run the O9.4 CLI contract and confirm red**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationCliTests.test_o94_parser_dispatch_and_validation_exit_code -v
```

Expected: output contains `Ran 1 test` and either `FAILED` or `ERROR`; the
failure names `main`.

- [ ] **I9.10 — Implement migration `main`**

```python
def main(argv=None):
    args = _build_parser().parse_args(argv)
    try:
        _validate_migration_paths(_migration_role_paths(args))
        result = _run_migration_command(args)
        print(json.dumps(
            result, ensure_ascii=False, sort_keys=True
        ))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

Expected: path identities are validated before loading, successful migration
returns 0 with deterministic JSON, and every validation failure returns 2.

- [ ] **G9.10 — Re-run the O9.4 CLI contract and confirm green**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline.MigrationCliTests.test_o94_parser_dispatch_and_validation_exit_code -v
```

Expected: output contains `Ran 1 test` and ends with `OK`.

- [ ] **O9.1 — Record the three pre-migration fingerprints in the task evidence log**

```bash
evidence_path=docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md
mkdir -p "$(dirname "$evidence_path")"
printf '\n## Pre-migration fingerprints\n\n' | tee -a "$evidence_path"
shasum -a 256 reference/原始文档.pdf reference/source-audit/source-index.json reference/source-audit/coverage-decisions.json | tee -a "$evidence_path"
```

The PDF output must contain:
`27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`.
Save the complete command output under
`docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md`.

Expected: the evidence log contains all three 64-character hashes, including the approved PDF hash above; no formal source file changes.

- [ ] **O9.2 — Create only `reference/source-audit/unnumbered-visuals.json`.**

Use `apply_patch` to create the file with exactly:

```json
[]
```

Expected: `reference/source-audit/unnumbered-visuals.json` contains exactly an empty JSON array plus one final newline.

- [ ] **O9.3 — Create only `reference/source-audit/review-ledger.json`.**

Use `apply_patch` to create the file with exactly:

```json
[]
```

Expected: `reference/source-audit/review-ledger.json` contains exactly an empty JSON array plus one final newline.

- [ ] **O9.4 — Run the guarded 834-record migration**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.migrate_editorial_baseline --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --expected-source-count 834 --expected-unreviewed-count 834
```

The result contains 834 `unreviewed` records, no course or visual decision, and
one fixed genesis whose base and accepted hashes both equal the migrated
decisions SHA-256.

Expected: exit 0; decisions contain exactly 834 sorted `unreviewed` records, and the ledger contains one fixed genesis whose two decision hashes equal the migrated decisions SHA-256.

- [ ] **O9.5 — Generate the two reports for deterministic pass one**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_reports --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --unnumbered-visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --review-ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --coverage-report reference/source-audit/source-coverage-matrix.md --visual-report reference/source-audit/visual-asset-index.md
```

Expected: exit 0; both Markdown reports exist, end with one newline, and contain the 834-source migrated baseline without claiming Stage A completion.

- [ ] **O9.6 — Record the pass-one report hashes**

```bash
evidence_path=docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md
pass_one_path=tmp/source-audit/baseline-migration-report-pass-one.sha256
mkdir -p "$(dirname "$pass_one_path")"
printf '\n## Migration report pass one\n\n' | tee -a "$evidence_path"
shasum -a 256 reference/source-audit/source-coverage-matrix.md reference/source-audit/visual-asset-index.md | tee "$pass_one_path" | tee -a "$evidence_path"
```

Expected: two 64-character lowercase SHA-256 values are recorded both in the
tracked evidence and in the exact temporary comparison baseline.

- [ ] **O9.7 — Generate the two reports for deterministic pass two**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_reports --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --unnumbered-visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --review-ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --coverage-report reference/source-audit/source-coverage-matrix.md --visual-report reference/source-audit/visual-asset-index.md
```

Expected: exit 0; both reports are regenerated from the same formal inputs without changing any other file.

- [ ] **O9.8 — Record the pass-two report hashes and compare them with pass one**

```bash
set -o pipefail
evidence_path=docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md
pass_one_path=tmp/source-audit/baseline-migration-report-pass-one.sha256
test -s "$pass_one_path"
printf '\n## Migration report pass two\n\n' | tee -a "$evidence_path"
shasum -a 256 reference/source-audit/source-coverage-matrix.md reference/source-audit/visual-asset-index.md | tee -a "$evidence_path" | diff -u "$pass_one_path" -
```

Expected: exit 0 and no diff output. A missing pass-one baseline or either
changed report hash produces a nonzero exit and stops Task 9.

- [ ] **Task 9 focused gate — run migration tests**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest tests.source_audit.test_migrate_editorial_baseline -v
```

Expected: every named focused test module passes and unittest output ends with `OK`.

- [ ] **Task 9 full-suite gate — run the complete repository test suite.**

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: the complete repository suite passes and unittest output ends with `OK`.

- [ ] **Task 9 fingerprint gate — verify the immutable PDF and source-index hashes.**

```bash
printf '%s\n' \
  '27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac  reference/原始文档.pdf' \
  '101c5adc73073a0afb3b4dd08d0fa7b6b56a9aa8a611b2ff6a95c87a75b220ce  reference/source-audit/source-index.json' \
  | shasum -a 256 -c -
```

Expected: exit 0 and both lines end with `OK`. Either protected file mismatch
returns nonzero; the source-index value is the fixed pre-migration O9.1 hash.

- [ ] **Task 9 whitespace gate — check the complete working diff.**

```bash
git diff --check
```

Expected: no output and exit 0.

- [ ] **Task 9 commit — record the approved baseline migration**

```bash
git add scripts/source_audit/migrate_editorial_baseline.py tests/source_audit/test_migrate_editorial_baseline.py reference/source-audit/unnumbered-visuals.json reference/source-audit/review-ledger.json reference/source-audit/coverage-decisions.json reference/source-audit/source-coverage-matrix.md reference/source-audit/visual-asset-index.md docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/baseline-migration.md
git commit -m "data: migrate editorial review baseline"
```

Expected: one local Task commit is created with the stated message; no remote write occurs.

### Task 10: Execute and accept the calibration batch

**Files:**
- Modify: `reference/source-audit/unnumbered-visuals.json`
- Modify: `reference/source-audit/coverage-decisions.json`
- Modify: `reference/source-audit/review-ledger.json`
- Modify: `reference/source-audit/source-coverage-matrix.md`
- Modify: `reference/source-audit/visual-asset-index.md`
- Modify: `06-开发计划与验收标准.md`
- Create: `docs/superpowers/plans/2026-07-31-source-editorial-review-execution.md`
- Create: `docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/calibration-acceptance.md`
- Temporary: `tmp/pdfs/source-audit/`
- Temporary: `tmp/source-audit/discovery/calibration/`
- Temporary: `tmp/source-audit/review-packages/calibration/`
- Temporary: `tmp/source-audit/review-freezes/`
- Temporary: `tmp/source-audit/review-patches/calibration/`

**Interfaces:**
- Consumes: completed Tasks 1–9 and the actual PDF pages.
- Produces: one accepted, double-blind, 30–40-item review batch and the real
  inputs needed for the full-book editorial execution plan.
- Requires the read-only CLI:
  `python3 -m scripts.source_audit.integrate_review_batch validate-resolution`.
  Task 7 must implement and test this interface before Task 10 begins. It must
  run the same freeze, patch, resolution, candidate-decision, candidate-ledger,
  and candidate-report validation as `apply`, print deterministic JSON, and
  write no formal or temporary output.
- Steps 10.60–10.76 are root-controller-only. The canonical controller must be
  `/root`; a nested controller stops and hands Task 10 back to `/root` before
  dispatch. Therefore the two spawned reviewer task IDs are exactly
  `/root/calibration_primary` and `/root/calibration_secondary`.

#### Discovery-patch evidence contract

Every page patch has exactly these top-level fields:
`pdfPage`, `reviewer`, `attempt`, `numberedVisualIds`, `visuals`, and
`symbolReview`. Use reviewer `visual-scanner-a` and attempt `1` for this first
complete scan. `visuals` and `symbolReview` must contain literal observations
from the immediately preceding full-resolution inspection; never put a
placeholder in a patch.

The generated index fixes the process-only `numberedVisualIds` values:

| PDF page | Exact `numberedVisualIds` |
|---:|---|
| 10 | `["figure-0-1"]` |
| 20 | `["figure-1-2"]` |
| 32 | `[]` |
| 35 | `[]` |
| 52 | `[]` |
| 81 | `["figure-3-2"]` |
| 239 | `[]` |
| 240 | `["figure-8-3", "table-8-2"]` |
| 279 | `["figure-10-1", "table-10-1"]` |
| 15 | `[]` |
| 26 | `[]` |
| 27 | `[]` |

For page 239, if full-resolution inspection confirms no unnumbered visual, use
this exact patch:

```json
{
  "pdfPage": 239,
  "reviewer": "visual-scanner-a",
  "attempt": 1,
  "numberedVisualIds": [],
  "visuals": [],
  "symbolReview": [
    {
      "symbol": "★",
      "observedCount": 2,
      "semanticAssignments": [
        {
          "targetRef": "experiment-8-1",
          "count": 2,
          "meaning": "实验难度：两星"
        }
      ],
      "nonSemanticCount": 0,
      "note": "两枚星均表示实验难度"
    }
  ]
}
```

If inspection finds an unnumbered visual on page 239, replace only the empty
`visuals` array with the complete literal rows before applying the patch.

#### Prepare working directories

- [ ] **Step 10.1 — Create the Task 10 working and evidence directories.**

Run:

```bash
mkdir -p tmp/pdfs/source-audit tmp/source-audit/discovery/calibration tmp/source-audit/review-packages/calibration tmp/source-audit/review-freezes tmp/source-audit/review-patches/calibration docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration
```

Expected: exit 0; all six directories exist; no formal source file changes.

#### Page 10 — six actions

- [ ] **Step 10.2 — Render only PDF page 10.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 10 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-010.png` exists.

- [ ] **Step 10.3 — Verify the page-010 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-010.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.4 — Inspect page 10 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-010.png
```

Expected: the full page opens; the inspection records every numbered,
unnumbered, decorative, and symbolic visual and confirms
`numberedVisualIds=["figure-0-1"]`.

- [ ] **Step 10.5 — Author only the page-010 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-010.json` with the exact field set,
reviewer, attempt, numbered IDs, and literal observations above.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.6 — Apply only the page-010 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-010.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-010 discovery entry is appended atomically.

- [ ] **Step 10.7 — Verify page-010 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=10; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-010.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-010"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-010 discovery verified")'
```

Expected: `page-010 discovery verified`.

#### Page 20 — six actions

- [ ] **Step 10.8 — Render only PDF page 20.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 20 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-020.png` exists.

- [ ] **Step 10.9 — Verify the page-020 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-020.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.10 — Inspect page 20 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-020.png
```

Expected: the full page opens; the inspection records every visual and symbol
and confirms `numberedVisualIds=["figure-1-2"]`.

- [ ] **Step 10.11 — Author only the page-020 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-020.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.12 — Apply only the page-020 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-020.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-020 discovery entry is appended atomically.

- [ ] **Step 10.13 — Verify page-020 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=20; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-020.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-020"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-020 discovery verified")'
```

Expected: `page-020 discovery verified`.

#### Page 32 — six actions

- [ ] **Step 10.14 — Render only PDF page 32.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 32 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-032.png` exists.

- [ ] **Step 10.15 — Verify the page-032 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-032.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.16 — Inspect page 32 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-032.png
```

Expected: the full page opens; every visual and symbol is recorded and
`numberedVisualIds=[]`.

- [ ] **Step 10.17 — Author only the page-032 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-032.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.18 — Apply only the page-032 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-032.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-032 discovery entry is appended atomically.

- [ ] **Step 10.19 — Verify page-032 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=32; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-032.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-032"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-032 discovery verified")'
```

Expected: `page-032 discovery verified`.

#### Page 35 — six actions

- [ ] **Step 10.20 — Render only PDF page 35.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 35 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-035.png` exists.

- [ ] **Step 10.21 — Verify the page-035 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-035.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.22 — Inspect page 35 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-035.png
```

Expected: the full page opens; every visual and symbol is recorded and
`numberedVisualIds=[]`.

- [ ] **Step 10.23 — Author only the page-035 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-035.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.24 — Apply only the page-035 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-035.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-035 discovery entry is appended atomically.

- [ ] **Step 10.25 — Verify page-035 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=35; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-035.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-035"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-035 discovery verified")'
```

Expected: `page-035 discovery verified`.

#### Page 52 — six actions

- [ ] **Step 10.26 — Render only PDF page 52.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 52 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-052.png` exists.

- [ ] **Step 10.27 — Verify the page-052 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-052.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.28 — Inspect page 52 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-052.png
```

Expected: the full page opens; every visual and symbol is recorded and
`numberedVisualIds=[]`.

- [ ] **Step 10.29 — Author only the page-052 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-052.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.30 — Apply only the page-052 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-052.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-052 discovery entry is appended atomically.

- [ ] **Step 10.31 — Verify page-052 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=52; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-052.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-052"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-052 discovery verified")'
```

Expected: `page-052 discovery verified`.

#### Page 81 — six actions

- [ ] **Step 10.32 — Render only PDF page 81.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 81 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-081.png` exists.

- [ ] **Step 10.33 — Verify the page-081 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-081.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.34 — Inspect page 81 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-081.png
```

Expected: the full page opens; every visual and symbol is recorded and
`numberedVisualIds=["figure-3-2"]`.

- [ ] **Step 10.35 — Author only the page-081 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-081.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.36 — Apply only the page-081 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-081.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-081 discovery entry is appended atomically.

- [ ] **Step 10.37 — Verify page-081 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=81; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-081.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-081"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-081 discovery verified")'
```

Expected: `page-081 discovery verified`.

#### Page 239 — six actions

- [ ] **Step 10.38 — Render only PDF page 239.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 239 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-239.png` exists.

- [ ] **Step 10.39 — Verify the page-239 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-239.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.40 — Inspect page 239 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-239.png
```

Expected: the full page opens; `numberedVisualIds=[]`; both `★` symbols belong
to `experiment-8-1` and mean `实验难度：两星`; every unnumbered visual is
recorded.

- [ ] **Step 10.41 — Author only the page-239 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-239.json`. Use the exact page-239
JSON above if inspection confirms no unnumbered visual; otherwise add only the
literal observed visual rows.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.42 — Apply only the page-239 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-239.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-239 discovery entry is appended atomically.

- [ ] **Step 10.43 — Verify page-239 discovery and star ownership.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=239; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-239.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-239"); experiment=next(x for x in decisions if x["sourceId"]=="experiment-8-1"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); assert any(x["symbol"]=="★" and x["pdfPage"]==239 and x["meaning"]=="实验难度：两星" for x in experiment["symbolTextAlternatives"]); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-239 discovery verified")'
```

Expected: `page-239 discovery verified`.

#### Page 240 — six actions

- [ ] **Step 10.44 — Render only PDF page 240.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 240 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-240.png` exists.

- [ ] **Step 10.45 — Verify the page-240 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-240.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.46 — Inspect page 240 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-240.png
```

Expected: the full page opens; every visual and symbol is recorded;
`numberedVisualIds=["figure-8-3", "table-8-2"]`; `figure-8-3` remains on PDF
page 240.

- [ ] **Step 10.47 — Author only the page-240 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-240.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.48 — Apply only the page-240 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-240.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-240 discovery entry is appended atomically.

- [ ] **Step 10.49 — Verify page-240 discovery closure and figure ownership.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=240; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-240.json").read_text()); index=json.loads(Path("reference/source-audit/source-index.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-240"); figure=next(x for x in index["numberedItems"] if x["sourceId"]=="figure-8-3"); assert figure["pdfPage"]==240; assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-240 discovery verified")'
```

Expected: `page-240 discovery verified`.

#### Page 279 — six actions

- [ ] **Step 10.50 — Render only PDF page 279.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 279 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-279.png` exists.

- [ ] **Step 10.51 — Verify the page-279 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-279.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.52 — Inspect page 279 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-279.png
```

Expected: the full page opens; every visual and symbol is recorded and
`numberedVisualIds=["figure-10-1", "table-10-1"]`.

- [ ] **Step 10.53 — Author only the page-279 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-279.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.54 — Apply only the page-279 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-279.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-279 discovery entry is appended atomically.

- [ ] **Step 10.55 — Verify page-279 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=279; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-279.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-279"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); tail=ledger[-1]; assert (tail["entryType"],tail["pdfPage"],tail["attempt"],tail["reviewer"])==("discovery",n,patch["attempt"],patch["reviewer"]); print("page-279 discovery verified")'
```

Expected: `page-279 discovery verified`.

#### Calibration selection and conditional fallback pages

- [ ] **Step 10.56 — Run the calibration selector after the nine initial pages.**

Run:

```bash
set -o pipefail
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_review_packages --batch-id calibration-001 --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --policy reference/source-audit/editorial-policy.json --mode calibration --selection-only | tee tmp/source-audit/review-patches/calibration/selection-after-initial.json
```

Expected: exit 0 with 30–40 sources, or documented exit 3 requiring page 15.
The deterministic JSON is saved as the branch record. Any other result stops
the task.

The following fallback subsection becomes executable only if the immediately
preceding selector exits 3. When a selector exits 0, leave every later fallback
checkbox untouched and use the corresponding `selection-after-*.json` as the
branch record. Never delete, rewrite, or mark conditional steps in Plan 1.

##### Fallback page 15 — seven actions when required

- [ ] **Step 10.F15.1 — Render only PDF page 15.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 15 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-015.png` exists.

- [ ] **Step 10.F15.2 — Verify the page-015 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-015.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.F15.3 — Inspect page 15 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-015.png
```

Expected: every visual and symbol is recorded and `numberedVisualIds=[]`.

- [ ] **Step 10.F15.4 — Author only the page-015 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-015.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.F15.5 — Apply only the page-015 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-015.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-015 discovery entry is appended atomically.

- [ ] **Step 10.F15.6 — Verify page-015 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=15; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-015.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-015"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); assert ledger[-1]["pdfPage"]==n; print("page-015 discovery verified")'
```

Expected: `page-015 discovery verified`.

- [ ] **Step 10.F15.7 — Rerun the selector after page 15.**

Run:

```bash
set -o pipefail
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_review_packages --batch-id calibration-001 --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --policy reference/source-audit/editorial-policy.json --mode calibration --selection-only | tee tmp/source-audit/review-patches/calibration/selection-after-page-015.json
```

Expected: exit 0 with 30–40 sources, or exit 3 requiring page 26.

##### Fallback page 26 — seven actions only when page-15 selection still exits 3

- [ ] **Step 10.F26.1 — Render only PDF page 26.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 26 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-026.png` exists.

- [ ] **Step 10.F26.2 — Verify the page-026 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-026.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.F26.3 — Inspect page 26 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-026.png
```

Expected: every visual and symbol is recorded and `numberedVisualIds=[]`.

- [ ] **Step 10.F26.4 — Author only the page-026 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-026.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.F26.5 — Apply only the page-026 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-026.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-026 discovery entry is appended atomically.

- [ ] **Step 10.F26.6 — Verify page-026 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=26; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-026.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-026"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); assert ledger[-1]["pdfPage"]==n; print("page-026 discovery verified")'
```

Expected: `page-026 discovery verified`.

- [ ] **Step 10.F26.7 — Rerun the selector after page 26.**

Run:

```bash
set -o pipefail
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_review_packages --batch-id calibration-001 --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --policy reference/source-audit/editorial-policy.json --mode calibration --selection-only | tee tmp/source-audit/review-patches/calibration/selection-after-page-026.json
```

Expected: exit 0 with 30–40 sources, or exit 3 requiring page 27.

##### Fallback page 27 — seven actions only when page-26 selection still exits 3

- [ ] **Step 10.F27.1 — Render only PDF page 27.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.render_review_pages --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --output-dir tmp/pdfs/source-audit --pages 27 --dpi 144
```

Expected: exit 0 and `tmp/pdfs/source-audit/page-027.png` exists.

- [ ] **Step 10.F27.2 — Verify the page-027 PNG signature and print its SHA-256.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'from pathlib import Path; import hashlib; p=Path("tmp/pdfs/source-audit/page-027.png"); b=p.read_bytes(); assert b[:8] == b"\x89PNG\r\n\x1a\n"; print(hashlib.sha256(b).hexdigest())'
```

Expected: one 64-character lowercase SHA-256 and exit 0.

- [ ] **Step 10.F27.3 — Inspect page 27 at full resolution.**

Run:

```bash
open -a Preview tmp/pdfs/source-audit/page-027.png
```

Expected: every visual and symbol is recorded and `numberedVisualIds=[]`.

- [ ] **Step 10.F27.4 — Author only the page-027 discovery patch.**

Use `apply_patch` to create
`tmp/source-audit/discovery/calibration/page-027.json` with literal observations.

Expected: one complete JSON object, no placeholders, and no other file edit.

- [ ] **Step 10.F27.5 — Apply only the page-027 discovery patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch discover --patch tmp/source-audit/discovery/calibration/page-027.json --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json
```

Expected: exit 0; one page-027 discovery entry is appended atomically.

- [ ] **Step 10.F27.6 — Verify page-027 discovery closure.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; n=27; patch=json.loads(Path("tmp/source-audit/discovery/calibration/page-027.json").read_text()); decisions=json.loads(Path("reference/source-audit/coverage-decisions.json").read_text()); visuals=json.loads(Path("reference/source-audit/unnumbered-visuals.json").read_text()); ledger=json.loads(Path("reference/source-audit/review-ledger.json").read_text()); page=next(x for x in decisions if x["sourceId"]=="page-027"); assert page["reviewState"]=="unreviewed"; assert page["visualReviewState"]=="reviewed"; assert page["visualReviewer"]==patch["reviewer"]; assert page["discoveredVisualIds"]==sorted(x["sourceId"] for x in visuals if x["pdfPage"]==n); assert ledger[-1]["pdfPage"]==n; print("page-027 discovery verified")'
```

Expected: `page-027 discovery verified`.

- [ ] **Step 10.F27.7 — Run the final selector after page 27.**

Run:

```bash
set -o pipefail
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_review_packages --batch-id calibration-001 --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --policy reference/source-audit/editorial-policy.json --mode calibration --selection-only | tee tmp/source-audit/review-patches/calibration/selection-after-page-027.json
```

Expected: exit 0 with 30–40 unique unreviewed source IDs. Exit 3 or a count over
40 stops Task 10; do not freeze.

#### Build, freeze, and verify — one command per action

- [ ] **Step 10.57 — Build the calibration review package.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.build_review_packages --batch-id calibration-001 --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --mode calibration --image-dir tmp/pdfs/source-audit --output-dir tmp/source-audit/review-packages/calibration
```

Expected: exit 0; deterministic bundles, policy snapshot, and manifest exist.

- [ ] **Step 10.58 — Freeze the calibration batch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch freeze --manifest tmp/source-audit/review-packages/calibration/manifest.json --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --output tmp/source-audit/review-freezes/calibration.json
```

Expected: exit 0 and one self-hashed `calibration.json` exists.

- [ ] **Step 10.59 — Verify the frozen batch without writing.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.prepare_review_batch verify --freeze tmp/source-audit/review-freezes/calibration.json --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --image-dir tmp/pdfs/source-audit --package-dir tmp/source-audit/review-packages/calibration
```

Expected: exit 0; all source IDs are unreviewed, every selected page is
scan-complete, all frozen hashes match, and no file changes.

#### Dispatch and collect the two blind reviews

Use these exact handoffs:

```text
Primary handoff
Task name: calibration_primary
Reviewer ID: reviewer-a
Reviewer task ID: /root/calibration_primary
Read only tmp/source-audit/review-freezes/calibration.json plus the exact
project-relative paths in its pageBundles[*].path, pageImages[*].path, and
policySnapshotPath fields. Confirm every frozen hash before judging. Do not
read any reviewer-b path. Write one complete full-record patch for every frozen
source ID only to
tmp/source-audit/review-patches/calibration/reviewer-a.json. Do not modify a
formal file.
```

```text
Secondary handoff
Task name: calibration_secondary
Reviewer ID: reviewer-b
Reviewer task ID: /root/calibration_secondary
Read only tmp/source-audit/review-freezes/calibration.json plus the exact
project-relative paths in its pageBundles[*].path, pageImages[*].path, and
policySnapshotPath fields. Confirm every frozen hash before judging. Do not
read any reviewer-a path. Write one complete full-record patch for every frozen
source ID only to
tmp/source-audit/review-patches/calibration/reviewer-b.json. Do not modify a
formal file.
```

- [ ] **Step 10.60 — Dispatch only the primary reviewer.**

Tool call:

```text
spawn_agent(task_name="calibration_primary", fork_turns="none", message="Reviewer ID: reviewer-a. Reviewer task ID: /root/calibration_primary. Read only tmp/source-audit/review-freezes/calibration.json plus the exact project-relative paths in its pageBundles[*].path, pageImages[*].path, and policySnapshotPath fields. Confirm every frozen hash before judging. Do not read any reviewer-b path. Write one complete full-record patch for every frozen source ID only to tmp/source-audit/review-patches/calibration/reviewer-a.json. Do not modify a formal file.")
```

Expected: `/root/calibration_primary` is running with no access to reviewer-b
output.

- [ ] **Step 10.61 — Dispatch only the secondary reviewer.**

Tool call:

```text
spawn_agent(task_name="calibration_secondary", fork_turns="none", message="Reviewer ID: reviewer-b. Reviewer task ID: /root/calibration_secondary. Read only tmp/source-audit/review-freezes/calibration.json plus the exact project-relative paths in its pageBundles[*].path, pageImages[*].path, and policySnapshotPath fields. Confirm every frozen hash before judging. Do not read any reviewer-a path. Write one complete full-record patch for every frozen source ID only to tmp/source-audit/review-patches/calibration/reviewer-b.json. Do not modify a formal file.")
```

Expected: `/root/calibration_secondary` is running with no access to reviewer-a
output.

- [ ] **Step 10.62 — Wait until both blind reviewers finish, in either order.**

Run one bounded collection round. Issue the second `wait_agent` call only when
either exact reviewer is still running after the first status check; never issue
a third wait from this checkbox:

```text
wait_agent(timeout_ms=60000)
list_agents(path_prefix="/root/calibration_primary")
list_agents(path_prefix="/root/calibration_secondary")

Only if either exact task is still running:
wait_agent(timeout_ms=60000)
list_agents(path_prefix="/root/calibration_primary")
list_agents(path_prefix="/root/calibration_secondary")
```

Expected: both exact canonical tasks report `completed`, and the two delivered
final notifications name those exact task paths. Ignore updates from every other
sender. If either task is still running after the second poll, stop Task 10,
leave this checkbox unchecked, and report the bounded-wait blocker. Arrival
order is irrelevant; do not open either patch until both bound final
notifications have arrived.

- [ ] **Step 10.63 — Syntax-check only the primary patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool tmp/source-audit/review-patches/calibration/reviewer-a.json >/dev/null
```

Expected: exit 0 and no formal file change.

- [ ] **Step 10.64 — Syntax-check only the secondary patch.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool tmp/source-audit/review-patches/calibration/reviewer-b.json >/dev/null
```

Expected: exit 0 and no formal file change.

- [ ] **Step 10.65 — Verify root-bound reviewer identities and complete coverage.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -c 'import json; from pathlib import Path; freeze=json.loads(Path("tmp/source-audit/review-freezes/calibration.json").read_text()); a=json.loads(Path("tmp/source-audit/review-patches/calibration/reviewer-a.json").read_text()); b=json.loads(Path("tmp/source-audit/review-patches/calibration/reviewer-b.json").read_text()); expected=set(freeze["sourceIds"]); assert (a["reviewer"],a["reviewerTaskId"])==("reviewer-a","/root/calibration_primary"); assert (b["reviewer"],b["reviewerTaskId"])==("reviewer-b","/root/calibration_secondary"); assert {row["sourceId"] for row in a["changes"]}==expected; assert {row["sourceId"] for row in b["changes"]}==expected; print("blind reviewer identities and coverage verified")'
```

Expected: `blind reviewer identities and coverage verified`; reviewer IDs and
task IDs are pairwise different, and both patches cover the frozen source set.

#### Compare and resolve real disagreements

- [ ] **Step 10.66 — Run the read-only patch comparator.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.integrate_review_batch compare --freeze tmp/source-audit/review-freezes/calibration.json --primary-patch tmp/source-audit/review-patches/calibration/reviewer-a.json --secondary-patch tmp/source-audit/review-patches/calibration/reviewer-b.json --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --image-dir tmp/pdfs/source-audit --package-dir tmp/source-audit/review-packages/calibration --disagreements-output tmp/source-audit/review-patches/calibration/disagreements.json --resolution-output tmp/source-audit/review-patches/calibration/resolution.json
```

Expected: exit 0; deterministic disagreement and resolution-skeleton JSON;
no formal file write.

The following is a **temporary-worklist expansion template**. Never copy it
into or otherwise modify Plan 1. After Step 10.66, sort the literal `sourceId`
values in `disagreements.json`. Use `apply_patch` to create
`tmp/source-audit/review-patches/calibration/disagreement-worklist.md`; for each
real row, copy this template into that temporary file, replace every token with
literal data, convert the five lines to checkboxes, execute them, and mark them
there. If there are zero disagreements, create the temporary worklist with a
literal `No disagreements.` record and no checkbox. The completed worklist is
execution evidence summarized in the tracked acceptance evidence.

```text
D-<SOURCE_ID>-1 — Print only the <SOURCE_ID> disagreement row.
Command: python3 -c with the literal source ID and disagreements.json.
Expected: exactly one row and its literal differing fields.

D-<SOURCE_ID>-2 — Inspect only the primary and secondary complete records for
<SOURCE_ID>.
Command: python3 -c with the literal source ID and the two patch paths.
Expected: both complete records and no write.

D-<SOURCE_ID>-3 — Inspect only the frozen page image and full-text bundle for
<SOURCE_ID>.
Command: open -a Preview <literal page-image path from the frozen bundle>.
Expected: the evidence for that one source is visible.

D-<SOURCE_ID>-4 — Fill only that row's finalRecord using apply_patch.
Rule: copy every agreed field byte-for-byte and change only the literal fields
listed by the disagreement row.
Expected: one non-null complete finalRecord; reviewer patches unchanged.

D-<SOURCE_ID>-5 — Fill only that row's resolutionNote and, when evidence proves
one, its criticalOmissions row using apply_patch.
Expected: one nonblank evidence-based note; no unrelated resolution row changes.
```

- [ ] **Step 10.67 — Validate the completed resolution document without writing.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.integrate_review_batch validate-resolution --freeze tmp/source-audit/review-freezes/calibration.json --primary-patch tmp/source-audit/review-patches/calibration/reviewer-a.json --secondary-patch tmp/source-audit/review-patches/calibration/reviewer-b.json --resolution tmp/source-audit/review-patches/calibration/resolution.json --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --image-dir tmp/pdfs/source-audit --package-dir tmp/source-audit/review-packages/calibration --json
```

Expected: exit 0; deterministic JSON containing
`status="valid"`, `batchId="calibration-001"`, and disagreement and critical
omission counts equal to the two temporary artifacts; no file changes.

#### Apply and accept

- [ ] **Step 10.68 — Apply the validated calibration batch atomically.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.integrate_review_batch apply --freeze tmp/source-audit/review-freezes/calibration.json --primary-patch tmp/source-audit/review-patches/calibration/reviewer-a.json --secondary-patch tmp/source-audit/review-patches/calibration/reviewer-b.json --resolution tmp/source-audit/review-patches/calibration/resolution.json --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --image-dir tmp/pdfs/source-audit --package-dir tmp/source-audit/review-packages/calibration --coverage-report reference/source-audit/source-coverage-matrix.md --visual-report reference/source-audit/visual-asset-index.md
```

Expected: exit 0; exactly one accepted `calibration-001` ledger tail; decisions,
ledger, coverage report, and visual report change in one rollback-capable
transaction.

- [ ] **Step 10.69 — Run the independent calibration acceptance verifier.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m scripts.source_audit.verify_calibration_acceptance --freeze tmp/source-audit/review-freezes/calibration.json --pdf reference/原始文档.pdf --index reference/source-audit/source-index.json --visuals reference/source-audit/unnumbered-visuals.json --decisions reference/source-audit/coverage-decisions.json --ledger reference/source-audit/review-ledger.json --policy reference/source-audit/editorial-policy.json --analysis reference/book-analysis.md --course-outline 02-课程大纲.md --image-dir tmp/pdfs/source-audit --package-dir tmp/source-audit/review-packages/calibration --review-evidence-root tmp/source-audit --json
```

Expected: exit 0 and deterministic acceptance JSON proving 30–40 assigned IDs,
100% independent double review, exact unreviewed delta, frozen page equality,
ledger-tail equality, and protected review-evidence loading from
`tmp/source-audit/review-freezes` and `tmp/source-audit/review-patches`.

- [ ] **Step 10.70 — Run the complete automated test suite.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: every test passes with zero warnings promoted to errors.

- [ ] **Step 10.71 — Recheck the protected PDF and source-index hashes.**

Run:

```bash
printf '%s\n' \
  '27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac  reference/原始文档.pdf' \
  '101c5adc73073a0afb3b4dd08d0fa7b6b56a9aa8a611b2ff6a95c87a75b220ce  reference/source-audit/source-index.json' \
  | shasum -a 256 -c -
```

Expected: exit 0 and both protected paths end with `OK`; either mismatch exits
nonzero and blocks acceptance.

- [ ] **Step 10.72 — Check the working diff for whitespace errors.**

Run:

```bash
git diff --check
```

Expected: no output and exit 0.

#### Independent final review

- [ ] **Step 10.73 — Dispatch only the final spec-compliance reviewer.**

Tool call:

```text
spawn_agent(task_name="calibration_spec_review", fork_turns="all", message="Canonical reviewer task ID: /root/calibration_spec_review. Read-only review the completed branch against docs/superpowers/specs/2026-07-31-source-editorial-review-design.md and this implementation plan. Inspect all changed files and real calibration evidence. If and only if P0=P1=P2=0, return exactly PASS — no P0-P2. Otherwise return the findings and never include PASS. Do not edit files.")
```

Expected: one independent spec-review task is running.

- [ ] **Step 10.74 — Collect only the final spec-compliance result.**

Run one bounded collection round. An unrelated agent update does not satisfy
this gate. Issue the second wait only if the exact spec task remains running:

```text
wait_agent(timeout_ms=60000)
list_agents(path_prefix="/root/calibration_spec_review")

Only if the exact task is still running:
wait_agent(timeout_ms=60000)
list_agents(path_prefix="/root/calibration_spec_review")
```

Expected: `/root/calibration_spec_review` is `completed`, and the delivered
final notification has `Task name: /root/calibration_spec_review` with payload
exactly `PASS — no P0-P2`. Ignore every other sender. A finding, variant payload,
or target still running after the second poll stops Task 10 and leaves this
checkbox unchecked; no third wait or loop is allowed.

- [ ] **Step 10.75 — Dispatch only the final code-quality reviewer.**

Tool call:

```text
spawn_agent(task_name="calibration_quality_review", fork_turns="all", message="Canonical reviewer task ID: /root/calibration_quality_review. Read-only review every changed implementation and test file for correctness, unittest collection, deterministic output, path alias safety, rollback behavior, and command/interface consistency. If and only if P0=P1=P2=0, return exactly PASS — no P0-P2. Otherwise return the findings and never include PASS. Do not edit files.")
```

Expected: one independent code-quality task is running.

- [ ] **Step 10.76 — Collect only the final code-quality result.**

Run one bounded collection round. An unrelated agent update does not satisfy
this gate. Issue the second wait only if the exact quality task remains running:

```text
wait_agent(timeout_ms=60000)
list_agents(path_prefix="/root/calibration_quality_review")

Only if the exact task is still running:
wait_agent(timeout_ms=60000)
list_agents(path_prefix="/root/calibration_quality_review")
```

Expected: `/root/calibration_quality_review` is `completed`, and the delivered
final notification has `Task name: /root/calibration_quality_review` with
payload exactly `PASS — no P0-P2`. Ignore every other sender. A finding, variant
payload, or target still running after the second poll stops Task 10 and leaves
this checkbox unchecked; no third wait or loop is allowed.

- [ ] **Step 10.77 — Refresh the calibration acceptance evidence.**

Use `apply_patch` to create or update only
`docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/calibration-acceptance.md`
with the verifier JSON, protected hashes, final source/review counts,
disagreement rate, critical omissions, escalations, test result, and both PASS
reviews. Also record the executed `selection-after-*.json` branch artifacts and
the completed disagreement-worklist outcome; do not copy temporary checkboxes
into Plan 1.

Expected: every recorded value comes from the accepted artifacts; no guessed
count or ID.

- [ ] **Step 10.78 — Update the Stage A execution status without closing Stage A.**

Use `apply_patch` to update only `06-开发计划与验收标准.md` with the accepted
calibration source count, remaining unreviewed count, disagreement/escalation
outcome, and the fact that full-book review remains open.

Expected: no Stage A completion checkbox is marked complete.

- [ ] **Step 10.79 — Commit only the accepted calibration data and status.**

Run:

```bash
git add reference/source-audit/unnumbered-visuals.json reference/source-audit/coverage-decisions.json reference/source-audit/review-ledger.json reference/source-audit/source-coverage-matrix.md reference/source-audit/visual-asset-index.md 06-开发计划与验收标准.md docs/superpowers/evidence/2026-07-31-source-editorial-review-tooling-and-calibration/calibration-acceptance.md
git commit -m "data: accept source review calibration batch"
```

Expected: one local commit; no remote push.

#### Generate and commit Plan 2

- [ ] **Step 10.80 — Create Plan 2 from accepted evidence.**

Use the `superpowers:writing-plans` skill and `apply_patch` to create only
`docs/superpowers/plans/2026-07-31-source-editorial-review-execution.md`.
Its first blocking engineering task implements and accepts the deterministic
normal-batch selector. Its real batch tasks use the accepted remaining IDs,
5–15-page or 20–40-item bounds, calibrated strata, and no-overwrite rules. It
must finish all 314 scans, all 21 conflicts, the 1-1 source pack, and the Stage A
gate.

Expected: no guessed batch ID, count, source ID, or unresolved placeholder.

- [ ] **Step 10.81 — Run the Plan 2 placeholder and checkbox lint.**

Run:

```bash
! rg -n 'TBD|TODO|implement later|fill in details|Add appropriate error handling|Write tests for the above|Similar to Task' docs/superpowers/plans/2026-07-31-source-editorial-review-execution.md
```

Expected: no output and exit 0.

- [ ] **Step 10.82 — Commit only Plan 2.**

Run:

```bash
git add docs/superpowers/plans/2026-07-31-source-editorial-review-execution.md
git commit -m "docs: plan full source editorial review"
```

Expected: one local documentation commit; no remote push.

#### Merge locally to `main`

The user has already selected the `Merge back to main locally` option. Do not
present the integration menu again and never push.

- [ ] **Step 10.83 — Verify the implementation branch test suite before integration.**

Run:

```bash
/Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: every test passes.

- [ ] **Step 10.84 — Print the current branch.**

Run:

```bash
git branch --show-current
```

Expected: `main` or one non-empty named implementation branch.

- [ ] **Step 10.85 — Print the registered worktree topology.**

Run:

```bash
git worktree list --porcelain
```

Expected: an identifiable worktree whose branch is `refs/heads/main`.

- [ ] **Step 10.86 — Merge the implementation branch into local `main` with fast-forward only.**

Run:

```bash
EDITORIAL_FEATURE_BRANCH="$(git branch --show-current)"
EDITORIAL_MAIN_WORKTREE="$(git worktree list --porcelain | awk '/^worktree / { path=substr($0, 10) } /^branch refs\/heads\/main$/ { print path; exit }')"
EDITORIAL_RANGE_BASE_FILE="tmp/source-audit/review-patches/calibration/main-before-integration.txt"
test -n "$EDITORIAL_FEATURE_BRANCH"
test -z "$(git status --porcelain)"
if [ "$EDITORIAL_FEATURE_BRANCH" = "main" ]; then
  git rev-parse HEAD~2 > "$EDITORIAL_RANGE_BASE_FILE"
  echo "merge-no-op: execution already occurred on main"
else
  test -n "$EDITORIAL_MAIN_WORKTREE"
  test -z "$(git -C "$EDITORIAL_MAIN_WORKTREE" status --porcelain)"
  git -C "$EDITORIAL_MAIN_WORKTREE" rev-parse HEAD > "$EDITORIAL_RANGE_BASE_FILE"
  git -C "$EDITORIAL_MAIN_WORKTREE" merge --ff-only "$EDITORIAL_FEATURE_BRANCH"
fi
```

Expected: either `merge-no-op: execution already occurred on main` or one
successful local fast-forward merge. A dirty main worktree or non-fast-forward
topology stops the task. The current implementation worktree must also be clean.
The saved commit is the pre-integration main tip, or `HEAD~2` for the two Task 10
commits when execution occurred directly on main. No rebase, discard, force
action, pull, or push.

- [ ] **Step 10.87 — Verify the resulting integration branch is `main`.**

Run:

```bash
EDITORIAL_MAIN_WORKTREE="$(git worktree list --porcelain | awk '/^worktree / { path=substr($0, 10) } /^branch refs\/heads\/main$/ { print path; exit }')"
if [ -z "$EDITORIAL_MAIN_WORKTREE" ]; then EDITORIAL_MAIN_WORKTREE="$(git rev-parse --show-toplevel)"; fi
git -C "$EDITORIAL_MAIN_WORKTREE" branch --show-current
```

Expected: exactly `main`.

- [ ] **Step 10.88 — Verify the resulting local `main` worktree is clean.**

Run:

```bash
EDITORIAL_MAIN_WORKTREE="$(git worktree list --porcelain | awk '/^worktree / { path=substr($0, 10) } /^branch refs\/heads\/main$/ { print path; exit }')"
if [ -z "$EDITORIAL_MAIN_WORKTREE" ]; then EDITORIAL_MAIN_WORKTREE="$(git rev-parse --show-toplevel)"; fi
git -C "$EDITORIAL_MAIN_WORKTREE" status --short
```

Expected: no output.

- [ ] **Step 10.89 — Run the complete suite on the resulting local `main`.**

Run:

```bash
EDITORIAL_MAIN_WORKTREE="$(git worktree list --porcelain | awk '/^worktree / { path=substr($0, 10) } /^branch refs\/heads\/main$/ { print path; exit }')"
if [ -z "$EDITORIAL_MAIN_WORKTREE" ]; then EDITORIAL_MAIN_WORKTREE="$(git rev-parse --show-toplevel)"; fi
(cd "$EDITORIAL_MAIN_WORKTREE" && /Users/songhonglei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -W error -m unittest discover -s tests -p 'test_*.py' -v)
```

Expected: every test passes.

- [ ] **Step 10.90 — Check the complete integrated commit range for whitespace errors.**

Run:

```bash
EDITORIAL_MAIN_WORKTREE="$(git worktree list --porcelain | awk '/^worktree / { path=substr($0, 10) } /^branch refs\/heads\/main$/ { print path; exit }')"
if [ -z "$EDITORIAL_MAIN_WORKTREE" ]; then EDITORIAL_MAIN_WORKTREE="$(git rev-parse --show-toplevel)"; fi
EDITORIAL_RANGE_BASE_FILE="tmp/source-audit/review-patches/calibration/main-before-integration.txt"
test -s "$EDITORIAL_RANGE_BASE_FILE"
EDITORIAL_RANGE_BASE="$(sed -n '1p' "$EDITORIAL_RANGE_BASE_FILE")"
git -C "$EDITORIAL_MAIN_WORKTREE" cat-file -e "${EDITORIAL_RANGE_BASE}^{commit}"
git -C "$EDITORIAL_MAIN_WORKTREE" diff --check "${EDITORIAL_RANGE_BASE}..HEAD"
```

Expected: no output and exit 0; the checked range contains every commit merged
from the feature branch, or both Task 10 commits in the direct-main no-op case.

- [ ] **Step 10.91 — Run the final local-main status gate.**

Run:

```bash
EDITORIAL_MAIN_WORKTREE="$(git worktree list --porcelain | awk '/^worktree / { path=substr($0, 10) } /^branch refs\/heads\/main$/ { print path; exit }')"
if [ -z "$EDITORIAL_MAIN_WORKTREE" ]; then EDITORIAL_MAIN_WORKTREE="$(git rev-parse --show-toplevel)"; fi
git -C "$EDITORIAL_MAIN_WORKTREE" status --short
```

Expected: no output. The tooling and calibration plan is complete locally; the
persistent Goal remains open for the full-book review, 1-1, the course engine,
the other 11 lessons, and release acceptance.

## Specification Traceability

| Approved design section | Implemented or exercised by |
|---|---|
| §1 goals and expanding source denominator | Tasks 1, 8, 9, 10 |
| §2 non-goals | Global Constraints and two-plan boundary |
| §3 disposition, mapping, version, and visual rules | Tasks 1, 2, 10 |
| §4 single decision source, visual catalog, scan fields, ledger | Tasks 1, 2, 3, 6, 9 |
| §5 page-grouped bundle | Task 4 |
| §6 calibration and high-risk review | Tasks 4, 6, 10; normal-batch selection is an explicit mandatory first task and acceptance gate of Plan 2 |
| §7 full-record patches and atomic integration | Tasks 5, 7 |
| §8 frozen conflict set and source-index correction gate | Tasks 1, 8, 10 |
| §9 visual discovery before disposition | Tasks 3, 5, 10 |
| §10 reports and exact count reconciliation | Tasks 7, 8, 9, 10 |
| §11 failures and recovery | Tasks 3, 5, 7 |
| §12 automatic and human verification | Every task's focused test plus Task 10 acceptance |
| §13 Stage A gate | Task 8 implements automatic gates; the full-book plan supplies all reviewed data and the 1-1 source pack |

## Plan Exit Criteria

This plan is complete only when:

1. all new and old automated tests pass under `-W error`;
2. the PDF and generated source index fingerprints remain unchanged;
3. the 834 baseline is migrated without any automatic content decision;
4. calibration evidence includes full text, page-image hashes, stable source IDs,
   and three default-queue-external pages;
5. 30–40 calibration sources receive two independent complete reviews;
6. disagreements are explicitly resolved and ledgered;
7. formal source-count and unreviewed-count deltas reconcile exactly;
8. reports are deterministic;
9. the branch passes independent spec and quality review;
10. the full-book execution plan is based on accepted real IDs and counts.
11. all plan commits are present on local `main` (or the merge is a recorded
    no-op because work stayed on `main`), with no remote push.
