import type { LessonProgress } from '../types/lesson'

export const LESSON_PROGRESS_STORAGE_KEY = 'ai-agent-learning:lesson-1-1:progress'

export type LessonProgressLoadResult =
  | { status: 'loaded'; progress: LessonProgress }
  | { status: 'empty' }
  | { status: 'malformed' }
  | { status: 'read-error' }

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  )
}

function projectLessonProgress(value: unknown): LessonProgress | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const progress = value as Record<string, unknown>
  if (
    typeof progress.currentStepId === 'string' &&
    isStringArray(progress.completedStepIds) &&
    isStringArray(progress.selectedContextIds) &&
    isStringRecord(progress.answers) &&
    (progress.theme === 'light' || progress.theme === 'dark')
  ) {
    return {
      currentStepId: progress.currentStepId,
      completedStepIds: [...progress.completedStepIds],
      selectedContextIds: [...progress.selectedContextIds],
      answers: { ...progress.answers },
      theme: progress.theme,
    }
  }

  return null
}

export function parseLessonProgressValue(savedProgress: string | null): LessonProgress | null {
  if (savedProgress === null) {
    return null
  }

  try {
    return projectLessonProgress(JSON.parse(savedProgress) as unknown)
  } catch {
    return null
  }
}

export function loadLessonProgressResult(): LessonProgressLoadResult {
  let savedProgress: string | null

  try {
    savedProgress = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
  } catch {
    return { status: 'read-error' }
  }

  if (savedProgress === null) {
    return { status: 'empty' }
  }

  const progress = parseLessonProgressValue(savedProgress)
  return progress === null
    ? { status: 'malformed' }
    : { status: 'loaded', progress }
}

export function loadLessonProgress(): LessonProgress | null {
  const result = loadLessonProgressResult()
  return result.status === 'loaded' ? result.progress : null
}

export function saveLessonProgress(progress: LessonProgress): boolean {
  try {
    const lessonLocalProgress = projectLessonProgress(progress)
    if (lessonLocalProgress === null) {
      return false
    }

    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(lessonLocalProgress))
    return true
  } catch {
    return false
  }
}

export function clearLessonProgress(): boolean {
  try {
    localStorage.removeItem(LESSON_PROGRESS_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
