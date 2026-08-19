# AI Agent 学习网站

面向非技术学习者的互动式 AI Agent 入门课程。项目提供 12 节结构化课程、过程练习、来源依据、学习档案与基于审核课程资料的自由提问能力。

| 项目属性 | 内容 |
|---|---|
| 项目名称 | 红叔 Agent 入门课 |
| 当前版本 | v0.1 |
| 技术栈 | React、Vite、TypeScript |
| 文档维护 | 项目团队 |

## 开源与部署

应用包含学习地图、情境练习、来源依据、错题与收藏、浏览器本地学习档案，以及基于审核课程资料的 AI 自由提问。

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

## 项目结构

| 目录/文件 | 说明 |
|---|---|
| `README.md` | 项目说明、运行方式与部署约定 |
| `src/` | React 应用源码；`src/assets/brand/` 存放运行时品牌资源 |
| `api/`、`server/` | 服务端 API 与本地开发服务 |
| `tests/` | 单元测试、来源审计与端到端测试（`tests/e2e/`） |
| `docs/project/` | PRD、课程大纲、视觉规范、交互方案、技术架构、开发计划与决策记录 |
| `docs/visuals/prototypes/` | 设计过程中的视觉稿与静态原型，不参与应用构建 |
| `config/` | 本地与平台配置；示例位于 `config/examples/`，真实密钥保持忽略 |
| `reference/` | 受控来源包、审计产物与原书分析；运行时 AI 问答会读取其中的逐课来源包 |
| 根目录运行入口 | `package.json`、`vite.config.ts`、`vercel.json`、`server.cjs`、`install.sh`、`start.sh` 保持在根目录，供构建和部署平台识别 |

---

## 产品定位

> 面向非技术白领的AI Agent互动学习网站，通过学习地图、对话导师、互动实验和情境测验，让用户在约4小时内理解Agent的工作原理、能力边界和实际应用。

---

## 课程内容参考

本项目课程内容参考李博杰《深入理解 AI Agent》电子书 **V1.3（2026-07-27）**，并在此基础上进行了课程化编排、互动练习设计、来源审计与页面呈现。

该电子书及其原始图文资料不随本开源仓库分发；相关权利仍归原权利人所有。仓库仅保留经审核后用于课程问答与来源追溯的必要文字化来源包。

---

## 核心公式

**Agent = LLM + 上下文 + 工具**  
对应：**大脑 + 眼睛 + 手脚**

---

## v0.1 基线

| 项 | 状态 | 说明 |
|---|---|---|
| 目标用户 | ✅ 已确认 | 技术背景不高的普通白领 |
| 12课课程结构 | ✅ 已确认 | 见 `docs/project/02-课程大纲.md` |
| 学习地图与对话导师 | 已确认 | v0.1 核心学习流程 |
| Light / Dark 主题 | 已确认 | 提供完整主题切换体验 |
| 红叔角色设定 | ✅ 已确认 | 见 `docs/project/04-交互与AI方案.md` |
| 视觉基线 | 已冻结 | 色彩、字体、布局及导师形象资源已统一定义 |
| 技术架构 | 已冻结 | React + Vite + TypeScript、服务器端 AI 调用与本地学习档案降级方案 |
| 部署形态 | 已支持 | Cowork 与 Vercel；具体环境由部署配置决定 |
| AI 自由问答 | 已支持 | 仅使用服务端密钥，并依据逐课审核来源包回答 |
| 质量门槛 | 已定义 | 来源完整性、进度恢复、人工审核与关键无障碍为核心验收项 |

---

## 当前实现状态

课程引擎已完成 12 节课程的全局学习档案、进度恢复、错题与收藏、复习掌握、本地 JSON 备份恢复和跨标签同步。

全部课程均已配备课稿、情境测验、互动练习、FAQ 与逐课来源包；核心关系图使用可访问的 HTML/CSS 图示实现。项目已完成多断点界面与本地学习档案恢复链路的验证。相关验收材料见 `docs/superpowers/evidence/`。

## 本地运行

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

## 备份与恢复

1. 从学习地图或课程页进入“学习档案”。
2. 点击“导出学习档案”，保存只含学习记录的本地 JSON；导出不包含课程正文。
3. 恢复时选择该 JSON，先查看逐课程取舍及收藏、错题合并预览。
4. 点击“确认导入”才会写入；“取消导入”、无效文件和未来版本文件均不会改动当前档案。

学习档案默认只保存在当前浏览器的 localStorage；应用不会自动上传备份或学习数据。

## 安全与数据边界

- 原始 PDF 与任何生产密钥均不随开源仓库分发。
- API 密钥只能配置在服务器端环境变量或受忽略的本地配置文件中，不得使用 `VITE_` 前缀或提交到仓库。
- 非 Cowork 环境默认使用浏览器本地学习档案；云端档案不可用时，用户可确认后保存至 localStorage。
- 课程互动与 FAQ 可离线运行；自由提问仅在服务端 AI 配置完整时可用。

---

## 文档导航

1. **产品经理/设计师**：先看 `docs/project/01-项目概述与PRD.md` 和 `docs/project/03-视觉设计规范.md`
2. **研发工程师**：先看 `docs/project/05-技术架构建议.md` 和 `docs/project/06-开发计划与验收标准.md`
3. **内容/教研**：重点看 `docs/project/02-课程大纲.md`
4. **测试/QA**：参考 `docs/project/06-开发计划与验收标准.md` 中的验收标准

---

本仓库统一管理项目代码、课程规范、来源审计与验收材料。受控原始资料及运行环境密钥不包含在开源版本中。
