# 自定义课程平台完整开发计划

> 状态：MVP 决策已冻结、可执行
>
> 日期：2026-08-12
>
> 目标版本：Platform MVP v1.0
>
> 基线提交：`4989dc6660774c176c9f0f39aa06650f31da0c8b`

## 1. 目标与实施假设

把当前“固定 12 课的 AI Agent 静态学习站”升级为支持用户自定义内容的课程平台，跑通以下核心闭环：

`创建课程 → 上传多个 PDF/DOCX/MD → 解析与预览 → AI 生成大纲 → 人工确认 → 逐课生成 → 审核编辑 → 发布 → 学习 → 云端记录`

本计划基于以下已确认产品决策：

- MVP 是企业内部、邀请制平台；一套部署对应一个企业工作区，不做多企业 SaaS 管理。
- 当前采用平台内轻量账号；首次启动由用户设置系统管理员名称和管理密码，登录后可验证当前密码并修改，系统管理员也可重置课程管理员密码。长期通过认证适配层接入企业 SSO。
- 上传格式先支持数字版 PDF、扫描 PDF、DOCX 和 Markdown；每门课程允许上传多个源文件，PPT、Excel、音视频后续扩展。
- AI 生成内容默认是草稿，未经人工审核不得发布。
- 发布课程采用不可变版本；修改已发布课程必须创建新版本。
- 只有课程管理员和系统管理员可以发布；系统管理员拥有全局管理和应急下架权限。
- 上传资料、解析产物和生成内容长期保留，直到用户主动删除。
- 发布课程仅对持有企业邀请码或有效企业会话的用户开放；平台不提供互联网匿名公开链接。
- Demo 使用 Vercel + Supabase 部署。若需要公网公开展示，由部署者自行配置公网映射或另建公开部署。
- 企业自行配置 OpenAI-compatible 模型地址、模型和 API 密钥；MVP 不限制预算或数据处理地区，但记录基础调用量便于排障。
- 有文本层的 PDF 不启用 OCR；扫描页默认调用企业配置的视觉 LLM，并预留自定义 OCR Provider。
- 试运行不预置创作者或学习者名单，通过邀请码进入即可。
- 保留现有 12 课作为系统示例课程，并尽量保留已有稳定内容 ID。
- 继续使用现有 React/Vite 学习端；Vercel Functions 提供轻量 API，Supabase 提供数据库、私有文件存储、向量和任务队列。
- 课程生成只允许输出平台支持的内容块，不允许 AI 生成并执行任意前端代码。

## 2. 当前基线与改造边界

### 2.1 可直接复用

- React/Vite/TypeScript 前端工程、主题和响应式样式。
- `LessonPlayer` 的步骤推进、恢复、完成判定和课程导航。
- 学习地图、测验、前后测、错题、收藏、复习和来源展示组件。
- 现有课程与来源数据契约的核心概念。
- Vitest、Testing Library、Playwright 测试体系。
- Python 来源审计工具中的文件指纹、稳定来源 ID、覆盖决策、审核账本和事务写入思路。
- 当前 `/api/course-answer` 的服务端密钥保护、超时和引用返回格式可作为 AI 问答原型参考。

### 2.2 必须替换或重构

- `src/content/lesson-*.ts` 静态内容改为 API 动态加载。
- 固定 12 课的 `learning-map.ts` 改为按课程版本返回动态模块和课时。
- 全局、固定课程 ID 的 `LearningProfile` 改为按用户、课程版本和课时存储。
- localStorage 从主数据源降为匿名体验和短期离线缓存。
- 播放器内按 `experimentKind` 硬编码判断的逻辑改为内容块注册表。
- 单文档硬编码 SHA-256 和固定来源包映射改为数据库中的多文档、多课程来源模型。
- 原生 Node HTTP 原型服务迁移为正式 API；迁移完成前保留兼容入口。

### 2.3 MVP 明确不做

- 课程交易、优惠券、结算和分成。
- 公开课程市场、推荐算法和社交关系。
- 多人实时协同编辑。
- AI 生成任意 JavaScript、React 组件或可执行脚本。
- 自动发布 AI 生成内容。
- 复杂证书、积分、排行榜和推送系统。
- 多模型自动竞价或复杂模型路由。
- 多企业租户、组织套餐和成员计费。
- 平台托管的互联网匿名公开课程。
- 首版预算强控和数据处理地域策略。

## 3. 目标架构

### 3.1 技术选型

| 层级 | 选型 | 说明 |
|---|---|---|
| Web | React + Vite + TypeScript on Vercel | 延续当前项目，Vercel 托管静态前端和预览环境 |
| API | TypeScript Vercel Functions | 复用现有 Node 能力，不新增 FastAPI 服务 |
| 数据库 | Supabase PostgreSQL | 账号、课程、版本、进度、任务和审计主存储 |
| 后台任务 | Supabase Queues + 分步 Vercel Function | 每次只执行一个可恢复步骤，避免长请求超时 |
| 向量检索 | Supabase Postgres + pgvector | 与业务数据共用数据库，MVP 不引入独立向量库 |
| 文件存储 | Supabase Storage 私有桶 | 浏览器直传，服务端签发短时访问地址 |
| 身份认证 | 自建轻量 Session Adapter | 当前账号密码，长期替换为企业 SSO Adapter |
| AI/OCR | 企业配置的 OpenAI-compatible API | 服务端调用；视觉模型作为默认扫描页 OCR |
| 可观测性 | Vercel 日志 + Supabase 任务/审计表 | 全链路携带 `request_id/job_id` |

MVP 不部署 Redis、常驻 Worker 或独立 Python 服务。现有 Python 来源审计脚本继续作为离线质检工具；当文档规模或并发超过 Vercel Function 限制时，再把相同任务协议迁移到常驻 Worker。

### 3.2 服务职责

```text
Web
 ├─ 创作者工作台
 ├─ 课程编辑器
 ├─ 学习端
 └─ 平台管理端

Vercel Functions
 ├─ Bootstrap / Session / Invite
 ├─ Course / Version / Publish
 ├─ Document / Upload
 ├─ Learning / Progress
 ├─ Generation Job
 └─ AI Tutor

Supabase
 ├─ PostgreSQL / pgvector
 ├─ Private Storage
 └─ Durable Queues

Step Executor
 ├─ File validation / extraction
 ├─ LLM vision OCR fallback
 ├─ Structure / chunk / index
 ├─ Outline / lesson generation
 └─ Quality validation
```

### 3.3 目标目录

```text
src/
  app/
  api/                    # API client、查询缓存、错误协议
  features/
    creator-dashboard/
    course-editor/
    document-upload/
    generation-center/
    course-library/
    lesson-player/
    learning-profile/
  content-blocks/         # 内容块注册表与通用互动
  shared/

api/                      # Vercel Functions
  auth/
  courses/
  documents/
  jobs/
  learn/
  internal/

server/                   # 共享服务端领域逻辑；现有问答原型逐步迁移
  auth/
  repositories/
  document-pipeline/
  generation-pipeline/
  quality-pipeline/

supabase/
  migrations/
  seed.sql
  tests/

contracts/
  course-version.schema.json
  generation-output.schema.json
  openapi.json

vercel.json
```

现有 `server/course-answer.mjs` 的问答逻辑迁入共享领域模块，`server/index.mjs` 在 Vercel API 覆盖静态资源和问答能力后删除；迁移期间不得同时维护两套业务规则。

### 3.4 Demo 部署约束

- 文件不经过 Vercel Function 请求体上传；浏览器使用 Supabase Storage 的可恢复直传，规避 Vercel Function 请求体上限。
- 每个解析、OCR 或生成步骤控制在单次 Function 时限内，目标不超过 240 秒。
- 任务写入 Supabase Queue 和 `generation_steps` 后再执行；步骤完成才确认消息，失败可重试。
- 初次请求立即触发第一步，后续步骤链式触发；链路中断时可在生成中心点击“继续”。Cron 只用于兜底扫描，不作为实时调度前提。
- Vercel Hobby 的 Cron 只能每日运行，因此 Demo 必须不依赖分钟级 Cron。
- Supabase Data API 不直接暴露业务表；浏览器统一访问 Vercel API。`service_role` 只保存在 Vercel 服务端环境变量。
- Supabase Storage 使用私有桶；原文件和页图仅通过短时签名 URL 查看。

## 4. 核心领域模型

### 4.1 轻量账号和权限

| 实体 | 核心字段 |
|---|---|
| `system_settings` | `id=1`, `enterprise_name`, `auth_mode`, `bootstrap_completed_at` |
| `admin_accounts` | `id`, `login_name`, `display_name`, `password_hash`, `role`, `status`, `password_changed_at` |
| `admin_sessions` | `id`, `account_id`, `token_hash`, `expires_at`, `revoked_at` |
| `password_reset_events` | `id`, `target_account_id`, `performed_by`, `reason`, `created_at` |
| `invite_codes` | `id`, `code_hash`, `course_id`, `status`, `expires_at`, `max_uses` |
| `learner_profiles` | `id`, `display_name`, `invite_code_id`, `session_token_hash`, `last_seen_at` |
| `model_configs` | `id`, `name`, `base_url`, `model`, `vision_model`, `encrypted_api_key`, `status` |

角色：

- `super_admin`：系统配置、课程管理员、全部课程、发布和应急下架。
- `course_admin`：创建、生成、编辑、审核和发布自己管理的课程。
- `learner`：学习已授权课程。

首次启动只在数据库不存在系统管理员时开放初始化页面，用户设置企业名称、系统管理员名称和管理密码后立即关闭入口。密码使用 `scrypt` 强哈希并加独立随机盐；Session 使用随机令牌、HttpOnly/Secure/SameSite Cookie，数据库只保存令牌哈希。

所有管理员登录后都可以通过“当前密码 + 新密码”修改自己的密码。修改成功后吊销该账号的其他 Session，当前 Session 可重新签发。系统管理员可以为课程管理员设置临时新密码并强制其下次登录修改；系统管理员忘记密码时，MVP 不提供邮件找回，使用部署环境中的一次性恢复密钥或受控数据库运维流程重置，并写审计记录。

学习者通过课程邀请码进入并填写显示名称，不需要复杂注册。邀请码可以长期有效或由课程管理员设置失效时间；已撤销的邀请码不能创建新会话。长期 SSO 接入时只替换认证适配器，不改变课程、权限和学习数据主键。

### 4.2 课程和版本

| 实体 | 核心字段 |
|---|---|
| `courses` | `id`, `manager_id`, `title`, `visibility`, `status` |
| `course_versions` | `id`, `course_id`, `version_number`, `status`, `generation_config`, `published_at` |
| `modules` | `id`, `course_version_id`, `position`, `title`, `objectives` |
| `lessons` | `id`, `module_id`, `position`, `title`, `duration_minutes`, `objectives` |
| `content_blocks` | `id`, `lesson_id`, `position`, `type`, `payload`, `review_status` |
| `quiz_questions` | `id`, `lesson_id`, `kind`, `payload`, `review_status` |
| `citations` | `id`, `content_block_id/question_id`, `source_block_id`, `claim`, `status` |

课程版本状态机：

```text
draft → generating → review_required → ready_to_publish → published → archived
          ↘ failed             ↘ rejected → draft
```

规则：

- `published` 版本正文不可原地修改。
- 学习记录永远绑定 `course_version_id`。
- 生成时只写草稿版本。
- 只有课程管理员和系统管理员可发布；课程管理员只能管理自己负责的课程。
- 删除后立即不可访问，并在 24 小时内异步物理删除原文件、解析块、向量、生成产物和学习数据；删除动作写审计记录。

### 4.3 文档和来源

| 实体 | 核心字段 |
|---|---|
| `source_documents` | `id`, `course_id`, `filename`, `mime_type`, `size`, `sha256`, `status`, `object_key`, `ocr_provider` |
| `source_pages` | `id`, `document_id`, `page_number`, `text`, `ocr_used`, `confidence` |
| `source_blocks` | `id`, `document_id`, `page_number`, `heading_path`, `kind`, `text`, `bbox`, `token_count`, `embedding` |
| `document_issues` | `id`, `document_id`, `severity`, `page_number`, `code`, `message` |

文档状态机：

```text
created → uploading → uploaded → validating → parsing → indexed → ready
                         ↘ rejected    ↘ failed
```

### 4.4 生成任务

| 实体 | 核心字段 |
|---|---|
| `generation_jobs` | `id`, `course_version_id`, `kind`, `status`, `progress`, `attempt`, `idempotency_key` |
| `generation_steps` | `id`, `job_id`, `step_name`, `status`, `input_hash`, `output_ref`, `started_at`, `finished_at` |
| `generation_artifacts` | `id`, `job_id`, `artifact_type`, `schema_version`, `payload`, `validation_result` |
| `ai_usage_records` | `id`, `job_id`, `model`, `prompt_version`, `input_tokens`, `output_tokens`, `cost`, `latency_ms` |

任务状态机：

```text
queued → running → succeeded
           ├→ retry_wait → running
           ├→ cancelled
           └→ failed
```

所有耗时任务使用幂等键；重试必须从最近成功步骤继续，不能重复生成整套课程。

### 4.5 学习数据

| 实体 | 核心字段 |
|---|---|
| `enrollments` | `learner_id`, `course_id`, `course_version_id`, `status`, `enrolled_at` |
| `lesson_progress` | `learner_id`, `course_version_id`, `lesson_id`, `current_block_id`, `completed_at`, `updated_at` |
| `block_progress` | `learner_id`, `content_block_id`, `state`, `completed_at` |
| `answers` | `learner_id`, `question_id`, `selected_answer`, `correct`, `attempt_no` |
| `favorites` | `learner_id`, `course_version_id`, `content_id`, `content_type` |
| `wrong_answers` | `learner_id`, `question_id`, `mastered`, `recorded_at` |

关键唯一索引：

- `(course_id, sha256)` on `source_documents`：同一课程内相同文件去重，不限制不同文件数量。
- `(course_id, filename, deleted_at)`：帮助识别同名文件；同名替换必须由用户确认。
- `(course_id, version_number)`：课程版本唯一。
- `(learner_id, course_version_id)`：报名唯一。
- `(learner_id, lesson_id)`：课时进度唯一。
- `(job_id, step_name, input_hash)`：任务步骤幂等。

## 5. 课程内容契约

### 5.1 版本化 Schema

课程运行时必须使用 JSON Schema 校验，初始 `schemaVersion` 设为 `2`。内容块至少支持：

- `scene`
- `dialogue`
- `rich-text`
- `image`
- `callout`
- `single-choice`
- `multiple-choice`
- `true-false`
- `sorting`
- `matching`
- `scenario`
- `summary`
- `faq`
- `source-evidence`

每个块必须包含稳定 `id`、`type`、`payload`、`citationIds` 和 `reviewStatus`。平台对块进行白名单渲染，不解析 AI 输出的 HTML 脚本。

### 5.2 组件注册表

播放器不再直接判断具体实验名，而是通过注册表：

```ts
interface ContentBlockDefinition<TPayload> {
  validate(payload: unknown): payload is TPayload
  render: React.ComponentType<ContentBlockProps<TPayload>>
  createEmpty(): TPayload
}
```

注册表负责：

- Schema 校验。
- 学习状态序列化。
- 编辑器表单。
- 学习端渲染。
- 无障碍规则。
- 未知块类型的安全降级。

## 6. 文档处理流水线

### 6.1 上传与安全校验

1. API 校验课程管理员权限，为所选多个文件分别创建上传会话。
2. 浏览器将 PDF、DOCX、MD 逐个直传 Supabase Storage 私有桶；大文件使用 TUS 可恢复上传，文件内容不经过 Vercel Function。
3. 完成回调后校验对象大小、MIME、扩展名和 SHA-256。
4. 执行恶意文件扫描；拒绝加密、损坏或超限文件。
5. 写入上传审计记录并投递 Supabase Queue 解析任务。

MVP 每门课程允许多个有效源文件。首版不设置用户、组织或模型预算额度；为保护 Vercel Demo，使用可配置的系统安全上限，默认单文件 100 MB、单课程累计 1,000 页或等价 Markdown 字符量。同名或相同哈希文件必须提示跳过、保留两份或替换；替换后旧文件及其衍生产物进入删除流程。删除单个来源文件时，平台必须先展示受影响的引用、课程内容和索引，不能误删其他文件生成的内容。

### 6.2 解析策略

- 数字版 PDF：提取文本、页码、块位置、标题、列表、表格和图片说明。
- 扫描 PDF：页面无有效文本或文本置信度低时启用 OCR Provider。
- DOCX：提取标题层级、段落、列表、表格、图片替代文本和分页信息。
- Markdown：按 UTF-8 纯文本解析标题、段落、列表、代码块、表格和本地图片引用；禁止执行 HTML、脚本和事件属性，不自动抓取远程资源。
- 表格同时保存结构化单元格和可检索文本。
- 每页记录解析置信度，低置信度页进入“需要确认”。
- 不执行文档中的宏、脚本、超链接或嵌入对象。

OCR 在本计划中指“把扫描页或图片里的文字识别成可引用文本”。默认 `llm_vision` Provider 把单页图片交给企业配置的视觉 LLM；课程管理员可选择 `disabled` 或配置兼容的自定义 OCR HTTP Provider。Provider 统一返回页文本、文本块位置和置信度；若企业配置的模型不支持视觉输入，扫描页必须显示明确失败原因，不能假装解析成功。

### 6.3 切块与索引

- 优先按标题层级和段落边界切块，避免固定字符数截断语义。
- 小块用于精确引用，章节摘要用于大纲生成，全文摘要用于课程规划。
- 每个块保留文档、页码、标题路径、位置和原文哈希。
- 文档发生变化时只重建受影响的摘要、嵌入和引用。

### 6.4 解析预览验收

用户必须能看到：

- 文档清单和处理状态。
- 跨文档标题树、文件筛选和来源文件标识。
- 页数、识别语言、是否使用 OCR。
- 标题树和随机抽样原文。
- 乱码、空白页、低置信度页和失败原因。
- 删除并重新解析入口。

## 7. AI 课程生成流水线

### 7.1 生成配置

创作者可配置：目标学员、语言、难度、预期总时长、模块数范围、课时长度、教学风格、案例领域、测验数量和互动类型。配置保存到课程版本，后续生成可复现。

系统管理员另行配置企业模型：OpenAI-compatible `base_url`、文本模型、视觉模型和 API 密钥。API 密钥使用部署级加密主密钥加密后存储，只允许 Vercel 服务端解密；前端只显示掩码。MVP 不做预算拦截和地域限制，但保留调用次数、Token、耗时与错误记录。

### 7.2 分阶段生成

1. `document-summary`：逐章摘要和术语表。
2. `learning-objectives`：提取学习目标、前置知识和不覆盖范围。
3. `outline`：生成模块、课时和来源块映射。
4. `outline-review`：等待用户确认或编辑，不自动继续。
5. `lesson-plan`：逐课生成教学设计和引用计划。
6. `lesson-content`：并行生成内容块。
7. `assessment`：生成测验、答案、解析和难度标签。
8. `faq`：基于本课来源生成 FAQ。
9. `quality-check`：结构、引用、覆盖、重复、安全和一致性检查。
10. `review-required`：生成结果进入人工审核。

### 7.3 模型调用约束

- 使用版本化系统提示和严格结构化输出。
- 每次只提供完成当前步骤需要的来源块，避免整本材料直接塞入上下文。
- 文档内容始终标记为不可信数据，不能覆盖系统规则。
- 模型不可调用发送、删除、发布或其他外部写操作。
- 输出先过 JSON Schema，再写数据库。
- 格式修复最多重试两次，仍失败则进入人工可见的失败状态。
- 模型回答中的来源 ID 必须和本次提供的来源白名单求交集。

### 7.4 自动质检

发布阻断级检查：

- 所有引用 ID 存在，且属于该课程允许使用的文档。
- 事实性内容块至少有一条有效引用。
- 题目正确答案能从来源或课内内容得到支持。
- 内容块和题目通过 Schema。
- 不存在空课、空模块、重复稳定 ID 或断裂关联。
- 不包含脚本、危险链接、密钥或明显敏感信息。

警告级检查：

- 学习目标没有内容或测验覆盖。
- 课时间重复度过高。
- 难度、语气或预计时长偏离配置。
- 引用只覆盖宽泛章节，缺少精确页码。

### 7.5 局部重生成

允许重生成大纲、单课、单个内容块或单道题。用户编辑或锁定过的内容不得被整课重生成覆盖；生成前展示影响范围，生成后支持差异对比和撤销。

## 8. 创作者端开发范围

### 8.1 页面和路由

| 路由 | 页面 |
|---|---|
| `/dashboard` | 我的课程、状态、最近任务 |
| `/courses/new` | 创建课程与生成配置 |
| `/courses/:courseId/sources` | 上传、解析状态和来源预览 |
| `/courses/:courseId/outline` | 大纲确认和排序 |
| `/courses/:courseId/editor` | 课程树、内容编辑和引用审核 |
| `/courses/:courseId/generation` | 任务步骤、进度、错误和重试 |
| `/courses/:courseId/preview` | 学习者视角预览 |
| `/courses/:courseId/settings` | 权限、版本、删除和导出 |

### 8.2 编辑器布局

- 左栏：模块、课时、内容块树和完成状态。
- 中栏：内容块编辑、排序、添加、删除、锁定和重生成。
- 右栏：来源原文、页码、引用、质检问题和版本差异。
- 顶栏：自动保存状态、预览、提交审核、发布。

### 8.3 编辑器可靠性

- 采用乐观并发版本号，保存冲突时不得静默覆盖。
- 自动保存失败必须保留本地草稿并提示重试。
- 删除、批量重生成和发布需要明确确认。
- 操作写入审计日志；关键版本支持回滚。

## 9. 学习端开发范围

- 课程库和报名入口。
- 动态课程主页、模块目录和学习地图。
- 动态内容块播放器。
- 云端进度、答案、收藏、错题和复习。
- 发布版本锁定与升级提示。
- 弱网重试；本地缓存只保存待同步操作和最近课程。
- 带来源引用的课程问答，资料不足时明确拒答。
- 课程完成度和学习报告。

学习进度 API 必须接受幂等请求；客户端重复发送不会产生重复答题记录或错误完成度。

## 10. API 计划

### 10.1 初始化、账号和配置

```text
GET    /api/v1/bootstrap/status
POST   /api/v1/bootstrap
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/session
POST   /api/v1/auth/change-password
POST   /api/v1/admin-accounts
PATCH  /api/v1/admin-accounts/{account_id}
POST   /api/v1/admin-accounts/{account_id}/reset-password
PUT    /api/v1/settings/model
POST   /api/v1/settings/model/test
POST   /api/v1/courses/{course_id}/invite-codes
POST   /api/v1/invites/{invite_code}/join
```

`POST /bootstrap` 必须是事务操作并使用数据库唯一约束保证只成功一次；不能只依赖前端隐藏初始化页面。

### 10.2 课程与版本

```text
POST   /api/v1/courses
GET    /api/v1/courses
GET    /api/v1/courses/{course_id}
PATCH  /api/v1/courses/{course_id}
POST   /api/v1/courses/{course_id}/versions
GET    /api/v1/course-versions/{version_id}
PATCH  /api/v1/course-versions/{version_id}
POST   /api/v1/course-versions/{version_id}/validate
POST   /api/v1/course-versions/{version_id}/submit-review
POST   /api/v1/course-versions/{version_id}/publish
```

### 10.3 文档和生成

```text
POST   /api/v1/courses/{course_id}/documents/uploads
POST   /api/v1/documents/{document_id}/uploads/complete
GET    /api/v1/documents/{document_id}
GET    /api/v1/documents/{document_id}/blocks
DELETE /api/v1/documents/{document_id}
POST   /api/v1/course-versions/{version_id}/outline-jobs
POST   /api/v1/course-versions/{version_id}/generation-jobs
POST   /api/v1/content-blocks/{block_id}/regeneration-jobs
GET    /api/v1/generation-jobs/{job_id}
POST   /api/v1/generation-jobs/{job_id}/retry
POST   /api/v1/generation-jobs/{job_id}/cancel
```

### 10.4 学习

```text
POST   /api/v1/courses/{course_id}/enrollments
GET    /api/v1/learn/courses/{course_id}
GET    /api/v1/learn/course-versions/{version_id}/progress
PUT    /api/v1/learn/lessons/{lesson_id}/progress
POST   /api/v1/learn/questions/{question_id}/answers
PUT    /api/v1/learn/favorites/{content_id}
DELETE /api/v1/learn/favorites/{content_id}
POST   /api/v1/learn/course-versions/{version_id}/questions
```

统一错误体：

```json
{
  "error": {
    "code": "DOCUMENT_PARSE_FAILED",
    "message": "文档解析失败",
    "requestId": "...",
    "details": {}
  }
}
```

API 使用 OpenAPI 生成 TypeScript 客户端；前后端不得各自手写同一套枚举和错误码。

## 11. 旧课程和学习档案迁移

### 11.1 12 课内容迁移

1. 编写只读迁移器，将 `src/content/lesson-*.ts` 投影为 v2 JSON。
2. 创建系统组织和“红叔 Agent 入门课”示例课程。
3. 按现有模块、课时和步骤顺序导入第一个发布版本。
4. 保留 `lessonId`、`contentId`、问题 ID 和来源 ID，减少进度断裂。
5. 将现有专用实验映射到注册表内容块；无法通用化的先作为 `legacy-*` 块保留。
6. 对导入结果做数量、引用、题目和渲染快照比对。

### 11.2 localStorage 学习档案迁移

- 首次登录检测旧档案，展示迁移预览并由用户确认。
- 客户端提交旧 Schema 和一次性 `migration_id`。
- 服务端白名单校验后映射到示例课程 v1。
- 同一个 `migration_id` 重复提交返回同一结果。
- 服务端写入成功前不删除本地档案。
- 迁移成功后仍允许用户导出原 JSON，至少保留一个版本周期。

### 11.3 AI 问答迁移

- 保留旧 `/api/course-answer` 兼容层一个版本周期。
- 新端点读取数据库中的课程版本和来源块。
- 引用协议从正则提取升级为结构化响应。
- 新端点验收完成后移除固定课程映射和原始文档直出逻辑。

## 12. 安全、隐私和治理

### 12.1 账号和会话

- 初始化系统管理员的数据库写入必须具备唯一约束和事务保护，防止并发创建两个超管。
- 管理密码使用 Node `crypto.scrypt` 和独立随机盐，不保存明文或可逆密文。
- 登录接口按 IP 和账号限速；连续失败写安全审计。
- Session Cookie 设置 HttpOnly、Secure、SameSite=Lax；令牌数据库只存哈希，可主动吊销。
- 自助改密必须验证当前密码；新密码不能与当前密码相同，成功后更新 `password_changed_at` 并吊销其他 Session。
- 系统管理员重置课程管理员密码必须写审计并生成一次性临时密码；课程管理员下次登录强制改密。
- 超管恢复入口必须依赖部署环境中的一次性恢复密钥，并在使用后立即轮换；不提供可枚举的公开“忘记密码”接口。
- 课程管理员所有写操作校验 `courses.manager_id`；系统管理员可全局管理。
- 未来 SSO 只实现新的 `AuthProvider`，不把 SSO 身份字段散落进课程表。

### 12.2 Supabase 数据和文件

- 业务表放在非暴露 Schema，Supabase Data API 关闭或不暴露业务 Schema；浏览器统一通过 Vercel API。
- 若未来开放 Data API，必须同时配置最小 `GRANT` 和 RLS，不能只写 `TO authenticated`。
- `service_role`、数据库连接和模型解密主密钥只保存在 Vercel 服务端环境变量，绝不进入 Vite 前端变量。
- Supabase Storage 使用私有桶；下载使用短时签名 URL，存储键使用随机 ID。
- 浏览器直传只获得指定对象路径和有限时效的上传权限，不能列举或覆盖其他文件。
- 上传资料、解析产物和生成内容默认永久保留；用户主动删除后立即停止访问，并在 24 小时内清理原文件、页图、解析块、向量、生成缓存和关联学习数据。
- 日志不得记录原文、管理密码、模型密钥、签名 URL 或完整用户问题。

### 12.3 模型安全

- 企业模型 API 密钥使用部署级主密钥加密存储，只允许系统管理员替换和测试。
- 用户文档和问题是否被供应商用于训练由企业选择的模型服务条款决定；配置页必须提示管理员自行确认。
- 文档提示注入按不可信内容处理，不能改变系统提示、权限或发布状态。
- 设置系统级输入长度、输出长度和并发安全上限；MVP 不设置预算封顶或数据地区拦截。
- 模型供应商、模型版本、提示版本、Token、耗时和错误写入使用记录，但不以费用为由阻断任务。

### 12.4 权限测试

每个资源型 API 至少覆盖：系统管理员允许、负责该课程的课程管理员允许、其他课程管理员拒绝、无邀请码学习者拒绝、已撤销邀请码拒绝、已删除资源拒绝、签名 URL 过期和越权 ID 枚举。

## 13. 可观测性和运营

### 13.1 关键指标

- API 成功率、P50/P95/P99 延迟。
- 上传成功率和失败原因。
- 文档解析成功率、OCR 比例和每页耗时。
- 生成任务成功率、重试率、取消率和阶段耗时。
- 单课程输入/输出 Token、耗时和缓存命中率；供应商未返回价格时不计算费用。
- 自动质检阻断项数量和人工驳回率。
- 发布课程数、报名数、开课率、完课率。
- 学习进度同步失败率。

### 13.2 告警

- API 5xx 连续超阈值。
- 队列积压或任务长时间无心跳。
- 模型错误率和超时率异常。
- 对象存储或数据库容量异常。
- 模型调用量或错误率突增。
- 管理员登录失败或越权拒绝异常上升。

### 13.3 管理后台

MVP 管理后台只提供：系统初始化、课程管理员、企业模型配置、课程状态、任务失败详情、重试/取消、基础 AI 用量、审计日志和主动删除。暂不建设组织套餐、试运行名单和复杂运营报表。

## 14. 测试策略与质量门槛

| 层级 | 覆盖内容 |
|---|---|
| 单元测试 | Schema、状态机、改密/重置/Session 吊销、权限、切块、引用、进度合并 |
| 契约测试 | OpenAPI、前端客户端、模型/OCR Provider、结构化输出、Storage 回调 |
| 集成测试 | Supabase PostgreSQL、Storage、Queues、Vercel Functions、模型模拟服务 |
| 语料回归 | 多 PDF、扫描/双栏/含表格 PDF、DOCX、MD、同名文件、乱码和损坏文件 |
| 组件测试 | 上传、编辑器、任务进度、播放器、冲突和错误状态 |
| E2E | 初始化超管、管理员改密/重置、创建课程管理员、多文件上传到发布、邀请码学习、失败重试、版本升级 |
| 安全测试 | 越权、路径穿越、恶意 MIME、提示注入、限流、签名过期 |
| 性能测试 | 并发上传、进度写入、任务排队、长文档生成 |
| 恢复测试 | Function 超时、步骤链中断、模型超时、数据库瞬断、重复回调和备份恢复 |

发布硬门槛：

- 所有 P0/P1 自动化测试通过。
- 课程 JSON Schema 和数据库迁移具备向前、回滚验证。
- 100% 引用 ID 有效；事实性内容引用覆盖率不低于 95%。
- 未授权访问和课程管理员跨课程越权测试 100% 被拒绝。
- 已发布版本修改不会改变旧学习记录的解释。
- 数字版 PDF、DOCX 和 UTF-8 Markdown 测试语料解析成功率不低于 98%。扫描 PDF 在配置了支持视觉输入的默认 LLM 时，测试语料 OCR 成功率不低于 95%；未配置视觉模型时必须明确阻断并提示配置。
- 多来源引用必须始终携带 `document_id`，同页码或同标题不能串到另一份文件。
- 生成任务中断后可从步骤级检查点恢复。
- 桌面及 360/768/1024/1440px 关键流程通过。
- 关键流程满足键盘可达、焦点可见和 WCAG 2.1 AA 对比度要求。

## 15. 非功能目标

- 普通读取 API：P95 小于 500 ms。
- 学习进度写入：P95 小于 800 ms。
- 150 页数字版 PDF：解析 P90 小于 3 分钟。
- 10 课时标准课程：生成 P90 小于 15 分钟，不包含人工确认等待。
- API 月可用性目标：99.9%。
- 任务状态更新延迟：小于 10 秒。
- 每个 Vercel 任务步骤目标小于 240 秒；超过时按页、章节或课时进一步拆分。
- 使用 Supabase 可用的数据库备份能力，目标 RPO 24 小时、RTO 4 小时；正式上线前演练恢复。
- 所有耗时操作写入 Supabase Queue 和步骤表，浏览器刷新不丢失任务；链式触发中断后可手动继续。
- 资料永久保留不等于无备份风险；数据库记录和 Storage 对象都必须纳入恢复清单。

以上指标在试运行两周后根据真实文档体量调整，不以牺牲引用质量换取速度。

## 16. 分阶段实施计划

### 阶段 0：基线与契约（第 1 周）

- P0-01 冻结当前 12 课功能、测试结果、数据数量和关键页面截图。
- P0-02 完成课程 v2 Schema、内容块注册表协议和统一错误体。
- P0-03 建立 Supabase 本地环境、迁移规范、Vercel Preview 和 CI。
- P0-04 确认管理员初始化、邀请码、永久保留和主动删除流程。

出口条件：现有测试通过；Vercel Preview 和 Supabase 测试项目可连接；契约评审通过。

### 阶段 1：轻量平台底座（第 2 周）

- P1-01 首次启动页、系统管理员初始化和关闭初始化入口。
- P1-02 管理员登录、Session、登出、自助改密、Session 吊销和登录限速。
- P1-03 系统管理员创建/停用课程管理员、重置课程管理员密码和超管受控恢复。
- P1-04 企业模型配置、密钥加密保存和连通性测试。
- P1-05 课程、版本、审计日志基础表和 Vercel API。

出口条件：超管可初始化系统、配置模型、创建课程管理员；未授权访问全部拒绝。

### 阶段 2：动态课程与多文件上传（第 3–4 周）

- P2-01 课程 v2 运行时类型、JSON Schema 和内容块注册表。
- P2-02 学习地图和播放器改为 Supabase 数据驱动。
- P2-03 12 课迁移器和系统示例课程 Seed。
- P2-04 每课程多个文件、批量上传、Supabase Storage 可恢复直传和私有访问。
- P2-05 PDF/DOCX/MD 文本提取、跨文档标题树、来源块和解析预览。
- P2-06 默认视觉 LLM OCR Provider、自定义 Provider 接口和错误提示。

出口条件：数据库中的示例课可学习；课程管理员可上传多个 PDF、DOCX 或 MD，并按来源文件查看可追溯解析结果。

### 阶段 3：AI 课程生成（第 5–6 周）

- P3-01 Supabase Queue、任务表、分步执行器和链路恢复。
- P3-02 章节摘要、学习目标、术语和大纲生成。
- P3-03 大纲人工确认后逐课生成内容、互动、测验和 FAQ。
- P3-04 Schema、引用、覆盖和重复检查。
- P3-05 生成中心、进度轮询、失败详情、继续、取消和局部重试。

出口条件：多个来源文件可稳定生成同一套草稿课程；Function 中断后可继续；跨文档错误引用不能通过质检。

### 阶段 4：编辑、发布与邀请学习（第 7–8 周）

- P4-01 课程树和内容块编辑器，支持自动保存和保存冲突。
- P4-02 来源原文、引用审核、质检问题和单块重生成。
- P4-03 预览、审核、版本化发布和系统管理员应急下架。
- P4-04 课程邀请码、学习者显示名称和学习 Session。
- P4-05 云端进度、答案、错题、收藏和复习。
- P4-06 localStorage 示例课档案迁移和课程问答。

出口条件：课程管理员或超管可发布；学习者通过邀请码完成课程；其他课程管理员不能越权。

### 阶段 5：删除、加固和 Demo 上线（第 9–10 周）

- P5-01 主动删除与 24 小时内衍生数据清理。
- P5-02 权限、安全、语料、恢复、性能和响应式专项测试。
- P5-03 Vercel Preview E2E，通过后 Promote 同一构建产物。
- P5-04 Supabase 备份恢复和任务链中断演练。
- P5-05 邀请制试运行；人数不限，依据反馈修复 P0/P1。
- P5-06 上线清单、运维说明、Vercel 回滚和数据库迁移回滚演练。

出口条件：全部硬门槛通过，Vercel + Supabase Demo 可稳定跑通完整闭环。

## 17. 推荐团队和职责

| 角色 | 建议投入 | 主要责任 |
|---|---:|---|
| 产品/教研 | 0.5–1 | 模板、审核标准和试运行反馈 |
| 全栈前端/Node | 2 | 工作台、Vercel API、编辑器、播放器和学习端 |
| AI/数据工程 | 1 | 文档解析、OCR Provider、检索、生成和质检 |
| QA/设计 | 0.5–1 | 关键体验、语料、E2E、安全和恢复测试 |

3–4 人核心团队按 10 周完成 MVP；单人全职实施建议按 16–22 周估算。若扫描 PDF 兼容性要求很高，可把自定义 OCR Provider 完整管理界面延后，只保留配置文件级接入。

## 18. Sprint 交付节奏

采用两周一个 Sprint：

| Sprint | 演示结果 |
|---|---|
| S0 | 契约、Supabase/Vercel 环境和基线报告 |
| S1 | 初始化超管、课程管理员、模型配置和动态示例课 |
| S2 | 多文件上传、跨文档解析预览和默认 LLM OCR |
| S3 | 大纲与逐课生成、任务恢复和质检 |
| S4 | 编辑、发布、邀请码学习和云端进度 |
| S5 | 删除、试运行、恢复演练和 Demo 上线；作为风险缓冲 Sprint |

每个 Sprint 必须交付可演示纵向切片，不接受只完成数据库表或只完成静态页面。

## 19. 主要风险和应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 长 PDF 解析质量不稳定 | 引用和课程事实错误 | 解析预览、置信度、OCR 回退、语料回归 |
| AI 一次生成内容过多 | 超时、成本高、难重试 | 分阶段、逐课生成、检查点、局部重试 |
| 模型伪造引用 | 课程不可信 | 来源白名单、结构化引用、数据库校验、发布阻断 |
| 发布后内容变化 | 旧进度失效 | 不可变课程版本、稳定内容 ID |
| 编辑器范围膨胀 | 延期 | MVP 仅支持注册块、单人编辑、无实时协同 |
| 自建管理员密码被撞库 | 管理权限泄露 | scrypt、强密码提示、登录限速、Session 吊销和审计 |
| 密码修改后旧 Session 仍有效 | 账号继续被滥用 | `password_changed_at` 校验、吊销其他 Session、重置后强制改密 |
| 课程管理员跨课程越权 | 内容和学习数据泄露 | 服务端 `manager_id` 校验、自动化越权测试和审计 |
| 多文档引用串线 | 教学内容引用错误文件 | 引用强制携带 `document_id + source_block_id`，按文件筛选和发布阻断 |
| 模型费用失控 | 企业账单增加 | MVP 不阻断，但展示调用量、缓存结果并支持立即停用配置 |
| Function 链路中断 | 任务长期暂停 | Supabase Queue、幂等步骤、生成中心“继续”与每日兜底扫描 |
| Vercel Hobby 调度限制 | 任务不能依赖分钟级 Cron | 首次和链式即时触发，Cron 只做每日修复 |
| 旧站迁移回归 | 已有课程受损 | 示例课程 Seed、旧 ID 保留、双轨回归测试 |
| 用户上传无权材料 | 法务风险 | 上传声明、权限条款、删除和投诉流程 |

## 20. 上线和回滚

### 20.1 灰度顺序

1. Vercel Preview 环境完成自动测试和管理员验收。
2. 系统管理员在生产环境完成初始化并创建课程管理员。
3. 课程管理员创建邀请码，按需邀请创作者和学习者，不维护预置名单。
4. 企业内逐步扩散邀请码；平台始终不开放匿名访问。

每阶段至少观察 48 小时的错误率、任务失败率、成本和内容质量。

### 20.2 回滚策略

- 前端和 Vercel Functions 使用同一 Preview 构建产物验证，通过后 Promote；异常时 Instant Rollback 到上一个部署。
- API 保持一个版本周期的向后兼容。
- 数据库迁移采用 expand/contract；破坏性收缩延后一版本。
- 任务执行器新旧消息格式并存，旧队列清空后再下线旧处理器。
- 发布课程版本不回写；有问题时下架版本或切换到上一个已发布版本。
- 上线前完成数据库和对象存储恢复演练。

## 21. Definition of Done

任一任务只有同时满足以下条件才算完成：

- 代码和 Schema 已评审。
- 单元、集成或 E2E 测试覆盖对应风险。
- 权限、错误、空状态和重试路径已处理。
- 日志、指标和审计信息可定位问题。
- 用户界面具备加载、成功、失败和恢复状态。
- 文档和 API 契约已更新。
- 不引入前端密钥、跨租户数据或不可恢复写入。
- 通过对应阶段出口条件。

## 22. 已冻结 MVP 决策

| 事项 | 冻结结论 |
|---|---|
| 平台性质 | 企业内部、邀请制，一套部署对应一个企业 |
| 当前身份 | 首次启动设置系统管理员名称和管理密码；支持自助改密；超管创建课程管理员并可重置其密码 |
| 长期身份 | 通过认证适配层接入企业 SSO |
| 源文件 | 每门课程可上传多个 PDF、DOCX 或 MD；默认单文件 100 MB、单课程累计 1,000 页或等价字符量，可配置 |
| 用户/组织额度 | MVP 不设置套餐或业务额度 |
| 内容保留 | 长期保留，用户主动删除后执行完整清理 |
| 发布权限 | 课程管理员、系统管理员 |
| 模型配置 | 企业自行配置 OpenAI-compatible 文本/视觉模型和 API 密钥 |
| 预算与地区 | MVP 不设预算封顶和数据处理地区限制 |
| 课程访问 | 企业邀请码或有效企业会话；不支持互联网匿名公开 |
| Demo 部署 | Vercel + Supabase；公网映射或另行公开部署由用户自行负责 |
| OCR | 有文本层时不用；扫描页默认用已配置视觉 LLM，并允许自定义 Provider |
| 试运行名单 | 不预置、不限人数，邀请码控制入口 |

仍需在实施时设置但不属于产品决策的问题只有环境参数：Supabase 项目、Vercel 项目、加密主密钥、默认文件安全上限、Session 有效期和管理员初始强密码规则。这些参数全部通过环境变量或系统设置管理，不写死在业务代码中。

## 23. 实施参考基线

实现阶段以官方文档的当前版本为准，并在升级依赖或部署前重新检查变更日志：

- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)：确认请求体、运行时长、内存和函数包限制。
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)：确认计划任务调用方式；Hobby 调度限制不能承担实时生成。
- [Supabase Queues](https://supabase.com/docs/guides/queues)：任务消息只由服务端消费者访问，不向浏览器暴露队列 API。
- [Supabase API Security](https://supabase.com/docs/guides/api/securing-your-api)：业务表采用非暴露 Schema 或显式最小授权；若开放 Data API，必须同时配置 GRANT 和 RLS。
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)：源文件使用私有桶和有限权限。
- [Supabase Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)：大文件使用 TUS 直传，不经过 Vercel Function 请求体。

Vercel、Supabase 和模型供应商均可能调整限制。上述链接是实现时的核对入口，文档中的数值不是永久平台承诺。
