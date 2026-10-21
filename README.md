# Agent 入门课 · 开源版

面向非技术学习者的 12 课互动课程，整体约 3 小时。保留学习地图、情境练习、AI 助教、错题与收藏、JSON 备份和可选账号同步。

- 在线课程：https://my-agent-learning.vercel.app/
- 开源仓库：https://github.com/Songhonglei/ai-agent-learning
- 项目主页：https://songhonglei.github.io/ai-agent-learning/
- 本项目仅维护开源版，使用 Vercel；Cowork 已拆为独立本地项目，不再通过 mode 切换。

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
- 未引用资料的回答统一提示资料未覆盖，不显示无依据正文。
- 每个访客每个暖实例最多 12 次/分钟、同一访客最多 1 条在途提问、每实例最多 4 条并发。
- 服务端默认等待 20 秒，上限 50 秒；浏览器等待 55 秒，可随时取消。超时、繁忙、断网和异常响应不影响本课 FAQ。
- 上述限流是实例内保护，不是跨实例的总配额或计费上限；需要统一用量控制时应另配平台防火墙或共享限流服务。

## 发布与数据边界

Vercel 项目保持 ai-agent-learning；生产域名保持 my-agent-learning.vercel.app。构建 npm run build，输出 dist；api/ 中提供课程问答及 Supabase 档案服务。发布操作与验收记录见 docs/release/。

本仓库不包含 Cowork SSO、企业 PostgreSQL 服务、平台安装脚本、原始 PDF、企业配置或密钥。公开页面展示审核来源说明；如部署者有合法可公开的参考文档，可自行配置 VITE_SOURCE_DOCUMENT_URL。学习数据默认只在当前浏览器，登录后才按用户选择同步。

原始书籍及图文不随仓库分发，相关权利归原权利人；课程代码采用 MIT License。

两个项目的独立演进约定见 docs/PROJECT-BOUNDARY.md，实际进展见 docs/CURRENT-STATE.md。已加入覆盖12课的课程前测、结课后测与结果对照，原有课内练习和1-1局部自测继续保留。

## 全课程测评

从学习地图进入“开始课程前测”，或打开 /assessment/pretest。前、后测各24题，每课2题，情境不同；提交前不显示对错，支持暂停、跳题、修改与刷新续答，首次提交后锁定结果。完成12课后从结课入口进入 /assessment/posttest；未做前测也能做后测。

/assessment 和学习档案显示总分、正确率、六个主题及逐课对照，并给出后测待复习课程。已有学习记录后提交的前测标为补测；缺前测、补测或顺序不符时不计算提升。两套题未作难度统计校准，结果用于个人复盘，不作课程因果效果或能力认证。

档案升级为schema v2，自动读取并迁移v1，课程练习、收藏、错题与原1-1自测均保留。测评草稿与结果随JSON备份、跨标签同步和可选云端档案保存；导入优先保留较早的首次提交结果。前端和 /api/profile 须使用同一版本部署，旧版写入返回409，防止覆盖新测评；本轮没有数据库迁移。详情见 [测评规则](docs/COURSE-ASSESSMENT.md) 与 [验证报告](docs/testing/2026-10-21-course-assessment.md)。
