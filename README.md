# Agent 入门课 · 开源版

面向非技术学习者的 12 课 AI Agent 互动课程，整体约 3 小时。通过学习地图、情境练习、AI 助教和课程前后测，理解 Agent 的工作方式、能力边界及办公应用。

**项目亮点介绍（GitHub Pages）：[songhonglei.github.io/ai-agent-learning](https://songhonglei.github.io/ai-agent-learning/)**

**在线学习站（Vercel）：[my-agent-learning.vercel.app](https://my-agent-learning.vercel.app/)**

介绍页展示项目亮点与产品实景；在线学习站提供完整课程、测评与 AI 助教。

[课程前测](https://my-agent-learning.vercel.app/assessment/pretest) · [结课后测](https://my-agent-learning.vercel.app/assessment/posttest) · [结果对照](https://my-agent-learning.vercel.app/assessment) · [开源仓库](https://github.com/Songhonglei/ai-agent-learning) · [项目介绍（GitHub Pages）](https://songhonglei.github.io/ai-agent-learning/)

## 主要功能

- **12 课互动学习**：学习地图、情境练习、预置 FAQ，保留原有课内练习和局部自测。
- **全课程前后测**：前后卷各 24 题，覆盖全部 12 课；支持草稿续答、刷新恢复和首次提交锁定，完成课程后开放后测。
- **结果对照与复习**：展示总分、正确率、六个主题及逐课变化，并提供后测复习入口；缺少有效前测时不计算提升。
- **有来源的 AI 助教**：按本课审核来源校验引用，提供超时、取消、限流和异常保护；支持分别配置主模型与 fallback 备用模型，可替换兼容接口的模型服务。
- **学习档案与备份**：进度、错题、收藏和测评记录保存在浏览器，支持 JSON 导入导出、跨标签同步和可选 Supabase 账号同步。

测评用于个人学习复盘，题卷尚未做统计难度校准，不作为能力认证或课程因果效果证明。

本项目仅维护开源版，使用 Vercel；Cowork 已拆为独立本地项目，不再通过 mode 切换。项目维护入口：[当前状态](docs/CURRENT-STATE.md)、[OpenViking 使用说明](OPENVIKING.md)。本项目与课坊分别索引，Cowork 不接入。

## 本地运行

使用 Node.js 24：

```bash
npm ci
npm run dev
```

前端固定在 http://localhost:5173；本地学习和预置 FAQ 不需要账号或 AI 服务。问答由同源 /api/course-answer 提供，开发时转发到本机 3000 端口。另一个终端可执行 npm run serve:ai；模型参数只从本机被忽略的 config/ai.env 或服务端环境读取，不放入 VITE_ 变量。

可选账号与云端档案沿用 Supabase。开发环境需配置 VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY；服务端使用 SUPABASE_URL、SUPABASE_PUBLISHABLE_KEY。没有配置时仍可使用访客本地学习。

## 验证

```bash
npx playwright install chromium
npm run verify
```

verify 依次运行单元测试、服务端测试、构建和 E2E。测试使用本地模型桩，不读取真实模型凭据。生产构建冒烟命令为 APP_PREVIEW_URL=http://127.0.0.1:4175 npm run verify:preview。

## AI 问答保护

- 仅接受本课审核来源表中的引用编号；跨课或虚构编号返回可重试提示。
- 明确区分资料未覆盖与模型漏写引用：模型返回回答状态、正文和引用；只有明确拒答才提示资料未覆盖，缺引用或坏格式显示可重试错误，不展示无依据正文。兼容既有引用格式，不自动补来源。
- 每个访客每个暖实例最多 12 次/分钟、同一访客最多 1 条在途提问、每实例最多 4 条并发。
- 服务端默认等待 20 秒，上限 50 秒；浏览器等待 55 秒，可随时取消。超时、繁忙、断网和异常响应不影响本课 FAQ。
- 上述限流是实例内保护，不是跨实例的总配额或计费上限；需要统一用量控制时应另配平台防火墙或共享限流服务。

## 主模型与 fallback 配置

AI 助教不绑定特定模型或供应商。主模型与可选 fallback 备用模型的地址、密钥、模型名和接口协议可分别配置；使用与实现兼容的服务即可。当前支持 `openai-chat-completions` 和 `runway-bedrock` 两种接口协议，其他协议需先增加适配。

主模型正常时不调用备用。主模型超时、繁忙、连接/响应异常、空答案或引用校验失败后只尝试一次备用，同样执行本课引用校验；取消提问后不切换，有效的资料未覆盖提示也不切换。配置备用后主模型最多等待20秒、整条链最多50秒。

Vercel 的 Production 与 Preview 可按下表配置。除 API Key 设为 Secret 外，其余为 Config；不要加 VITE_ 前缀。

| 配置项 | 主模型 | fallback 备用模型 |
| --- | --- | --- |
| 服务地址 | `AI_BASE_URL` | `AI_FALLBACK_BASE_URL` |
| 服务端密钥 | `AI_API_KEY` | `AI_FALLBACK_API_KEY` |
| 模型名 | `AI_MODEL` | `AI_FALLBACK_MODEL` |
| 接口协议 | `AI_API_STYLE` | `AI_FALLBACK_API_STYLE` |
| 超时毫秒 | `AI_TIMEOUT_MS`，默认 `20000` | `AI_FALLBACK_TIMEOUT_MS`，默认 `30000` |

可复制 [配置示例](config/ai.env.example)，将占位地址、密钥和模型名替换为自己的配置。使用 OpenAI 兼容接口时，两组 `API_STYLE` 均显式设置为 `openai-chat-completions`。主备可使用不同服务，分别确认接口协议、模型权限与参数兼容性。

`AI_FALLBACK_THINKING` 为可选扩展参数：仅在备用服务支持 `thinking.type` 且使用 `openai-chat-completions` 时设置 `enabled` 或 `disabled`，否则留空，不发送该字段。

未填备用密钥时保持原主模型行为，缺主模型但备用配置完整时也可独立使用备用。模型配置只在服务端读取，不写入前端代码；环境变量更新后需重新部署，才能让新配置生效。

## 发布与数据边界

Vercel 项目保持 ai-agent-learning；生产域名保持 my-agent-learning.vercel.app。构建 npm run build，输出 dist；api/ 中提供课程问答及 Supabase 档案服务。发布操作与验收记录见 docs/release/。

本仓库不包含 Cowork SSO、企业 PostgreSQL 服务、平台安装脚本、原始 PDF、企业配置或密钥。公开页面展示审核来源说明；如部署者有合法可公开的参考文档，可自行配置 VITE_SOURCE_DOCUMENT_URL。学习数据默认只在当前浏览器，登录后才按用户选择同步。

原始书籍及图文不随仓库分发，相关权利归原权利人；课程代码采用 MIT License。

两个项目的独立演进约定见 docs/PROJECT-BOUNDARY.md，实际进展见 docs/CURRENT-STATE.md。已加入覆盖12课的课程前测、结课后测与结果对照，原有课内练习和1-1局部自测继续保留。

## 全课程测评

从学习地图进入“开始课程前测”，或打开 /assessment/pretest。前、后测各24题，每课2题，情境不同；提交前不显示对错，支持暂停、跳题、修改与刷新续答，首次提交后锁定结果。完成12课后从结课入口进入 /assessment/posttest；未做前测也能做后测。

/assessment 和学习档案显示总分、正确率、六个主题及逐课对照，并给出后测待复习课程。已有学习记录后提交的前测标为补测；缺前测、补测或顺序不符时不计算提升。两套题未作难度统计校准，结果用于个人复盘，不作课程因果效果或能力认证。

档案升级为schema v2，自动读取并迁移v1，课程练习、收藏、错题与原1-1自测均保留。测评草稿与结果随JSON备份、跨标签同步和可选云端档案保存；导入优先保留较早的首次提交结果。前端和 /api/profile 须使用同一版本部署，旧版写入返回409，防止覆盖新测评；本轮没有数据库迁移。详情见 [测评规则](docs/COURSE-ASSESSMENT.md) 与 [验证报告](docs/testing/2026-10-21-course-assessment.md)。
