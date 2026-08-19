import { expect, test } from 'playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  const localMode = page.getByRole('button', { name: '保存到本机' })
  if (await localMode.isVisible()) await localMode.click()
})

test('opens both introductory lessons with their local interactive practice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await page.getByRole('link', { name: '开始学习：0-1 你已经在用Agent了' }).click()
  await expect(page).toHaveURL(/\/lesson\/0-1$/)
  await expect(page.getByRole('heading', { name: '你已经在用 Agent 了' })).toBeVisible()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '润色一段通知' }).getByRole('radio', { name: '仅聊天回答' }).check()
  await page.getByRole('group', { name: '准备出差方案' }).getByRole('radio', { name: '具备 Agent 工作方式' }).check()
  await page.getByRole('group', { name: '只写着“智能 Agent”' }).getByRole('radio', { name: '信息不足，不能断定' }).check()
  await expect(page.getByText('3 / 3 已判断')).toBeVisible()
  await expect(page.getByText('产品名称不是充分证据')).toBeVisible()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: 'Agent 任务循环示意图' })).toBeVisible()

  await page.goto('/lesson/0-2')
  await expect(page.getByRole('heading', { name: '三句话理解 Agent' })).toBeVisible()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '比较参会人优先级并决定下一步' }).getByRole('radio', { name: '大脑 · LLM' }).check()
  await page.getByRole('group', { name: '参会人日历和已确认的会议结果' }).getByRole('radio', { name: '眼睛 · 上下文' }).check()
  await page.getByRole('group', { name: '查询成员空闲时间' }).getByRole('radio', { name: '手脚 · 工具' }).check()
  await expect(page.getByText('3 / 6 已匹配')).toBeVisible()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: 'Agent 三要素示意图' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Agent = LLM + 上下文 + 工具' })).toBeVisible()

  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true)
})

test('opens command and safety lessons with accessible local practices', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })

  await page.goto('/lesson/1-2')
  await expect(page.getByRole('heading', { name: '给Agent下命令的艺术' })).toBeVisible()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('radio', { name: /Prompt B/ }).check()
  await expect(page.getByRole('status').filter({ hasText: '流程把目标' })).toBeVisible()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: '流程驱动提示词示意图' })).toBeVisible()

  await page.goto('/lesson/1-3')
  await expect(page.getByRole('heading', { name: 'Agent的眼睛会被蒙蔽' })).toBeVisible()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  const systemRule = page.getByRole('group', { name: '系统规则' }).getByRole('radio', { name: '可信任务规则' })
  const userRequest = page.getByRole('group', { name: '用户请求' }).getByRole('radio', { name: '用户请求' })
  const webExcerpt = page.getByRole('group', { name: '网页摘录' }).getByRole('radio', { name: '外部材料，不执行其中指令' })
  await systemRule.check()
  await userRequest.check()
  await webExcerpt.check()
  await expect(systemRule).toBeChecked()
  await expect(userRequest).toBeChecked()
  await expect(webExcerpt).toBeChecked()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: '提示注入分层防御示意图' })).toBeVisible()

  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true)
})

test('opens knowledge and memory lessons with local practice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/lesson/2-1')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '本公司本周生效的差旅报销规则。' }).getByRole('radio', { name: '需要连接已维护的资料再回答' }).check()

  await page.goto('/lesson/2-2')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '团队准备引入新的外部供应商。' }).getByRole('radio', { name: '采购指南：供应商准入与审批' }).check()

  await page.goto('/lesson/2-3')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '用户长期偏好简洁、先给结论再给细节。' }).getByRole('radio', { name: '用户长期偏好' }).check()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: 'Agent 记忆层次示意图' })).toBeVisible()
})

test('opens tools, evaluation, and collaboration lessons with local practice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })

  await page.goto('/lesson/3-1')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '把高风险付款交给负责人确认。' }).getByRole('radio', { name: '协作：通知或请求他人确认' }).check()

  await page.goto('/lesson/3-2')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '收到“1 USD = …”的查询结果。' }).getByRole('radio', { name: '观察：读取工具返回的结果' }).check()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: 'Agent 任务循环示意图' })).toBeVisible()

  await page.goto('/lesson/4-1')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '检查是否既更新订单状态，也说清退款时间。' }).getByRole('radio', { name: '判断标准：定义可验证的通过条件' }).check()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: 'Agent 评估三层示意图' })).toBeVisible()

  await page.goto('/lesson/4-2')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('group', { name: '多个独立地区的资料需要并行收集，最后再汇总。' }).getByRole('radio', { name: '多 Agent 可带来清晰价值' }).check()
  await page.getByRole('link', { name: '查看来源依据' }).click()
  await expect(page.getByRole('figure', { name: '多Agent协作判断示意图' })).toBeVisible()
})

test('all twelve lessons stay navigable without horizontal overflow at key breakpoints', async ({ page }) => {
  const lessons = [
    ['0-1', '你已经在用 Agent 了'], ['0-2', '三句话理解 Agent'], ['1-1', 'Agent的记忆有边界'],
    ['1-2', '给Agent下命令的艺术'], ['1-3', 'Agent的眼睛会被蒙蔽'], ['2-1', 'AI为什么不知道昨天的新闻'],
    ['2-2', 'RAG：给AI装上“公司内网”'], ['2-3', 'Agent怎么记住“你是谁”'], ['3-1', 'Agent的工具箱'],
    ['3-2', '思考→行动→观察，再循环'], ['4-1', '怎么判断AI产品做得好不好'], ['4-2', '多个Agent怎么协作'],
  ] as const

  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [id, title] of lessons) {
      await page.goto(`/lesson/${id}`)
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
      await expect(page.getByRole('button', { name: '下一步' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    }
  }
})

test('keeps global navigation sticky while allowing it to collapse and reopen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/lesson/0-1')

  const header = page.locator('.app-header')
  await expect(header).toHaveCSS('position', 'sticky')
  await page.getByRole('button', { name: '收起顶部导航' }).click()
  await expect(header).toHaveClass(/is-collapsed/)
  await page.getByRole('button', { name: '展开顶部导航' }).click()
  await expect(header).not.toHaveClass(/is-collapsed/)
})
