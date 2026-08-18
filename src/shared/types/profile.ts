import { learningMapLessonIds } from '../../content/learning-map'
import { authoredLessons, lessonById } from '../../content/lessons'

export const PROFILE_SCHEMA_VERSION = 1 as const

export type AssessmentKind = 'pretest' | 'posttest'

export interface CourseProgress {
  currentStepId: string
  completedStepIds: string[]
  experimentStates: Record<string, string[]>
  answers: Record<string, string>
  completedAt?: string
}

export interface WrongAnswer {
  questionId: string
  lessonId: string
  selectedOptionId: string
  sourceRefIds: string[]
  mastered: boolean
  recordedAt: string
}

export interface AssessmentResult {
  kind: AssessmentKind
  answers: Record<string, string>
  completedAt: string
  score: number
}

export interface LearningProfile {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION
  theme: 'light' | 'dark'
  currentLessonId: string
  courses: Record<string, CourseProgress>
  wrongAnswers: WrongAnswer[]
  favoriteContentIds: string[]
  assessments: Partial<Record<AssessmentKind, AssessmentResult>>
  updatedAt: string
}

const UTC_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export function isValidUtcIsoTimestamp(value: string): boolean {
  if (!UTC_ISO_TIMESTAMP_PATTERN.test(value)) return false

  const time = Date.parse(value)
  return !Number.isNaN(time) && new Date(time).toISOString() === value
}

export function createEmptyProfile(): LearningProfile {
  const courses = Object.fromEntries(
    learningMapLessonIds.map((lessonId) => [
      lessonId,
      {
        currentStepId: lessonId === authoredLessons[0]?.id
          ? authoredLessons[0].steps[0]?.id ?? ''
          : '',
        completedStepIds: [],
        experimentStates: {},
        answers: {},
      },
    ]),
  )

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    theme: 'light',
    currentLessonId: lessonById.get(authoredLessons[0]?.id ?? '')?.id ?? '',
    courses,
    wrongAnswers: [],
    favoriteContentIds: [],
    assessments: {},
    updatedAt: new Date().toISOString(),
  }
}
