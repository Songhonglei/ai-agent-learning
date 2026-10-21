import { courseTestQuestions } from '../content/course-assessment'
import { authoredLessons } from '../content/lessons'
import { COURSE_TEST_VERSION, type CourseTestAttempt, type CourseTestRecords } from './types/courseAssessment'
import { isValidUtcIsoTimestamp, type AssessmentKind, type LearningProfile } from './types/profile'

export function hasCourseLearning(profile: LearningProfile): boolean {
  return Object.values(profile.courses).some((course) => course.completedAt
    || course.completedStepIds.length > 0 || Object.keys(course.answers).length > 0
    || Object.values(course.experimentStates).some((values) => values.length > 0))
}

export function completedLessonCount(profile: LearningProfile): number {
  return authoredLessons.filter(({ id }) => profile.courses[id]?.completedAt).length
}

export function scoreAttempt(attempt: CourseTestAttempt, lessonIds?: string[]): { score: number; total: number; percent: number } {
  const questions = courseTestQuestions[attempt.kind].filter((q) => !lessonIds || lessonIds.includes(q.lessonId))
  const score = questions.filter((q) => attempt.answers[q.id] === q.correctOptionId).length
  return { score, total: questions.length, percent: questions.length ? score / questions.length * 100 : 0 }
}

export function isBaselineComparable(records: CourseTestRecords): boolean {
  const { pretest, posttest } = records
  return !!pretest?.completedAt && !!posttest?.completedAt && !pretest.learningStarted
    && pretest.version === posttest.version && pretest.completedAt <= posttest.startedAt
}

export function projectCourseTestRecords(value: unknown): CourseTestRecords | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const records: CourseTestRecords = {}
  for (const kind of ['pretest', 'posttest'] as const) {
    const raw = (value as Record<string, unknown>)[kind]
    if (raw === undefined) continue
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const item = raw as Record<string, unknown>
    if (item.kind !== kind || item.version !== COURSE_TEST_VERSION || typeof item.learningStarted !== 'boolean'
      || !Number.isInteger(item.currentQuestion) || (item.currentQuestion as number) < 0
      || (item.currentQuestion as number) >= courseTestQuestions[kind].length
      || typeof item.startedAt !== 'string' || !isValidUtcIsoTimestamp(item.startedAt)
      || typeof item.updatedAt !== 'string' || !isValidUtcIsoTimestamp(item.updatedAt)
      || item.updatedAt < item.startedAt
      || !item.answers || typeof item.answers !== 'object' || Array.isArray(item.answers)) return null
    const answers: Record<string, string> = {}
    for (const [id, option] of Object.entries(item.answers)) {
      const question = courseTestQuestions[kind].find((q) => q.id === id)
      if (!question || !question.options.some((o) => o.id === option)) return null
      answers[id] = option as string
    }
    if (item.completedAt !== undefined && (typeof item.completedAt !== 'string'
      || !isValidUtcIsoTimestamp(item.completedAt) || item.completedAt < item.startedAt
      || item.completedAt !== item.updatedAt || Object.keys(answers).length !== courseTestQuestions[kind].length)) return null
    records[kind] = {
      kind, version: COURSE_TEST_VERSION, answers,
      currentQuestion: item.currentQuestion as number,
      startedAt: item.startedAt, updatedAt: item.updatedAt,
      learningStarted: item.learningStarted,
      ...(typeof item.completedAt === 'string' ? { completedAt: item.completedAt } : {}),
    }
  }
  return records
}

export function editCourseTest(profile: LearningProfile, kind: AssessmentKind, change: { questionId?: string; optionId?: string; currentQuestion?: number; submit?: boolean } = {}): LearningProfile {
  const previous = profile.courseAssessments[kind]
  if (previous?.completedAt || (kind === 'posttest' && completedLessonCount(profile) !== authoredLessons.length)) return profile
  const lastTime = Date.parse(previous?.updatedAt ?? profile.updatedAt)
  const now = new Date(Math.max(Date.now(), Number.isFinite(lastTime) ? lastTime + 1 : 0)).toISOString()
  const attempt: CourseTestAttempt = previous ? { ...previous, answers: { ...previous.answers } } : {
    kind, version: COURSE_TEST_VERSION, answers: {}, currentQuestion: 0,
    startedAt: now, updatedAt: now, learningStarted: hasCourseLearning(profile),
  }
  if (change.questionId !== undefined) {
    const question = courseTestQuestions[kind].find((q) => q.id === change.questionId)
    if (!question?.options.some((o) => o.id === change.optionId)) return profile
    attempt.answers[question.id] = change.optionId!
  }
  if (change.currentQuestion !== undefined) {
    if (!Number.isInteger(change.currentQuestion) || change.currentQuestion < 0 || change.currentQuestion >= courseTestQuestions[kind].length) return profile
    attempt.currentQuestion = change.currentQuestion
  }
  attempt.learningStarted ||= hasCourseLearning(profile)
  attempt.updatedAt = now
  if (change.submit) {
    if (courseTestQuestions[kind].some((q) => !attempt.answers[q.id])) return profile
    attempt.completedAt = now
  }
  return { ...profile, courseAssessments: { ...profile.courseAssessments, [kind]: attempt }, updatedAt: now }
}

function clone(attempt: CourseTestAttempt): CourseTestAttempt {
  return { ...attempt, answers: { ...attempt.answers } }
}

// Preserve the earliest completed baseline; imports never turn it back into a draft.
export function mergeCourseTestRecords(current: CourseTestRecords, incoming: CourseTestRecords): CourseTestRecords {
  const merged: CourseTestRecords = {}
  for (const kind of ['pretest', 'posttest'] as const) {
    const left = current[kind], right = incoming[kind]
    if (!left || !right) { const item = left ?? right; if (item) merged[kind] = clone(item); continue }
    if (left.completedAt || right.completedAt) {
      merged[kind] = clone(left.completedAt && (!right.completedAt || left.completedAt <= right.completedAt) ? left : right)
    } else {
      const newer = left.updatedAt >= right.updatedAt ? left : right
      const older = newer === left ? right : left
      merged[kind] = { ...clone(newer), startedAt: left.startedAt < right.startedAt ? left.startedAt : right.startedAt,
        answers: { ...older.answers, ...newer.answers }, learningStarted: left.learningStarted || right.learningStarted }
    }
  }
  return merged
}

export function mergeCourseTestDelta(base: CourseTestRecords, requested: CourseTestRecords, canonical: CourseTestRecords): CourseTestRecords {
  const merged = { ...canonical }
  for (const kind of ['pretest', 'posttest'] as const) {
    const before = base[kind], next = requested[kind], saved = canonical[kind]
    if (JSON.stringify(before) === JSON.stringify(next) || saved?.completedAt || !next) continue
    if (!saved || JSON.stringify(before) === JSON.stringify(saved)) { merged[kind] = clone(next); continue }
    // A competing draft changed during submission: display that draft for review first.
    if (next.completedAt) continue
    const answers = { ...saved.answers }
    for (const [id, option] of Object.entries(next.answers)) {
      if (option !== before?.answers[id] && saved.answers[id] === before?.answers[id]) answers[id] = option
    }
    merged[kind] = { ...saved, answers, updatedAt: next.updatedAt > saved.updatedAt ? next.updatedAt : saved.updatedAt,
      learningStarted: saved.learningStarted || next.learningStarted,
      currentQuestion: saved.currentQuestion === before?.currentQuestion ? next.currentQuestion : saved.currentQuestion }
  }
  return merged
}
