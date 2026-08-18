from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from scripts.source_audit.build_review_packages import parse_markdown_sections
from scripts.source_audit.catalog import all_editorial_source_items
from scripts.source_audit.decisions import (
    initial_editorial_decision,
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    APPROVED_PDF_SHA256,
    AuditValidationError,
    all_source_items,
    assert_distinct_paths,
    assert_expected_sha256,
    load_json,
    sha256_file,
    validate_decisions,
    write_json_deterministic,
)
from scripts.source_audit.must_keep import build_must_keep_inventory
from scripts.source_audit.prepare_review_batch import _load_existing_review_batch_evidence
from scripts.source_audit.review_ledger import validate_review_ledger
from scripts.source_audit.transactions import sha256_json, write_files_transaction


DISPOSITION_LABELS = {"included": "纳入", "compressed": "压缩", "excluded": "排除", "missing": "缺失", "unreviewed": "未检查"}
VISUAL_CLASS_LABELS = {"semantic-core": "语义核心", "evidence": "证据", "decorative": "装饰"}
VISUAL_HANDLING_LABELS = {"reuse": "复用", "redraw": "重绘", "text-alt": "文字替代", "omit": "省略"}
REPORT_KINDS = (("pages", "页面", "page"), ("outline", "目录项", "outline"), ("figures", "图", "figure"), ("tables", "表", "table"), ("experiments", "实验", "experiment"))

def _pending(name):
    raise NotImplementedError(name)


def _build_parser(*args, **kwargs):
    parser = argparse.ArgumentParser(*args, **kwargs)
    parser.add_argument("--pdf")
    parser.add_argument("--index", required=True)
    parser.add_argument("--unnumbered-visuals")
    parser.add_argument("--decisions", required=True)
    parser.add_argument("--review-ledger")
    parser.add_argument("--policy")
    parser.add_argument("--analysis")
    parser.add_argument("--course-outline")
    parser.add_argument("--review-evidence-root")
    parser.add_argument("--coverage-report", required=True)
    parser.add_argument("--visual-report", required=True)
    parser.add_argument("--require-complete", action="store_true")
    # Compatibility only for the pre-editorial command.  Formal calls use the
    # immutable PDF anchor through run_stage_a_gate instead.
    parser.add_argument("--expected-sha256", default=APPROVED_PDF_SHA256)
    return parser


def initial_decision(item: dict) -> dict:
    return initial_editorial_decision(item)


def initialize_decisions(index: dict, decisions_path: Path) -> list[dict]:
    if decisions_path.exists():
        return load_json(decisions_path)
    decisions = sorted(
        (initial_decision(item) for item in all_source_items(index)),
        key=lambda decision: decision["sourceId"],
    )
    write_json_deterministic(decisions_path, decisions)
    return decisions


def _project_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else Path(__file__).resolve().parents[2] / path


def _pdf_fingerprint(index: dict) -> str:
    pdf_path = index.get("pdfPath")
    if not isinstance(pdf_path, str) or not pdf_path:
        return "未提供或未知"
    path = _project_path(pdf_path)
    return sha256_file(path) if path.is_file() else "未提供或未知"


def _escape_markdown(value) -> str:
    if value is None or value == "":
        return "—"
    return str(value).replace("\\", "\\\\").replace("|", "\\|").replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")


def _join_markdown(values) -> str:
    return "、".join(_escape_markdown(value) for value in values) if values else "—"


def _decision_by_source_id(decisions: list[dict]) -> dict[str, dict]:
    return {decision["sourceId"]: decision for decision in decisions}


def _decision_for(item: dict, decision_map: dict[str, dict]) -> dict:
    return decision_map.get(item["sourceId"], initial_decision(item))


def _is_unreviewed(decision: dict) -> bool:
    return decision.get("reviewState") == "unreviewed" or decision.get("disposition") == "unreviewed"


def _caption_conflict_is_resolved(decision: dict) -> bool:
    return decision.get("captionConflictResolved") is True and isinstance(decision.get("captionConflictNote"), str) and bool(decision["captionConflictNote"].strip())


def _caption_conflicts(index: dict, visual_only: bool = False) -> list[dict]:
    return sorted((item for item in index.get("numberedItems", []) if item.get("captionConflict") is True and (not visual_only or item.get("kind") in {"figure", "table"})), key=lambda item: item["sourceId"])


def _occurrence_text(occurrences: list[dict]) -> str:
    return "<br>".join("PDF {pdf_page} / 印刷页 {printed_page} / {title}".format(pdf_page=_escape_markdown(row.get("pdfPage")), printed_page=_escape_markdown(row.get("printedPage")), title=_escape_markdown(row.get("title"))) for row in sorted(occurrences, key=lambda row: (row.get("pdfPage", 0), row.get("printedPage") or 0, str(row.get("title", ""))))) or "—"


def _caption_conflict_section(index: dict, decision_map: dict[str, dict], visual_only: bool = False) -> list[str]:
    items = _caption_conflicts(index, visual_only)
    unresolved = sum(not _caption_conflict_is_resolved(_decision_for(item, decision_map)) for item in items)
    lines = ["## 标题冲突", "", f"标题冲突：{len(items)}；未解决：{unresolved}", "", "| 来源 ID | 类型 | 选中 PDF 页 | 选中印刷页 | 选中标题 | 所有候选 | 解决状态 | 备注 |", "| --- | --- | ---: | ---: | --- | --- | --- | --- |"]
    for item in items:
        decision = _decision_for(item, decision_map)
        lines.append("| {source_id} | {kind} | {pdf_page} | {printed_page} | {title} | {occurrences} | {state} | {note} |".format(source_id=_escape_markdown(item["sourceId"]), kind=_escape_markdown(item.get("kind")), pdf_page=_escape_markdown(item.get("pdfPage")), printed_page=_escape_markdown(item.get("printedPage")), title=_escape_markdown(item.get("title")), occurrences=_occurrence_text(item.get("occurrences", [])), state="已解决" if _caption_conflict_is_resolved(decision) else "未解决", note=_escape_markdown(decision.get("captionConflictNote"))))
    return [*lines, ""]


def _report_conflict_ids(index, policy):
    indexed = {item["sourceId"] for item in index.get("numberedItems", []) if item.get("captionConflict") is True}
    return indexed | set((policy or {}).get("captionConflictSourceIds", []))


def _legacy_baseline_totals(index):
    counts = Counter(item.get("kind") for item in index.get("numberedItems", []))
    return f"页面：{len(index.get('pages', []))}；目录项：{len(index.get('outline', []))}；图：{counts['figure']}；表：{counts['table']}；实验：{counts['experiment']}"


def _legacy_summary_line(values, labels):
    counts = Counter(values)
    return "；".join(f"{labels[value]}：{counts[value]}" for value in sorted(counts)) or "无"


def _legacy_items_for_kind(index, kind):
    if kind == "page":
        items = index.get("pages", [])
    elif kind == "outline":
        items = index.get("outline", [])
    else:
        items = [item for item in index.get("numberedItems", []) if item.get("kind") == kind]
    return sorted(items, key=lambda item: item["sourceId"])


def _legacy_coverage_table(items, decision_map):
    rows = ["| 来源 ID | PDF 页 | 印刷页 | 标题 | 处置 | 课时 ID | Markdown 引用 | 原因 |", "| --- | ---: | ---: | --- | --- | --- | --- | --- |"]
    for item in items:
        decision = _decision_for(item, decision_map)
        rows.append("| {source_id} | {pdf_page} | {printed_page} | {title} | {disposition} | {lesson_ids} | {markdown_refs} | {reason} |".format(source_id=_escape_markdown(item["sourceId"]), pdf_page=_escape_markdown(item.get("pdfPage")), printed_page=_escape_markdown(item.get("printedPage")), title=_escape_markdown(item.get("title")), disposition=DISPOSITION_LABELS.get(decision.get("disposition"), _escape_markdown(decision.get("disposition"))), lesson_ids=_join_markdown(decision.get("lessonIds", [])), markdown_refs=_join_markdown(decision.get("markdownRefs", [])), reason=_escape_markdown(decision.get("reason"))))
    return rows


def _legacy_render_coverage(index, decisions):
    decision_map = _decision_by_source_id(decisions)
    source_items = all_source_items(index)
    item_decisions = [_decision_for(item, decision_map) for item in source_items]
    incomplete = sum(_is_unreviewed(item) for item in item_decisions)
    lines = ["# 来源覆盖矩阵", "", f"PDF 指纹：{_pdf_fingerprint(index)}", f"基线总数：{_legacy_baseline_totals(index)}", "", "## 处置汇总", "", _legacy_summary_line([item.get("disposition", "unreviewed") for item in item_decisions], DISPOSITION_LABELS), ""]
    if incomplete:
        lines.extend([f"> 警告：未检查：{incomplete}，请完成人工复核。", ""])
    lines.extend(_caption_conflict_section(index, decision_map))
    for _, label, kind in REPORT_KINDS:
        lines.extend([f"## {label}", *[""], *_legacy_coverage_table(_legacy_items_for_kind(index, kind), decision_map), ""])
    return "\n".join(lines).rstrip() + "\n"


def _legacy_visual_summary(decisions, key, labels):
    return _legacy_summary_line([decision.get(key) for decision in decisions if decision.get(key) is not None], labels)


def _legacy_render_visual(index, decisions):
    decision_map = _decision_by_source_id(decisions)
    items = sorted([item for item in index.get("numberedItems", []) if item.get("kind") in {"figure", "table"}], key=lambda item: item["sourceId"])
    item_decisions = [_decision_for(item, decision_map) for item in items]
    counts = Counter(item.get("kind") for item in items)
    lines = ["# 视觉资产索引", "", f"图：{counts['figure']}；表：{counts['table']}", f"视觉类别汇总：{_legacy_visual_summary(item_decisions, 'visualClass', VISUAL_CLASS_LABELS)}", f"处理方式汇总：{_legacy_visual_summary(item_decisions, 'visualHandling', VISUAL_HANDLING_LABELS)}", ""]
    lines.extend(_caption_conflict_section(index, decision_map, visual_only=True))
    lines.extend(["| 来源 ID | PDF 页 | 标题 | 语义符号 | 视觉类别 | 处理方式 | 课时 | 处置 |", "| --- | ---: | --- | --- | --- | --- | --- | --- |"])
    for item in items:
        decision = _decision_for(item, decision_map)
        lines.append("| {source_id} | {pdf_page} | {title} | {symbols} | {visual_class} | {visual_handling} | {lessons} | {disposition} |".format(source_id=_escape_markdown(item["sourceId"]), pdf_page=_escape_markdown(item.get("pdfPage")), title=_escape_markdown(item.get("title")), symbols=_symbol_text(item.get("symbolCounts")), visual_class=VISUAL_CLASS_LABELS.get(decision.get("visualClass"), "—"), visual_handling=VISUAL_HANDLING_LABELS.get(decision.get("visualHandling"), "—"), lessons=_join_markdown(decision.get("lessonIds", [])), disposition=DISPOSITION_LABELS.get(decision.get("disposition"), _escape_markdown(decision.get("disposition")))))
    return "\n".join(lines).rstrip() + "\n"


def _coverage_header_lines(index, catalog, decisions, ledger, policy, visual_count, pdf_sha256):
    decision_map = _decision_by_source_id(decisions)
    baseline = len(index.get("pages", [])) + len(index.get("outline", [])) + len(index.get("numberedItems", []))
    scanned = sum(decision_map[item["sourceId"]].get("visualReviewState") == "reviewed" for item in catalog if item["kind"] == "page" and item["sourceId"] in decision_map)
    incomplete = sum(_is_unreviewed(_decision_for(item, decision_map)) for item in catalog)
    flags = Counter(flag for decision in decisions for flag in decision.get("riskFlags", []))
    risk_summary = "；".join(f"{flag}：{flags[flag]}" for flag in sorted(flags)) or "无"
    conflicts = _report_conflict_ids(index, policy)
    unresolved = sum(not _caption_conflict_is_resolved(decision_map.get(source_id, {})) for source_id in conflicts)
    return ["# 来源覆盖矩阵", "", "## 覆盖概览", "", f"PDF 指纹：{pdf_sha256 or _pdf_fingerprint(index)}", "来源总数：{total}（初始基线：{baseline}；新增未编号视觉：{added}）".format(total=len(catalog), baseline=baseline, added=visual_count), f"视觉扫描：{scanned}/{len(index.get('pages', []))} 页", f"未检查：{incomplete}", f"风险汇总：{risk_summary}", f"标题冲突：{len(conflicts)}；未解决：{unresolved}", "", "## 来源决定", "", "| 来源 ID | 类型 | PDF 页 | 标题/摘要 | 处置 | 审核状态 | 课时 | Markdown 引用 | 风险 | 必保留项 | 符号文字替代 |", "| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |"]


def _coverage_source_rows(catalog, decisions):
    decision_map = _decision_by_source_id(decisions)
    rows = []
    for item in catalog:
        decision = _decision_for(item, decision_map)
        symbols = ["{symbol}@PDF {page}：{meaning}".format(symbol=row["symbol"], page=row["pdfPage"], meaning=row["meaning"]) for row in decision.get("symbolTextAlternatives", [])]
        rows.append("| {source_id} | {kind} | {page} | {title} | {disposition} | {state} | {lessons} | {refs} | {risks} | {keeps} | {symbols} |".format(source_id=_escape_markdown(item["sourceId"]), kind=_escape_markdown(item["kind"]), page=_escape_markdown(item.get("pdfPage")), title=_escape_markdown(item.get("title") or item.get("semanticBrief") or "—"), disposition=_escape_markdown(decision.get("disposition")), state=_escape_markdown(decision.get("reviewState")), lessons=_join_markdown(decision.get("lessonIds", [])), refs=_join_markdown(decision.get("markdownRefs", [])), risks=_join_markdown(decision.get("riskFlags", [])), keeps=_join_markdown(decision.get("mustKeepIds", [])), symbols=_join_markdown(symbols)))
    return rows


def _coverage_tail_lines(decisions, ledger, must_keep_inventory):
    lines = ["", "## 复核与升级", "", f"复核批次：{sum(row.get('entryType') == 'review' for row in (ledger or []))}", "", "## 必保留项", "", "| 必保留 ID | 状态 | 原文 | 声明来源 | 目标课时 |", "| --- | --- | --- | --- | --- |"]
    for keep in sorted(must_keep_inventory or [], key=lambda row: row["mustKeepId"]):
        claims = sorted(row["sourceId"] for row in decisions if keep["mustKeepId"] in row.get("mustKeepIds", []))
        lessons = sorted({lesson for row in decisions if row["sourceId"] in claims for lesson in row.get("lessonIds", [])})
        lines.append("| {keep_id} | {status} | {text} | {claims} | {lessons} |".format(keep_id=_escape_markdown(keep["mustKeepId"]), status="当前版" if keep["versionStatus"] == "current" else "未来版", text=_escape_markdown(keep["text"]), claims=_join_markdown(claims), lessons=_join_markdown(lessons)))
    return lines


def render_coverage_matrix(index: dict, decisions: list[dict], visuals: list[dict] | None = None, ledger: list[dict] | None = None, policy: dict | None = None, must_keep_inventory: list[dict] | None = None, pdf_sha256: str | None = None) -> str:
    if visuals is None and ledger is None and policy is None and must_keep_inventory is None and pdf_sha256 is None:
        return _legacy_render_coverage(index, decisions)
    visual_items = list(visuals or [])
    catalog = all_editorial_source_items(index, visual_items)
    lines = _coverage_header_lines(index, catalog, decisions, ledger, policy, len(visual_items), pdf_sha256)
    lines.extend(_coverage_source_rows(catalog, decisions))
    lines.extend(["", *_caption_conflict_section(index, _decision_by_source_id(decisions))])
    lines.extend(_coverage_tail_lines(decisions, ledger, must_keep_inventory))
    return "\n".join(lines).rstrip() + "\n"


def _symbol_text(symbol_counts: dict | None) -> str:
    labels = (("check", "正确标记", "次"), ("cross", "错误标记", "次"), ("triangle", "部分成立标记", "次"), ("star", "难度星", "颗"))
    return "、".join(f"{(symbol_counts or {}).get(key, 0)}{suffix}{label}" for key, label, suffix in labels if (symbol_counts or {}).get(key, 0)) or "—"


def _visual_asset_row(item, decision, scanner, conflict_ids):
    visual_class = decision.get("visualClass")
    allowed = {"semantic-core": ("redraw", "reuse"), "evidence": ("text-alt", "reuse"), "decorative": ("omit",)}.get(visual_class, ())
    evidence = [value for value in (item.get("discoveryEvidence"), f"扫描员：{scanner}" if scanner else None) if value]
    symbols = ["{symbol}@PDF {page}：{meaning}".format(symbol=row["symbol"], page=row["pdfPage"], meaning=row["meaning"]) for row in decision.get("symbolTextAlternatives", [])]
    legacy_symbols = _symbol_text(item.get("symbolCounts"))
    if legacy_symbols != "—":
        symbols.insert(0, legacy_symbols)
    conflict = "—" if item["sourceId"] not in conflict_ids else ("已解决" if _caption_conflict_is_resolved(decision) else "未解决")
    return "| {source_id} | {kind} | {page} | {title} | {visual_class} | {allowed} | {handling} | {note} | {alternative} | {lessons} | {evidence} | {symbols} | {risks} | {conflict} |".format(source_id=_escape_markdown(item["sourceId"]), kind=_escape_markdown(item["kind"]), page=_escape_markdown(item.get("pdfPage")), title=_escape_markdown(item.get("title") or item.get("semanticBrief") or "—"), visual_class=_escape_markdown(visual_class), allowed=_join_markdown(allowed), handling=_escape_markdown(decision.get("visualHandling")), note=_escape_markdown(decision.get("visualHandlingNote")), alternative=_escape_markdown(decision.get("visualTextAlternative")), lessons=_join_markdown(decision.get("lessonIds", [])), evidence=_join_markdown(evidence), symbols=_join_markdown(symbols), risks=_join_markdown(decision.get("riskFlags", [])), conflict=_escape_markdown(conflict))


def render_visual_asset_index(index: dict, decisions: list[dict], visuals: list[dict] | None = None, ledger: list[dict] | None = None, policy: dict | None = None, must_keep_inventory: list[dict] | None = None) -> str:
    if visuals is None and ledger is None and policy is None and must_keep_inventory is None:
        return _legacy_render_visual(index, decisions)
    del must_keep_inventory
    catalog = all_editorial_source_items(index, list(visuals or []))
    decisions_by_id = _decision_by_source_id(decisions)
    assets = [item for item in catalog if item["kind"] in {"figure", "table", "visual"}]
    scanners = {item["pdfPage"]: decisions_by_id[item["sourceId"]].get("visualReviewer") for item in catalog if item["kind"] == "page" and item["sourceId"] in decisions_by_id}
    lines = ["# 视觉资产索引", "", "## 视觉概览", "", f"视觉总数：{len(assets)}", "复核批次：" + str(sum(row.get("entryType") == "review" for row in (ledger or []))), ""]
    lines.extend(_caption_conflict_section(index, decisions_by_id, visual_only=True))
    lines.extend(["## 资产明细", "", "| 来源 ID | 类型 | PDF 页 | 标题/语义摘要 | 视觉类别 | 允许处理 | 实际处理 | 处理说明 | 文字替代 | 目标课时 | 扫描证据 | 符号文字替代 | 风险 | 标题冲突 |", "| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"])
    conflicts = _report_conflict_ids(index, policy)
    lines.extend(_visual_asset_row(item, _decision_for(item, decisions_by_id), scanners.get(item["pdfPage"]), conflicts) for item in assets)
    return "\n".join(lines).rstrip() + "\n"


def _report_role_paths(args):
    roles = {"index": Path(args.index), "decisions": Path(args.decisions), "coverageOutput": Path(args.coverage_report), "visualOutput": Path(args.visual_report)}
    optional = {"visuals": args.unnumbered_visuals, "ledger": args.review_ledger, "policy": args.policy, "analysis": args.analysis, "courseOutline": args.course_outline, "reviewEvidenceRoot": args.review_evidence_root, "pdf": args.pdf}
    roles.update({name: Path(value) for name, value in optional.items() if value is not None})
    return roles


def _load_report_case(args):
    index = load_json(Path(args.index))
    pdf_path = Path(args.pdf or index["pdfPath"])
    roles = _report_role_paths(args)
    roles["pdf"] = pdf_path
    assert_distinct_paths(roles)
    visuals = load_json(Path(args.unnumbered_visuals))
    decisions = load_json(Path(args.decisions))
    ledger = load_json(Path(args.review_ledger))
    policy = load_json(Path(args.policy))
    inventory = build_must_keep_inventory(policy, parse_markdown_sections(Path(args.analysis), args.analysis), parse_markdown_sections(Path(args.course_outline), args.course_outline))
    validate_editorial_decisions(index, visuals, decisions, policy, require_complete=False)
    protected = _report_role_paths(args)
    protected.pop("reviewEvidenceRoot", None)
    batch_evidence = _load_existing_review_batch_evidence(
        ledger, args.review_evidence_root, protected,
    )
    validate_review_ledger(
        index, visuals, decisions, ledger, policy, sha256_json(decisions),
        batch_evidence=batch_evidence,
    )
    return {"pdfSha256": sha256_file(pdf_path), "index": index, "visuals": visuals, "decisions": decisions, "ledger": ledger, "policy": policy, "mustKeepInventory": inventory, "batchEvidence": batch_evidence}


def _run_report_command(args, case):
    if args.require_complete:
        from scripts.source_audit.verify_calibration_acceptance import run_stage_a_gate
        run_stage_a_gate(case["pdfSha256"], case["index"], case["visuals"], case["decisions"], case["ledger"], case["policy"], case["mustKeepInventory"], case["batchEvidence"])
    coverage = render_coverage_matrix(case["index"], case["decisions"], case["visuals"], case["ledger"], case["policy"], case["mustKeepInventory"], case["pdfSha256"])
    visual = render_visual_asset_index(case["index"], case["decisions"], case["visuals"], case["ledger"], case["policy"], case["mustKeepInventory"])
    write_files_transaction({Path(args.coverage_report): coverage.encode("utf-8"), Path(args.visual_report): visual.encode("utf-8")})


def _legacy_main(args, parser):
    roles = {"index": _project_path(args.index), "decisions": _project_path(args.decisions), "coverage-report": _project_path(args.coverage_report), "visual-report": _project_path(args.visual_report)}
    try:
        assert_distinct_paths(roles)
    except AuditValidationError as error:
        parser.error(str(error))
    index = load_json(roles["index"])
    if not isinstance(index, dict):
        parser.error("index must be an object")
    pdf_value = index.get("pdfPath")
    if not isinstance(pdf_value, str) or not pdf_value:
        parser.error("index.pdfPath must be a non-empty string")
    pdf = _project_path(pdf_value)
    try:
        assert_distinct_paths({**roles, "pdf": pdf})
        assert_expected_sha256(pdf, args.expected_sha256)
    except AuditValidationError as error:
        parser.error(str(error))
    decisions = initialize_decisions(index, roles["decisions"])
    try:
        validate_decisions(index, decisions)
    except AuditValidationError as error:
        if args.require_complete:
            print(f"完成门禁失败：{error}", file=sys.stderr)
            return 2
        raise
    write_files_transaction({roles["coverage-report"]: render_coverage_matrix(index, decisions).encode("utf-8"), roles["visual-report"]: render_visual_asset_index(index, decisions).encode("utf-8")})
    if args.require_complete:
        decision_map = _decision_by_source_id(decisions)
        incomplete = sum(_is_unreviewed(_decision_for(item, decision_map)) for item in all_source_items(index))
        if incomplete:
            print(f"未检查：{incomplete}", file=sys.stderr)
            return 2
        try:
            validate_decisions(index, decisions, require_complete=True)
        except AuditValidationError as error:
            print(f"完成门禁失败：{error}", file=sys.stderr)
            return 2
    return 0


def main(argv=None):
    parser = _build_parser()
    args = parser.parse_args(argv)
    formal_values = (
        args.unnumbered_visuals, args.review_ledger, args.policy,
        args.analysis, args.course_outline, args.review_evidence_root,
    )
    formal = all(formal_values)
    if any(formal_values) and not formal:
        print(
            "formal report options must be supplied together",
            file=sys.stderr,
        )
        return 2
    if not formal:
        return _legacy_main(args, parser)
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
