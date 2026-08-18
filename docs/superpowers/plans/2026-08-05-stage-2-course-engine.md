# 阶段2课程引擎与全局学习档案 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已验收的1-1样板升级为配置驱动的课程引擎，并交付版本化全局学习档案、备份恢复、错题/收藏/复习和1-1前后测闭环。

**Architecture:** 用白名单校验的 `LearningProfile` 取代阶段1单课键，保留一次性、幂等的旧键迁移。课程引擎读取课程配置并写入全局档案；记录、测评和备份能力通过独立适配器与组件接入，其他11课只占位、不制造学习数据。

**Tech Stack:** React 19、React Router 6、TypeScript、Vite、CSS Variables/Tailwind、Vitest/Testing Library、Playwright。

## Global Constraints

- 课程固定12课、5个Module、6个地图节点；阶段2只有1-1的真实课内内容，其余11课无步骤、测验、实验或假进度。
- 步骤协议固定为 `scene | dialogue | experiment | quiz | summary | free-question`；内容继续由 TypeScript 配置驱动。
- 全局档案从 `schemaVersion: 1` 开始，运行时和写入均白名单投影；不保存未知字段、课程正文或前端密钥。
- 阶段1键 `ai-agent-learning:lesson-1-1:progress` 只在首次迁移读取；全局写入成功后才清理，迁移必须幂等且失败不丢旧键。
- 导出是仅含学习档案的 JSON；导入固定为校验、预览、明确确认、合并，取消/失败/未知未来版本不得改写当前档案。
- 合并规则：同课取完成度更高、答案更完整的一方；错题/收藏按稳定ID去重；前后测和当前步骤取较新有效记录；预览显示取舍。
- 错题答对不自动删除；用户可标记已掌握。复习队列仅由未掌握错题和主动收藏构成；前后测各3题，题干不重复、不作用户标签。
- 全局档案只同步本应用的 `storage` 键；损坏事件值不覆盖有效状态。真正并发写入是浏览器最后写入者胜出，不实现事务、CAS或额外并发版本字段。
- 沿用冻结视觉基线：1200px桌面容器、310px导师列、可见焦点、AA对比度、375–1440px和减弱动态效果。
- 不接入模型、网络教学依赖或前端密钥；不发布、不推送、不执行远程写入。

---

### Task 1: 定义通用课程与全局档案契约

**Files:**
- Modify: `src/shared/types/lesson.ts`
- Create: `src/shared/types/profile.ts`, `src/shared/types/profile.test.ts`
- Modify: `src/content/learning-map.ts`, `src/content/lesson-1-1.ts`, `src/content/lesson-1-1.test.ts`

**Interfaces:**

```ts
export const PROFILE_SCHEMA_VERSION = 1 as const;
export type AssessmentKind = 'pretest' | 'posttest';
export interface CourseProgress { currentStepId: string; completedStepIds: string[]; experimentStates: Record<string, string[]>; answers: Record<string, string>; completedAt?: string; }
export interface WrongAnswer { questionId: string; lessonId: string; selectedOptionId: string; sourceRefIds: string[]; mastered: boolean; recordedAt: string; }
export interface AssessmentResult { kind: AssessmentKind; answers: Record<string, string>; completedAt: string; score: number; }
export interface LearningProfile { schemaVersion: 1; theme: 'light' | 'dark'; currentLessonId: string; courses: Record<string, CourseProgress>; wrongAnswers: WrongAnswer[]; favoriteContentIds: string[]; assessments: Partial<Record<AssessmentKind, AssessmentResult>>; updatedAt: string; }
export function createEmptyProfile(): LearningProfile;
```

- [ ] **Step 1: 写入失败的契约测试**

测试空档案包含12个课程ID但仅`1-1`允许有效步骤；测试`Lesson`新增稳定内容ID和可选前/后测题集；测试前/后测均为3题、选项完整且题干集合无交集。

- [ ] **Step 2: 运行失败测试**

Run: `npm run test -- --run src/shared/types/profile.test.ts src/content/lesson-1-1.test.ts`

Expected: FAIL，因为类型、档案工厂和测评配置不存在。

- [ ] **Step 3: 实现最小契约与1-1测评配置**

定义以上类型，`createEmptyProfile()`为12个已知课程创建空`CourseProgress`。在1-1添加各3题的前/后测：只使用来源包允许的“可见上下文、缺失背景、窗口有限”判断，不使用模型参数、缓存价格或版本；后测不复用前测题干。添加稳定`contentId`供收藏使用。

- [ ] **Step 4: 验证并提交**

Run: `npm run test -- --run src/shared/types/profile.test.ts src/content/lesson-1-1.test.ts && npm run build`

Expected: PASS。

```bash
git add src/shared/types src/content/learning-map.ts src/content/lesson-1-1.ts src/content/lesson-1-1.test.ts
git commit -m "feat: define global learning profile contract"
```

### Task 2: 实现版本化档案、旧键迁移与安全同步

**Files:**
- Create: `src/shared/storage/learningProfile.ts`, `src/shared/storage/learningProfile.test.ts`
- Modify: `src/shared/storage/lessonProgress.ts`, `src/shared/storage/lessonProgress.test.ts`
- Create: `src/app/profileState.ts`, `src/app/profileState.test.ts`

**Interfaces:**

```ts
export const LEARNING_PROFILE_STORAGE_KEY = 'ai-agent-learning:learning-profile';
export type ProfileLoadResult = { status: 'loaded'; profile: LearningProfile } | { status: 'empty' } | { status: 'malformed' } | { status: 'future-version' } | { status: 'read-error' } | { status: 'migration-error' };
export function loadLearningProfile(): ProfileLoadResult;
export function saveLearningProfile(profile: LearningProfile): boolean;
export function migrateLessonOneProgress(legacy: LessonProgress, profile: LearningProfile): LearningProfile;
export function reconcileProfileStorageEvent(event: StorageEvent, current: LearningProfile): LearningProfile | null;
```

- [ ] **Step 1: 写入失败的存储测试**

覆盖空档案12课结构、未知字段剥离、损坏JSON、未来版本拒绝、写读失败、旧1-1五字段迁移、重复迁移不改变结果、全局写入失败不删除旧键、全局写入成功后清理旧键，以及全局键有效/损坏/过期`storage`事件。

- [ ] **Step 2: 运行失败测试**

Run: `npm run test -- --run src/shared/storage/learningProfile.test.ts src/app/profileState.test.ts`

Expected: FAIL，因为新模块不存在。

- [ ] **Step 3: 实现白名单档案适配器和状态操作**

只允许`LearningProfile`定义字段，`schemaVersion: 1`为唯一已知版本；旧键存在且全局档案为空时迁移。每个成功路径写入单个全局键，只有写入成功才删除旧键。`profileState.ts`提供不可变的`updateCourseProgress`、`recordWrongAnswer`、`toggleFavorite`、`markWrongAnswerMastered`和`completeAssessment`，均更新`updatedAt`并防止未开放课程产生完成记录。

- [ ] **Step 4: 验证并提交**

Run: `npm run test -- --run src/shared/storage/learningProfile.test.ts src/app/profileState.test.ts && npm run build && git diff --check`

Expected: PASS。

```bash
git add src/shared/storage src/app/profileState.ts src/app/profileState.test.ts
git commit -m "feat: add versioned learning profile storage"
```

### Task 3: 实现导出、校验预览与确定性合并

**Files:**
- Create: `src/shared/profile-transfer/transfer.ts`, `src/shared/profile-transfer/transfer.test.ts`
- Create: `src/features/profile-transfer/ProfileTransfer.tsx`, `src/features/profile-transfer/ProfileTransfer.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**

```ts
export type ImportPreview = { status: 'ready'; candidate: LearningProfile; summary: string[] } | { status: 'invalid'; message: string } | { status: 'future-version'; message: string };
export function exportProfile(profile: LearningProfile): string;
export function previewProfileImport(json: string, current: LearningProfile): ImportPreview;
export function mergeLearningProfiles(current: LearningProfile, incoming: LearningProfile): LearningProfile;
```

- [ ] **Step 1: 写入失败的导入导出测试**

测试导出JSON不含课程正文；损坏JSON和未来版本只返回预览错误；取消不触发保存；相同课程按完成度、答案完整度、更新时间合并；错题和收藏按ID去重；预览列出导入、保留和合并取舍。

- [ ] **Step 2: 运行失败测试**

Run: `npm run test -- --run src/shared/profile-transfer/transfer.test.ts src/features/profile-transfer/ProfileTransfer.test.tsx`

Expected: FAIL，因为新模块不存在。

- [ ] **Step 3: 实现纯导入导出与组件**

`exportProfile`序列化白名单档案。浏览器组件提供导出下载、文件读取、预览、确认、取消；确认前不写入。测试中注入`onConfirm(merged: LearningProfile)`；错误只显示可理解的本地文案，不上传文件。

- [ ] **Step 4: 验证并提交**

Run: `npm run test -- --run src/shared/profile-transfer/transfer.test.ts src/features/profile-transfer/ProfileTransfer.test.tsx && npm run build && git diff --check`

Expected: PASS。

```bash
git add src/shared/profile-transfer src/features/profile-transfer src/styles.css
git commit -m "feat: add profile backup and import preview"
```

### Task 4: 通用化播放器并接入错题、收藏、复习与测评

**Files:**
- Modify: `src/features/lesson-player/LessonPlayer.tsx`, `src/features/lesson-player/LessonPlayer.test.tsx`
- Create: `src/features/assessment/Assessment.tsx`, `src/features/assessment/Assessment.test.tsx`
- Create: `src/features/review/ReviewQueue.tsx`, `src/features/review/ReviewQueue.test.tsx`
- Create: `src/features/favorites/FavoriteButton.tsx`, `src/features/favorites/FavoriteButton.test.tsx`
- Modify: `src/features/quiz/Quiz.tsx`, `src/features/quiz/Quiz.test.tsx`

**Interfaces:**

```ts
export interface LessonPlayerProps { lesson: Lesson; courseProgress: CourseProgress; profile: LearningProfile; onProfileChange(next: LearningProfile): void; }
export interface AssessmentProps { kind: AssessmentKind; questions: QuizQuestion[]; existing?: AssessmentResult; onComplete(result: AssessmentResult): void; }
```

- [ ] **Step 1: 写入失败的交互测试**

测试播放器通过`CourseProgress`恢复步骤/实验/答案；错答创建不重复错题，答对不移除；收藏按稳定`contentId`切换；复习只显示未掌握错题与收藏；标记掌握后从默认队列移除；前后测各3题，完成后记录结果，且后测题干不与前测重复。

- [ ] **Step 2: 运行失败测试**

Run: `npm run test -- --run src/features/lesson-player/LessonPlayer.test.tsx src/features/quiz/Quiz.test.tsx src/features/assessment/Assessment.test.tsx src/features/review/ReviewQueue.test.tsx src/features/favorites/FavoriteButton.test.tsx`

Expected: FAIL，因为新组件和全局接口未实现。

- [ ] **Step 3: 实现引擎和学习记录接线**

播放器不再依赖单课`LessonProgress`。选择实验、步骤和答案均调用`profileState`操作；错答记录来源ID和错误选项。1-1入口显示前测，完成课后可进入后测；正确和错误路径都不阻断课程。概念、来源和题目收藏只传稳定ID；复习使用原生控件、筛选和“已掌握”动作，空队列有返回地图动作。

- [ ] **Step 4: 验证并提交**

Run: `npm run test -- --run src/features/lesson-player/LessonPlayer.test.tsx src/features/quiz/Quiz.test.tsx src/features/assessment/Assessment.test.tsx src/features/review/ReviewQueue.test.tsx src/features/favorites/FavoriteButton.test.tsx && npm run build && git diff --check`

Expected: PASS。

```bash
git add src/features/lesson-player src/features/quiz src/features/assessment src/features/review src/features/favorites src/styles.css
git commit -m "feat: add reusable learning record features"
```

### Task 5: 接入全局档案页、路由和本地恢复状态

**Files:**
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/theme.tsx`, `src/app/theme.test.tsx`
- Create: `src/features/learning-profile/LearningProfilePage.tsx`, `src/features/learning-profile/LearningProfilePage.test.tsx`
- Modify: `src/features/learning-map/LearningMap.tsx`, `src/features/learning-map/LearningMap.test.tsx`
- Modify: `src/shared/ui/StatusPanel.tsx`, `src/styles.css`

**Interfaces:**

```ts
export function LearningProfilePage(props: { profile: LearningProfile; onProfileChange(next: LearningProfile): void }): JSX.Element;
```

- [ ] **Step 1: 写入失败的应用接线测试**

测试首次全局加载迁移旧1-1键、主题/课程恢复、全局读取错误可重试、学习档案入口可达、导入确认后替换内存档案并同步本地、取消不改变档案、未开放课程不显示学习完成状态。

- [ ] **Step 2: 运行失败测试**

Run: `npm run test -- --run src/app/App.test.tsx src/app/theme.test.tsx src/features/learning-profile/LearningProfilePage.test.tsx src/features/learning-map/LearningMap.test.tsx`

Expected: FAIL，因为现有单课状态断言或新页面模块失败。

- [ ] **Step 3: 将App切换到全局档案**

使用`loadLearningProfile`初始化并在保存、重试、`storage`事件和导入确认时更新同一档案。旧单课键只由迁移适配器处理。地图页增加“学习档案”入口，档案页组合概览、测评、错题、收藏、复习和备份恢复，且所有路由保持可恢复状态。

- [ ] **Step 4: 验证并提交**

Run: `npm run test -- --run src/app/App.test.tsx src/app/theme.test.tsx src/features/learning-profile/LearningProfilePage.test.tsx src/features/learning-map/LearningMap.test.tsx && npm run test:run && npm run build && git diff --check`

Expected: PASS。

```bash
git add src/app src/features/learning-profile src/features/learning-map src/shared/ui src/styles.css
git commit -m "feat: connect global learning profile"
```

### Task 6: 端到端验收、阶段2证据与计划更新

**Files:**
- Modify: `e2e/lesson-1-1.spec.ts`
- Create: `docs/superpowers/evidence/stage-2-course-engine.md`
- Modify: `06-开发计划与验收标准.md`, `README.md`

- [ ] **Step 1: 写入端到端场景**

新增Playwright场景：将阶段1旧键写入浏览器后进入应用并确认迁移；完成1-1前测、实验和错题，收藏来源，完成后测；在档案页复习并标记掌握；导出档案、导入可验证测试文件、预览合并、确认；取消另一次导入；两个标签页同步全局档案。覆盖375px和1440px，监控请求仅本地且FAQ无Fetch/XHR。

- [ ] **Step 2: 运行端到端测试**

Run: `npm run test:e2e`

Expected: 所有阶段1回归和新增阶段2场景通过。

- [ ] **Step 3: 写入验收证据与项目状态**

证据文档记录旧键迁移、版本校验、导出/预览/合并、错题/收藏/复习、前后测、双标签、移动端、全套命令结果及明确未实现的模型、其余11课和发布。将开发计划的阶段2标为已验收、下一步更新为阶段3；README写明本地运行、备份恢复和未外发边界。

- [ ] **Step 4: 全量验收并提交**

Run: `npm run test:run && npm run build && npm run test:e2e && git diff --check`

Expected: PASS。

```bash
git add e2e docs/superpowers/evidence/stage-2-course-engine.md "06-开发计划与验收标准.md" README.md
git commit -m "feat: complete stage two course engine"
```

## Acceptance

- 阶段1旧1-1进度可安全、幂等迁移到版本化12课学习档案；未知字段与未来版本不会污染当前档案。
- 本地JSON导出不含课程正文；导入经预览和明确确认后按固定规则合并，取消/失败不写入。
- 1-1完整接入通用课程进度、错题、收藏、复习和3题前/后测；其他11课无假学习数据。
- 跨标签档案同步、损坏存储、读取/写入失败和导入失败均可恢复。
- 单元/组件、构建和Playwright端到端在375–1440px下通过；无模型、教学网络依赖、发布或远程写入。
