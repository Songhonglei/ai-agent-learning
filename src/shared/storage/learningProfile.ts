import { learningMapLessonIds } from '../../content/learning-map'
import type { LessonProgress } from '../types/lesson'
import {
  PROFILE_SCHEMA_VERSION,
  createEmptyProfile,
  isValidUtcIsoTimestamp,
  type AssessmentKind,
  type AssessmentResult,
  type CourseProgress,
  type LearningProfile,
  type WrongAnswer,
} from '../types/profile'
import {
  clearLessonProgress,
  loadLessonProgressResult,
} from './lessonProgress'

export const LEARNING_PROFILE_STORAGE_KEY = 'ai-agent-learning:learning-profile'
const LOCAL_FALLBACK_CONFIRMATION_STORAGE_KEY = 'ai-agent-learning:local-fallback-confirmed'

export type ProfileLoadResult =
  | { status: 'loaded'; profile: LearningProfile }
  | { status: 'empty' }
  | { status: 'malformed' }
  | { status: 'future-version' }
  | { status: 'read-error' }
  | { status: 'migration-error' }

export type ParsedProfile =
  | { status: 'loaded'; profile: LearningProfile }
  | { status: 'malformed' }
  | { status: 'future-version' }

export type ProfileStorageReadResult =
  | { status: 'loaded'; profile: LearningProfile }
  | { status: 'empty' }
  | { status: 'malformed' }
  | { status: 'future-version' }
  | { status: 'read-error' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function projectStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? [...value]
    : null
}

function projectStringRecord(value: unknown): Record<string, string> | null {
  if (!isRecord(value) || !Object.values(value).every((item) => typeof item === 'string')) {
    return null
  }

  return { ...value } as Record<string, string>
}

function projectExperimentStates(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value)) return null

  const entries: [string, string[]][] = []
  for (const [experimentId, selectedIds] of Object.entries(value)) {
    const projectedIds = projectStringArray(selectedIds)
    if (projectedIds === null) return null
    entries.push([experimentId, projectedIds])
  }
  return Object.fromEntries(entries)
}

function projectCourseProgress(value: unknown): CourseProgress | null {
  if (!isRecord(value)) return null

  const completedStepIds = projectStringArray(value.completedStepIds)
  const experimentStates = projectExperimentStates(value.experimentStates)
  const answers = projectStringRecord(value.answers)
  if (
    typeof value.currentStepId !== 'string' ||
    completedStepIds === null ||
    experimentStates === null ||
    answers === null ||
    (value.completedAt !== undefined && typeof value.completedAt !== 'string')
  ) {
    return null
  }

  return {
    currentStepId: value.currentStepId,
    completedStepIds,
    experimentStates,
    answers,
    ...(typeof value.completedAt === 'string' ? { completedAt: value.completedAt } : {}),
  }
}

function projectWrongAnswer(value: unknown): WrongAnswer | null {
  if (!isRecord(value)) return null
  const sourceRefIds = projectStringArray(value.sourceRefIds)
  if (
    typeof value.questionId !== 'string' ||
    typeof value.lessonId !== 'string' ||
    typeof value.selectedOptionId !== 'string' ||
    sourceRefIds === null ||
    typeof value.mastered !== 'boolean' ||
    typeof value.recordedAt !== 'string'
  ) {
    return null
  }

  return {
    questionId: value.questionId,
    lessonId: value.lessonId,
    selectedOptionId: value.selectedOptionId,
    sourceRefIds,
    mastered: value.mastered,
    recordedAt: value.recordedAt,
  }
}

function projectAssessmentResult(
  value: unknown,
  expectedKind: AssessmentKind,
): AssessmentResult | null {
  if (!isRecord(value)) return null
  const answers = projectStringRecord(value.answers)
  if (
    value.kind !== expectedKind ||
    answers === null ||
    typeof value.completedAt !== 'string' ||
    !isValidUtcIsoTimestamp(value.completedAt) ||
    typeof value.score !== 'number' ||
    !Number.isFinite(value.score)
  ) {
    return null
  }

  return {
    kind: expectedKind,
    answers,
    completedAt: value.completedAt,
    score: value.score,
  }
}

export function projectLearningProfile(value: unknown): LearningProfile | null {
  if (!isRecord(value) || value.schemaVersion !== PROFILE_SCHEMA_VERSION) return null
  if (
    (value.theme !== 'light' && value.theme !== 'dark') ||
    typeof value.currentLessonId !== 'string' ||
    !learningMapLessonIds.includes(value.currentLessonId) ||
    !isRecord(value.courses) ||
    !Array.isArray(value.wrongAnswers) ||
    !isRecord(value.assessments) ||
    typeof value.updatedAt !== 'string'
  ) {
    return null
  }

  const favoriteContentIds = projectStringArray(value.favoriteContentIds)
  if (favoriteContentIds === null) return null

  const courses: Record<string, CourseProgress> = {}
  for (const lessonId of learningMapLessonIds) {
    const course = projectCourseProgress(value.courses[lessonId])
    if (course === null) return null
    courses[lessonId] = course
  }

  const wrongAnswers: WrongAnswer[] = []
  for (const valueItem of value.wrongAnswers) {
    const wrongAnswer = projectWrongAnswer(valueItem)
    if (wrongAnswer === null) return null
    wrongAnswers.push(wrongAnswer)
  }

  const assessments: Partial<Record<AssessmentKind, AssessmentResult>> = {}
  for (const kind of ['pretest', 'posttest'] as const) {
    if (value.assessments[kind] === undefined) continue
    const assessment = projectAssessmentResult(value.assessments[kind], kind)
    if (assessment === null) return null
    assessments[kind] = assessment
  }

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    theme: value.theme,
    currentLessonId: value.currentLessonId,
    courses,
    wrongAnswers,
    favoriteContentIds,
    assessments,
    updatedAt: value.updatedAt,
  }
}

export function parseLearningProfileValue(savedProfile: string): ParsedProfile {
  let value: unknown
  try {
    value = JSON.parse(savedProfile) as unknown
  } catch {
    return { status: 'malformed' }
  }

  if (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    value.schemaVersion > PROFILE_SCHEMA_VERSION
  ) {
    return { status: 'future-version' }
  }

  const profile = projectLearningProfile(value)
  return profile === null
    ? { status: 'malformed' }
    : { status: 'loaded', profile }
}

function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function stringRecordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftKeys = Object.keys(left)
  return leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => left[key] === right[key])
}

export function migrateLessonOneProgress(
  legacy: LessonProgress,
  profile: LearningProfile,
): LearningProfile {
  const currentCourse = profile.courses['1-1']
  if (!currentCourse) return profile

  const currentExperimentSelection = currentCourse.experimentStates['context-builder'] ?? []
  const alreadyMigrated =
    profile.theme === legacy.theme &&
    profile.currentLessonId === '1-1' &&
    currentCourse.currentStepId === legacy.currentStepId &&
    stringArraysEqual(currentCourse.completedStepIds, legacy.completedStepIds) &&
    stringArraysEqual(currentExperimentSelection, legacy.selectedContextIds) &&
    stringRecordsEqual(currentCourse.answers, legacy.answers)

  if (alreadyMigrated) return profile

  return {
    ...profile,
    theme: legacy.theme,
    currentLessonId: '1-1',
    courses: {
      ...profile.courses,
      '1-1': {
        ...currentCourse,
        currentStepId: legacy.currentStepId,
        completedStepIds: [...legacy.completedStepIds],
        experimentStates: {
          ...currentCourse.experimentStates,
          'context-builder': [...legacy.selectedContextIds],
        },
        answers: { ...legacy.answers },
      },
    },
    updatedAt: new Date().toISOString(),
  }
}

export function saveLearningProfile(profile: LearningProfile): boolean {
  const projectedProfile = projectLearningProfile(profile)
  if (projectedProfile === null) return false

  try {
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(projectedProfile))
    return true
  } catch {
    return false
  }
}

export function hasConfirmedLocalFallback(): boolean {
  try {
    return localStorage.getItem(LOCAL_FALLBACK_CONFIRMATION_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function confirmLocalFallback(): boolean {
  try {
    localStorage.setItem(LOCAL_FALLBACK_CONFIRMATION_STORAGE_KEY, 'true')
    return true
  } catch {
    return false
  }
}

function representsMigratedLegacyState(
  profile: LearningProfile,
  legacy: LessonProgress,
): boolean {
  const expected = migrateLessonOneProgress(legacy, createEmptyProfile())
  return JSON.stringify({ ...profile, updatedAt: '' })
    === JSON.stringify({ ...expected, updatedAt: '' })
}

function cleanMatchingLegacyProfile(profile: LearningProfile): 'clean' | 'unrelated' | 'error' {
  const legacyResult = loadLessonProgressResult()
  if (legacyResult.status === 'empty') return 'clean'
  if (
    legacyResult.status !== 'loaded'
    || !representsMigratedLegacyState(profile, legacyResult.progress)
  ) {
    return 'unrelated'
  }

  return clearLessonProgress() ? 'clean' : 'error'
}

export function loadLearningProfile(): ProfileLoadResult {
  const storedResult = readLearningProfileStorage()
  if (storedResult.status === 'read-error') return storedResult
  if (storedResult.status === 'malformed' || storedResult.status === 'future-version') {
    return storedResult
  }

  if (storedResult.status === 'loaded') {
    const cleanup = cleanMatchingLegacyProfile(storedResult.profile)
    return cleanup === 'error'
      ? { status: 'migration-error' }
      : storedResult
  }

  const legacyResult = loadLessonProgressResult()
  if (legacyResult.status === 'empty') return { status: 'empty' }
  if (legacyResult.status !== 'loaded') return { status: 'migration-error' }

  const migratedProfile = migrateLessonOneProgress(legacyResult.progress, createEmptyProfile())
  if (!saveLearningProfile(migratedProfile)) return { status: 'migration-error' }
  if (!clearLessonProgress()) {
    return { status: 'migration-error' }
  }

  return { status: 'loaded', profile: migratedProfile }
}

export function readLearningProfileStorage(): ProfileStorageReadResult {
  let savedProfile: string | null
  try {
    savedProfile = localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)
  } catch {
    return { status: 'read-error' }
  }

  return savedProfile === null
    ? { status: 'empty' }
    : parseLearningProfileValue(savedProfile)
}

export function reconcileProfileStorageEvent(
  event: StorageEvent,
  current: LearningProfile,
): LearningProfile | null {
  if (event.key !== LEARNING_PROFILE_STORAGE_KEY || event.newValue === null) return null

  const parsed = parseLearningProfileValue(event.newValue)
  if (parsed.status !== 'loaded') return null

  const incomingUpdatedAt = Date.parse(parsed.profile.updatedAt)
  const currentUpdatedAt = Date.parse(current.updatedAt)
  if (
    Number.isNaN(incomingUpdatedAt) ||
    (!Number.isNaN(currentUpdatedAt) && incomingUpdatedAt < currentUpdatedAt) ||
    (incomingUpdatedAt === currentUpdatedAt
      && JSON.stringify(parsed.profile) === JSON.stringify(current))
  ) {
    return null
  }

  return parsed.profile
}
