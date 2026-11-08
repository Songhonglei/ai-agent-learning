import { mergeCourseTestDelta } from './courseAssessment'
import type { AssessmentResult, CourseProgress, LearningProfile, WrongAnswer } from './types/profile'

function validTime(value: string): number | null {
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

export function profileDataEqual(left: LearningProfile, right: LearningProfile): boolean {
  return JSON.stringify({ ...left, updatedAt: '' }) === JSON.stringify({ ...right, updatedAt: '' })
}

function timestampAfter(...values: string[]): string {
  const latestKnownTime = values.reduce((latest, value) => {
    const time = validTime(value)
    return time === null ? latest : Math.max(latest, time)
  }, Date.now())
  return new Date(latestKnownTime + 1).toISOString()
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function localValueIfUncontested<T>(base: T, requested: T, canonical: T): T {
  return !sameValue(requested, base) && sameValue(canonical, base)
    ? requested
    : canonical
}

function applyMembershipDelta(
  base: string[],
  requested: string[],
  canonical: string[],
): string[] {
  const removed = new Set(base.filter((value) => !requested.includes(value)))
  const merged = canonical.filter((value) => !removed.has(value))

  for (const value of requested) {
    if (!base.includes(value) && !merged.includes(value)) merged.push(value)
  }
  return merged
}

function applyStringRecordDelta(
  base: Record<string, string>,
  requested: Record<string, string>,
  canonical: Record<string, string>,
): Record<string, string> {
  const merged = { ...canonical }
  for (const key of new Set([...Object.keys(base), ...Object.keys(requested)])) {
    if (requested[key] === base[key]) continue
    if (canonical[key] !== base[key]) continue

    if (requested[key] === undefined) delete merged[key]
    else merged[key] = requested[key]
  }
  return merged
}

function applyExperimentDelta(
  base: Record<string, string[]>,
  requested: Record<string, string[]>,
  canonical: Record<string, string[]>,
): Record<string, string[]> {
  const merged = Object.fromEntries(
    Object.entries(canonical).map(([id, selectedIds]) => [id, [...selectedIds]]),
  )
  for (const id of new Set([...Object.keys(base), ...Object.keys(requested)])) {
    const baseSelection = base[id] ?? []
    const requestedSelection = requested[id] ?? []
    if (sameValue(requestedSelection, baseSelection)) continue

    const selection = applyMembershipDelta(
      baseSelection,
      requestedSelection,
      canonical[id] ?? [],
    )
    if (requested[id] === undefined && selection.length === 0) delete merged[id]
    else merged[id] = selection
  }
  return merged
}

function mergeCourseDelta(
  base: CourseProgress,
  requested: CourseProgress,
  canonical: CourseProgress,
): CourseProgress {
  const completedAt = localValueIfUncontested(
    base.completedAt,
    requested.completedAt,
    canonical.completedAt,
  )
  return {
    currentStepId: localValueIfUncontested(
      base.currentStepId,
      requested.currentStepId,
      canonical.currentStepId,
    ),
    completedStepIds: applyMembershipDelta(
      base.completedStepIds,
      requested.completedStepIds,
      canonical.completedStepIds,
    ),
    experimentStates: applyExperimentDelta(
      base.experimentStates,
      requested.experimentStates,
      canonical.experimentStates,
    ),
    answers: applyStringRecordDelta(base.answers, requested.answers, canonical.answers),
    ...(completedAt === undefined ? {} : { completedAt }),
  }
}

function wrongAnswerId(wrongAnswer: WrongAnswer): string {
  return `${wrongAnswer.lessonId}\u0000${wrongAnswer.questionId}`
}

function cloneWrongAnswer(wrongAnswer: WrongAnswer): WrongAnswer {
  return { ...wrongAnswer, sourceRefIds: [...wrongAnswer.sourceRefIds] }
}

function mergeWrongAnswerDelta(
  base: WrongAnswer[],
  requested: WrongAnswer[],
  canonical: WrongAnswer[],
): WrongAnswer[] {
  const baseById = new Map(base.map((item) => [wrongAnswerId(item), item]))
  const requestedById = new Map(requested.map((item) => [wrongAnswerId(item), item]))
  const canonicalById = new Map(canonical.map((item) => [wrongAnswerId(item), item]))

  for (const id of new Set([...baseById.keys(), ...requestedById.keys()])) {
    const baseItem = baseById.get(id)
    const requestedItem = requestedById.get(id)
    if (sameValue(requestedItem, baseItem)) continue
    if (!sameValue(canonicalById.get(id), baseItem)) continue

    if (requestedItem === undefined) canonicalById.delete(id)
    else canonicalById.set(id, cloneWrongAnswer(requestedItem))
  }
  return [...canonicalById.values()].map(cloneWrongAnswer)
}

function cloneAssessment(assessment: AssessmentResult): AssessmentResult {
  return { ...assessment, answers: { ...assessment.answers } }
}

function mergeAssessmentDelta(
  base: LearningProfile['assessments'],
  requested: LearningProfile['assessments'],
  canonical: LearningProfile['assessments'],
): LearningProfile['assessments'] {
  const merged: LearningProfile['assessments'] = {}
  for (const kind of ['pretest', 'posttest'] as const) {
    const selected = localValueIfUncontested(
      base[kind],
      requested[kind],
      canonical[kind],
    )
    if (selected !== undefined) merged[kind] = cloneAssessment(selected)
  }
  return merged
}

export function mergeStaleProfileUpdate(
  canonical: LearningProfile,
  staleBase: LearningProfile,
  requested: LearningProfile,
): LearningProfile {
  const courses = Object.fromEntries(
    Object.keys(canonical.courses).map((lessonId) => [
      lessonId,
      mergeCourseDelta(
        staleBase.courses[lessonId],
        requested.courses[lessonId],
        canonical.courses[lessonId],
      ),
    ]),
  )
  const merged: LearningProfile = {
    ...canonical,
    theme: localValueIfUncontested(staleBase.theme, requested.theme, canonical.theme),
    currentLessonId: localValueIfUncontested(
      staleBase.currentLessonId,
      requested.currentLessonId,
      canonical.currentLessonId,
    ),
    courses,
    wrongAnswers: mergeWrongAnswerDelta(
      staleBase.wrongAnswers,
      requested.wrongAnswers,
      canonical.wrongAnswers,
    ),
    favoriteContentIds: applyMembershipDelta(
      staleBase.favoriteContentIds,
      requested.favoriteContentIds,
      canonical.favoriteContentIds,
    ),
    assessments: mergeAssessmentDelta(
      staleBase.assessments,
      requested.assessments,
      canonical.assessments,
    ),
    courseAssessments: mergeCourseTestDelta(staleBase.courseAssessments, requested.courseAssessments, canonical.courseAssessments),
  }
  if (profileDataEqual(merged, canonical)) return canonical

  return {
    ...merged,
    updatedAt: timestampAfter(canonical.updatedAt, requested.updatedAt),
  }
}
