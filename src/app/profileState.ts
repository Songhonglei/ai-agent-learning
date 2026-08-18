import { fullyAuthoredLessonIds } from '../content/learning-map'
import type {
  AssessmentResult,
  CourseProgress,
  LearningProfile,
  WrongAnswer,
} from '../shared/types/profile'
import { isValidUtcIsoTimestamp } from '../shared/types/profile'

function withUpdatedAt(profile: LearningProfile): LearningProfile {
  return { ...profile, updatedAt: new Date().toISOString() }
}

function isAuthoredCourse(lessonId: string): boolean {
  return fullyAuthoredLessonIds.includes(lessonId)
}

export function updateCourseProgress(
  profile: LearningProfile,
  lessonId: string,
  update: Partial<CourseProgress>,
): LearningProfile {
  const current = profile.courses[lessonId]
  if (!current || !isAuthoredCourse(lessonId)) return profile

  const nextCourse: CourseProgress = {
    ...current,
    ...update,
    completedStepIds: update.completedStepIds
      ? [...update.completedStepIds]
      : [...current.completedStepIds],
    experimentStates: Object.fromEntries(
      Object.entries(update.experimentStates ?? current.experimentStates)
        .map(([experimentId, selectedIds]) => [experimentId, [...selectedIds]]),
    ),
    answers: { ...(update.answers ?? current.answers) },
  }
  if (nextCourse.completedAt === undefined) delete nextCourse.completedAt

  return withUpdatedAt({
    ...profile,
    courses: {
      ...profile.courses,
      [lessonId]: nextCourse,
    },
  })
}

export function recordWrongAnswer(
  profile: LearningProfile,
  wrongAnswer: WrongAnswer,
): LearningProfile {
  if (!isAuthoredCourse(wrongAnswer.lessonId)) return profile

  const entry: WrongAnswer = {
    questionId: wrongAnswer.questionId,
    lessonId: wrongAnswer.lessonId,
    selectedOptionId: wrongAnswer.selectedOptionId,
    sourceRefIds: [...wrongAnswer.sourceRefIds],
    mastered: wrongAnswer.mastered,
    recordedAt: wrongAnswer.recordedAt,
  }
  const existingIndex = profile.wrongAnswers.findIndex(
    (item) => item.lessonId === entry.lessonId && item.questionId === entry.questionId,
  )
  const wrongAnswers = profile.wrongAnswers.map((item) => ({
    ...item,
    sourceRefIds: [...item.sourceRefIds],
  }))
  if (existingIndex < 0) wrongAnswers.push(entry)
  else wrongAnswers[existingIndex] = entry

  return withUpdatedAt({ ...profile, wrongAnswers })
}

export function toggleFavorite(
  profile: LearningProfile,
  contentId: string,
): LearningProfile {
  const favoriteContentIds = profile.favoriteContentIds.includes(contentId)
    ? profile.favoriteContentIds.filter((id) => id !== contentId)
    : [...profile.favoriteContentIds, contentId]

  return withUpdatedAt({ ...profile, favoriteContentIds })
}

export function markWrongAnswerMastered(
  profile: LearningProfile,
  lessonId: string,
  questionId: string,
  mastered = true,
): LearningProfile {
  const index = profile.wrongAnswers.findIndex(
    (item) => item.lessonId === lessonId && item.questionId === questionId,
  )
  if (index < 0 || profile.wrongAnswers[index].mastered === mastered) return profile

  const wrongAnswers = profile.wrongAnswers.map((item, itemIndex) => ({
    ...item,
    sourceRefIds: [...item.sourceRefIds],
    ...(itemIndex === index ? { mastered } : {}),
  }))
  return withUpdatedAt({ ...profile, wrongAnswers })
}

export function completeAssessment(
  profile: LearningProfile,
  result: AssessmentResult,
): LearningProfile {
  if (!isValidUtcIsoTimestamp(result.completedAt)) return profile

  const assessment: AssessmentResult = {
    kind: result.kind,
    answers: { ...result.answers },
    completedAt: result.completedAt,
    score: result.score,
  }

  return withUpdatedAt({
    ...profile,
    assessments: {
      ...profile.assessments,
      [assessment.kind]: assessment,
    },
  })
}
