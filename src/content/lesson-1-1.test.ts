import { describe, expect, it } from 'vitest'
import { lessonOne } from './lesson-1-1'
import {
  fullyAuthoredLessonIds,
  learningMapModules,
  learningMapNodes,
} from './learning-map'

describe('lessonOne', () => {
  it('exposes a stable content id for favorites', () => {
    expect(lessonOne.contentId).toBe('lesson-1-1')
  })

  it('keeps its teaching sources within the approved 1-1 source pack', () => {
    expect(lessonOne.sourceRefs.map((source) => source.id)).toEqual([
      'figure-2-1',
      'page-035',
      'page-052',
    ])
  })

  it('provides one configured step for every stage-one lesson step type', () => {
    expect(new Set(lessonOne.steps.map((step) => step.type))).toEqual(
      new Set(['scene', 'dialogue', 'experiment', 'quiz', 'summary', 'free-question']),
    )
  })

  it('contains three reviewed context scenarios', () => {
    expect(lessonOne.quiz).toHaveLength(3)
    expect(lessonOne.quiz.map((question) => question.id)).toEqual([
      'missing-background',
      'current-context',
      'information-quality',
    ])
  })

  it('provides complete three-question pretests and posttests without reused prompts', () => {
    expect(lessonOne.pretest).toHaveLength(3)
    expect(lessonOne.posttest).toHaveLength(3)

    for (const question of [...(lessonOne.pretest ?? []), ...(lessonOne.posttest ?? [])]) {
      expect(question.options).toHaveLength(3)
      expect(question.options.map((option) => option.id)).toContain(question.correctOptionId)
      expect(question.sourceRefIds.length).toBeGreaterThan(0)
    }

    const pretestPrompts = new Set(lessonOne.pretest?.map((question) => question.prompt))
    const posttestPrompts = lessonOne.posttest?.map((question) => question.prompt)

    expect(new Set(posttestPrompts).size).toBe(3)
    expect(posttestPrompts?.every((prompt) => !pretestPrompts.has(prompt))).toBe(true)
  })

  it('keeps assessment facts inside the approved introductory source boundary', () => {
    const assessments = [...(lessonOne.pretest ?? []), ...(lessonOne.posttest ?? [])]
    const assessmentText = assessments.flatMap((question) => [
      question.prompt,
      question.immediateFeedback,
      question.explanation,
      ...question.options.map((option) => option.label),
    ]).join(' ')

    expect(new Set(assessments.flatMap((question) => question.sourceRefIds))).toEqual(
      new Set(['figure-2-1', 'page-035']),
    )
    expect(assessmentText).not.toMatch(/模型参数|窗口数值|缓存|价格|版本/)
  })

  it('teaches that the current context window is finite', () => {
    const teachingText = [
      ...lessonOne.steps.map((step) => step.content),
      ...lessonOne.sourceRefs.map((source) => source.conclusion),
    ].join(' ')

    expect(teachingText).toContain('窗口有限')
    expect(teachingText).toContain('超出容量会导致判断失真')
  })

  it('keeps the frozen five-module, twelve-lesson, six-node map while opening the first batch', () => {
    expect(learningMapModules).toHaveLength(5)
    expect(learningMapModules.flatMap((module) => module.lessons)).toHaveLength(12)
    expect(learningMapNodes).toHaveLength(6)
    expect(fullyAuthoredLessonIds).toHaveLength(12)
  })
})
