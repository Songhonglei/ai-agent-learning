import { describe, expect, it } from 'vitest'
import { lessonOneThree } from './lesson-1-3'

describe('lessonOneThree', () => {
  it('keeps its teaching sources within the reviewed safety source pack', () => {
    expect(lessonOneThree.sourceRefs.map((source) => source.id)).toEqual([
      'outline-057-044',
      'page-057',
      'page-058',
    ])
  })

  it('uses a local source-classification practice without executable attack content', () => {
    expect(lessonOneThree.steps.find((step) => step.type === 'experiment')).toMatchObject({
      experimentId: 'prompt-safety',
      experimentKind: 'prompt-safety',
    })
    expect(lessonOneThree.quiz).toHaveLength(3)
    expect(lessonOneThree.steps.map((step) => step.content).join(' ')).toContain('本地文本卡')
  })

  it('teaches layered protection rather than a single-rule guarantee', () => {
    const text = lessonOneThree.faq.flatMap((item) => [item.question, item.answer]).join(' ')

    expect(text).toContain('分层防御')
    expect(text).not.toMatch(/一条.*保证安全/)
  })
})
