import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from '../shared/types/profile'
import {
  completeAssessment,
  markWrongAnswerMastered,
  recordWrongAnswer,
  toggleFavorite,
  updateCourseProgress,
} from './profileState'

describe('profile state operations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-05T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('immutably updates authored course progress and the profile timestamp', () => {
    const profile = { ...createEmptyProfile(), updatedAt: '2026-08-05T09:00:00.000Z' }

    const next = updateCourseProgress(profile, '1-1', {
      currentStepId: 'dialogue-context',
      completedStepIds: ['scene-intro'],
      experimentStates: { 'context-builder': ['code-and-error'] },
    })

    expect(next).not.toBe(profile)
    expect(next.courses).not.toBe(profile.courses)
    expect(next.courses['1-1']).not.toBe(profile.courses['1-1'])
    expect(next.courses['1-1']).toEqual({
      currentStepId: 'dialogue-context',
      completedStepIds: ['scene-intro'],
      experimentStates: { 'context-builder': ['code-and-error'] },
      answers: {},
    })
    expect(next.updatedAt).toBe('2026-08-05T10:00:00.000Z')
    expect(profile.courses['1-1'].completedStepIds).toEqual([])
  })

  it('does not create fake progress for unavailable or unknown courses', () => {
    const profile = { ...createEmptyProfile(), updatedAt: '2026-08-05T09:00:00.000Z' }

    expect(updateCourseProgress(profile, '9-9', {
      currentStepId: 'invented-step',
      completedStepIds: ['invented-step'],
      completedAt: '2026-08-05T10:00:00.000Z',
    })).toBe(profile)
    expect(updateCourseProgress(profile, '9-9', {
      currentStepId: 'invented-step',
    })).toBe(profile)
  })

  it('records one immutable wrong-answer entry per lesson and question', () => {
    const profile = { ...createEmptyProfile(), updatedAt: '2026-08-05T09:00:00.000Z' }
    const wrongAnswer = {
      questionId: 'missing-background',
      lessonId: '1-1',
      selectedOptionId: 'always-complete',
      sourceRefIds: ['page-035'],
      mastered: false,
      recordedAt: '2026-08-05T09:30:00.000Z',
    }

    const first = recordWrongAnswer(profile, wrongAnswer)
    const second = recordWrongAnswer(first, {
      ...wrongAnswer,
      selectedOptionId: 'more-instructions',
      recordedAt: '2026-08-05T09:45:00.000Z',
    })

    expect(profile.wrongAnswers).toEqual([])
    expect(second.wrongAnswers).toEqual([
      {
        ...wrongAnswer,
        selectedOptionId: 'more-instructions',
        recordedAt: '2026-08-05T09:45:00.000Z',
      },
    ])
    expect(second.updatedAt).toBe('2026-08-05T10:00:00.000Z')
  })

  it('toggles favorites without mutating the prior profile', () => {
    const profile = createEmptyProfile()

    const added = toggleFavorite(profile, 'lesson-1-1')
    const removed = toggleFavorite(added, 'lesson-1-1')

    expect(profile.favoriteContentIds).toEqual([])
    expect(added.favoriteContentIds).toEqual(['lesson-1-1'])
    expect(removed.favoriteContentIds).toEqual([])
    expect(added.updatedAt).toBe('2026-08-05T10:00:00.000Z')
  })

  it('marks only the requested wrong answer as mastered', () => {
    const profile = {
      ...createEmptyProfile(),
      wrongAnswers: [
        {
          questionId: 'missing-background',
          lessonId: '1-1',
          selectedOptionId: 'always-complete',
          sourceRefIds: ['page-035'],
          mastered: false,
          recordedAt: '2026-08-05T09:00:00.000Z',
        },
        {
          questionId: 'current-context',
          lessonId: '1-1',
          selectedOptionId: 'chat-only',
          sourceRefIds: ['figure-2-1'],
          mastered: false,
          recordedAt: '2026-08-05T09:10:00.000Z',
        },
      ],
    }

    const next = markWrongAnswerMastered(profile, '1-1', 'missing-background')

    expect(next.wrongAnswers.map(({ questionId, mastered }) => ({ questionId, mastered }))).toEqual([
      { questionId: 'missing-background', mastered: true },
      { questionId: 'current-context', mastered: false },
    ])
    expect(profile.wrongAnswers[0].mastered).toBe(false)
    expect(next.updatedAt).toBe('2026-08-05T10:00:00.000Z')
  })

  it('records completed assessments immutably by kind', () => {
    const profile = createEmptyProfile()
    const result = {
      kind: 'posttest' as const,
      answers: {
        'posttest-check-visibility': 'check-visible-information',
      },
      completedAt: '2026-08-05T09:55:00.000Z',
      score: 1,
    }

    const next = completeAssessment(profile, result)

    expect(profile.assessments).toEqual({})
    expect(next.assessments).toEqual({ posttest: result })
    expect(next.assessments).not.toBe(profile.assessments)
    expect(next.updatedAt).toBe('2026-08-05T10:00:00.000Z')
  })

  it('does not record an assessment with an invalid completion date', () => {
    const profile = createEmptyProfile()

    expect(completeAssessment(profile, {
      kind: 'pretest',
      answers: { q1: 'a1' },
      completedAt: '2026-02-30T09:00:00.000Z',
      score: 1,
    })).toBe(profile)
  })
})
