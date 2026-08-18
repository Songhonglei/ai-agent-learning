import { describe, expect, it } from 'vitest'
import { lessonZeroTwo } from './lesson-0-2'

describe('lessonZeroTwo', () => {
  it('keeps the formula and evidence sources traceable', () => {
    expect(lessonZeroTwo.sourceRefs.map((source) => source.id)).toEqual([
      'figure-0-1', 'page-015', 'page-020',
    ])
    expect(lessonZeroTwo.steps.find((step) => step.experimentId === 'agent-formula-builder')?.experimentKind)
      .toBe('agent-formula-builder')
    expect(lessonZeroTwo.quiz).toHaveLength(3)
  })

  it('teaches all three parts without making tool access unconditional', () => {
    const teachingText = [
      ...lessonZeroTwo.steps.map((step) => step.content),
      ...lessonZeroTwo.sourceRefs.map((source) => source.conclusion),
    ].join(' ')

    expect(teachingText).toContain('LLM')
    expect(teachingText).toContain('上下文')
    expect(teachingText).toContain('工具')
    expect(lessonZeroTwo.faq[1].answer).toContain('权限')
  })
})
