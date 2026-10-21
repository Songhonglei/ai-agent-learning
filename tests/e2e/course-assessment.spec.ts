import { expect, test, type Page } from 'playwright/test'
import { createEmptyProfile, type LearningProfile } from '../../src/shared/types/profile'
import { courseTestQuestions } from '../../src/content/course-assessment'

const key = 'ai-agent-learning:learning-profile'
async function seed(page: Page, profile: LearningProfile | Record<string, unknown>) {
  await page.addInitScript(({ profile, key }) => {
    if (sessionStorage.getItem('course-assessment-seeded')) return
    localStorage.setItem(key, JSON.stringify(profile))
    sessionStorage.setItem('course-assessment-seeded', 'true')
  }, { profile, key })
}
async function fillTest(page: Page, kind: 'pretest' | 'posttest', correct: number) {
  for (const [index, q] of courseTestQuestions[kind].entries()) {
    await expect(page.locator('#course-test-question-title')).toHaveText(q.prompt)
    await page.locator(`input[name="${q.id}"][value="${index < correct ? 'a' : 'b'}"]`).check()
    if (index < 23) await page.getByRole('button', { name: '下一题', exact: true }).click()
  }
  await expect(page.getByText(/参考答案：/)).toHaveCount(0)
  await expect(page.getByRole('status', { exact: true }).filter({ hasText: '已答 24 / 24 题' })).toBeVisible()
}
async function submit(page: Page, kind: 'pretest' | 'posttest') {
  await page.getByRole('button', { name: kind === 'pretest' ? '提交课程前测' : '提交结课后测', exact: true }).click()
  await page.getByRole('button', { name: kind === 'pretest' ? '确认提交前测' : '确认提交后测', exact: true }).click()
  await expect(page.getByRole('heading', { name: kind === 'pretest' ? '课程前测已提交' : '结课后测已提交', exact: true })).toBeVisible()
}
async function completeLessons(page: Page) {
  await page.evaluate((key) => {
    const profile = JSON.parse(localStorage.getItem(key)!)
    const now = new Date(Date.now() + 100).toISOString()
    for (const progress of Object.values(profile.courses) as Array<Record<string, unknown>>) progress.completedAt = now
    profile.updatedAt = now
    localStorage.setItem(key, JSON.stringify(profile))
  }, key)
}

for (const width of [1440, 360]) {
  test(`${width}px completes all 48 assessment items, compares scores and restores submitted results`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await page.getByRole('link', { name: '开始课程前测', exact: true }).click()
    await page.getByRole('button', { name: '开始作答课程前测', exact: true }).click()
    await expect(page.getByRole('button', { name: '提交课程前测', exact: true })).toBeDisabled()
    await fillTest(page, 'pretest', 12)
    await page.getByRole('button', { name: '提交课程前测', exact: true }).click()
    await page.getByRole('button', { name: '返回检查', exact: true }).click()
    await expect(page.getByRole('radio')).toHaveCount(3)
    await submit(page, 'pretest')
    await expect(page.getByText('得分 12 / 24 · 正确率 50%', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('radio')).toHaveCount(0)
    await completeLessons(page)
    await page.goto('/assessment/posttest')
    await page.getByRole('button', { name: '开始作答结课后测', exact: true }).click()
    await fillTest(page, 'posttest', 18)
    await submit(page, 'posttest')
    await expect(page.getByText('+6 分', { exact: true })).toBeVisible()
    await expect(page.getByText('正确率 +25 个百分点', { exact: true })).toBeVisible()
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(18)
    await expect(page.getByRole('link', { name: /复习 3-2/ })).toBeVisible()
    await page.getByText('第 24 题 · 4-2 · 待复习', { exact: true }).click()
    await expect(page.getByText('参考答案：交付结构化结论、关键证据、产物及未解决问题。', { exact: true })).toBeVisible()
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: '全课程结果对照' })).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出学习档案', exact: true }).click()
    const download = await downloadPromise
    const path = await download.path()
    const fs = await import('node:fs/promises')
    const backup = JSON.parse(await fs.readFile(path!, 'utf8'))
    expect(Object.keys(backup.courseAssessments)).toEqual(['pretest', 'posttest'])
    expect(backup.schemaVersion).toBe(2)
    expect(backup.courseAssessments.pretest.completedAt).toBeTruthy()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('resumes selected answers and question position; skips unanswered items and blocks incomplete submission', async ({ page }) => {
  await page.goto('/assessment/pretest')
  await page.getByRole('button', { name: '开始作答课程前测' }).click()
  await page.locator('input[value="b"]').check()
  await page.getByRole('button', { name: '下一题', exact: true }).click()
  await page.reload()
  await expect(page.getByText('当前第 2 题', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '第 1 题，已答', exact: true }).click()
  await expect(page.locator('input[value="b"]')).toBeChecked()
  await page.locator('input[value="c"]').check()
  await page.getByRole('button', { name: '第 24 题，未答', exact: true }).click()
  await expect(page.getByRole('button', { name: '提交课程前测' })).toBeDisabled()
  await expect(page.getByText('还剩 23 题未答，全部作答后即可提交。')).toBeVisible()
})

test('guards the posttest deep link with eleven lessons done; legacy 1-1 scores remain separate', async ({ page }) => {
  const profile = createEmptyProfile()
  for (const [id, progress] of Object.entries(profile.courses)) if (id !== '4-2') progress.completedAt = new Date().toISOString()
  profile.assessments.pretest = { kind: 'pretest', score: 3, answers: {}, completedAt: new Date().toISOString() }
  const legacy = { ...profile, schemaVersion: 1 } as Record<string, unknown>
  delete legacy.courseAssessments
  await seed(page, legacy)
  await page.goto('/assessment/posttest')
  await expect(page.getByText('当前已完成 11 / 12 课。请在每课末尾点击“完成本课”，再回来作答。')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始作答结课后测' })).toHaveCount(0)
  await page.goto('/profile')
  await expect(page.getByText('课前测验 3 / 3', { exact: true })).toBeVisible()
  await expect(page.getByText('尚无已提交的全课程前测，后测可单独完成；缺少前测时不计算提升。')).toBeVisible()
  await page.goto('/assessment/pretest')
  await expect(page.getByRole('note')).toContainText('补测')
})

test('cross-tab changes keep draft answers and submitted results immutable', async ({ page, context }) => {
  await page.goto('/assessment/pretest')
  await page.getByRole('button', { name: '开始作答课程前测' }).click()
  const second = await context.newPage()
  await second.goto('/assessment/pretest')
  await page.locator('input[value="b"]').check()
  await expect(second.locator('input[value="b"]')).toBeChecked()
  await second.getByRole('button', { name: '第 2 题，未答', exact: true }).click()
  await second.locator('input[value="c"]').check()
  await expect(page.getByText('已答 2 / 24 题', { exact: true })).toBeVisible()
  await page.reload()
  expect(await page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key)!).courseAssessments.pretest.answers).length, key)).toBe(2)
  await second.close()
})

test('new-schema backup imports require confirmation, cancel leaves existing records unchanged', async ({ page }) => {
  const { editCourseTest } = await import('../../src/shared/courseAssessment')
  let backupProfile = createEmptyProfile()
  for (const q of courseTestQuestions.pretest) backupProfile = editCourseTest(backupProfile, 'pretest', { questionId: q.id, optionId: 'a' })
  backupProfile = editCourseTest(backupProfile, 'pretest', { submit: true })
  await page.goto('/profile')
  const before = await page.evaluate((key) => localStorage.getItem(key), key)
  const file = { name: 'assessment-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backupProfile)) }
  await page.getByLabel('导入学习档案', { exact: true }).setInputFiles(file)
  await expect(page.getByRole('heading', { name: '导入影响' })).toBeVisible()
  await page.getByRole('button', { name: '取消导入' }).click()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(before)
  await page.getByLabel('导入学习档案', { exact: true }).setInputFiles(file)
  await page.getByRole('button', { name: '确认导入' }).click()
  await page.goto('/assessment/pretest')
  await expect(page.getByRole('heading', { name: '课程前测已提交' })).toBeVisible()
  await expect(page.getByText('得分 24 / 24 · 正确率 100%', { exact: true })).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(0)
})

test('a posttest without a pretest reports scores without inventing an improvement', async ({ page }) => {
  const { editCourseTest } = await import('../../src/shared/courseAssessment')
  let profile = createEmptyProfile()
  for (const progress of Object.values(profile.courses)) progress.completedAt = new Date().toISOString()
  for (const q of courseTestQuestions.posttest) profile = editCourseTest(profile, 'posttest', { questionId: q.id, optionId: 'b' })
  profile = editCourseTest(profile, 'posttest', { submit: true })
  await seed(page, profile)
  await page.goto('/assessment/posttest')
  await expect(page.getByText('得分 0 / 24 · 正确率 0%', { exact: true })).toBeVisible()
  await expect(page.getByText('待有效对照', { exact: true })).toBeVisible()
  await expect(page.getByText('尚无已提交的全课程前测，后测可单独完成；缺少前测时不计算提升。')).toBeVisible()
})

test('assessment start, draft and results pages fit common viewport sizes', async ({ page }) => {
  await page.goto('/assessment/pretest')
  await page.getByRole('button', { name: '开始作答课程前测' }).click()
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/assessment', '/assessment/pretest', '/assessment/posttest']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    }
  }
})

test('keyboard answers stay neutral and focus follows question navigation', async ({ page }) => {
  await page.goto('/assessment/pretest')
  await page.getByRole('button', { name: '开始作答课程前测' }).click()
  await expect(page.locator('#course-test-question-title')).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Space')
  await expect(page.locator('input:checked')).toHaveCount(1)
  await page.getByRole('button', { name: '下一题', exact: true }).click()
  await expect(page.locator('#course-test-question-title')).toBeFocused()
  await expect(page.getByText(/参考答案：/)).toHaveCount(0)
})

test('storage failure keeps draft visible and retry saves it without losing answers', async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key && !(window as unknown as { allowTestSave?: boolean }).allowTestSave) throw new DOMException('test quota', 'QuotaExceededError')
      return original.call(this, name, value)
    }
  }, key)
  await page.goto('/assessment/pretest')
  await page.getByRole('button', { name: '开始作答课程前测' }).click()
  await expect(page.getByRole('heading', { name: '本地进度暂时不可用' })).toBeVisible()
  await page.locator('input[value="b"]').check()
  await page.evaluate(() => { (window as unknown as { allowTestSave?: boolean }).allowTestSave = true })
  await page.getByRole('button', { name: '重试保存当前进度' }).click()
  await expect(page.getByRole('heading', { name: '本地进度暂时不可用' })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('input[value="b"]')).toBeChecked()
})

test('completing the last lesson opens a direct graduation posttest entry', async ({ page }) => {
  const profile = createEmptyProfile()
  for (const [id, progress] of Object.entries(profile.courses)) if (id !== '4-2') progress.completedAt = new Date().toISOString()
  await seed(page, profile)
  await page.goto('/lesson/4-2')
  for (let index = 0; index < 5; index++) await page.getByRole('button', { name: '下一步', exact: true }).click()
  await page.getByRole('button', { name: '完成本课', exact: true }).click()
  await page.getByRole('link', { name: '开始结课后测', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始作答结课后测' })).toBeVisible()
})
