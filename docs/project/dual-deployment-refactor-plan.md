# Internet / Cowork 双模式单仓改造计划

更新日期：2026-08-20

## 1. 项目定义

`ai-agent-learning` 是一个开源 Agent 学习平台，使用同一份课程内容、学习引擎、档案协议和界面代码，构建为两个相互隔离的官方部署实例：

- **Internet 模式**：部署到 Vercel，公开访问；访客可把学习进度保存在浏览器本地，也可使用 AI 自由问答；注册用户通过 Supabase 邮箱 OTP 登录，将档案同步到 Supabase PostgreSQL。
- **Cowork 模式**：部署到公司 Cowork，必须使用 Cowork SSO；学习档案只写入 Cowork 运行时 PostgreSQL，AI 只走 Runway；不提供邮箱 OTP、匿名身份、存储模式切换或浏览器本地持久化回退。

两种实例不共享用户表和学习数据。相同邮箱不代表同一身份，跨实例迁移仅支持用户主动导出、导入通用学习档案 JSON。

## 2. 已确认需求

### 2.1 共享能力

- 课程地图、12 节课程、测验、实验、错题、收藏、复习和来源依据保持一致。
- 学习档案使用同一个 `LearningProfile` schema 与迁移逻辑。
- 两端统一使用 `/api/session/me`、`/api/profile`、`/api/course-answer` 契约。
- UI 视觉、响应式布局、主题和无障碍交互共享。
- 每次构建写入部署模式、Git commit 和档案 schemaVersion，便于排查版本漂移。

### 2.2 Internet 模式

- 未登录访客可以直接开始学习，无需注册。
- 访客进度保存在 `localStorage`，继续支持损坏保护、跨标签合并和 JSON 导入导出。
- 访客可以使用 AI 自由问答；AI key 永远只保留在 Vercel Serverless Function 环境变量中。
- 登录用户使用 Supabase 邮箱 OTP；登录后可以选择或引导将访客档案合并到云端。
- 云端档案使用 Supabase Auth + PostgreSQL + RLS，并按 `auth.uid()` 隔离。
- AI 接口对访客开放，但必须支持服务端限流、请求长度限制、课程白名单和滥用保护；不因为访客身份伪造持久化账号。

### 2.3 Cowork 模式

- 所有身份只读取 `Decrypted-Userinfo`，并执行 latin-1 → UTF-8 解码。
- 缺失或无效 SSO 时返回 401，不允许匿名 fallback、环境变量绕过或自造身份 Header。
- SSO 用户首次访问自动 upsert 到业务用户表。
- 持久化只使用运行时注入的 `db.properties` 六个固定字段，通过结构化 `pg.Pool` 配置连接。
- AI 只读取运行时注入的 `ai.properties`，调用 Runway Bedrock 协议。
- 学习档案与 AI 问答接口均要求 SSO。
- 保留原 Cowork `workId=143463`、alias 和作品数据，后续只执行 redeploy。

## 3. 目标代码结构

```text
src/
  content/                       # 共享课程内容
  features/                      # 共享学习功能
  platform/
    contract.ts                  # 部署能力、身份和档案端口
    current.ts                   # 构建期 alias，只指向一个平台
    internet/                    # OTP、访客、本地/云端账户界面
    cowork/                      # SSO 账户界面

server/
  core/                          # 档案校验、课程问答共享逻辑
  adapters/
    internet/                    # Supabase 与公网 AI 配置
    cowork/                      # Cowork SSO、PG、Runway
  cowork-entry.mjs               # Cowork Node 服务入口

api/                             # Vercel Functions 薄入口
infrastructure/supabase/         # Internet 数据库迁移
deploy/cowork/                   # Cowork 打包清单；部署产物为可丢弃 staging
```

现有目录允许渐进迁移，不要求为了目录整洁一次性搬动稳定课程代码。

## 4. 兼容策略

### 4.1 构建期选择平台

- `npm run build:internet` 使用 Internet 适配器。
- `npm run build:cowork` 使用 Cowork 适配器，并生成 Cowork 所需的相对静态资源。
- 使用 Vite alias/define 在构建期选择适配器，避免 Cowork bundle 包含 Supabase 登录实现，也避免 Internet 前端引用 Cowork SSO。
- 不在业务组件中散落 `if (platform === ...)`；差异通过平台能力与组件插槽集中注入。

### 4.2 统一 API 契约

- `GET /api/session/me`：返回标准用户或明确的访客状态。
- `GET/PUT /api/profile`：仅注册用户或 Cowork SSO 用户使用；Internet 访客直接使用本地档案，不向服务端伪造账号。
- `POST /api/course-answer`：两端使用同一输入输出格式；Internet 允许访客，Cowork 要求 SSO。

### 4.3 数据隔离

- Internet 数据库和 Cowork 数据库永久隔离。
- 通用 JSON 只含学习记录，不含 token、邮箱、SSO userId 或数据库主键。
- schema 变更必须同时通过本地档案、Supabase 档案和 Cowork PG 档案的契约测试。

## 5. 访客 AI 安全要求

访客 AI 是正式功能，不依赖登录，但需要以下服务端保护：

- 课程 ID 必须来自已发布课程白名单。
- 问题去空格后限制最大长度，响应限制最大 token。
- 不接受客户端传入模型、base URL、system prompt 或 API key。
- Vercel 层按 IP/匿名设备标识限流；设备标识只能用于限流，不作为账户或档案身份。
- 日志不记录完整邮箱、SSO Header、学习档案或密钥。
- 上游失败使用统一错误结构，不把供应商响应或凭据回传前端。

第一阶段若暂时没有可用的共享限流存储，允许以 Vercel 平台防护与函数级轻量限流起步，但必须把“分布式强限流”记录为上线前风险项。

## 6. 发布流程

1. 所有产品改动先进入同一个 Git 分支并跑双模式测试。
2. Internet 构建：测试 → `build:internet` → Vercel Preview 验收 → Production。
3. Cowork 构建：测试 → `build:cowork` → 生成干净 staging → Cowork precheck → `redeploy 143463`。
4. 两端记录相同 Git commit；允许发布时间不同，不允许从未提交工作区发布正式版本。
5. Cowork staging 是构建产物，不作为第二份长期源码仓库。

## 7. 验收矩阵

| 场景 | Internet | Cowork |
| --- | --- | --- |
| 未登录打开课程 | 可学习，本地保存 | 401 / 平台登录 |
| 未登录 AI 问答 | 可用，受限流保护 | 不允许 |
| 注册/登录 | Supabase 邮箱 OTP | 不显示该入口 |
| 登录后档案 | Supabase 云端同步 | Cowork PG 自动同步 |
| 云端不可用 | 明确允许访客本地体验 | 不降级到本地存储 |
| 中文身份 | 不适用 | SSO 解码正确 |
| 档案导入导出 | 支持 | 支持，导入后写 PG |
| 深链接与静态资源 | Vercel 路由正常 | `/s/<alias>/` 下正常 |

## 8. 实施阶段

1. 备份并冻结两个旧目录，建立新的统一工作树。
2. 以 GitHub 最新 `main` 为 Internet 基线，保留访客本地体验和 Supabase 注册体验。
3. 抽取平台契约，把现有账户、档案和状态界面接到 Internet 适配器。
4. 从当前 Cowork 版本迁入 SSO、PG、Runway 与企业账户菜单。
5. 增加双模式脚本、条件构建和平台契约测试。
6. 增加访客 AI 测试、Cowork 无匿名回退测试、Supabase RLS/令牌校验测试。
7. 完成 Internet 构建、Cowork 构建、单元测试、服务端测试和发布前检查。
8. 使用原 workId 原位升级 Cowork；Vercel 先走 Preview，再决定是否提升为 Production。

## 9. 非目标

- 第一阶段不做 Internet 与 Cowork 自动数据同步。
- 不把邮箱与 SSO userId 自动映射成同一人。
- 不引入统一管理员后台、计费系统或多企业租户管理。
- 不在仓库保存任何 Supabase secret、Cowork cookie、`db.properties` 或 `ai.properties`。

## 10. 本次执行记录

- 两个旧项目已完整备份到 `/Users/songhonglei/space/ai-agent-learning-backups/20260820-220427/`，原目录保持不动。
- 统一工作树位于 `/Users/songhonglei/space/ai-agent-learning-unified/`，开发分支为 `codex/unified-dual-deploy`。
- Internet 已接入独立构建入口；未配置 Supabase 时使用带损坏保护、跨标签合并和导入恢复的访客本地应用，配置后保留邮箱 OTP 与云端档案模式。
- Internet `/api/course-answer` 不要求登录，并增加每个热实例按网络地址哈希的轻量限流；共享存储强限流仍是生产增强项。
- Cowork 已接入 SSO 身份、PG 档案、Runway AI 和企业账户界面；业务接口缺失 SSO 时失败关闭，不提供匿名或 localStorage 回退。
- Cowork staging 由 `npm run prepare:cowork` 生成，只含 `pg` 运行依赖，不含 Supabase、Vercel Functions 或 Internet 登录界面。
- 当前自动验证：前端 183 项、服务端 20 项全部通过；Internet / Cowork 双构建通过；Cowork 发布预检通过。
