import { describe, expect, it } from 'vitest'
import { courseTestQuestions } from '../content/course-assessment'
import { authoredLessons } from '../content/lessons'
import { createEmptyProfile, hasLearningActivity, type AssessmentKind, type LearningProfile } from './types/profile'
import { completedLessonCount, editCourseTest, isBaselineComparable, mergeCourseTestDelta, mergeCourseTestRecords, projectCourseTestRecords, scoreAttempt } from './courseAssessment'
import { projectLearningProfile } from './storage/learningProfile'
import { exportProfile, mergeLearningProfiles, previewProfileImport } from './profile-transfer/transfer'

function readyPost(profile: LearningProfile): LearningProfile {
  return { ...profile, courses: Object.fromEntries(Object.entries(profile.courses).map(([id, progress]) => [id, { ...progress, completedAt: new Date().toISOString() }])) }
}

function fill(profile: LearningProfile, kind: AssessmentKind, correct = 24) {
  let next = editCourseTest(profile, kind)
  courseTestQuestions[kind].forEach((q, index) => { next = editCourseTest(next, kind, { questionId: q.id, optionId: index < correct ? 'a' : 'b' }) })
  return next
}

describe('whole-course question coverage', () => {
  it('has two new, source-backed questions per lesson in each distinct form', () => {
    const prompts = new Set<string>()
    const existing = new Set(authoredLessons.flatMap((l) => [...l.quiz, ...(l.pretest ?? []), ...(l.posttest ?? [])].map((q) => q.prompt)))
    for (const kind of ['pretest', 'posttest'] as const) {
      expect(courseTestQuestions[kind]).toHaveLength(24)
      expect(new Set(courseTestQuestions[kind].map((q) => q.id)).size).toBe(24)
      for (const lesson of authoredLessons) {
        const questions = courseTestQuestions[kind].filter((q) => q.lessonId === lesson.id)
        expect(questions).toHaveLength(2)
        for (const q of questions) {
          expect(existing.has(q.prompt)).toBe(false)
          expect(prompts.has(q.prompt)).toBe(false); prompts.add(q.prompt)
          expect(q.options).toHaveLength(3)
          expect(q.sourceRefIds.length).toBeGreaterThan(0)
          expect(q.sourceRefIds.every((id) => lesson.sourceRefs.some((ref) => ref.id === id))).toBe(true)
          expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true)
        }
      }
    }
  })
})

describe('assessment lifecycle and evidence', () => {
  it('saves a draft and position without inventing a result, rejects invalid input', () => {
    const original = createEmptyProfile(), q = courseTestQuestions.pretest[0]
    const draft = editCourseTest(original, 'pretest', { questionId: q.id, optionId: 'b', currentQuestion: 3 })
    expect(original.courseAssessments).toEqual({})
    expect(draft.courseAssessments.pretest).toMatchObject({ currentQuestion: 3, answers: { [q.id]: 'b' }, learningStarted: false })
    expect(draft.courseAssessments.pretest?.completedAt).toBeUndefined()
    expect(editCourseTest(draft, 'pretest', { submit: true })).toBe(draft)
    expect(editCourseTest(draft, 'pretest', { questionId: q.id, optionId: 'unknown' })).toBe(draft)
    expect(editCourseTest(draft, 'pretest', { currentQuestion: 24 })).toBe(draft)
    expect(hasLearningActivity(draft)).toBe(true)
  })

  it('requires all twelve completed lessons for posttest start and submission', () => {
    const empty = createEmptyProfile()
    expect(editCourseTest(empty, 'posttest')).toBe(empty)
    const eleven = readyPost(empty); delete eleven.courses['4-2'].completedAt
    expect(completedLessonCount(eleven)).toBe(11)
    expect(editCourseTest(eleven, 'posttest')).toBe(eleven)
    expect(fill(readyPost(empty), 'posttest').courseAssessments.posttest).toBeDefined()
  })

  it('locks the first submitted result and scores independently from old 1-1 self-checks', () => {
    const filled = fill(createEmptyProfile(), 'pretest', 12)
    const submitted = editCourseTest(filled, 'pretest', { submit: true })
    expect(scoreAttempt(submitted.courseAssessments.pretest!)).toEqual({ score: 12, total: 24, percent: 50 })
    expect(submitted.assessments).toEqual({})
    expect(editCourseTest(submitted, 'pretest', { questionId: courseTestQuestions.pretest[0].id, optionId: 'c' })).toBe(submitted)
  })

  it('compares valid pre/post results including zero, full and negative changes', () => {
    let profile = editCourseTest(fill(createEmptyProfile(), 'pretest', 24), 'pretest', { submit: true })
    profile = editCourseTest(fill(readyPost(profile), 'posttest', 0), 'posttest', { submit: true })
    expect(isBaselineComparable(profile.courseAssessments)).toBe(true)
    expect(scoreAttempt(profile.courseAssessments.pretest!).score).toBe(24)
    expect(scoreAttempt(profile.courseAssessments.posttest!).percent).toBe(0)
    expect(scoreAttempt(profile.courseAssessments.pretest!, ['0-1'])).toEqual({ score: 2, total: 2, percent: 100 })
  })

  it('flags learning during a draft and late pretests; missing or reverse baselines are not comparable', () => {
    let draft = fill(createEmptyProfile(), 'pretest')
    draft.courses['0-1'].completedStepIds = ['scene-daily-agent']
    const late = editCourseTest(draft, 'pretest', { submit: true })
    expect(late.courseAssessments.pretest?.learningStarted).toBe(true)
    const post = editCourseTest(fill(readyPost(late), 'posttest'), 'posttest', { submit: true })
    expect(isBaselineComparable(post.courseAssessments)).toBe(false)
    expect(isBaselineComparable({ posttest: post.courseAssessments.posttest })).toBe(false)
    const reversed = structuredClone(post.courseAssessments)
    reversed.pretest!.learningStarted = false
    reversed.pretest!.completedAt = '2099-01-01T00:00:00.000Z'
    expect(isBaselineComparable(reversed)).toBe(false)
  })
})

describe('profile safety and transfers', () => {
  it('migrates v1 without treating its 1-1 results as full-course measurements', () => {
    const legacy = { ...createEmptyProfile(), schemaVersion: 1, assessments: { pretest: { kind: 'pretest', answers: {}, score: 3, completedAt: '2026-10-20T00:00:00.000Z' } } }
    const projected = projectLearningProfile(legacy)
    expect(projected?.schemaVersion).toBe(2)
    expect(projected?.assessments.pretest?.score).toBe(3)
    expect(projected?.courseAssessments).toEqual({})
  })

  it('rejects malformed drafts, unknown versions and incomplete or forged submitted answers', () => {
    const draft = fill(createEmptyProfile(), 'pretest').courseAssessments
    expect(projectCourseTestRecords(draft)).toEqual(draft)
    for (const patch of [{ version: 'unknown' }, { currentQuestion: -1 }, { startedAt: 'invalid' }, { completedAt: '2026-10-20T00:00:00.000Z' }, { answers: { fake: 'a' } }]) {
      expect(projectCourseTestRecords({ pretest: { ...draft.pretest, ...patch } })).toBeNull()
    }
    expect(projectLearningProfile({ ...createEmptyProfile(), courseAssessments: [] })).toBeNull()
  })

  it('round-trips drafts and submitted results with import preview counts and immutable baseline choice', () => {
    const completed = editCourseTest(fill(createEmptyProfile(), 'pretest', 8), 'pretest', { submit: true })
    const backup = exportProfile(completed)
    const preview = previewProfileImport(backup, createEmptyProfile())
    expect(preview.status).toBe('ready')
    if (preview.status !== 'ready') throw Error('Expected valid import')
    expect(preview.changeCount).toBe(1)
    expect(preview.candidate.courseAssessments).toEqual(completed.courseAssessments)
    const newer = structuredClone(completed)
    newer.courseAssessments.pretest!.answers[courseTestQuestions.pretest[0].id] = 'c'
    newer.courseAssessments.pretest!.completedAt = '2099-01-01T00:00:00.000Z'
    newer.courseAssessments.pretest!.updatedAt = '2099-01-01T00:00:00.000Z'
    expect(mergeLearningProfiles(completed, newer).courseAssessments).toEqual(completed.courseAssessments)
    const draft = fill(createEmptyProfile(), 'pretest', 4)
    expect(projectLearningProfile(JSON.parse(exportProfile(draft)))?.courseAssessments).toEqual(draft.courseAssessments)
  })

  it('merges different draft answers while preserving the canonical choice on conflicts and completed results', () => {
    const base = editCourseTest(createEmptyProfile(), 'pretest')
    const [q1, q2] = courseTestQuestions.pretest
    const one = editCourseTest(base, 'pretest', { questionId: q1.id, optionId: 'a' })
    const two = editCourseTest(base, 'pretest', { questionId: q2.id, optionId: 'b' })
    expect(mergeCourseTestDelta(base.courseAssessments, one.courseAssessments, two.courseAssessments).pretest?.answers).toEqual({ [q1.id]: 'a', [q2.id]: 'b' })
    const conflict = editCourseTest(base, 'pretest', { questionId: q1.id, optionId: 'c' })
    expect(mergeCourseTestDelta(base.courseAssessments, conflict.courseAssessments, one.courseAssessments).pretest?.answers[q1.id]).toBe('a')
    const done = editCourseTest(fill(base, 'pretest'), 'pretest', { submit: true })
    expect(mergeCourseTestRecords(done.courseAssessments, one.courseAssessments)).toEqual(done.courseAssessments)
    expect(mergeCourseTestDelta(base.courseAssessments, conflict.courseAssessments, done.courseAssessments)).toEqual(done.courseAssessments)
  })
})
