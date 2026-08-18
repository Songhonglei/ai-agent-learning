# AI Agent 学习网站 v0.1 — 项目材料包

> **项目代号：** 红叔 Agent 入门课  
> **版本：** v0.1（首期交付）  
> **生成时间：** 2026-07-30  
> **文档责任人：** Evan（洪磊）  
> **AI Agent 助手：** Ashley

## 开源与部署

这是一个包含 12 节互动课程的 React + Vite 应用：学习地图、情境练习、来源依据、错题与收藏、浏览器本地学习档案，以及基于已审核课程资料的 AI 自由提问。

- **Cowork**：完整部署模式，使用平台 SSO、PostgreSQL 学习档案与 Runway 网关。
- **Vercel**：静态前端 + `/api/course-answer` Serverless Function。学习档案在没有外接数据库时会降级为用户确认后的浏览器本地存储；AI 自由提问可正常使用。
- **开源边界**：原始 PDF 不随仓库分发；它保留在受控部署环境。非 Cowork 部署可通过 `VITE_SOURCE_DOCUMENT_URL` 配置一个已获许可的公开文档地址，才会显示可点击的来源链接。

### Vercel 配置

在 Vercel 项目的 **Environment Variables** 中配置（Production / Preview / Development 均按需要勾选）：

```text
AI_BASE_URL=https://your-gateway.example/v1
AI_API_KEY=server-only-secret
AI_API_STYLE=openai-chat-completions
AI_MODEL=your-model-name
AI_TIMEOUT_MS=20000
```

上述变量只由服务器函数读取；不要使用 `VITE_` 前缀存放密钥。若接入 Cowork 的 Runway 网关，保留 `AI_API_STYLE=runway-bedrock`，无需填写 `AI_MODEL`。完整字段示例见 [`.env.example`](.env.example)。

部署前执行：

```bash
npm ci
npm run test:server
npm run test:run
npm run build
```

Vercel 会自动识别 `vercel.json` 中的 SPA 回退和 `api/course-answer.mjs` 函数。

---

## 📦 材料包结构

| 目录/文件 | 说明 |
|---|---|
| `README.md` | 本文件，材料包总览与使用指南 |
| `01-项目概述与PRD.md` | 产品需求文档：定位、目标用户、核心公式、产品原则、版本规划 |
| `02-课程大纲.md` | 12课完整课程结构、模块划分、每课知识点与互动设计 |
| `03-视觉设计规范.md` | 视觉方向、色彩系统、字体、布局、组件规范、Light/Dark主题 |
| `04-交互与AI方案.md` | 交互流程、对话引擎、互动实验、测验机制、AI问答策略 |
| `05-技术架构建议.md` | 技术栈选型、数据结构设计、存储方案、部署建议 |
| `06-开发计划与验收标准.md` | 开发阶段划分、里程碑、验收标准、成功指标 |
| `visuals/` | 视觉稿与Demo文件 |
| `reference/` | 参考文档（原书分析报告、决策清单） |

---

## 🔗 关键在线地址

- **线上Demo（学习地图）：** https://aifin.xiaohongshu.com/apps/copilot/chart-container?dashboardId=52A7A71F627F263B537AE4B7922F3D1C
- **设计稿目录：** `output/ai-agent-learning-site-design/`
- **分析报告目录：** `output/ai-agent-learning-site-analysis/`

---

## 🎯 一句话定位

> 面向非技术白领的AI Agent互动学习网站，通过学习地图、对话导师、互动实验和情境测验，让用户在约4小时内理解Agent的工作原理、能力边界和实际应用。

---

## 📚 核心公式

**Agent = LLM + 上下文 + 工具**  
对应：**大脑 + 眼睛 + 手脚**

---

## ✅ v0.1 已冻结基线

| 项 | 状态 | 说明 |
|---|---|---|
| 目标用户 | ✅ 已确认 | 技术背景不高的普通白领 |
| 12课课程结构 | ✅ 已确认 | 见 02-课程大纲.md |
| 学习地图+对话导师 | ✅ 已确认 | v0.1核心功能 |
| Light/Dark主题 | ✅ 已确认 | 视觉方向已确认 |
| 红叔角色设定 | ✅ 已确认 | 见 04-交互与AI方案.md |
| 视觉样板 | ✅ v0.1冻结 | 色彩、字体、布局与 `visuals/hongshu-avatar.svg` 为样板基线；移动端与异常状态在阶段1验收 |
| 技术栈 | ✅ v0.1冻结 | React + Vite + TypeScript、CSS Variables + Tailwind、本地存储与既定测试组合 |
| 静态发布目标 | ✅ v0.1冻结 | 构建物未来可由 html-go-live 发布；当前没有发布授权，不执行发布 |
| AI自由问答 | ✅ v0.1冻结 | 真实模型服务默认关闭；预置FAQ降级为样板必做，不阻断预设课程 |
| 量化验收指标 | ✅ v0.1冻结 | 来源完整性、恢复、人工审核和关键无障碍为硬门槛；使用行为与效果指标为观测目标 |

真实模型服务（含服务、知识来源和预算）及任何发布，均须在后续单独取得授权。

---

## 🧭 当前实现状态

阶段2课程引擎已于 2026-08-11 验收：阶段1旧 1-1 进度可安全迁移到版本化的 12 课全局档案；1-1 已接入各 3 题前/后测、错题、稳定收藏、复习掌握、本地 JSON 备份恢复和跨标签同步。

阶段3内容批量生产已完成：12 课均有课稿、3 题情境测验、本地互动、FAQ 与逐课来源包；核心关系图统一重绘为可访问的 HTML/CSS 图示。阶段4本地全量联调也已完成：12课关键路径与 360px、768px、1024px、1440px 四档断点均已自动化验证，本地档案恢复链路已复核。验收证据见 `docs/superpowers/evidence/stage-3-content-production.md` 与 `docs/superpowers/evidence/stage-4-local-integration.md`；发布准备与发布继续等待授权。

## 💻 本地运行

```bash
npm install
npm run dev
```

Vite 默认提供本地地址 `http://localhost:5173`。另开终端可执行完整验收：

```bash
npm run test:run
npm run build
npm run test:e2e
```

如需在本机启用自由提问，在 `config/ai.env` 中设置与上方相同的 `AI_*` 变量，再运行：

```bash
npm run serve:ai
```

## 💾 备份与恢复

1. 从学习地图或课程页进入“学习档案”。
2. 点击“导出学习档案”，保存只含学习记录的本地 JSON；导出不包含课程正文。
3. 恢复时选择该 JSON，先查看逐课程取舍及收藏、错题合并预览。
4. 点击“确认导入”才会写入；“取消导入”、无效文件和未来版本文件均不会改动当前档案。

学习档案默认只保存在当前浏览器的 localStorage；应用不会自动上传备份或学习数据。

## 🔒 当前边界

- 未接入真实模型、AI 服务、前端密钥或教学网络依赖；FAQ 只展开本地审核内容且不发 Fetch/XHR。
- 不接入真实模型、网络教学依赖或前端密钥；所有课内互动和 FAQ 均可在本地完成。
- 未部署、未发布、未推送或远程写入；任何模型接入和发布均须另行授权。

---

## 🚀 如何使用本材料包

1. **产品经理/设计师**：先看 `01-项目概述与PRD.md` 和 `03-视觉设计规范.md`
2. **研发工程师**：先看 `05-技术架构建议.md` 和 `06-开发计划与验收标准.md`
3. **内容/教研**：重点看 `02-课程大纲.md`
4. **测试/QA**：参考 `06-开发计划与验收标准.md` 中的验收标准

---

*本材料包基于多次会话讨论、design文档、analysis文档和线上Demo综合整理而成。*
