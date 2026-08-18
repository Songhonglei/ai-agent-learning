import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import type { AssessmentResult } from '../../shared/types/profile'
import { Assessment } from './Assessment'

describe('Assessment', () => {
  afterEach(cleanup)

  it('completes a three-question pretest with answers and a numeric score', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <Assessment
        kind="pretest"
        questions={lessonOne.pretest ?? []}
        onComplete={onComplete}
      />,
    )

    const assessment = screen.getByRole('region', { name: '课前测验' })
    expect(within(assessment).getAllByRole('group')).toHaveLength(3)

    await user.click(within(assessment).getByRole('radio', {
      name: '任务规则、用户请求、既往回复和相关工具结果。',
    }))
    await user.click(within(assessment).getByRole('radio', {
      name: '现有信息已经足够按团队约束完成修复。',
    }))
    await user.click(within(assessment).getByRole('radio', {
      name: 'Agent 可能给出看似合理但不符合当前约束的判断。',
    }))
    await user.click(within(assessment).getByRole('button', { name: '完成课前测验' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({
      kind: 'pretest',
      answers: {
        'pretest-visible-context': 'task-context',
        'pretest-missing-background': 'ready-to-fix',
        'pretest-finite-window': 'distorted-judgment',
      },
      completedAt: expect.any(String),
      score: 2,
    })
    expect(within(assessment).getByRole('status')).toHaveTextContent('得分 2 / 3')
  })

  it('does not complete or count an existing result again', async () => {
    const onComplete = vi.fn()
    const existing: AssessmentResult = {
      kind: 'posttest',
      answers: Object.fromEntries((lessonOne.posttest ?? []).map((question) => [
        question.id,
        question.correctOptionId,
      ])),
      completedAt: '2026-08-05T10:00:00.000Z',
      score: 3,
    }

    const { rerender } = render(
      <Assessment
        kind="posttest"
        questions={lessonOne.posttest ?? []}
        existing={existing}
        onComplete={onComplete}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('得分 3 / 3')
    expect(screen.queryByRole('button', { name: '完成课后测验' })).not.toBeInTheDocument()

    rerender(
      <Assessment
        kind="posttest"
        questions={lessonOne.posttest ?? []}
        existing={existing}
        onComplete={onComplete}
      />,
    )
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('uses three distinct posttest prompts without reusing pretest wording', () => {
    const pretestPrompts = new Set((lessonOne.pretest ?? []).map((question) => question.prompt))
    const posttestPrompts = (lessonOne.posttest ?? []).map((question) => question.prompt)

    expect(posttestPrompts).toHaveLength(3)
    expect(posttestPrompts.every((prompt) => !pretestPrompts.has(prompt))).toBe(true)
  })
})
