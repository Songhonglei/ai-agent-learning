import { describe, expect, it } from 'vitest'
import { authoredLessons } from '../../content/lessons'
import {
  PROFILE_SCHEMA_VERSION,
  createEmptyProfile,
  isValidUtcIsoTimestamp,
} from './profile'

describe('isValidUtcIsoTimestamp', () => {
  it('accepts the application UTC format and rejects normalized calendar dates', () => {
    expect(isValidUtcIsoTimestamp('2026-02-28T09:30:00.000Z')).toBe(true)
    expect(isValidUtcIsoTimestamp('2026-02-30T09:30:00.000Z')).toBe(false)
    expect(isValidUtcIsoTimestamp('2026-02-28T09:30:00Z')).toBe(false)
    expect(isValidUtcIsoTimestamp('2026-02-28T17:30:00.000+08:00')).toBe(false)
  })
})

describe('createEmptyProfile', () => {
  it('creates empty progress for all twelve known lessons', () => {
    const profile = createEmptyProfile()
    const knownLessonIds = [
      '0-1', '0-2', '1-1', '1-2', '1-3', '2-1',
      '2-2', '2-3', '3-1', '3-2', '4-1', '4-2',
    ]

    expect(Object.keys(profile.courses)).toEqual(knownLessonIds)
    expect(profile).toMatchObject({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      theme: 'light',
      currentLessonId: '0-1',
      wrongAnswers: [],
      favoriteContentIds: [],
      assessments: {},
    })
    expect(Date.parse(profile.updatedAt)).not.toBeNaN()

    for (const course of Object.values(profile.courses)) {
      expect(course.completedStepIds).toEqual([])
      expect(course.experimentStates).toEqual({})
      expect(course.answers).toEqual({})
      expect(course.completedAt).toBeUndefined()
    }
  })

  it('starts the first authored lesson at a valid step and leaves later courses untouched', () => {
    const profile = createEmptyProfile()

    expect(profile.courses['0-1'].currentStepId).toBe(authoredLessons[0].steps[0].id)
    expect(profile.courses['1-1'].currentStepId).toBe('')
    for (const [lessonId, course] of Object.entries(profile.courses)) {
      if (lessonId !== '0-1') {
        expect(course.currentStepId).toBe('')
      }
    }
  })
})
