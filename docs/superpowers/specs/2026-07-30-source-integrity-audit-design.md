# 原始PDF来源完整性审计设计

> **状态：** 自动化工具已实现并硬化，834项人工复核待执行
> **适用阶段：** 《06 开发计划与验收标准》阶段A
> **事实源：** `reference/原始文档.pdf`

## 1. 目标

建立一条可重复验证的来源链路：

`原始PDF → 原书分析稿 → 12课大纲 → 单课内容/题目/视觉`

审计完成后，应能回答三个问题：

1. 原书每项内容在项目中去了哪里。
2. 没有进入课程的内容是主动取舍还是转换遗漏。
3. 图、表、实验和语义图标应复用、重绘、转成文字还是排除。

## 2. 成功口径

### 2.1 来源清点完整

- PDF 314页全部登记。
- 章节、节、小节使用PDF书签结构登记。
- 当前基线中的120幅编号图、23张编号表、94个编号实验全部建立稳定ID。
- 原始PDF保持不变，并通过SHA-256指纹验证。

### 2.2 课程选择可解释

每个来源项最终使用下列一种状态：

| 机器值 | 中文含义 | 使用规则 |
|---|---|---|
| `included` | 完整纳入 | 课程保留原结论、边界和必要上下文 |
| `compressed` | 压缩表达 | 课程保留核心含义，省略技术细节 |
| `excluded` | 主动排除 | 因目标用户、时长或课程边界排除，并记录理由 |
| `missing` | 疑似遗漏 | 本应纳入但当前产物没有覆盖 |
| `unreviewed` | 未检查 | 只允许出现在阶段A进行中，不允许通过出口验收 |

“全部包含”指所有来源项都有明确去向，不代表课程逐字复制原书。

### 2.3 视觉语义可恢复

每个图表额外标记视觉类别：

| 类别 | 定义 | 默认处置 |
|---|---|---|
| `semantic-core` | 架构、流程、关系或取舍本身依赖视觉结构 | 涉及课程时复用或重绘 |
| `evidence` | 实验结果、数据图或产品截图 | 按论证需要保留并标明来源 |
| `decorative` | 不影响知识理解 | 可排除 |

视觉处置使用 `reuse`、`redraw`、`text-alt`、`omit` 四种机器值。承载判断或难度的 `✓ / ✗ / △ / ★` 必须同时转换成文字，不能仅保留符号。

## 3. 文件边界

### 3.1 原始输入

- `reference/原始文档.pdf`：不可修改的事实源
- `reference/book-analysis.md`：分析和选材层
- `02-课程大纲.md`：课程映射层
- `01-项目概述与PRD.md`、`03-视觉设计规范.md`、`04-交互与AI方案.md`：产品表达层

### 3.2 审计代码

- `scripts/source_audit/models.py`：稳定ID、字段和校验规则
- `scripts/source_audit/extract_pdf_index.py`：提取PDF元数据、书签、逐页文字特征、图表和实验编号
- `scripts/source_audit/build_reports.py`：合并自动索引与人工处置，生成Markdown报告
- `scripts/source_audit/render_review_pages.py`：把需要人工视觉复核的PDF页渲染到临时目录

### 3.3 审计数据与报告

- `reference/source-audit/source-manifest.json`：PDF路径、SHA-256、页数、标题和基线计数
- `reference/source-audit/source-index.json`：自动生成的章节、页面、图表和实验索引
- `reference/source-audit/coverage-decisions.json`：唯一允许人工维护的处置记录
- `reference/source-audit/source-coverage-matrix.md`：自动生成的人类可读覆盖矩阵
- `reference/source-audit/visual-asset-index.md`：自动生成的视觉资产去向表

自动生成文件采用稳定排序，不写入易变时间戳，保证相同输入产生相同结果。

### 3.4 测试

- `tests/source_audit/test_models.py`：状态值、稳定ID和决策校验
- `tests/source_audit/test_extract_pdf_index.py`：标题识别、编号解析、去重和页码映射
- `tests/source_audit/test_build_reports.py`：报告排序、缺失决策和统计汇总
- `tests/source_audit/test_render_review_pages.py`：默认视觉队列、渲染参数和源文件保护
- `tests/source_audit/test_original_pdf_integration.py`：针对当前原始PDF验证314页、120图、23表、94实验

### 3.5 执行隔离

项目已初始化Git；阶段A自动化工具在 `goal/source-integrity-audit` 分支和
`.worktrees/source-integrity-audit` 隔离工作区中实施，`.worktrees/` 已纳入
忽略规则。原始材料、计划与规格均由版本控制基线保护，原始PDF只读访问，
任何生成目标都不得与源PDF或其他输入指向同一文件、软链接或硬链接。

`extract_pdf_index.py` 与 `build_reports.py` 默认要求原始PDF的批准指纹为
`27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac`。
指纹不一致时在解析或写入产物前停止。若人工确认要审计另一个PDF版本，
可显式传入该文件的实际指纹 `--expected-sha256`；该参数只确认本次输入，
不会改写批准默认值或源文件。

## 4. 数据结构

### 4.1 来源项

```json
{
  "sourceId": "figure-1-2",
  "kind": "figure",
  "chapter": "1",
  "number": "1-2",
  "pdfPage": 20,
  "printedPage": 12,
  "title": "实验1-1——上下文消融实验设计",
  "symbolCounts": {
    "check": 22,
    "cross": 6,
    "triangle": 2,
    "star": 2
  }
}
```

`sourceId` 不随标题文字变化；编号项使用类型和原书编号，普通页面使用三位文件页码，例如 `page-020`。

### 4.2 人工处置

```json
{
  "sourceId": "figure-1-2",
  "disposition": "compressed",
  "reason": "1-1课程保留消融结论，但不展示全部技术字段",
  "lessonIds": ["1-1"],
  "markdownRefs": [
    "reference/book-analysis.md:354"
  ],
  "visualClass": "semantic-core",
  "visualHandling": "redraw",
  "reviewState": "reviewed"
}
```

校验规则：

- `sourceId` 必须存在于自动索引。
- 一个 `sourceId` 只能有一条人工处置。
- `excluded` 和 `missing` 必须提供 `strip()` 后非空的字符串理由。
- reviewed 的 figure/table 必须同时填写 `visualClass` 和 `visualHandling`。
- `missing` 必须至少关联一个非空 `lessonId`。
- 索引中 `captionConflict=true` 的项目只有在
  `captionConflictResolved=true` 且 `captionConflictNote` 非空时才能通过阶段A出口。
- `semantic-core` 且被课程使用时，`visualHandling` 不能为 `omit`；只有记录了
  非空排除理由、没有课程落点的 `excluded` 项才允许 `semantic-core + omit`。
- `reviewState=reviewed` 时不得缺少最终处置。

### 4.3 单课来源引用

后续课程数据契约中的 `SourceRef` 使用同一稳定ID：

```ts
interface SourceRef {
  sourceId: string;
  pdfPage: number;
  printedPage?: number;
  note: string;
}
```

课程不复制审计元数据，只保存稳定引用和本课使用说明。

## 5. 数据流

1. 对PDF计算指纹并读取元数据、书签和逐页文本。
2. 识别图、表、实验编号和语义符号，生成自动索引。
3. 对照分析稿和课程大纲创建初始处置文件；无法可靠判断的项目使用 `unreviewed`。该文件只在不存在时创建，后续生成不得覆盖人工修改。
4. 默认渲染含图表、关键符号或 `charCount == 0` 的页面；空文本页即使没有
   编号项或语义符号也必须进入视觉复核，多重入队理由按页码排序去重。
5. 校验人工处置并生成两份Markdown报告；阶段性报告保留所有标题冲突的
   选中标题、候选 occurrence、解决状态和备注。
6. 阶段A出口检查拒绝任何 `unreviewed`、无理由排除、无去向语义图示或
   未人工解决的标题冲突。

## 6. 人工与自动化边界

自动化负责：

- 文件指纹、页数、书签和编号识别
- 稳定ID、统计、交叉引用和格式校验
- 页面渲染、报告生成和差异检测

人工负责：

- 判断内容是否适合目标用户
- 区分压缩表达与真实遗漏
- 判断图表是否承载不可替代的视觉语义
- 决定补入哪一课及采用复用、重绘还是文字替代

系统不得用关键词命中自动宣布“已覆盖”。

## 7. 错误处理

- PDF不存在或与默认批准指纹不一致：停止生成，提示重新确认事实源版本；
  只有显式提供匹配的 `--expected-sha256` 才接受已人工确认的新版本。
- 任一页面抽取不到文字：记录页码并强制进入默认视觉复核队列，不静默跳过。
- 编号重复或跨页标题冲突：阶段性报告保留并统计全部冲突证据；在人工填写
  解决状态和非空备注前，`--require-complete` 必须失败。
- 当前基线计数发生变化：集成测试失败，要求人工确认PDF版本。
- 人工处置引用不存在的来源ID：校验失败。
- 报告存在 `unreviewed`：允许生成阶段性报告，但阶段A出口命令失败。
- Poppler不可用：文字索引仍可生成，视觉复核明确标记未完成，不得通过阶段A。

## 8. 验证策略

### 自动验证

- 单元测试覆盖编号解析、状态转换、稳定排序、空文本页视觉入队和无效决策。
- 集成测试验证原始PDF指纹、314页及120/23/94基线。
- 相同输入连续生成两次，输出文件哈希必须一致。
- 生成报告中的总数必须与JSON索引一致。

### 人工抽查

- 每章至少抽查一页正文、一幅语义图和一个实验。
- 必查PDF文件页10、20、81、279，用于验证公式关系、消融矩阵、记忆策略和多Agent架构。
- 检查 `✓ / ✗ / △ / ★` 是否转为文字含义。
- 检查Markdown和静态PNG是否存在空方框、缺角或不可读图标。

## 9. 阶段A出口

只有同时满足以下条件才允许冻结项目基线：

1. 自动测试全部通过。
2. PDF指纹与审计清单一致。
3. 所有来源项都已人工处置。
4. 所有语义核心视觉均有明确去向。
5. 所有疑似遗漏都有补入位置或排除决定。
6. 1-1来源包已具备可用于纵向样板的结论、边界、图示和题目依据。

## 10. 非目标

- 不把314页原书全文复制进项目。
- 不在阶段A开发学习网站或接入AI服务。
- 不自动认定关键词相似就代表内容完整。
- 不批量提交314页渲染图；视觉复核图只存放在 `tmp/pdfs/source-audit/`。
- 不在未确认来源去向前批量编写剩余11课。
