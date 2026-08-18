# 原始 PDF 编辑复核工作流设计

> **状态：** 用户已复核确认，进入实施计划
> **适用阶段：** 阶段 A「来源完整性审计」的人工复核部分
> **前置基线：** 来源审计工具已合并到 `main`，当前共有 834 个来源项
> **事实源：** `reference/原始文档.pdf`

## 1. 目标

在不提前编写课程页面的前提下，完成原始 PDF 到 12 课课程规划的人工编辑复核，
并把每一项取舍沉淀为可校验、可追溯、可继续用于单课开发的正式数据。

本阶段必须解决四类问题：

1. 当前 834 个来源项是否都已被正确理解并获得明确去向。
2. 314 页中未被编号索引捕获的图标、关系图、示意图和插画是否发生遗漏。
3. 原书内容进入课程时是完整纳入、压缩表达、主动排除，还是仍属疑似遗漏。
4. 每个视觉对象在 Web 课程中应重绘、转换为文字或表格、直接复用，还是省略。

当前 834 项只是扫描开始前的基线。发现有知识意义的未编号视觉后，正式来源总数
允许增长；阶段 A 的完成率必须以扩展后的最终来源集合为分母。

## 2. 非目标

- 不在本阶段开发学习网站、课程引擎或 AI 服务。
- 不在本阶段编写 1-1 的正式课稿、题目或页面。
- 不逐字复制原书，也不把关键词相似自动视为已经覆盖。
- 不把第 5、7、9 章纳入 v0.1 的正式课程映射。
- 不新建第二套人工处置事实源。
- 不批量提交 314 页 PDF 渲染图；页面图像只作为临时复核证据。

## 3. 已冻结的编辑口径

### 3.1 处置状态的含义

`coverage-decisions.json` 中的 `included` 与 `compressed` 表示来源内容已经由人工
批准进入课程规划，不表示它已经写入最终课稿或页面。进入课程开发后，必须通过
同一稳定 `sourceId` 的 `SourceRef` 再次验证实际落地。

| 状态 | 编辑含义 | 课程开发阶段的义务 |
|---|---|---|
| `included` | 原结论、边界和必要上下文应完整进入指定课程 | 用 `SourceRef` 验证完整实现 |
| `compressed` | 保留核心含义，允许缩短技术过程或细节 | 用 `SourceRef` 验证核心含义未丢失 |
| `excluded` | 主动排除，并记录目标用户、版本或时长理由 | 不进入 v0.1 课稿 |
| `missing` | 应进入课程规划，但当前课程大纲或分析稿尚未覆盖 | 必须给出补入的课程 ID |
| `unreviewed` | 尚未完成人工判断 | 阶段 A 出口禁止存在 |

同一 PDF 页面只有一部分内容被课程采用时，页面级来源项使用 `compressed`，
不能因为局部命中而标记为 `included`。

课程落点使用 12 课 ID 白名单校验：`0-1`、`0-2`、`1-1`、`1-2`、`1-3`、
`2-1`、`2-2`、`2-3`、`3-1`、`3-2`、`4-1`、`4-2`。

- `included`、`compressed`、`missing` 必须至少关联一个有效课程 ID。
- `excluded` 的 `lessonIds` 必须为空。
- 第 5、7、9 章的版本边界项必须是 `excluded`，不能借由无效或未来课程 ID
  绕过当前版本边界。

### 3.2 “疑似遗漏”的判定范围

`missing` 的必保范围由两部分组成：

1. `02-课程大纲.md` 中 12 课的学习目标。
2. `reference/book-analysis.md` 中标记为高优先级的内容和高风险限定条件。

实施时把它们解析成 25 条原子清单：12 条课程核心意图、5 条最高优先级论断、
8 条红色高风险限定。每条决定用 `mustKeepIds` 声明自己承接的清单项，完成门禁
再从正式决定反向生成“清单项 → 来源 ID → 最终处置 → 课程”的覆盖表。第 5、7、
9 章中的清单项仍须明确关联到本版排除来源和统一版本边界理由，不能从清单消失。
每个分析清单项同时冻结其 `sourceChapters`，防止把一个未来版本论断随意挂到另一个
被排除章节；当前版本项也只能由其来源章节和允许课程共同承接。

仅仅没有进入课程不等于 `missing`。如果内容不适合当前目标用户或属于明确的
版本边界，应使用 `excluded` 并填写理由。

### 3.3 课程映射口径

- 2-3 的主要来源是第 3 章 §3.1 与第 8 章。
- 第 2 章对 2-3 只提供补充性的上下文记忆背景。
- 1-3 的主要来源仍是第 2 章和第 4 章；第 1 章 Harness 护栏作为次要来源补入。
- 第 5、7、9 章不进入 v0.1 正式课程映射。相关项目使用
  `[版本边界] 留待未来技术人员版` 作为排除理由，`lessonIds` 保持为空。

第 5、7、9 章仍须逐项复核和完成视觉扫描；“本版排除”不能成为跳过来源登记的理由。

### 3.4 视觉处置口径

用户拥有原始图片的使用授权，但 Web 页面优先保持一致的视觉语言：

| 视觉类别 | 默认处理 | 例外 |
|---|---|---|
| `semantic-core` | `redraw`，按统一风格重绘关系、流程或架构 | 只有原貌本身构成证据时才 `reuse` |
| `evidence` | 优先 `text-alt`，转换成文字、表格或可访问的数据表达 | 必须保存原始数据、截图或外观证据时 `reuse` |
| `decorative` | `omit` | 明确承担导航或叙事功能时重新分类 |

`reuse` 不是版权兜底选项，而是证据真实性要求下的例外。所有承载判断、状态或难度
的 `✓ / ✗ / △ / ★` 等符号都必须写出文字含义，不能只靠图标或颜色表达。

## 4. 单一事实源与文件边界

### 4.1 受保护输入

- `reference/原始文档.pdf`
- `reference/book-analysis.md`
- `02-课程大纲.md`
- `reference/source-audit/source-manifest.json`
- `reference/source-audit/source-index.json`

复核者和批次整合器不得手工改写这些输入。若发现标题、页码或对象识别错误，应修正
来源索引的生成逻辑并重新生成索引，不能只在处置备注中掩盖错误。PDF、分析稿和
课程大纲始终只读；`source-manifest.json` 与 `source-index.json` 只能由现有审计
工具确定性生成。

### 4.2 正式人工数据

- `reference/source-audit/coverage-decisions.json`

这是唯一允许保存最终课程处置、视觉分类、视觉处理和课程映射的人工事实源。
复核包和批次补丁都是过程产物，不得代替它。

视觉来源项在现有字段之外增加：

```json
{
  "visualHandlingNote": "",
  "visualTextAlternative": "文字说明应完整表达视觉中的关系、结论和限定条件"
}
```

`semantic-core` 与 `evidence` 都必须填写非空的 `visualTextAlternative`，无论最终
采用 `redraw`、`reuse` 还是 `text-alt`。它保存可访问的语义等价表达，不只是一句
“见原图”。`decorative + omit + excluded` 使用空字符串，并在 `reason` 中说明
其课程处置；`visualHandlingNote` 使用非空 `[装饰说明]` 解释为何不承载知识语义。
带有判断符号的视觉必须在文字替代中逐项写明符号含义。

`visualHandlingNote` 与课程处置 `reason` 分离。普通 `redraw` / `text-alt` 可为空；
`reuse` 必须以 `[复用依据]` 开头并跟随非空解释。这样第 5、7、9 章仍能保持
`reason=[版本边界] 留待未来技术人员版` 的精确值，同时独立记录视觉复用或装饰依据。

任何来源类型都可承载语义符号，因此另设通用字段：

```json
{
  "symbolTextAlternatives": [
    {
      "symbol": "★",
      "pdfPage": 239,
      "meaning": "实验 8-1 难度：两星"
    }
  ]
}
```

`symbolTextAlternatives` 保存人工确认后的归属和文字含义，适用于 page、outline、
experiment、figure、table、visual，不能由页级 `symbolCounts` 自动推断。
同一页同一符号再次扫描时，以完整的新扫描记录替换该页该符号此前派生的文字替代，
不能只追加并保留已经更正的旧含义。

每条 reviewed 决定还必须包含 `riskFlags` 数组，可用值为
`caption-conflict`、`missing`、`visual`、`lesson-1-1`、
`analysis-high-risk`、`critical-number`、`experiment-conclusion`、
`scope-boundary`。无风险时使用空数组；前五类可由正式数据推导，后三类必须由
人工阅读判断。任何决定承接 `analysis-high-risk-*` 必保项时，自动派生
`analysis-high-risk` 并进入强制双审。这里的
`scope-boundary` 指影响结论适用性的实质限定条件，不是第 5、7、9 章统一使用的
v0.1 版本排除标签。

314 页扫描状态也记录在对应 `kind=page` 的处置项中：

```json
{
  "sourceId": "page-239",
  "visualReviewState": "reviewed",
  "visualReviewer": "reviewer-a",
  "discoveredVisualIds": [],
  "symbolReview": [
    {
      "symbol": "★",
      "observedCount": 2,
      "semanticAssignments": [
        {
          "sourceId": "experiment-8-1",
          "count": 2,
          "meaning": "实验难度：两星"
        }
      ],
      "nonSemanticCount": 0,
      "note": "两枚星都表示实验难度"
    }
  ]
}
```

`visualReviewState` 只允许 `reviewed` 或 `unreviewed`；`discoveredVisualIds` 可为空，
但必须与本页在 `unnumbered-visuals.json` 中登记的 ID 完全一致。这样可以证明
无视觉页面也确实被看过，同时不引入第二套人工决策文件。

page 决定初始化为：

```json
{
  "visualReviewState": "unreviewed",
  "visualReviewer": "",
  "discoveredVisualIds": [],
  "symbolReview": []
}
```

当 `visualReviewState=reviewed` 时，`visualReviewer` 必须为非空稳定标识；
`discoveredVisualIds` 不得重复，其中每个 ID 都必须存在、属于同一 PDF 页，而且
`unnumbered-visuals.json` 中该页的每个视觉 ID 都必须反向出现在这里。页面中每种
已提取符号都要有一条 `symbolReview`：语义分配数与非语义数之和必须等于观察数；
每个语义分配都必须指向同页来源项，并在目标决定中存在对应的非空
`symbolTextAlternatives`。没有任何已观察或已提取符号的页面使用空数组；仅含
非语义符号的页面仍须逐种记录，并将观察数全部计入 `nonSemanticCount`。
发现补丁中的每个语义分配同时携带 `meaning`，登记事务用它更新目标来源的
`symbolTextAlternatives`；目标来源仍保持原有课程处置和复核状态。

### 4.3 新增未编号视觉登记

- `reference/source-audit/unnumbered-visuals.json`

该文件只登记扫描发现的视觉对象身份与位置，不保存课程判断。它会与
`source-index.json` 共同组成完整来源集合，并要求在
`coverage-decisions.json` 中存在同 ID 的处置记录。

```json
[
  {
    "sourceId": "visual-p010-01",
    "kind": "visual",
    "pdfPage": 10,
    "region": {
      "x": 0.12,
      "y": 0.24,
      "width": 0.66,
      "height": 0.31
    },
    "semanticBrief": "上下文、模型与行动之间的关系示意",
    "discoveryEvidence": "314页视觉扫描；PDF第10页中部"
  }
]
```

约束如下：

- ID 格式为 `visual-p{三位PDF页码}-{两位页内序号}`。
- 页面首次完整发现后，按从上到下、从左到右的稳定阅读顺序统一分配页内序号。
- 后续补发现的对象只使用下一个未占用序号；即使它在页面位置更靠前，也不重编号
  已登记对象。
- `region` 使用相对页面宽高的 0–1 坐标，供复核定位，不作为裁切精度承诺。
- `semanticBrief` 只描述看见的内容，不提前写课程结论。
- `discoveryEvidence` 必须说明发现方式和页码。
- 同一对象不得因跨批次复核而生成新 ID。
- 装饰视觉也先登记，再在 `coverage-decisions.json` 中分类为
  `decorative + omit + excluded`。

新增视觉项加入完整来源集合后，报告生成、完成门禁和处置校验都必须把它计入分母。

### 4.4 过程产物

复核包、临时页面图、两位复核者的批次补丁和差异报告放入临时工作目录，
不作为正式来源数据提交。只有经整合校验后的正式数据、复核台账和确定性报告进入
版本控制。

### 4.5 复核台账

- `reference/source-audit/review-ledger.json`

复核台账只证明谁复核了哪些来源、抽样是否达标、出现过哪些分歧以及如何升级，
不保存另一套课程处置。每个已验收批次包含：

```json
[
  {
    "entryType": "review",
    "batchId": "batch-001",
    "mode": "normal",
    "sourceIds": ["page-010", "visual-p010-01"],
    "primaryReviewer": "reviewer-a",
    "primaryTaskId": "/root/batch_001_primary",
    "secondaryReviewer": "reviewer-b",
    "secondaryTaskId": "/root/batch_001_secondary",
    "doubleReviewedSourceIds": ["visual-p010-01"],
    "mandatoryReviews": [
      {
        "sourceId": "visual-p010-01",
        "reasons": ["visual"]
      }
    ],
    "strata": [
      {
        "key": "chapter-1|kind-visual",
        "populationSourceIds": ["visual-p010-01"],
        "mandatorySourceIds": ["visual-p010-01"],
        "sampledSourceIds": [],
        "doubleReviewedSourceIds": ["visual-p010-01"],
        "disagreementSourceIds": ["visual-p010-01"],
        "sourceDisagreementRate": 1.0,
        "expanded": true
      }
    ],
    "disagreements": [
      {
        "sourceId": "visual-p010-01",
        "fields": ["visualHandling"],
        "resolutionNote": "原貌不是证据，按统一网页风格重绘"
      }
    ],
    "resolvedSourceIds": ["visual-p010-01"],
    "sourceDisagreementRate": 1.0,
    "escalations": [
      {
        "stratumKey": "chapter-1|kind-visual",
        "reasons": ["disagreement-rate-over-0.02"],
        "expandedSourceIds": ["visual-p010-01"]
      }
    ],
    "inputFingerprint": "冻结与两份补丁及决议的组合 SHA-256",
    "baseDecisionsSha256": "批次冻结时的SHA-256",
    "acceptedDecisionsSha256": "批次整合后的SHA-256"
  }
]
```

台账首条固定为基线 `genesis`，其基线哈希和验收哈希都等于 834 项迁移后的正式
决定哈希；后续任何发现或复核记录都必须从上一条验收哈希继续。每次页面发现使用
`discovery-p{页码}-{attempt}` 唯一标识，允许同页二次发现而不覆盖历史记录。

台账按哈希链先后顺序追加，不写时间戳；每条记录内部的来源 ID 和分层列表稳定排序。
它必须足以自动核对 100% 双审范围、
20% 分层抽样、每层最少 5 项、分歧率和扩审结果。`mandatoryReviews.reasons`
使用与决定中 `riskFlags` 相同的枚举，并覆盖所有强制双审来源；最终决定中的每个
风险标识都必须在台账中获得相同原因。

`primaryReviewer` 必须非空。只要 `doubleReviewedSourceIds` 非空，
`secondaryReviewer` 就必须非空且与 `primaryReviewer` 不同；同一人换一个显示名
不构成独立复核。

## 5. 页聚合复核包

人工复核以 PDF 页为基本阅读单元，不按来源类型分散阅读。每个页面包同时展示：

- PDF 页图像与页码。
- 本页提取文字。
- 本页对应的 page、outline、experiment、figure、table 来源项。
- 已登记的未编号视觉对象。
- `✓ / ✗ / △ / ★` 等符号及其出现数量。
- 来自大纲和分析稿的候选课程 ID。
- 可直接阅读的分析稿与课程大纲原文摘录，以及完整 25 项必保清单。
- 标题冲突、空文本页、外部视觉队列等风险提示。
- 当前处置值，但不把自动候选值表现成已确认结论。

页面包是只读证据快照。复核者只能提交按 `sourceId` 定位的结构化补丁，不能直接
覆盖正式处置文件。

页面包的最小结构为：

```json
{
  "pdfPage": 20,
  "pageImage": "tmp/pdfs/source-audit/page-020.png",
  "text": "……",
  "sourceItems": [],
  "unnumberedVisuals": [],
  "symbolCounts": {},
  "lessonCandidates": [],
  "analysisEvidence": [],
  "courseObjectiveEvidence": [],
  "mustKeepInventory": [],
  "riskFlags": []
}
```

页面包按 PDF 页码稳定排序；同页来源项按种类和稳定 ID 排序。相同输入必须生成
相同 JSON 内容，不写入生成时间或本机绝对路径。

## 6. 批次与执行顺序

### 6.1 校准批

第一批选择 30–40 个来源项，并覆盖下列页：

- PDF 第 10、20、81、239、240、279 页。
- 至少 3 个当前默认视觉队列之外的页面。
- 至少一个标题冲突、一个符号密集页和一个未编号视觉候选。

校准批采用双盲复核：两位复核者从同一只读复核包独立提交补丁，提交前不能查看
对方结论。整合者比较结果并先统一口径，再启动后续批次。

### 6.2 常规批

后续批次满足任一尺度：

- 连续 5–15 个 PDF 页面；或
- 20–40 个来源项。

优先保持同一小节的上下文连续，不为凑数拆开一个紧密的图文论证。每一批完成后
立即整合、校验并重新生成报告，不积压多批未落库决定。

### 6.3 批次内两阶段流程

每批先完成视觉发现，再冻结处置复核输入：

1. 对本批全部页面做发现扫描，登记未编号视觉。
2. 为新视觉创建 `unreviewed` 决定，更新 page 决定中的扫描字段。
3. 校验完整来源集合，重新生成页聚合复核包。
4. 记录新的 `coverage-decisions.json` 基线哈希，冻结本批来源 ID。
5. 复核者基于冻结包独立提交处置补丁。

如果任一复核者在第五步又发现未登记视觉，本批停止整合。整合者先补充视觉身份和
初始决定，再重新生成受影响页面包与基线哈希；两位复核者对受影响页面重新提交，
旧补丁不得直接套用。这样既允许二次发现，也不会让未知 ID 或过期哈希混入正式数据。

发现补丁用 `numberedVisualIds` 核对本页已有图表，但只把未编号对象写入
`visuals`。新对象先使用页内 `localId`，事务按稳定阅读顺序分配正式 ID；符号
分配可引用该 `localId`，待新视觉决定初始化后再解析为正式来源 ID。

### 6.4 高风险复核范围

下列项目必须 100% 双人复核：

- 21 个标题冲突。
- 所有 `missing` 项。
- 所有编号与未编号视觉项。
- 1-1 的完整来源包。
- 含关键数字、实验结论或适用边界的高风险内容。

其余项目按章节与来源类型分层抽查 20%，每个分层至少 5 项；分层不足 5 项时全部复核。
如果主复核补丁首次把项目判为 `missing` 或识别出高风险限定条件，该项目在批次验收前
自动加入二次复核，不能等到下一批再补。

如果抽查出现任一关键遗漏，或同一分层的处置分歧率超过 2%，该分层扩展为
100% 双人复核。分歧率以“任一最终字段不同的来源项数 / 该分层已双审来源项数”计算。

## 7. 复核补丁与整合

每位复核者为一个批次提交一份结构化补丁：

```json
{
  "batchId": "batch-001",
  "reviewer": "reviewer-a",
  "reviewerTaskId": "/root/batch_001_primary",
  "evidenceHashes": {
    "pdfSha256": "PDF SHA-256",
    "sourceIndexSha256": "索引 SHA-256",
    "unnumberedVisualsSha256": "视觉目录 SHA-256",
    "baseDecisionsSha256": "批次基线决定 SHA-256",
    "baseLedgerSha256": "批次基线台账 SHA-256",
    "editorialPolicySha256": "编辑政策 SHA-256",
    "analysisSha256": "分析稿 SHA-256",
    "courseOutlineSha256": "课程大纲 SHA-256",
    "freezeSha256": "冻结记录 SHA-256"
  },
  "changes": [
    {
      "sourceId": "figure-1-2",
      "disposition": "compressed",
      "reason": "保留消融结论，压缩技术字段",
      "lessonIds": ["1-1"],
      "markdownRefs": ["reference/book-analysis.md:354"],
      "visualClass": "semantic-core",
      "visualHandling": "redraw",
      "visualHandlingNote": "",
      "visualTextAlternative": "上下文长度有限；加入无关内容会挤占有效信息并降低任务表现",
      "riskFlags": ["visual", "lesson-1-1"],
      "mustKeepIds": ["course-objective-1-1"],
      "symbolTextAlternatives": [],
      "reviewState": "reviewed"
    }
  ]
}
```

`changes` 中每一项都是该 `sourceId` 的完整替换记录，不是字段级 merge：

- 所有记录必须包含 `sourceId`、`disposition`、`reason`、`lessonIds`、
  `markdownRefs`、`reviewState`、`riskFlags`、`mustKeepIds` 和
  `symbolTextAlternatives`。
- figure、table、visual 必须额外包含 `visualClass`、`visualHandling`、
  `visualHandlingNote` 和 `visualTextAlternative`。
- 属于编辑政策冻结 21-ID 冲突集合的来源必须额外包含
  `captionConflictResolved` 和 `captionConflictNote`，不依赖实时索引标记。
- page 必须额外包含 `visualReviewState`、`visualReviewer` 和
  `discoveredVisualIds`、`symbolReview`。

复核补丁中的 page 发现字段必须与冻结快照逐字节一致；若复核者要更正扫描结果，
批次必须先返回发现阶段、追加新的发现台账记录并重新冻结。

整合器按替换后的完整记录执行校验；缺少适用字段时拒绝整批补丁，不能用空值默默
清除已有证据。

整合规则：

1. 批次开始前记录 `coverage-decisions.json` 的 SHA-256。
2. 补丁只允许引用该批复核包中出现的稳定 ID。
3. `sourceId` 不存在、重复、越批或字段值非法时，整批拒绝，不做部分写入。
4. 基线哈希变化时，补丁必须重新基于最新处置文件生成，不能盲目套用。
5. 双审项目的字段完全一致时可直接整合；不一致时由整合者查看双方依据并形成
   一条最终决定。每项分歧都必须填写非空整合理由；最终记录只能改变双方发生
   分歧的字段，双方一致的字段不得被整合者顺手改写。
6. 整合只更新 `coverage-decisions.json` 中对应记录，不重新排列无关记录，
   也不覆盖已完成批次。
7. 写入后立即运行完整结构校验和报告生成。
8. 批次通过后追加 `review-ledger.json` 验收记录，并验证台账中的整合后哈希
   与正式处置文件一致。

双审分歧及整合理由保存在批次验收记录中；正式处置文件只保留最终结论和必要证据，
不混入讨论过程。

已验收来源不能再次进入普通批次，也不能被发现命令改写页面扫描或符号替代字段。
若验收后发现证据错误，v0.1 只登记为待修复事项，等待独立的更正流程设计，不在
原批次上覆盖历史。

## 8. 标题冲突和索引修正

当前 21 个标题冲突必须逐项查看 PDF 证据并填写：

- `captionConflictResolved: true`
- 非空的 `captionConflictNote`

这 21 个稳定 ID 作为已批准基线冻结在编辑政策中；后续即使修正提取器使
`source-index.json` 的实时冲突标记消失，它们仍须保留
`caption-conflict` 风险、双人复核和解决说明，不能因索引修复丢失审计历史。

其中图和表冲突必须同时完成视觉分类和视觉处理。若冲突来自自动提取错误：

1. 记录对应 PDF 页和错误类型。
2. 修正提取或去重规则。
3. 重新生成 `source-index.json`。
4. 验证稳定 ID 没有无理由漂移。
5. 重新生成受影响页面包，再作最终处置。

不得通过把错误标题写进 `reason` 或 `captionConflictNote` 来绕过索引修正。

## 9. 314 页视觉扫描

所有 314 页都必须被人工看过一次，即使页面已有文字、没有编号图表或未进入默认
视觉队列。扫描时将视觉对象分为：

1. 已编号且已在 `source-index.json` 中登记。
2. 未编号但承载语义或证据，需要新增稳定视觉 ID。
3. 装饰性视觉，需要登记后明确排除。
4. 字体图标或符号，需要写出等价文字。

页面级扫描记录写入对应 page 决定的 `visualReviewState`、`visualReviewer` 和
`discoveredVisualIds`。完成门禁按 1–314 连续页码检查，不接受只以“视觉队列已看完”
代替全书扫描。

发现新视觉后的顺序固定为：

`登记身份 → 加入来源集合 → 创建未复核决定 → 分类与处置 → 生成报告`

不得先写课程映射、后补来源身份。

## 10. 报告与进度核对

每个批次整合后重新生成：

- `reference/source-audit/source-coverage-matrix.md`
- `reference/source-audit/visual-asset-index.md`

并执行以下进度检查：

- 批次前后来源总数变化能由新增未编号视觉逐项解释。
- `unreviewed` 的减少量与本批成功整合的原未复核 ID 数完全一致。
- 已复核数量、未复核数量和最终来源总数相加关系正确。
- 21 个标题冲突的未解决数量只减不增；若索引修正产生新冲突，必须明确报告。
- 相同输入连续生成两次，正式 JSON 和 Markdown 报告哈希一致。

报告是正式数据的确定性视图，不接受手工修改。

## 11. 错误处理与恢复

- **PDF 指纹变化：** 在读取和写入前停止；重新确认事实源版本，不自动接受新文件。
- **页图或文本生成失败：** 标记该页未扫描，批次不得完成；修复后从该页重跑。
- **未知或越批 ID：** 拒绝整批补丁，正式处置文件保持原样。
- **处置文件并发变化：** 通过基线哈希拒绝旧补丁，重新生成批次输入。
- **字段不完整：** 拒绝整批补丁并列出具体来源 ID 与缺失字段。
- **来源索引错误：** 修正生成逻辑并重建索引，不用人工备注覆盖错误事实。
- **报告生成失败：** 保留已校验的正式决定，但该批不标记为验收完成。
- **确定性检查失败：** 停止后续批次，定位易变字段或排序问题。

批次写入前保存正式处置文件哈希；失败恢复以该哈希对应的版本控制内容为准，
不使用未校验的临时补丁覆盖正式数据。

## 12. 验证策略

### 12.1 自动验证

- 未编号视觉 ID、页码、区域、必填字段和稳定排序。
- 完整来源集合合并、重复 ID 拒绝及新增决定初始化。
- 视觉文字替代的必填规则，以及符号含义不得只写成“见原图”。
- 页级符号观察数、语义归属、非语义数量与目标决定中的文字含义双向一致。
- 12 课 ID 白名单，以及纳入、压缩、遗漏和排除状态的课程落点规则。
- page 扫描字段初始化、复核者必填、ID 去重、同页限制和双向一致性。
- 页聚合复核包的内容、排序、风险标识和确定性。
- 批次 ID 范围、基线哈希、字段枚举、整批原子拒绝。
- 视觉默认规则和版本边界规则。
- 314 页扫描连续性。
- 复核台账的强制双审原因、复核者非空且互异、抽样比例、最小样本、分歧率、
  升级规则和决策哈希。
- 每批 `unreviewed` 变化量与补丁内容一致。
- 现有来源审计测试继续通过。

### 12.2 人工验收

- 校准批两位复核者确实独立完成。
- 第 10、20、81、239、240、279 页可同时看到页图、文字、来源项和风险提示。
- 第 239 页的两枚星归属于实验 8-1，并写成“实验难度：两星”；
  第 240 页正确展示图 8-3。
- 21 个标题冲突都有 PDF 证据和非空解决说明。
- 第 5、7、9 章全部使用版本边界理由，且没有 v0.1 课程 ID。
- 语义核心图默认重绘；直接复用均有证据保真理由。
- 证据图优先转换成文字或表格，且文字替代保留原结论与限定条件。

## 13. 阶段 A 出口

只有同时满足以下条件，才能冻结内容口径并进入 1-1 纵向样板：

1. 初始 834 项和扫描新增的全部来源项都已完成复核。
2. 314 页视觉扫描完整，页码无缺口。
3. 所有视觉项均有分类、处理方式、文字替代要求和明确去向；所有语义符号均已
   归属到具体来源并写出文字含义。
4. 21 个标题冲突的未解决数量为 0。
5. 所有 `missing` 项都有课程补入位置或经过复核改为其他最终处置。
6. 所有 `included`、`compressed` 和 `missing` 都关联有效课程 ID，
   所有 `excluded` 都没有课程 ID。
7. 复核台账证明每项高风险原因都有对应的独立双审，且分层抽查和必要扩审均已完成。
8. `build_reports --require-complete` 成功。
9. 原始 PDF SHA-256 仍与批准指纹一致。
10. 正式 JSON 与生成报告通过确定性检查。
11. 1-1 来源包已经具备关键结论、适用边界、视觉依据和练习依据。

出口通过只代表课程内容口径已经冻结，不代表课程已经实现。后续课稿和页面仍须
使用稳定 `SourceRef` 验证每项批准内容的实际落地。
