import { describe, expect, it } from 'vitest'
import { lessonOneTwo } from './lesson-1-2'

describe('lessonOneTwo', () => {
  it('keeps its teaching sources within the reviewed prompt source pack', () => {
    expect(lessonOneTwo.sourceRefs.map((source) => source.id)).toEqual([
      'page-035',
      'page-054',
      'page-057',
    ])
  })

  it('uses a local prompt comparison and three reviewed questions', () => {
    expect(lessonOneTwo.steps.find((step) => step.type === 'experiment')).toMatchObject({
      experimentId: 'prompt-compare',
      experimentKind: 'prompt-compare',
    })
    expect(lessonOneTwo.quiz).toHaveLength(3)
    expect(lessonOneTwo.quiz.every((question) => question.sourceRefIds.length > 0)).toBe(true)
  })

  it('does not present prompt structure as a success guarantee', () => {
    const text = [
      ...lessonOneTwo.steps.map((step) => step.content),
      ...lessonOneTwo.quiz.flatMap((question) => [question.prompt, question.explanation]),
      ...lessonOneTwo.faq.flatMap((item) => [item.question, item.answer]),
    ].join(' ')

    expect(text).not.toMatch(/保证任何任务都一定成功|万能答案/)
  })
})
