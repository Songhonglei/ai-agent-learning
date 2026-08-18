# 阶段0基线冻结 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将用户确认的 v0.1 产品、课程、视觉、技术、AI 与发布边界写入一致的项目基线，使 1-1 纵向样板没有阻塞性待确认项。

**Architecture:** 不改变阶段A的来源审计事实和12课数量。以 `reference/project-baseline-v0.2.md` 作为唯一的冻结摘要，再将课程、交互、视觉、技术和计划文档的相应表述同步到该摘要；本次不创建应用、不接入模型服务、不发布站点。

**Tech Stack:** Markdown、Git、已有来源审计证据。

## Global Constraints

- 原始事实源仍为 `reference/原始文档.pdf`；本阶段不得改写来源审计数据或课程事实。
- 课程保持12课；工具权限、人工确认、不可逆护栏并入3-1，失败恢复与能力边界并入3-2，多Agent适用条件并入4-2。
- 1-1 仍是纵向样板，互动组件固定为“上下文构建器”。
- 课程采取软锁定：推荐顺序、允许直接进入任意课程、未完成前置课时显示提示。
- v0.1 保留3题前测和等价3题后测；工程指标是硬门槛，用户结果指标只作观测目标。
- 视觉使用现有色彩、字体、布局和 `visuals/hongshu-avatar.svg` 作为样板基线；移动端、加载、空和错误状态在阶段1实施并验收，不属于视觉基线定稿范围。
- 技术栈固定为 React + Vite + TypeScript + Tailwind/CSS Tokens，使用 Vitest、Testing Library 和 Playwright；1-1样板以 localStorage 恢复进度，Schema迁移与学习进度导入/导出由阶段2实现。
- 首版是可由 html-go-live 发布的静态站，但本阶段不发布、不进行远程写入。
- 自由问答必须有FAQ降级；真实模型服务默认关闭，待服务、知识来源和预算另行获批。

---

### Task 1: 冻结课程、学习地图与交互口径

**Files:**
- Modify: `02-课程大纲.md`
- Modify: `04-交互与AI方案.md`
- Modify: `07-决策与待确认清单.md`

**Produces:** 明确的6节点学习地图映射、12课内安全/恢复内容归属、软锁定规则与前后测规则。

- [x] **Step 1: 写入6节点与12课的固定映射**

在 `02-课程大纲.md` 的课程来源表后新增“学习地图节点”表：

| 节点 | 覆盖课程 |
| --- | --- |
| 认识 Agent | 0-1、0-2 |
| 看懂上下文 | 1-1、1-2、1-3 |
| 记忆与知识 | 2-1、2-2、2-3 |
| 工具与行动 | 3-1、3-2 |
| 评估 Agent | 4-1 |
| 多 Agent | 4-2 |

- [x] **Step 2: 固定12课内的补充归属**

将“建议补充内容（待确认）”改为已冻结内容：3-1纳入权限、人工确认和不可逆护栏；3-2纳入失败恢复和能力边界；4-2纳入多Agent有效的限定条件。

- [x] **Step 3: 固定软锁定与前后测规则**

在 `04-交互与AI方案.md` 追加 v0.1 学习路径规则：课程可直接进入、前置课未完成时仅提示推荐顺序，不阻断学习；前测与后测各3题，后测题目与前测等价且不直接复用题干。

- [x] **Step 4: 同步决策状态**

从 `07-决策与待确认清单.md` 的“仍需产品确认”移除已确认的课程边界、软锁定和后测事项，并记录冻结结论。

- [x] **Step 5: 核对规则一致性**

运行：

```bash
rg -n '软锁定|允许直接进入|前测|后测|人工确认|不可逆|失败恢复|多Agent有效|学习地图节点' \
  "02-课程大纲.md" "04-交互与AI方案.md" "07-决策与待确认清单.md"
```

预期：每项冻结结论均在至少一个规范文档和决策清单中可追溯，不再带“待确认”。

- [x] **Step 6: 提交**

```bash
git add "02-课程大纲.md" "04-交互与AI方案.md" "07-决策与待确认清单.md"
git commit -m "docs: freeze curriculum interaction baseline"
```

### Task 2: 冻结视觉、技术、AI 和发布边界

**Files:**
- Modify: `03-视觉设计规范.md`
- Modify: `05-技术架构建议.md`
- Modify: `06-开发计划与验收标准.md`
- Modify: `README.md`
- Modify: `07-决策与待确认清单.md`

**Produces:** 可供样板开发直接采用的视觉Token、技术栈、AI开关和无远程写入的发布边界。

- [x] **Step 1: 标记视觉样板基线**

在 `03-视觉设计规范.md` 明确色彩、字体、布局与 `visuals/hongshu-avatar.svg` 是 v0.1 样板基线；保留移动端、加载、空和错误状态为阶段1验收项而不是阻塞项。

- [x] **Step 2: 将技术建议改为 v0.1 冻结口径**

在 `05-技术架构建议.md` 将技术栈、存储、测试与静态站目标标为 v0.1 冻结。明确构建物可由 html-go-live 发布，但当前没有发布授权；不得接入线上模型或保存前端密钥。

- [x] **Step 3: 固定AI自由问答边界**

在 `05-技术架构建议.md` 将真实模型服务标为默认关闭的功能开关；FAQ降级是样板必须实现的功能。服务、知识来源和预算列为未来单独授权，不阻断预设课程。

- [x] **Step 4: 固定量化指标分层**

在 `06-开发计划与验收标准.md` 将来源完整性、断点恢复、题目人工审核和关键无障碍项标为硬门槛；开始率、完成率、前后测提升和端间差异标为观测目标。

- [x] **Step 5: 同步决策状态与入口说明**

更新 `07-决策与待确认清单.md`、`README.md`：移除技术栈、部署、AI、视觉和量化指标的待确认状态，说明发布、真实模型服务仍须单独授权。

- [x] **Step 6: 核对禁止项**

运行：

```bash
rg -n 'html-go-live|发布授权|默认关闭|FAQ|前端.*密钥|硬门槛|观测目标' \
  README.md "03-视觉设计规范.md" "05-技术架构建议.md" \
  "06-开发计划与验收标准.md" "07-决策与待确认清单.md"
```

预期：静态发布与真实模型服务均清楚标明边界，未产生发布或外部调用。

- [x] **Step 7: 提交**

```bash
git add README.md "03-视觉设计规范.md" "05-技术架构建议.md" \
  "06-开发计划与验收标准.md" "07-决策与待确认清单.md"
git commit -m "docs: freeze visual technical baseline"
```

### Task 3: 形成基线交付与阶段0验收

**Files:**
- Create: `reference/project-baseline-v0.2.md`
- Create: `docs/superpowers/evidence/stage-0-baseline.md`
- Modify: `06-开发计划与验收标准.md`
- Modify: `07-决策与待确认清单.md`

**Produces:** 可供阶段1直接执行的单一基线摘要，以及明确的阶段0完成证据。

- [x] **Step 1: 编写项目基线 v0.2**

汇总已确认的用户、12课、6节点、学习路径、前后测、视觉基线、技术栈、存储（含Schema迁移与学习进度导入/导出）、AI与发布边界；每项标出对应规范文件。

- [x] **Step 2: 写入阶段0验收记录**

记录确认日期、阶段A前置证据、冻结决策、未做的事（未发布、未接入模型）、下一步为1-1纵向样板。

- [x] **Step 3: 更新项目计划状态**

将 `06-开发计划与验收标准.md` 的当前状态更新为“阶段0已冻结；下一步进入阶段1纵向样板”，在阶段0下列出全部冻结结论，并将来源完整性验收中已在阶段A通过的项目勾选。

- [x] **Step 4: 运行文档一致性检查**

运行：

```bash
rg -n '待确认|待立项确认|是否允许直接进入' \
  README.md "01-项目概述与PRD.md" "02-课程大纲.md" \
  "03-视觉设计规范.md" "04-交互与AI方案.md" \
  "05-技术架构建议.md" "06-开发计划与验收标准.md" \
  "07-决策与待确认清单.md"
git diff --check
```

预期：仅未来阶段的非阻塞事项可保留；已冻结的 v0.1 决策不再相互矛盾。

- [x] **Step 5: 提交**

```bash
git add reference/project-baseline-v0.2.md docs/superpowers/evidence/stage-0-baseline.md \
  "06-开发计划与验收标准.md" "07-决策与待确认清单.md"
git commit -m "docs: complete stage zero baseline freeze"
```

## Acceptance

- 12课、6节点、1-1样板与互动归属均有唯一且一致的口径。
- 所有阶段0决策可在 `reference/project-baseline-v0.2.md` 追溯。
- 不发生发布、远程写入或真实模型调用。
- 阶段1可直接以1-1来源包、冻结视觉Token和课程数据契约开始开发。

### Task 4: 落实阶段能力归属裁决

**Files:**
- Modify: `06-开发计划与验收标准.md`
- Modify: `docs/superpowers/plans/2026-08-05-stage-0-baseline-freeze.md`

**User ruling:** 错题、收藏、复习、前测与全局导入/导出能力维持原计划，留在阶段2；阶段1仅实现1-1完整学习链路所需的测验、进度恢复、移动端和异常状态。

- [x] **Step 1: 修正阶段2的前置条件措辞**

将阶段2中的“阶段1已验证的课程、存储和交互协议”改为“已在1-1样板验证的课程与交互协议，并在阶段2实现全局存储能力”，明确Schema迁移、学习进度导入/导出、错题、收藏、复习和前测均由阶段2实现并通用化。

- [x] **Step 2: 标记已完成计划步骤**

将任务1至任务3的所有已完成步骤和任务4第1步标记为 `[x]`，保留任务4验收命令与提交步骤直到实际执行后再标记。

- [x] **Step 3: 验证职责边界**

运行：

```bash
rg -n -C 2 '阶段1|阶段2|错题|收藏|复习|前测|Schema迁移|导入/导出' \
  "06-开发计划与验收标准.md" \
  docs/superpowers/plans/2026-08-05-stage-0-baseline-freeze.md
git diff --check
```

预期：阶段1不宣称实现全局能力；阶段2是错题、收藏、复习、前测、Schema迁移和学习进度导入/导出的唯一实现与通用化阶段。

- [x] **Step 4: 提交**

```bash
git add "06-开发计划与验收标准.md" \
  docs/superpowers/plans/2026-08-05-stage-0-baseline-freeze.md
git commit -m "docs: clarify stage two capability ownership"
```
