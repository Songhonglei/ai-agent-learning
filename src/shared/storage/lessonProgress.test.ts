import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLessonProgress,
  loadLessonProgress,
  loadLessonProgressResult,
  saveLessonProgress,
} from './lessonProgress'

const progress = {
  currentStepId: 'dialogue-context',
  completedStepIds: ['scene-intro'],
  selectedContextIds: ['code-and-error'],
  answers: { 'missing-background': 'missing-context' },
  theme: 'dark' as const,
}

describe('lesson progress storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when the saved JSON is corrupted', () => {
    localStorage.setItem('ai-agent-learning:lesson-1-1:progress', '{not-json')

    expect(loadLessonProgress()).toBeNull()
  })

  it('returns null when the saved progress has an invalid lesson-local field', () => {
    localStorage.setItem(
      'ai-agent-learning:lesson-1-1:progress',
      JSON.stringify({ ...progress, answers: { 'missing-background': 3 } }),
    )

    expect(loadLessonProgress()).toBeNull()
  })

  it('returns null when the browser refuses a progress read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })

    expect(loadLessonProgress()).toBeNull()
  })

  it('distinguishes an empty store from a malformed saved record', () => {
    expect(loadLessonProgressResult()).toEqual({ status: 'empty' })

    localStorage.setItem('ai-agent-learning:lesson-1-1:progress', '{not-json')

    expect(loadLessonProgressResult()).toEqual({ status: 'malformed' })
  })

  it('reports read access errors separately from absent progress', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })

    expect(loadLessonProgressResult()).toEqual({ status: 'read-error' })
  })

  it('returns a projected five-field progress record when loading succeeds', () => {
    localStorage.setItem(
      'ai-agent-learning:lesson-1-1:progress',
      JSON.stringify({ ...progress, schemaVersion: 1, favoriteConceptIds: ['context'] }),
    )

    expect(loadLessonProgressResult()).toEqual({ status: 'loaded', progress })
  })

  it('returns false when the browser refuses a progress write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })

    expect(saveLessonProgress(progress)).toBe(false)
  })

  it('writes only the five lesson-local progress fields', () => {
    const progressWithGlobalState = {
      ...progress,
      schemaVersion: 1,
      migrationMarker: 'stage-two',
      wrongQuestionIds: ['missing-background'],
    }

    expect(saveLessonProgress(progressWithGlobalState as typeof progress)).toBe(true)
    expect(JSON.parse(localStorage.getItem('ai-agent-learning:lesson-1-1:progress') ?? '')).toEqual(
      progress,
    )
  })

  it('strips extra fields from a saved lesson progress record', () => {
    localStorage.setItem(
      'ai-agent-learning:lesson-1-1:progress',
      JSON.stringify({ ...progress, schemaVersion: 1, favoriteConceptIds: ['context'] }),
    )

    expect(loadLessonProgress()).toEqual(progress)
  })

  it('round-trips and clears only this lesson progress', () => {
    expect(saveLessonProgress(progress)).toBe(true)
    expect(loadLessonProgress()).toEqual(progress)
    expect(clearLessonProgress()).toBe(true)
    expect(loadLessonProgress()).toBeNull()
  })

  it('returns false when the browser refuses to clear lesson progress', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })

    expect(clearLessonProgress()).toBe(false)
  })
})
