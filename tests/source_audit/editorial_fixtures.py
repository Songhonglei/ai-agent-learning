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
_MIGRATED_BASELINE_SHA256 = (
    "c2e59acccb8c77a89103b9e698a5f82d"
    "60ec5803930551e132976484934294ca"
)

def _fresh(value):
    return copy.deepcopy(value)

def _sha256_json(value):
    payload = (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
        + "\n"
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

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


def _add_frozen_conflict_items(index):
    page = index["pages"][0]
    existing_ids = {
        item["sourceId"] for item in index["numberedItems"]
    }
    missing_source_ids = [
        source_id
        for source_id in sample_policy()["captionConflictSourceIds"]
        if source_id not in existing_ids
    ]
    for position, source_id in enumerate(missing_source_ids):
        kind, number = source_id.split("-", 1)
        support_page = 1001 + position
        support = _page(support_page, page["chapter"])
        support["charCount"] = 0
        support["textPreview"] = ""
        index["pages"].append(support)
        index["numberedItems"].append(
            _numbered(
                kind,
                number,
                support_page,
                page["chapter"],
                caption_conflict=True,
            )
        )
    return index

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
    return _add_frozen_conflict_items({
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
    })

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
                or item["pdfPage"] >= 1000
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
    return _fresh((_add_frozen_conflict_items(index), visuals, [_reviewed_decision(item)]))

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
    for position, source_id in enumerate(
        sample_policy()["captionConflictSourceIds"]
    ):
        kind, number = source_id.split("-", 1)
        numbered.append(_numbered(
            kind,
            number,
            [10, 20, 81, 240, 279][position % 5],
            caption_conflict=True,
        ))
    return {
        "schemaVersion": 1,
        "pdfPath": "reference/原始文档.pdf",
        "pages": pages,
        "outline": [],
        "numberedItems": numbered,
    }

def sample_calibration_decisions(visuals=None):
    index = sample_calibration_index()
    selected_visuals = _fresh(
        [sample_visual()] if visuals is None else visuals
    )
    records = []
    for item in [
        *index["pages"], *index["numberedItems"], *selected_visuals,
    ]:
        record = (
            _reviewed_decision(item)
            if item["sourceId"].startswith("experiment-cal-")
            else _base_decision(item)
        )
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
        "captionConflictSourceIds": _fresh(
            sample_policy()["captionConflictSourceIds"]
        ),
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
    catalog_ids = sorted(set([
        *page_ids,
        *selected_ids,
        *sample_policy()["captionConflictSourceIds"],
    ]))

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
        "captionConflictSourceIds": _fresh(
            sample_policy()["captionConflictSourceIds"]
        ),
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
            "captionConflictSourceIds",
            "pageImages", "pageBundles",
            "catalogSourceIds", "baseReviewStates",
        }
    }

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

def sample_ledger(decisions=None, visuals=None):
    accepted_hash = _sha256_json(
        decisions if decisions is not None else sample_decisions()
    )
    ledger = [{
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": _MIGRATED_BASELINE_SHA256,
    }]
    visuals_by_page = {}
    for visual in visuals or []:
        visuals_by_page.setdefault(
            visual["pdfPage"], []
        ).append(visual["sourceId"])
    discovery_pages = sorted(visuals_by_page)
    if not discovery_pages:
        page_source_ids = sorted(
            item["sourceId"]
            for item in (decisions or [])
            if item["sourceId"].startswith("page-")
        )
        discovery_pages = [
            int(page_source_ids[0].split("-", 1)[1])
            if page_source_ids
            else 1
        ]
    previous_hash = _MIGRATED_BASELINE_SHA256
    for pdf_page in discovery_pages:
        ledger.append({
            "entryType": "discovery",
            "discoveryId": f"discovery-p{pdf_page:03d}-01",
            "pdfPage": pdf_page,
            "attempt": 1,
            "reviewer": "visual-scanner-a",
            "addedVisualIds": sorted(visuals_by_page.get(pdf_page, [])),
            "baseDecisionsSha256": previous_hash,
            "acceptedDecisionsSha256": accepted_hash,
        })
        previous_hash = accepted_hash
    return ledger

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

def _catalog_items(index, visuals=None):
    return [
        *index["pages"], *index["outline"],
        *index["numberedItems"], *(visuals or []),
    ]

def _chapter_for_fixture(index, item):
    if item.get("chapter") is not None:
        return item["chapter"]
    return {
        page["pdfPage"]: page.get("chapter")
        for page in index["pages"]
    }.get(item["pdfPage"])

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

def _calibration_case_parts():
    index = sample_calibration_index()
    visuals = [sample_visual()]
    base = [
        _base_decision(item)
        for item in _catalog_items(index, visuals)
    ]
    for record in base:
        if record["sourceId"].startswith("page-"):
            record.update({
                "visualReviewState": "reviewed",
                "visualReviewer": "visual-scanner-a",
                "discoveredVisualIds": sorted(
                    visual["sourceId"]
                    for visual in visuals
                    if visual["pdfPage"] == int(
                        record["sourceId"].split("-", 1)[1]
                    )
                ),
            })
    base = sorted(base, key=lambda item: item["sourceId"])
    pages = sorted([*_REQUIRED_PAGES, *_EXTERNAL_PAGES])
    page_ids = {f"page-{page:03d}" for page in pages}
    source_ids = sorted(
        page_ids
        | set(
            source_id for source_id in sorted(
                item["sourceId"] for item in base
                if item["sourceId"] not in page_ids
            )[:25]
        )
    )
    freeze = _freeze_from(index, visuals, base, pages, source_ids)
    freeze["pdfSha256"] = (
        "27dba7a82ce46fbaa60c27a99e633a029"
        "db455ec2ccec08c79466c57f317b4ac"
    )
    genesis_hash = _MIGRATED_BASELINE_SHA256
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

def _calibration_accepted_decisions(index, visuals, freeze):
    frozen_pages = {
        value["sourceId"]: value
        for value in freeze["frozenPageDecisions"]
    }
    accepted = []
    for item in [
        *index["pages"], *index["numberedItems"], *visuals,
    ]:
        record = (
            _reviewed_decision(item)
            if item["sourceId"] in set(freeze["sourceIds"])
            else _base_decision(item)
        )
        if item["kind"] == "page":
            frozen = frozen_pages[item["sourceId"]]
            for field in (
                "visualReviewState", "visualReviewer",
                "discoveredVisualIds", "symbolReview",
            ):
                record[field] = _fresh(frozen[field])
        accepted.append(record)
    return sorted(accepted, key=lambda item: item["sourceId"])


def _trusted_review_evidence(index, visuals, freeze, accepted):
    from scripts.source_audit.review_ledger import build_review_ledger_entry

    selected = [
        row for row in accepted
        if row["sourceId"] in set(freeze["sourceIds"])
    ]
    primary = _review_patch(
        freeze, selected, "reviewer-a", "/root/calibration_primary",
    )
    secondary = _review_patch(
        freeze, selected, "reviewer-b", "/root/calibration_secondary",
    )
    resolution = {
        "batchId": freeze["batchId"],
        "resolutions": [],
        "criticalOmissions": [],
    }
    fingerprint = _sha256_json({
        "freezeSha256": freeze["freezeSha256"],
        "primaryPatchSha256": _sha256_json(primary),
        "secondaryPatchSha256": _sha256_json(secondary),
        "resolutionSha256": _sha256_json(resolution),
    })
    source_map = {
        item["sourceId"]: item
        for item in _catalog_items(index, visuals)
    }
    review = build_review_ledger_entry(
        freeze, primary, secondary, resolution, source_map, accepted,
        sample_policy(), _sha256_json(accepted), fingerprint,
    )
    return review, {
        freeze["batchId"]: {
            "freeze": freeze,
            "primaryPatch": primary,
            "secondaryPatch": secondary,
            "resolutions": resolution,
        }
    }

def _valid_calibration_payload():
    index, visuals, source_ids, freeze, base_ledger = (
        _calibration_case_parts()
    )
    accepted = _calibration_accepted_decisions(
        index, visuals, freeze,
    )
    review, batch_evidence = _trusted_review_evidence(
        index, visuals, freeze, accepted,
    )
    immutable = {
        key: _fresh(freeze[key])
        for key in (
            "pdfSha256", "sourceIndexSha256",
            "unnumberedVisualsSha256", "editorialPolicySha256",
            "analysisSha256", "courseOutlineSha256",
            "policySnapshotPath", "policySnapshotSha256",
            "captionConflictSourceIds",
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
        "batch_evidence": batch_evidence,
    }

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
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": _MIGRATED_BASELINE_SHA256,
    }, {
        "entryType": "discovery",
        "discoveryId": "discovery-p020-01",
        "pdfPage": 20,
        "attempt": 1,
        "reviewer": "visual-scanner-a",
        "addedVisualIds": [],
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": freeze["baseDecisionsSha256"],
    }]
    freeze["baseLedgerSha256"] = _sha256_json(base_ledger)
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    })
    return index, visuals, base, base_by_id, freeze, base_ledger

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
            "captionConflictSourceIds", "pageImages", "pageBundles",
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

def _valid_case(kind):
    if kind == "calibration":
        return _valid_calibration_payload()
    if kind == "integration":
        return _valid_integration_payload()
    raise ValueError(f"unknown valid fixture kind: {kind}")

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
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": _MIGRATED_BASELINE_SHA256,
    }, {
        "entryType": "discovery",
        "discoveryId": "discovery-p020-01",
        "pdfPage": 20,
        "attempt": 1,
        "reviewer": "visual-scanner-a",
        "addedVisualIds": [],
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": freeze["baseDecisionsSha256"],
    }]
    freeze["baseLedgerSha256"] = _sha256_json(base_ledger)
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    })
    return index, visuals, base, source_ids, freeze, base_ledger

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
            "captionConflictSourceIds", "pageImages", "pageBundles",
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

def valid_calibration_case():
    return _fresh(_valid_case("calibration"))

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
    numbered.append(_numbered("figure", "stage-1-1", 102, 2))
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
        if item["sourceId"] == "figure-stage-1-1":
            record.update({
                "lessonIds": ["1-1"],
                "visualClass": "semantic-core",
                "visualHandling": "redraw",
                "visualTextAlternative": "上下文窗口有限，Agent只能基于当前可见信息判断。",
                "riskFlags": ["lesson-1-1", "visual"],
            })
        decisions.append(record)
    return sorted(decisions, key=lambda item: item["sourceId"])

def valid_stage_a_case():
    policy = sample_policy()
    inventory = sample_must_keep_inventory()
    index, inventory_by_source = _stage_a_index(policy, inventory)
    decisions = _stage_a_decisions(
        index, policy, inventory_by_source,
    )
    source_ids = [
        item["sourceId"] for item in _catalog_items(index)
    ]
    base = [_base_decision(item) for item in _catalog_items(index)]
    final_pages = {
        row["sourceId"]: row
        for row in decisions
        if row["sourceId"].startswith("page-")
    }
    for row in base:
        if row["sourceId"] in final_pages:
            for field in (
                "visualReviewState", "visualReviewer",
                "discoveredVisualIds", "symbolReview",
            ):
                row[field] = _fresh(final_pages[row["sourceId"]][field])
    pages = sorted(item["pdfPage"] for item in index["pages"])
    freeze = _freeze_from(index, [], base, pages, source_ids)
    freeze["batchId"] = "stage-a-fixture"
    freeze["pdfSha256"] = (
        "27dba7a82ce46fbaa60c27a99e633a029"
        "db455ec2ccec08c79466c57f317b4ac"
    )
    genesis = {
        "entryType": "genesis",
        "genesisId": "editorial-baseline-834",
        "sourceCount": 834,
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": _MIGRATED_BASELINE_SHA256,
    }
    discovery = {
        "entryType": "discovery",
        "discoveryId": "discovery-p001-01",
        "pdfPage": 1,
        "attempt": 1,
        "reviewer": "visual-scanner-a",
        "addedVisualIds": [],
        "baseDecisionsSha256": _MIGRATED_BASELINE_SHA256,
        "acceptedDecisionsSha256": freeze["baseDecisionsSha256"],
    }
    freeze["baseLedgerSha256"] = _sha256_json([genesis, discovery])
    freeze["freezeSha256"] = _sha256_json({
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    })
    review, batch_evidence = _trusted_review_evidence(
        index, [], freeze, decisions,
    )
    ledger = [genesis, discovery, review]
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
        "batch_evidence": batch_evidence,
    }

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
            "captionConflictSourceIds",
            "pageImages", "pageBundles", "catalogSourceIds",
            "baseReviewStates",
        }
    }

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

def _write_fixture_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def sample_complete_ledger(*, index, visuals, decisions):
    accepted_hash = _sha256_json(decisions)
    ledger = sample_ledger(decisions=decisions, visuals=visuals)
    ledger.append(_review_entry_for(
        index, visuals, decisions,
        batch_id="complete-fixture",
        mode="calibration",
        source_ids=sorted(item["sourceId"] for item in _catalog_items(index, visuals)),
        base_hash=accepted_hash,
        accepted_hash=accepted_hash,
    ))
    return ledger

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
        decisions = sorted(
            (_base_decision(item) for item in _catalog_items(index)),
            key=lambda item: item["sourceId"],
        )
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

def _finish_frozen_workspace(paths, index, decisions, policy):
    project_root = Path.cwd()
    image = paths.image_dir / "page-020.png"
    bundle = paths.package_dir / "page-020.json"
    snapshot = paths.package_dir / "editorial-policy.snapshot.json"
    image.write_bytes(_PNG_BYTES)
    _write_fixture_json(bundle, {"pdfPage": 20})
    _write_fixture_json(snapshot, policy)
    catalog_source_ids = sorted(
        item["sourceId"] for item in _catalog_items(index)
    )
    source_ids = sorted(
        item["sourceId"] for item in _catalog_items(index)
        if item["pdfPage"] == 20
    )
    freeze = frozen_batch(
        mode="normal", pages=[20], source_ids=source_ids,
    )
    freeze.update({
        "catalogSourceIds": catalog_source_ids,
        "baseReviewStates": {
            source_id: "unreviewed" for source_id in catalog_source_ids
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

@contextmanager
def discovery_cli_workspace(*, accepted_review=False):
    with tempfile.TemporaryDirectory(
        dir=Path.cwd(), prefix=".source-audit-discovery-",
    ) as directory:
        root = Path(directory)
        index = sample_page20_index()
        index["pages"].extend(
            sample_index(page_count=19)["pages"]
        )
        index["pages"].sort(key=lambda item: item["sourceId"])
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
        ledger = sample_ledger(decisions=decisions)
        evidence_root = None
        evidence_files = {}
        if accepted_review:
            from scripts.source_audit.catalog import source_items_by_id
            from scripts.source_audit.review_ledger import (
                build_review_ledger_entry,
            )

            source_map = source_items_by_id(index, [])
            source_id = "figure-1-2"
            base_by_id = {
                item["sourceId"]: _fresh(item)
                for item in decisions
            }
            base_by_id[source_id] = _base_decision(
                source_map[source_id]
            )
            base_decisions = sorted(
                base_by_id.values(),
                key=lambda item: item["sourceId"],
            )
            ledger_prefix = sample_ledger(decisions=base_decisions)
            freeze = _freeze_from(
                index,
                [],
                base_decisions,
                [20],
                [source_id],
            )
            freeze["baseLedgerSha256"] = _sha256_json(ledger_prefix)
            freeze["freezeSha256"] = _sha256_json({
                key: value
                for key, value in freeze.items()
                if key != "freezeSha256"
            })
            final_record = next(
                item for item in decisions
                if item["sourceId"] == source_id
            )
            primary_patch = _review_patch(
                freeze,
                [final_record],
                "reviewer-a",
                "/root/calibration_primary",
            )
            secondary_patch = _review_patch(
                freeze,
                [final_record],
                "reviewer-b",
                "/root/calibration_secondary",
            )
            resolutions = {
                "batchId": freeze["batchId"],
                "resolutions": [],
                "criticalOmissions": [],
            }
            input_fingerprint = _sha256_json({
                "freezeSha256": freeze["freezeSha256"],
                "primaryPatchSha256": _sha256_json(primary_patch),
                "secondaryPatchSha256": _sha256_json(secondary_patch),
                "resolutionSha256": _sha256_json(resolutions),
            })
            ledger = [
                *ledger_prefix,
                build_review_ledger_entry(
                    freeze,
                    primary_patch,
                    secondary_patch,
                    resolutions,
                    source_map,
                    decisions,
                    sample_policy(),
                    _sha256_json(decisions),
                    input_fingerprint,
                ),
            ]
            evidence_root = root / "evidence"
            freeze_path = (
                evidence_root
                / "review-freezes"
                / "calibration.json"
            )
            patch_root = (
                evidence_root
                / "review-patches"
                / "calibration"
            )
            evidence_files = {
                "freeze": freeze_path,
                "primary": patch_root / "reviewer-a.json",
                "secondary": patch_root / "reviewer-b.json",
                "resolutions": patch_root / "resolution.json",
            }
            for path, value in (
                (evidence_files["freeze"], freeze),
                (evidence_files["primary"], primary_patch),
                (evidence_files["secondary"], secondary_patch),
                (evidence_files["resolutions"], resolutions),
            ):
                _write_fixture_json(path, value)
        paths = SimpleNamespace(
            patch=root / "patch.json",
            index=root / "index.json",
            visuals=root / "visuals.json",
            decisions=root / "decisions.json",
            ledger=root / "ledger.json",
            policy=root / "policy.json",
            evidence_root=evidence_root,
            evidence_files=evidence_files,
        )
        _write_fixture_json(paths.patch, {
            "pdfPage": 19, "attempt": 1, "reviewer": "visual-scanner-a",
            "numberedVisualIds": [],
            "visuals": ([{
                "localId": "late-visual-01",
                "region": {
                    "x": 0.1,
                    "y": 0.2,
                    "width": 0.4,
                    "height": 0.3,
                },
                "semanticBrief": "验收批次后的补充关系图",
                "discoveryEvidence": "全页复扫；PDF 第19页中部",
            }] if accepted_review else []),
            "symbolReview": [],
        })
        for path, value in (
            (paths.index, index), (paths.visuals, []),
            (paths.decisions, decisions),
            (paths.ledger, ledger),
            (paths.policy, sample_policy()),
        ):
            _write_fixture_json(path, value)
        paths.args = SimpleNamespace(
            patch=paths.patch, index=paths.index, visuals=paths.visuals,
            decisions=paths.decisions, ledger=paths.ledger,
            policy=paths.policy,
            review_evidence_root=paths.evidence_root,
        )
        yield paths
