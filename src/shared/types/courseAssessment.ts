import type { AssessmentKind } from './profile'

export const COURSE_TEST_VERSION = 'course-2026-10-v1' as const

export interface CourseTestAttempt {
  kind: AssessmentKind
  version: typeof COURSE_TEST_VERSION
  answers: Record<string, string>
  currentQuestion: number
  startedAt: string
  updatedAt: string
  completedAt?: string
  learningStarted: boolean
}

export type CourseTestRecords = Partial<Record<AssessmentKind, CourseTestAttempt>>
