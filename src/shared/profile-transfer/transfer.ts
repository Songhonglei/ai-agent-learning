import {
  parseLearningProfileValue,
  projectLearningProfile,
} from '../storage/learningProfile'
import type {
  AssessmentKind,
  AssessmentResult,
  CourseProgress,
  LearningProfile,
  WrongAnswer,
} from '../types/profile'
import { isValidUtcIsoTimestamp } from '../types/profile'

export type ImportPreview =
  | {
      status: 'ready'
      candidate: LearningProfile
      changeCount: number
      conflictCount: number
    }
  | { status: 'invalid'; message: string }
  | { status: 'future-version'; message: string }

type ProfileSide = 'current' | 'incoming'

function compareValidDates(left: string, right: string): number {
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)
  const leftIsValid = !Number.isNaN(leftTime)
  const rightIsValid = !Number.isNaN(rightTime)

  if (leftIsValid && !rightIsValid) return 1
  if (!leftIsValid && rightIsValid) return -1
  if (!leftIsValid && !rightIsValid) return 0
  return Math.sign(leftTime - rightTime)
}

function newerSide(currentDate: string, incomingDate: string): ProfileSide {
  return compareValidDates(incomingDate, currentDate) > 0 ? 'incoming' : 'current'
}

function preferredCourseSide(
  current: CourseProgress,
  incoming: CourseProgress,
  currentUpdatedAt: string,
  incomingUpdatedAt: string,
): ProfileSide {
  const completedDifference = incoming.completedStepIds.length - current.completedStepIds.length
  if (completedDifference !== 0) return completedDifference > 0 ? 'incoming' : 'current'

  const answerDifference = Object.keys(incoming.answers).length - Object.keys(current.answers).length
  if (answerDifference !== 0) return answerDifference > 0 ? 'incoming' : 'current'

  return newerSide(currentUpdatedAt, incomingUpdatedAt)
}

function cloneCourse(course: CourseProgress): CourseProgress {
  return {
    currentStepId: course.currentStepId,
    completedStepIds: [...course.completedStepIds],
    experimentStates: Object.fromEntries(
      Object.entries(course.experimentStates).map(([id, selectedIds]) => [id, [...selectedIds]]),
    ),
    answers: { ...course.answers },
    ...(course.completedAt === undefined ? {} : { completedAt: course.completedAt }),
  }
}

function preferredCurrentStep(
  current: CourseProgress,
  incoming: CourseProgress,
  currentUpdatedAt: string,
  incomingUpdatedAt: string,
): string {
  return newerSide(currentUpdatedAt, incomingUpdatedAt) === 'incoming'
    ? incoming.currentStepId
    : current.currentStepId
}

function cloneWrongAnswer(wrongAnswer: WrongAnswer): WrongAnswer {
  return { ...wrongAnswer, sourceRefIds: [...wrongAnswer.sourceRefIds] }
}

function wrongAnswerId(wrongAnswer: WrongAnswer): string {
  return `${wrongAnswer.lessonId}\u0000${wrongAnswer.questionId}`
}

function mergeWrongAnswers(current: WrongAnswer[], incoming: WrongAnswer[]): WrongAnswer[] {
  const merged = new Map<string, WrongAnswer>()

  for (const wrongAnswer of current) {
    const id = wrongAnswerId(wrongAnswer)
    if (!merged.has(id)) merged.set(id, cloneWrongAnswer(wrongAnswer))
  }

  for (const wrongAnswer of incoming) {
    const id = wrongAnswerId(wrongAnswer)
    const existing = merged.get(id)
    if (!existing || compareValidDates(wrongAnswer.recordedAt, existing.recordedAt) > 0) {
      merged.set(id, cloneWrongAnswer(wrongAnswer))
    }
  }

  return [...merged.values()]
}

function cloneAssessment(assessment: AssessmentResult): AssessmentResult {
  return { ...assessment, answers: { ...assessment.answers } }
}

function hasValidCompletedAt(
  assessment: AssessmentResult | undefined,
): assessment is AssessmentResult {
  return assessment !== undefined && isValidUtcIsoTimestamp(assessment.completedAt)
}

function preferredAssessment(
  current: AssessmentResult | undefined,
  incoming: AssessmentResult | undefined,
): AssessmentResult | undefined {
  if (!hasValidCompletedAt(current)) {
    return hasValidCompletedAt(incoming) ? cloneAssessment(incoming) : undefined
  }
  if (!hasValidCompletedAt(incoming)) return cloneAssessment(current)

  return compareValidDates(incoming.completedAt, current.completedAt) > 0
    ? cloneAssessment(incoming)
    : cloneAssessment(current)
}

function mergeAssessments(
  current: LearningProfile['assessments'],
  incoming: LearningProfile['assessments'],
): LearningProfile['assessments'] {
  const assessments: LearningProfile['assessments'] = {}
  for (const kind of ['pretest', 'posttest'] as AssessmentKind[]) {
    const assessment = preferredAssessment(current[kind], incoming[kind])
    if (assessment) assessments[kind] = assessment
  }
  return assessments
}

function mergeFavoriteIds(current: string[], incoming: string[]): string[] {
  return [...new Set([...current, ...incoming])]
}

function chooseProfileValue<T>(
  current: T,
  incoming: T,
  currentUpdatedAt: string,
  incomingUpdatedAt: string,
): T {
  return newerSide(currentUpdatedAt, incomingUpdatedAt) === 'incoming' ? incoming : current
}

function courseHasSavableLearningData(course: CourseProgress): boolean {
  return course.completedAt !== undefined
    || course.completedStepIds.length > 0
    || Object.keys(course.answers).length > 0
    || Object.values(course.experimentStates).some((selectedIds) => selectedIds.length > 0)
}

export function hasSavableLearningData(profile: LearningProfile): boolean {
  if (
    profile.wrongAnswers.length > 0
    || profile.favoriteContentIds.length > 0
    || Object.keys(profile.assessments).length > 0
  ) {
    return true
  }

  return Object.values(profile.courses).some(courseHasSavableLearningData)
}

export function exportProfile(profile: LearningProfile): string {
  const projected = projectLearningProfile(profile)
  if (!projected) throw new Error('当前学习档案无法导出。')
  if (!hasSavableLearningData(projected)) {
    throw new Error('本地没有可保存的学习档案。')
  }
  return JSON.stringify(projected, null, 2)
}

export function mergeLearningProfiles(
  current: LearningProfile,
  incoming: LearningProfile,
): LearningProfile {
  const courses: Record<string, CourseProgress> = {}

  for (const lessonId of Object.keys(current.courses)) {
    const currentCourse = current.courses[lessonId]
    const incomingCourse = incoming.courses[lessonId]
    if (!incomingCourse) {
      courses[lessonId] = cloneCourse(currentCourse)
      continue
    }

    const side = preferredCourseSide(
      currentCourse,
      incomingCourse,
      current.updatedAt,
      incoming.updatedAt,
    )
    const course = cloneCourse(side === 'incoming' ? incomingCourse : currentCourse)
    course.currentStepId = preferredCurrentStep(
      currentCourse,
      incomingCourse,
      current.updatedAt,
      incoming.updatedAt,
    )
    courses[lessonId] = course
  }

  return {
    schemaVersion: current.schemaVersion,
    theme: chooseProfileValue(current.theme, incoming.theme, current.updatedAt, incoming.updatedAt),
    currentLessonId: chooseProfileValue(
      current.currentLessonId,
      incoming.currentLessonId,
      current.updatedAt,
      incoming.updatedAt,
    ),
    courses,
    wrongAnswers: mergeWrongAnswers(current.wrongAnswers, incoming.wrongAnswers),
    favoriteContentIds: mergeFavoriteIds(
      current.favoriteContentIds,
      incoming.favoriteContentIds,
    ),
    assessments: mergeAssessments(current.assessments, incoming.assessments),
    updatedAt: chooseProfileValue(
      current.updatedAt,
      incoming.updatedAt,
      current.updatedAt,
      incoming.updatedAt,
    ),
  }
}

function recordsDiffer(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) !== JSON.stringify(right)
}

function countImportConflicts(
  current: LearningProfile,
  candidate: LearningProfile,
): number {
  let conflicts = 0

  for (const [lessonId, currentCourse] of Object.entries(current.courses)) {
    if (!courseHasSavableLearningData(currentCourse)) continue
    const candidateCourse = candidate.courses[lessonId]
    if (candidateCourse && recordsDiffer(currentCourse, candidateCourse)) conflicts += 1
  }

  const candidateWrongAnswers = new Map(
    candidate.wrongAnswers.map((wrongAnswer) => [wrongAnswerId(wrongAnswer), wrongAnswer]),
  )
  for (const currentWrongAnswer of current.wrongAnswers) {
    const candidateWrongAnswer = candidateWrongAnswers.get(wrongAnswerId(currentWrongAnswer))
    if (candidateWrongAnswer && recordsDiffer(currentWrongAnswer, candidateWrongAnswer)) conflicts += 1
  }

  for (const kind of ['pretest', 'posttest'] as AssessmentKind[]) {
    const currentAssessment = current.assessments[kind]
    const candidateAssessment = candidate.assessments[kind]
    if (
      currentAssessment
      && candidateAssessment
      && recordsDiffer(currentAssessment, candidateAssessment)
    ) {
      conflicts += 1
    }
  }

  return conflicts
}

function countImportChanges(
  current: LearningProfile,
  candidate: LearningProfile,
): number {
  let changes = 0

  for (const [lessonId, candidateCourse] of Object.entries(candidate.courses)) {
    if (!courseHasSavableLearningData(candidateCourse)) continue
    const currentCourse = current.courses[lessonId]
    if (!currentCourse || recordsDiffer(currentCourse, candidateCourse)) changes += 1
  }

  const currentWrongAnswers = new Map(
    current.wrongAnswers.map((wrongAnswer) => [wrongAnswerId(wrongAnswer), wrongAnswer]),
  )
  for (const candidateWrongAnswer of candidate.wrongAnswers) {
    const currentWrongAnswer = currentWrongAnswers.get(wrongAnswerId(candidateWrongAnswer))
    if (!currentWrongAnswer || recordsDiffer(currentWrongAnswer, candidateWrongAnswer)) changes += 1
  }

  for (const favoriteId of candidate.favoriteContentIds) {
    if (!current.favoriteContentIds.includes(favoriteId)) changes += 1
  }

  for (const kind of ['pretest', 'posttest'] as AssessmentKind[]) {
    const candidateAssessment = candidate.assessments[kind]
    if (!candidateAssessment) continue
    const currentAssessment = current.assessments[kind]
    if (!currentAssessment || recordsDiffer(currentAssessment, candidateAssessment)) changes += 1
  }

  return changes
}

export function previewProfileImport(json: string, current: LearningProfile): ImportPreview {
  try {
    JSON.parse(json)
  } catch {
    return {
      status: 'invalid',
      message: '无法读取备份：文件不是有效的 JSON。',
    }
  }

  const parsed = parseLearningProfileValue(json)
  if (parsed.status === 'future-version') {
    return {
      status: 'future-version',
      message: '这个备份来自更新版本，当前版本暂时无法导入。',
    }
  }
  if (parsed.status === 'malformed') {
    return {
      status: 'invalid',
      message: '无法读取备份：档案结构不完整或字段类型不正确。',
    }
  }

  const candidate = mergeLearningProfiles(current, parsed.profile)
  return {
    status: 'ready',
    candidate,
    changeCount: countImportChanges(current, candidate),
    conflictCount: countImportConflicts(current, candidate),
  }
}
