import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from '../types/profile'
import { LESSON_PROGRESS_STORAGE_KEY } from './lessonProgress'
import {
  LEARNING_PROFILE_STORAGE_KEY,
  loadLearningProfile,
  migrateLessonOneProgress,
  reconcileProfileStorageEvent,
  saveLearningProfile,
} from './learningProfile'

const legacyProgress = {
  currentStepId: 'quiz-context',
  completedStepIds: ['scene-intro', 'dialogue-context'],
  selectedContextIds: ['code-and-error', 'team-rules'],
  answers: { 'missing-background': 'missing-context' },
  theme: 'dark' as const,
}

function profileAt(updatedAt: string) {
  return { ...createEmptyProfile(), updatedAt }
}

describe('learning profile storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-05T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('round-trips schema v1 while projecting unknown fields at every level', () => {
    const profile = profileAt('2026-08-05T09:00:00.000Z')
    const valueWithUnknownFields = {
      ...profile,
      secret: 'do-not-store',
      courses: {
        ...profile.courses,
        '1-1': {
          ...profile.courses['1-1'],
          internalNote: 'do-not-store',
        },
        '9-9': {
          currentStepId: 'invented',
          completedStepIds: ['invented'],
          experimentStates: {},
          answers: {},
        },
      },
      wrongAnswers: [
        {
          questionId: 'missing-background',
          lessonId: '1-1',
          selectedOptionId: 'always-complete',
          sourceRefIds: ['page-035'],
          mastered: false,
          recordedAt: '2026-08-05T08:00:00.000Z',
          explanation: 'do-not-store',
        },
      ],
      assessments: {
        pretest: {
          kind: 'pretest',
          answers: { 'pretest-visible-context': 'task-context' },
          completedAt: '2026-08-05T08:30:00.000Z',
          score: 1,
          label: 'do-not-store',
        },
        surprise: {
          kind: 'surprise',
          answers: {},
          completedAt: '2026-08-05T08:40:00.000Z',
          score: 0,
        },
      },
    }

    expect(saveLearningProfile(valueWithUnknownFields as typeof profile)).toBe(true)
    expect(loadLearningProfile()).toEqual({
      status: 'loaded',
      profile: {
        ...profile,
        wrongAnswers: [
          {
            questionId: 'missing-background',
            lessonId: '1-1',
            selectedOptionId: 'always-complete',
            sourceRefIds: ['page-035'],
            mastered: false,
            recordedAt: '2026-08-05T08:00:00.000Z',
          },
        ],
        assessments: {
          pretest: {
            kind: 'pretest',
            answers: { 'pretest-visible-context': 'task-context' },
            completedAt: '2026-08-05T08:30:00.000Z',
            score: 1,
          },
        },
      },
    })
    expect(Object.keys(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '').courses)).not.toContain('9-9')
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBeNull()
  })

  it('distinguishes empty, malformed, and future-version global storage', () => {
    expect(loadLearningProfile()).toEqual({ status: 'empty' })

    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, '{not-json')
    expect(loadLearningProfile()).toEqual({ status: 'malformed' })

    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify({ schemaVersion: 2 }))
    expect(loadLearningProfile()).toEqual({ status: 'future-version' })
  })

  it('reports global read and write failures explicitly', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })
    expect(loadLearningProfile()).toEqual({ status: 'read-error' })

    vi.restoreAllMocks()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })
    expect(saveLearningProfile(profileAt('2026-08-05T09:00:00.000Z'))).toBe(false)
  })

  it('rejects assessment records whose completion timestamp is not a real date', () => {
    const profile = profileAt('2026-08-05T09:00:00.000Z')
    profile.assessments.pretest = {
      kind: 'pretest',
      answers: { q1: 'a1' },
      completedAt: '2026-02-30T09:00:00.000Z',
      score: 1,
    }

    expect(saveLearningProfile(profile)).toBe(false)
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    expect(loadLearningProfile()).toEqual({ status: 'malformed' })
  })

  it('migrates exactly the five legacy lesson fields into the twelve-course profile', () => {
    localStorage.setItem(
      LESSON_PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...legacyProgress, ignoredLegacyField: ['do-not-migrate'] }),
    )

    const result = loadLearningProfile()

    expect(result).toMatchObject({
      status: 'loaded',
      profile: {
        schemaVersion: 1,
        theme: 'dark',
        currentLessonId: '1-1',
        courses: {
          '1-1': {
            currentStepId: 'quiz-context',
            completedStepIds: ['scene-intro', 'dialogue-context'],
            experimentStates: {
              'context-builder': ['code-and-error', 'team-rules'],
            },
            answers: { 'missing-background': 'missing-context' },
          },
        },
        updatedAt: '2026-08-05T10:00:00.000Z',
      },
    })
    if (result.status !== 'loaded') throw new Error('Expected migration to load')
    expect(Object.keys(result.profile.courses)).toEqual([
      '0-1', '0-2', '1-1', '1-2', '1-3', '2-1',
      '2-2', '2-3', '3-1', '3-2', '4-1', '4-2',
    ])
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).not.toBeNull()
  })

  it('is idempotent when the same legacy progress is migrated repeatedly', () => {
    const first = migrateLessonOneProgress(
      legacyProgress,
      profileAt('2026-08-05T09:00:00.000Z'),
    )
    vi.setSystemTime(new Date('2026-08-05T11:00:00.000Z'))

    expect(migrateLessonOneProgress(legacyProgress, first)).toEqual(first)
  })

  it('does not migrate or clear the legacy key when any global value already exists', () => {
    const globalProfile = profileAt('2026-08-05T09:00:00.000Z')
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(globalProfile))
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(legacyProgress))

    expect(loadLearningProfile()).toEqual({ status: 'loaded', profile: globalProfile })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).not.toBeNull()

    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, '{not-json')
    expect(loadLearningProfile()).toEqual({ status: 'malformed' })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).not.toBeNull()
  })

  it('does not clean a legacy key from a global profile with extra non-migration state', () => {
    const globalProfile = migrateLessonOneProgress(
      legacyProgress,
      profileAt('2026-08-05T09:00:00.000Z'),
    )
    globalProfile.favoriteContentIds = ['lesson-1-1']
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(globalProfile))
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(legacyProgress))

    expect(loadLearningProfile()).toEqual({ status: 'loaded', profile: globalProfile })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBe(JSON.stringify(legacyProgress))
  })

  it('does not fall back to the legacy key when a future-version global profile exists', () => {
    const futureProfile = JSON.stringify({ schemaVersion: 2, futureField: true })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, futureProfile)
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(legacyProgress))

    expect(loadLearningProfile()).toEqual({ status: 'future-version' })
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(futureProfile)
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBe(JSON.stringify(legacyProgress))
  })

  it('keeps the legacy key when the migrated global write fails', () => {
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(legacyProgress))
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === LEARNING_PROFILE_STORAGE_KEY) {
        throw new DOMException('Storage is full')
      }
      return originalSetItem.call(this, key, value)
    })

    expect(loadLearningProfile()).toEqual({ status: 'migration-error' })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('reports malformed legacy data as a migration error without deleting it', () => {
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, '{not-json')

    expect(loadLearningProfile()).toEqual({ status: 'migration-error' })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBe('{not-json')
  })

  it('clears the legacy key only after a successful global write', () => {
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(legacyProgress))
    const calls: string[] = []
    const originalSetItem = Storage.prototype.setItem
    const originalRemoveItem = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      calls.push(`set:${key}`)
      return originalSetItem.call(this, key, value)
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key) {
      calls.push(`remove:${key}`)
      return originalRemoveItem.call(this, key)
    })

    expect(loadLearningProfile().status).toBe('loaded')
    expect(calls).toEqual([
      `set:${LEARNING_PROFILE_STORAGE_KEY}`,
      `remove:${LESSON_PROGRESS_STORAGE_KEY}`,
    ])
  })

  it('keeps both keys when removal is globally unavailable, then cleans the matching legacy key on recovery', () => {
    const serializedLegacy = JSON.stringify(legacyProgress)
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, serializedLegacy)
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage removal is unavailable')
    })

    expect(loadLearningProfile()).toEqual({ status: 'migration-error' })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBe(serializedLegacy)
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).not.toBeNull()
    expect(removeItem).toHaveBeenCalledTimes(1)

    vi.restoreAllMocks()
    expect(loadLearningProfile()).toMatchObject({
      status: 'loaded',
      profile: {
        theme: 'dark',
        courses: {
          '1-1': {
            currentStepId: 'quiz-context',
            answers: { 'missing-background': 'missing-context' },
          },
        },
      },
    })
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).not.toBeNull()
  })

  it('accepts newer and same-time different canonical values from storage events', () => {
    const current = profileAt('2026-08-05T09:00:00.000Z')
    const newer = {
      ...profileAt('2026-08-05T10:00:00.000Z'),
      theme: 'dark' as const,
      unknown: 'strip-me',
    }
    const event = (key: string, newValue: string | null) =>
      new StorageEvent('storage', { key, newValue })

    const reconciled = reconcileProfileStorageEvent(
      event(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(newer)),
      current,
    )
    expect(reconciled).toEqual({
      ...profileAt('2026-08-05T10:00:00.000Z'),
      theme: 'dark',
    })
    expect(reconciled).not.toHaveProperty('unknown')
    expect(reconcileProfileStorageEvent(
      event('another-app:key', JSON.stringify(newer)),
      current,
    )).toBeNull()
    expect(reconcileProfileStorageEvent(
      event(LEARNING_PROFILE_STORAGE_KEY, '{not-json'),
      current,
    )).toBeNull()
    expect(reconcileProfileStorageEvent(
      event(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify({ schemaVersion: 2 })),
      current,
    )).toBeNull()
    expect(reconcileProfileStorageEvent(
      event(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(profileAt('2026-08-05T08:00:00.000Z'))),
      current,
    )).toBeNull()

    const sameTimeReplacement = {
      ...profileAt('2026-08-05T09:00:00.000Z'),
      theme: 'dark' as const,
    }
    expect(reconcileProfileStorageEvent(
      event(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(sameTimeReplacement)),
      current,
    )).toEqual(sameTimeReplacement)
    expect(reconcileProfileStorageEvent(
      event(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(current)),
      current,
    )).toBeNull()
  })
})
