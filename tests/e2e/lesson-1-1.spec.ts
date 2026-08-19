import { expect, test, type BrowserContext, type Download, type Page } from 'playwright/test'

const legacyProgressKey = 'ai-agent-learning:lesson-1-1:progress'
const learningProfileKey = 'ai-agent-learning:learning-profile'
const testServerOrigin = 'http://127.0.0.1:4173'

const legacyProgress = {
  currentStepId: 'dialogue-context',
  completedStepIds: ['scene-intro'],
  selectedContextIds: ['code-context'],
  answers: { 'missing-background': 'missing-context' },
  theme: 'dark',
  futureField: 'must-not-migrate',
}

const requiredContexts = [
  '代码上下文',
  '流程约束',
  '环境上下文',
]

const correctAnswers = [
  '缺少任务背景，可能给出不符合当前约束的回答。',
  '规则、请求、既往回复以及相关工具调用和结果。',
  '当前决策点可见的任务信息不同，约束判断也会不同。',
]

const pretestAnswers = [
  '任务规则、用户请求、既往回复和相关工具结果。',
  '当前缺少必要任务背景，直接判断可能不符合任务约束。',
  'Agent 可能给出看似合理但不符合当前约束的判断。',
]

const posttestAnswers = [
  '检查代码、流程、环境和相关结果此刻是否可见。',
  '两次当前可见的任务信息不同，约束判断也会不同。',
  '关键结果仍然缺失，Agent 可能无法按当前条件正确判断。',
]

function monitorLocalRequests(context: BrowserContext) {
  const unexpectedRequests: string[] = []

  context.on('request', (request) => {
    const url = new URL(request.url())
    if (
      ['http:', 'https:'].includes(url.protocol)
      && url.origin !== testServerOrigin
    ) {
      unexpectedRequests.push(request.url())
    }
  })

  return unexpectedRequests
}

async function seedLegacyProgress(page: Page) {
  await page.addInitScript(({ storageKey, progress }) => {
    if (sessionStorage.getItem('stage-two-e2e-legacy-seeded')) return

    localStorage.setItem(storageKey, JSON.stringify(progress))
    sessionStorage.setItem('stage-two-e2e-legacy-seeded', 'true')
  }, { storageKey: legacyProgressKey, progress: legacyProgress })
}

async function openLessonFromMap(page: Page) {
  await page.goto('/')
  const localMode = page.getByRole('button', { name: '保存到本机' })
  if (await localMode.isVisible()) await localMode.click()
  await expect(page.getByRole('heading', { name: '你的学习地图' })).toBeVisible()
  await page.getByRole('link', { name: /开始学习：1-1 Agent的记忆有边界/ }).click()
  await expect(page).toHaveURL(/\/lesson\/1-1$/)
  await expect(page.getByRole('heading', { name: 'Agent的记忆有边界' })).toBeVisible()
}

async function finishLesson(page: Page) {
  const nextButton = page.getByRole('button', { name: '下一步' })

  await nextButton.click()
  await nextButton.click()

  for (const context of requiredContexts) {
    await page.getByRole('checkbox', { name: new RegExp(context) }).check()
  }
  await expect(page.getByRole('status').filter({ hasText: '可以继续分析' })).toBeVisible()

  await nextButton.click()
  for (const answer of correctAnswers) {
    await page.getByRole('radio', { name: answer }).check()
  }
  await expect(page.getByText('3 / 3 已答')).toBeVisible()
  await expect(page.getByRole('status', { name: /题反馈/ })).toHaveCount(3)

  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('region', { name: '来源依据入口' })).toBeInViewport()
  await expect(page.getByText('PDF 34 · 印刷页 26')).toBeVisible()
  await expect(page.getByText('PDF 35 · 印刷页 27')).toBeVisible()
  await expect(page.getByText('PDF 52 · 印刷页 44')).toBeVisible()

  await nextButton.click()
  await nextButton.click()
  await expect(page.getByText('步骤 6 / 6')).toBeVisible()
}

async function completeAssessment(
  page: Page,
  name: '课前测验' | '课后测验',
  answers: string[],
) {
  const assessment = page.getByRole('region', { name })
  for (const answer of answers) {
    await assessment.getByRole('radio', { name: answer }).check()
  }
  await expect(assessment.getByText('3 / 3 已答')).toBeVisible()
  await assessment.getByRole('button', { name: `完成${name}` }).click()
  await expect(assessment.getByRole('status')).toContainText('得分 3 / 3')
}

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream) content += chunk.toString()
  return content
}

async function expectSafeLegacyMigration(page: Page) {
  await expect(page.getByText('步骤 2 / 6')).toBeVisible()
  await expect(page.getByRole('button', { name: '切换到浅色主题' })).toBeVisible()

  const migration = await page.evaluate(({ legacyKey, profileKey }) => {
    const rawProfile = localStorage.getItem(profileKey)
    const profile = rawProfile ? JSON.parse(rawProfile) : null
    const untouchedCourses = profile
      ? Object.entries(profile.courses)
          .filter(([lessonId]) => lessonId !== '1-1')
          .every(([lessonId, course]) => {
            const value = course as {
              currentStepId: string
              completedStepIds: string[]
              experimentStates: Record<string, string[]>
              answers: Record<string, string>
              completedAt?: string
            }
            return value.currentStepId === (lessonId === '0-1' ? 'scene-daily-agent' : '')
              && value.completedStepIds.length === 0
              && Object.keys(value.experimentStates).length === 0
              && Object.keys(value.answers).length === 0
              && value.completedAt === undefined
          })
      : false

    return {
      rawProfile,
      legacyValue: localStorage.getItem(legacyKey),
      schemaVersion: profile?.schemaVersion,
      rootFutureField: profile?.futureField,
      courseFutureField: profile?.courses?.['1-1']?.futureField,
      courseCount: profile ? Object.keys(profile.courses).length : 0,
      currentStepId: profile?.courses?.['1-1']?.currentStepId,
      completedStepIds: profile?.courses?.['1-1']?.completedStepIds,
      selectedContextIds: profile?.courses?.['1-1']?.experimentStates?.['context-builder'],
      answers: profile?.courses?.['1-1']?.answers,
      untouchedCourses,
    }
  }, { legacyKey: legacyProgressKey, profileKey: learningProfileKey })

  expect(migration).toMatchObject({
    legacyValue: null,
    schemaVersion: 1,
    courseCount: 12,
    currentStepId: 'dialogue-context',
    completedStepIds: ['scene-intro'],
    selectedContextIds: ['code-context'],
    answers: { 'missing-background': 'missing-context' },
    untouchedCourses: true,
  })
  expect(migration.rootFutureField).toBeUndefined()
  expect(migration.courseFutureField).toBeUndefined()

  const reinserted = await page.evaluate(
    ({ legacyKey, profileKey, progress }) => {
      const canonicalBefore = localStorage.getItem(profileKey)
      localStorage.setItem(legacyKey, JSON.stringify(progress))
      return {
        canonicalBefore,
        canonicalAfter: localStorage.getItem(profileKey),
        legacyValue: localStorage.getItem(legacyKey),
      }
    },
    {
      legacyKey: legacyProgressKey,
      profileKey: learningProfileKey,
      progress: legacyProgress,
    },
  )
  expect(reinserted).toEqual({
    canonicalBefore: migration.rawProfile,
    canonicalAfter: migration.rawProfile,
    legacyValue: JSON.stringify(legacyProgress),
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('步骤 2 / 6')).toBeVisible()
  const repeatedMigration = await page.evaluate(
    ({ legacyKey, profileKey }) => ({
      rawProfile: localStorage.getItem(profileKey),
      legacyValue: localStorage.getItem(legacyKey),
    }),
    { legacyKey: legacyProgressKey, profileKey: learningProfileKey },
  )
  expect(repeatedMigration).toEqual({
    rawProfile: migration.rawProfile,
    legacyValue: null,
  })
}

async function completeStageTwoJourney(page: Page) {
  await completeAssessment(page, '课前测验', pretestAnswers)

  await page.getByRole('button', { name: '下一步' }).click()
  for (const context of requiredContexts) {
    await page.getByRole('checkbox', { name: new RegExp(context) }).check()
  }
  await expect(page.getByRole('status').filter({ hasText: '可以继续分析' })).toBeVisible()

  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('radio', { name: '只要模型足够强，就能补齐全部任务背景。' }).check()
  await page.getByRole('radio', { name: correctAnswers[1] }).check()
  await page.getByRole('radio', { name: correctAnswers[2] }).check()
  await expect(page.getByText('3 / 3 已答')).toBeVisible()
  await expect(page.getByRole('status', { name: '第 1 题反馈' })).toContainText('答错也不会阻断课程')

  await page.getByRole('button', { name: '收藏题目：Agent 要修复异常' }).click()
  await expect(page.getByRole('button', { name: '取消收藏题目：Agent 要修复异常' })).toBeVisible()

  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await expect(page.getByText('步骤 6 / 6')).toBeVisible()

  await page.getByRole('group').filter({ hasText: '为什么 Agent 会“忘记”重要信息？' }).click()
  await expect(page.getByText('在当前决策点，任务所需信息没有进入上下文窗口时')).toBeVisible()
  await expect(page.getByRole('button', { name: '提问' })).toBeDisabled()

  await page.getByRole('button', { name: '完成本课' }).click()
  await expect(page.getByRole('button', { name: '本课已完成' })).toBeDisabled()
  await completeAssessment(page, '课后测验', posttestAnswers)
}

async function verifyReviewExportAndImports(page: Page) {
  await page.getByRole('link', { name: '学习档案' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByText('课前测验 3 / 3')).toBeVisible()
  await expect(page.getByText('课后测验 3 / 3')).toBeVisible()
  await expect(page.getByText('1 道未掌握错题')).toBeVisible()
  await expect(page.getByText('1 项收藏')).toBeVisible()

  await page.getByRole('button', { name: '标记已掌握：Agent 要修复异常' }).click()
  await expect(page.getByText('0 道未掌握错题')).toBeVisible()
  await expect(page.getByRole('button', { name: /标记已掌握/ })).toHaveCount(0)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出学习档案' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ai-agent-learning-profile-\d{4}-\d{2}-\d{2}\.json$/)

  const exported = JSON.parse(await readDownload(download)) as Record<string, unknown> & {
    favoriteContentIds: string[]
    wrongAnswers: Array<{ mastered: boolean }>
    updatedAt: string
  }
  expect(Object.keys(exported).sort()).toEqual([
    'assessments',
    'courses',
    'currentLessonId',
    'favoriteContentIds',
    'schemaVersion',
    'theme',
    'updatedAt',
    'wrongAnswers',
  ])
  expect(exported.schemaVersion).toBe(1)
  expect(JSON.stringify(exported)).not.toContain('情境导入')
  expect(exported.wrongAnswers).toContainEqual(expect.objectContaining({ mastered: true }))

  const fileInput = page.getByLabel('导入学习档案')
  const storageBeforeCancel = await page.evaluate((key) => localStorage.getItem(key), learningProfileKey)
  const cancelCandidate = {
    ...exported,
    favoriteContentIds: [...exported.favoriteContentIds, 'lesson-1-1'],
    updatedAt: new Date(Date.parse(exported.updatedAt) + 1_000).toISOString(),
  }
  await fileInput.setInputFiles({
    name: 'cancel-profile.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(cancelCandidate)),
  })
  await expect(page.getByRole('heading', { name: '确认导入前，请检查这些取舍' })).toBeVisible()
  await expect(page.getByText(/收藏去重后 2 项/)).toBeVisible()
  await page.getByRole('button', { name: '取消导入' }).click()
  await expect(page.getByText('1 项收藏')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), learningProfileKey))
    .toBe(storageBeforeCancel)

  const confirmCandidate = {
    ...exported,
    favoriteContentIds: [...exported.favoriteContentIds, 'lesson-1-1'],
    updatedAt: new Date(Date.parse(exported.updatedAt) + 2_000).toISOString(),
  }
  await fileInput.setInputFiles({
    name: 'confirm-profile.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(confirmCandidate)),
  })
  await expect(page.getByRole('heading', { name: '确认导入前，请检查这些取舍' })).toBeVisible()
  await expect(page.getByText(/收藏去重后 2 项/)).toBeVisible()
  await page.getByRole('button', { name: '确认导入' }).click()
  await expect(page.getByText('2 项收藏')).toBeVisible()

  const importedFavorites = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).favoriteContentIds : []
  }, learningProfileKey)
  expect(importedFavorites).toEqual(expect.arrayContaining([
    'question:1-1:missing-background',
    'lesson-1-1',
  ]))
}

for (const scenario of [
  { name: '1440px 桌面端', viewport: { width: 1440, height: 1000 } },
  { name: '375px 移动端', viewport: { width: 375, height: 812 } },
]) {
  test(`${scenario.name}完成阶段 2 全局档案链路`, async ({ context, page }) => {
    await page.setViewportSize(scenario.viewport)
    const externalRequests = monitorLocalRequests(context)
    await seedLegacyProgress(page)
    await page.goto('/lesson/1-1')
    await expectSafeLegacyMigration(page)
    await completeStageTwoJourney(page)
    await verifyReviewExportAndImports(page)

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(externalRequests).toEqual([])
  })
}

test('阶段 1 全流程仍可恢复', async ({ context, page }) => {
  const externalRequests = monitorLocalRequests(context)
  await openLessonFromMap(page)
  await finishLesson(page)

  await page.getByRole('group').filter({ hasText: '为什么 Agent 会“忘记”重要信息？' }).click()
  await expect(page.getByText('在当前决策点，任务所需信息没有进入上下文窗口时')).toBeVisible()
  await expect(page.getByRole('button', { name: '提问' })).toBeDisabled()

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('步骤 6 / 6')).toBeVisible()
  await expect(page.getByText('3 项已选')).toBeVisible()
  await expect(page.getByText('3 / 3 已答')).toBeVisible()
  for (const contextName of requiredContexts) {
    await expect(page.getByRole('checkbox', { name: new RegExp(contextName) })).toBeChecked()
  }
  for (const answer of correctAnswers) {
    await expect(page.getByRole('radio', { name: answer })).toBeChecked()
  }

  await page.waitForTimeout(50)
  expect(externalRequests).toEqual([])
})

test('两个标签页同步全局主题与收藏档案', async ({ context }) => {
  const externalRequests = monitorLocalRequests(context)
  const firstTab = await context.newPage()
  const secondTab = await context.newPage()

  await Promise.all([
    firstTab.goto('/lesson/1-1'),
    secondTab.goto('/profile'),
  ])

  for (const tab of [firstTab, secondTab]) {
    const localMode = tab.getByRole('button', { name: '保存到本机' })
    if (await localMode.isVisible()) await localMode.click()
  }

  await firstTab.getByRole('button', { name: '收藏本课概念' }).click()
  await expect(secondTab.getByText('1 项收藏')).toBeVisible()
  await expect(secondTab.getByRole('heading', { name: 'Agent的记忆有边界' })).toBeVisible()

  await secondTab.getByRole('button', { name: '切换到深色主题' }).click()
  await expect.poll(() => firstTab.locator('html').getAttribute('data-theme')).toBe('dark')

  const [firstStored, secondStored] = await Promise.all([
    firstTab.evaluate((key) => localStorage.getItem(key), learningProfileKey),
    secondTab.evaluate((key) => localStorage.getItem(key), learningProfileKey),
  ])
  expect(firstStored).toBe(secondStored)
  expect(externalRequests).toEqual([])

  await Promise.all([firstTab.close(), secondTab.close()])
})

test('1440px 视口恢复冻结的桌面容器与导师列尺寸', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/lesson/1-1')

  const shellBox = await page.locator('.shell').boundingBox()
  const mentorBox = await page.locator('.mentor-panel').boundingBox()

  expect(shellBox?.width).toBe(1200)
  expect(mentorBox?.width).toBe(310)
})

test('375/768/1024/1440 下关键动作可见且页面无横向溢出', async ({ page }) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/lesson/1-1')

    await expect(page.getByRole('link', { name: '返回学习地图' })).toBeVisible()
    await expect(page.getByRole('button', { name: '下一步' })).toBeVisible()
    await expect(page.getByRole('link', { name: '查看来源依据' })).toBeVisible()
    await expect(page.getByRole('button', { name: /切换到(浅色|深色)主题/ })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow, `${width}px 不应出现横向溢出`).toBe(false)
  }
})

test('减弱动态效果时关闭非必要动画', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/lesson/1-1')

  const motion = await page.getByRole('button', { name: '下一步' }).evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      animationDuration: style.animationDuration,
      animationIterationCount: style.animationIterationCount,
      transitionDuration: style.transitionDuration,
    }
  })

  expect(Number.parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.00001)
  expect(motion.animationIterationCount).toBe('1')
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.00001)
})
