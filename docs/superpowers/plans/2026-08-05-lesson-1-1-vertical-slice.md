# 1-1《Agent的记忆有边界》纵向样板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在仓库根目录交付可本地运行的 React/Vite/TypeScript 1-1 样板：从学习地图进入课程，完成确定性上下文构建器、测验、来源依据、FAQ 与进度恢复。

**Architecture:** 以 TypeScript 课程配置驱动单课播放器，而非提前构建12课引擎。UI 由路由、课程状态、确定性互动模块和本地存储适配器组成；所有教学内容来自已验收的1-1来源包，真实模型和网络调用保持关闭。

**Tech Stack:** React、Vite、TypeScript、React Router、Tailwind CSS v4（`@tailwindcss/vite`）、CSS Variables、Vitest、Testing Library、Playwright。

## Global Constraints

- 应用在仓库根目录；保留现有文档、`reference/` 和 `visuals/`，不移动或改写阶段A审计数据与原始PDF。
- 课程固定12课、5个Module、6个地图节点；本轮只提供1-1完整内容，其他课程只能显示介绍与推荐路径。
- 1-1的唯一互动是“上下文构建器”；场景必需信息为代码/报错、流程/分支约束、测试/运行环境；无关信息不能替代必需信息。
- 可讲事实、图示和题目只能来自 `reference/source-audit/lesson-1-1-source-pack.md`；不得把缓存价格、模型版本或窗口大小写成课程结论。
- 图2-1必须重绘并包含完整文字替代；不得直接复用原图；不以颜色或图标作为唯一语义。
- 阶段1只做本课进度恢复；错题、收藏、复习、前测、后测、Schema迁移和学习进度导入/导出属于阶段2。
- 课后自由提问只有入口占位和审核FAQ；不发送网络请求、不调用模型、不保存前端密钥。
- 采用已冻结的Light/Dark Token、布局和 `visuals/hongshu-avatar.svg`；完成移动端、加载、空和错误状态。
- 不发布、不推送、不执行任何远程写入；html-go-live仅可在后续获得单独授权后使用。

---

### Task 1: 纠正阶段边界并建立根目录应用基础

**Files:**
- Modify: `reference/project-baseline-v0.2.md`
- Modify: `docs/superpowers/evidence/stage-0-baseline.md`
- Create: `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `playwright.config.ts`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/App.test.tsx`, `src/styles.css`, `src/vite-env.d.ts`

**Interfaces:** `App` renders the `/` learning-map route and `/lesson/1-1` route after later tasks. `src/styles.css` exports no JavaScript API but defines the shared visual tokens.

- [ ] **Step 1: 修正阶段0单一基线**

在 `reference/project-baseline-v0.2.md` 和 `docs/superpowers/evidence/stage-0-baseline.md` 中，把“Schema迁移与学习进度导入/导出”从阶段1范围删除，替换为“阶段1只做本课进度恢复；全局Schema迁移与导入/导出由阶段2实现”。

- [ ] **Step 2: 写出失败的路由外壳测试**

在 `src/app/App.test.tsx` 写入：渲染 `App` 后断言首页出现“你的学习地图”；将 history 切换至 `/lesson/1-1` 后断言出现“Agent的记忆有边界”。运行：

```bash
npm run test -- --run src/app/App.test.tsx
```

预期：因应用、测试配置尚不存在而失败。

- [ ] **Step 3: 创建根目录 Vite 工程与测试命令**

创建 React/TypeScript Vite 入口，并安装运行时依赖 `react`、`react-dom`、`react-router-dom`，以及开发依赖 `vite`、`@vitejs/plugin-react`、`typescript`、`tailwindcss`、`@tailwindcss/vite`、`vitest`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`、`@testing-library/user-event`、`@types/react`、`@types/react-dom`、`playwright`。`package.json` 至少包含：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

`vite.config.ts` 同时启用 React、Tailwind Vite plugin 和 `test.environment: "jsdom"`；`src/styles.css` 以 `@import "tailwindcss";` 开头，并实现现有规范的Light/Dark CSS变量、可见焦点、减弱动画和基础排版。

- [ ] **Step 4: 实现最小路由外壳**

`App` 用 `BrowserRouter`、`Routes`、`Route` 分别渲染占位的学习地图和1-1页；未知路径重定向到 `/`。保留两个稳定文字锚点：“你的学习地图”“Agent的记忆有边界”。

- [ ] **Step 5: 验证基础工程**

运行：

```bash
npm run test -- --run src/app/App.test.tsx
npm run build
git diff --check
```

预期：测试与构建均通过。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts playwright.config.ts src reference/project-baseline-v0.2.md docs/superpowers/evidence/stage-0-baseline.md
git commit -m "feat: scaffold lesson one application"
```

### Task 2: 定义1-1课程内容与本课进度恢复

**Files:**
- Create: `src/shared/types/lesson.ts`, `src/shared/storage/lessonProgress.ts`, `src/shared/storage/lessonProgress.test.ts`
- Create: `src/content/lesson-1-1.ts`, `src/content/learning-map.ts`, `src/content/lesson-1-1.test.ts`

**Interfaces:**

```ts
export type LessonStepType = 'scene' | 'dialogue' | 'experiment' | 'quiz' | 'summary' | 'free-question';
export interface LessonProgress { currentStepId: string; completedStepIds: string[]; selectedContextIds: string[]; answers: Record<string, string>; theme: 'light' | 'dark'; }
export function loadLessonProgress(): LessonProgress | null;
export function saveLessonProgress(progress: LessonProgress): boolean;
export function clearLessonProgress(): boolean;
export const lessonOne: Lesson;
```

- [ ] **Step 1: 写入失败的内容与存储测试**

测试 `lessonOne` 只引用 `figure-2-1`、`page-035`、`page-052`，包含六种步骤类型和3道情境题；测试 `loadLessonProgress` 对损坏JSON返回 `null`，`saveLessonProgress` 在 localStorage 抛错时返回 `false`。

- [ ] **Step 2: 运行失败测试**

```bash
npm run test -- --run src/content/lesson-1-1.test.ts src/shared/storage/lessonProgress.test.ts
```

预期：模块不存在而失败。

- [ ] **Step 3: 实现静态课程内容与安全存储**

课程脚本写入以下已核定要点：Agent只能基于当前上下文判断；上下文包含规则、请求、历史与工具结果；缺少代码、流程或环境信息会造成约束失真；先检查Agent能看见什么。FAQ不得产生模型回答。存储键固定为 `ai-agent-learning:lesson-1-1:progress`，仅保存本课最小状态；不包含 schemaVersion、迁移、导入或导出。

- [ ] **Step 4: 运行内容与存储测试**

```bash
npm run test -- --run src/content/lesson-1-1.test.ts src/shared/storage/lessonProgress.test.ts
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/content src/shared/types src/shared/storage
git commit -m "feat: add lesson one content and progress storage"
```

### Task 3: 实现学习地图、主题和课程播放器

**Files:**
- Create: `src/app/theme.tsx`, `src/app/theme.test.tsx`
- Create: `src/features/learning-map/LearningMap.tsx`, `src/features/learning-map/LearningMap.test.tsx`
- Create: `src/features/lesson-player/LessonPlayer.tsx`, `src/features/lesson-player/LessonPlayer.test.tsx`
- Modify: `src/app/App.tsx`, `src/styles.css`

**Interfaces:** `LearningMap` 接受6节点配置；`LessonPlayer` 接受 `Lesson` 与 `LessonProgress`，通过 `onProgressChange(next: LessonProgress)` 更新状态。

- [ ] **Step 1: 写入失败的组件测试**

测试地图展示6个节点、1-1为可进入链接、其他课为介绍卡；测试主题按钮切换 `data-theme` 并保存到当前本课进度；测试播放器展示情境和对话，且“下一步”推进到下一配置步骤。

- [ ] **Step 2: 运行失败测试**

```bash
npm run test -- --run src/app/theme.test.tsx src/features/learning-map/LearningMap.test.tsx src/features/lesson-player/LessonPlayer.test.tsx
```

预期：组件不存在而失败。

- [ ] **Step 3: 实现地图、主题与播放器**

地图按冻结顺序显示6节点；其他11课只有名称、简介和“推荐按顺序学习”提示。1-1可直接进入。播放器渲染预设步骤，显示红叔头像、进度、来源入口和非阻断导航；加载本地进度、保存当前步骤，并在存储失败时显示提示但不阻断。

- [ ] **Step 4: 运行组件测试**

```bash
npm run test -- --run src/app/theme.test.tsx src/features/learning-map/LearningMap.test.tsx src/features/lesson-player/LessonPlayer.test.tsx
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/app src/features/learning-map src/features/lesson-player src/styles.css
git commit -m "feat: add learning map and lesson player"
```

### Task 4: 实现上下文构建器与语义重绘图

**Files:**
- Create: `src/features/context-builder/contextBuilder.ts`, `src/features/context-builder/contextBuilder.test.ts`
- Create: `src/features/context-builder/ContextBuilder.tsx`, `src/features/context-builder/ContextBuilder.test.tsx`
- Create: `src/features/source-evidence/ContextWindowDiagram.tsx`, `src/features/source-evidence/ContextWindowDiagram.test.tsx`
- Modify: `src/features/lesson-player/LessonPlayer.tsx`, `src/styles.css`

**Interfaces:**

```ts
export const REQUIRED_CONTEXT_IDS = ['code-context', 'workflow-constraint', 'environment-context'] as const;
export function evaluateContextSelection(selectedIds: string[]): { status: 'ready' | 'missing'; missingIds: string[]; message: string };
```

- [ ] **Step 1: 写入失败的判定与可访问性测试**

测试：选齐三个必需块得到 `ready`；少任何一个得到 `missing` 且列出具体缺失项；无关块不改变缺失判定。组件测试键盘可选择信息块、可见文字反馈，并有 `aria-live` 状态。图示测试包含系统提示、用户消息、助手回复、工具调用及结果、当前生成位置、有限窗口及完整文字替代。

- [ ] **Step 2: 运行失败测试**

```bash
npm run test -- --run src/features/context-builder/contextBuilder.test.ts src/features/context-builder/ContextBuilder.test.tsx src/features/source-evidence/ContextWindowDiagram.test.tsx
```

预期：模块不存在而失败。

- [ ] **Step 3: 实现确定性互动与重绘**

构建器使用按钮或复选框，不使用拖拽。完整信息只说明具备继续分析的必要背景；缺失信息明确指出代码/流程/环境哪个缺少以及可能的约束风险。图示用HTML/CSS或内联SVG重绘，不引用原书图像，并在页面中显示文字替代。

- [ ] **Step 4: 运行互动测试**

```bash
npm run test -- --run src/features/context-builder/contextBuilder.test.ts src/features/context-builder/ContextBuilder.test.tsx src/features/source-evidence/ContextWindowDiagram.test.tsx
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/features/context-builder src/features/source-evidence src/features/lesson-player src/styles.css
git commit -m "feat: add context builder and accessible diagram"
```

### Task 5: 实现测验、来源依据、FAQ与状态页面

**Files:**
- Create: `src/features/quiz/Quiz.tsx`, `src/features/quiz/Quiz.test.tsx`
- Create: `src/features/source-evidence/SourceEvidence.tsx`, `src/features/source-evidence/SourceEvidence.test.tsx`
- Create: `src/features/ask-hongshu/FaqPanel.tsx`, `src/features/ask-hongshu/FaqPanel.test.tsx`
- Create: `src/shared/ui/StatusPanel.tsx`, `src/shared/ui/StatusPanel.test.tsx`
- Modify: `src/features/lesson-player/LessonPlayer.tsx`, `src/app/App.tsx`

- [ ] **Step 1: 写入失败的行为测试**

测试测验答错仍可继续、展示即时判断/深度解析/原书依据；测试来源页显示 PDF 34、35、52 与三个来源ID；测试FAQ不调用 `fetch`，显示“服务尚未启用”；测试加载、空、存储错误和未知路由各有可恢复文案。

- [ ] **Step 2: 运行失败测试**

```bash
npm run test -- --run src/features/quiz/Quiz.test.tsx src/features/source-evidence/SourceEvidence.test.tsx src/features/ask-hongshu/FaqPanel.test.tsx src/shared/ui/StatusPanel.test.tsx
```

预期：组件不存在而失败。

- [ ] **Step 3: 实现课内验收组件**

测验使用三道来源包限定的情境题。来源页写清可讲结论与缓存扩展边界。FAQ只返回审核过的1-1答案；自由提问入口不得建立网络路径。状态页面提供返回地图、重试本地读取或继续学习等恢复动作。

- [ ] **Step 4: 运行行为测试**

```bash
npm run test -- --run src/features/quiz/Quiz.test.tsx src/features/source-evidence/SourceEvidence.test.tsx src/features/ask-hongshu/FaqPanel.test.tsx src/shared/ui/StatusPanel.test.tsx
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/features/quiz src/features/source-evidence src/features/ask-hongshu src/shared/ui src/features/lesson-player src/app
git commit -m "feat: complete lesson one assessment and evidence"
```

### Task 6: 完成响应式验证、端到端测试与阶段1验收记录

**Files:**
- Create: `e2e/lesson-1-1.spec.ts`
- Create: `docs/superpowers/evidence/stage-1-lesson-1-1.md`
- Modify: `06-开发计划与验收标准.md`
- Modify: `README.md`

- [ ] **Step 1: 写入端到端场景**

Playwright 场景覆盖桌面和375px宽视口：从 `/` 进入1-1，选择三项必需上下文，完成三道测验，打开来源依据，刷新后确认当前课进度仍在；断言FAQ没有网络请求。使用本地开发服务器，不访问外网。

- [ ] **Step 2: 运行端到端测试并确认初始失败**

```bash
npm run test:e2e -- e2e/lesson-1-1.spec.ts
```

预期：在实现前失败，完成前述任务后通过。

- [ ] **Step 3: 补齐响应式和状态样式**

实现375px、768px、1024px、1440px下的布局断点；移动端不隐藏关键课程动作；在 `prefers-reduced-motion` 下关闭非必要动画。

- [ ] **Step 4: 运行全量验收**

```bash
npm run test:run
npm run build
npm run test:e2e
git diff --check
```

预期：全部通过。

- [ ] **Step 5: 写入验收证据与计划状态**

`stage-1-lesson-1-1.md` 记录来源输入、已实现交互、测试命令/结果、移动端验收、未做事项（发布、模型、阶段2全局能力）。在 `06-开发计划与验收标准.md` 将阶段1状态更新为已验收，并把下一步更新为阶段2。

- [ ] **Step 6: 提交**

```bash
git add e2e docs/superpowers/evidence/stage-1-lesson-1-1.md "06-开发计划与验收标准.md" README.md
git commit -m "feat: complete lesson one vertical slice"
```

## Acceptance

- 根目录应用可通过 `npm run dev` 本地运行，且 `npm run build` 成功。
- 新用户可从地图直接进入1-1，完成互动、测验、来源依据与FAQ。
- 三项必需上下文与缺失反馈严格符合来源包；图示是可访问的授权重绘。
- 刷新恢复本课进度；存储失败、加载、空、错误与未知路由均可恢复。
- 无真实模型调用、无网络教学依赖、无发布；阶段2能力未提前实现。
- 单元、组件、端到端和构建检查均通过。
