# 全书来源编辑复核 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development task-by-task.

**Goal:** 完成剩余805项来源的可审计复核，并仅在全书条件满足后关闭阶段A。

**Architecture:** 以已验收的`calibration-001`为样板，先实现确定性正常批次选择器，再按5–15页或20–40项的冻结批次推进。每批都保留页面证据、双补丁、逐项决议、原子整合和可重跑报告；正式数据只由整合器写入。

**Tech Stack:** Python 3、JSON、unittest、现有`source_audit`命令行工具。

## Global Constraints

- 原始PDF SHA-256固定为`27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`，不得改写。
- `source-index.json`受保护；视觉发现先于处置，新增视觉只可经发现事务进入正式目录。
- Chapters 5、7、9不进入当前正式课程映射；保留为未来技术人员专用版本边界。
- 语义核心关系图默认重绘；证据视觉优先文字替代或表格化；不得直接复用原图作为网页体验捷径。
- 每批双审使用独立 reviewer/task ID；分歧必须逐条记录冻结证据和非空裁决理由。
- 阶段A仅可在834项均已复核、21项题注冲突关闭、314页扫描闭环、1-1来源包完成后关闭。

### Task 1: Deterministic normal-batch selector

**Files:**
- Modify: `scripts/source_audit/build_review_packages.py`
- Modify: `tests/source_audit/test_build_review_packages.py`

- [ ] 编写失败测试：给定剩余未复核ID，选择器稳定返回20–40项、5–15页且优先补齐校准中触发扩审的分层。
- [ ] 运行 `python3 -W error -m unittest tests.source_audit.test_build_review_packages -v`，确认新测试失败。
- [ ] 实现排序规则：先未完成扫描页、再强制风险来源、再chapter-by-kind SHA-256稳定抽样；拒绝已复核ID和跨批重复ID。
- [ ] 重跑同一命令并确认通过；运行全量 `python3 -W error -m unittest discover -s tests -p 'test_*.py' -v`。
- [ ] 提交 `feat: select deterministic normal review batches`。

### Task 2: Execute normal review batches

**Files:**
- Create: `docs/superpowers/evidence/normal-batches/`
- Modify: `reference/source-audit/unnumbered-visuals.json`
- Modify: `reference/source-audit/coverage-decisions.json`
- Modify: `reference/source-audit/review-ledger.json`
- Modify: `reference/source-audit/source-coverage-matrix.md`
- Modify: `reference/source-audit/visual-asset-index.md`

- [ ] 对每个选择器输出批次渲染页面、执行缺失视觉发现、构建并验证冻结包；记录批次ID、页数、来源数和冻结SHA。
- [ ] 为每批生成两份独立完整补丁；验证任务身份、100%强制双审、正常抽样和补丁字段完整性。
- [ ] 比对补丁；为每条真实分歧在`tmp/source-audit/review-patches/<batch>/disagreement-worklist.md`填写冻结页证据、最终记录和非空裁决理由。
- [ ] 用`validate-resolution`通过后运行`apply`；执行带`--review-evidence-root tmp/source-audit`的校准/批次验证器，保存每批证据摘要。
- [ ] 每批运行全量测试、PDF/index哈希检查和`git diff --check`，再提交该批正式数据与报告。

### Task 3: Close Stage A and create 1-1 source pack

**Files:**
- Create: `docs/superpowers/evidence/stage-a-final.md`
- Create: `reference/source-audit/lesson-1-1-source-pack.md`
- Modify: `06-开发计划与验收标准.md`

- [ ] 编写失败测试：Stage A 在任一未复核来源、未关闭题注冲突、未扫描页或缺失1-1语义核心来源时拒绝。
- [ ] 运行对应 unittest，确认失败；完成全部正常批次及1-1来源包后实现/更新最终门禁。
- [ ] 运行`build_reports --require-complete`、Stage A 验证器、全量 unittest、保护哈希和独立规格/质量复审。
- [ ] 仅在所有门禁通过时更新阶段A状态；提交 `data: complete full source editorial review`。

## Acceptance

- 834项来源均已复核，314页扫描完整，21项题注冲突均已关闭。
- 每个批次有冻结证据、两份独立补丁、逐项决议和原子整合台账。
- 课程映射仍遵守当前版本边界；1-1来源包可直接支持纵向样板。
