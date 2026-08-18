import { describe, expect, it } from 'vitest'
import { lessonZeroOne } from './lesson-0-1'

describe('lessonZeroOne', () => {
  it('keeps the daily Agent distinction inside its reviewed source boundary', () => {
    expect(lessonZeroOne.sourceRefs.map((source) => source.id)).toEqual([
      'page-015', 'page-016', 'page-019',
    ])
    expect(lessonZeroOne.steps.find((step) => step.experimentId === 'agent-identifier')?.experimentKind)
      .toBe('agent-identifier')
    expect(lessonZeroOne.quiz).toHaveLength(3)
  })

  it('does not treat product labels or chat interfaces as sufficient proof', () => {
    const teachingText = [
      ...lessonZeroOne.steps.map((step) => step.content),
      ...lessonZeroOne.quiz.flatMap((question) => [question.prompt, question.explanation]),
    ].join(' ')

    expect(teachingText).toContain('产品标签')
    expect(teachingText).toContain('聊天窗口')
    expect(teachingText).toContain('信息不足')
  })
})
