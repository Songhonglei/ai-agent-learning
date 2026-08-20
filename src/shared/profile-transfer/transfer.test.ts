import { describe, expect, it } from 'vitest'
import { createEmptyProfile, type LearningProfile } from '../types/profile'
import {
  exportProfile,
  hasSavableLearningData,
  mergeLearningProfiles,
  previewProfileImport,
} from './transfer'

function profileAt(updatedAt: string): LearningProfile {
  return { ...createEmptyProfile(), updatedAt }
}

describe('profile transfer', () => {
  it('exports one projected profile without unknown fields or course bodies', () => {
    const profileWithBodies = {
      ...profileAt('2026-08-05T10:00:00.000Z'),
      courseBodies: [{ id: '1-1', markdown: 'private authored lesson body' }],
      localSecret: 'do-not-export',
      courses: {
        ...profileAt('2026-08-05T10:00:00.000Z').courses,
        '1-1': {
          ...profileAt('2026-08-05T10:00:00.000Z').courses['1-1'],
          currentStepId: 'dialogue-context',
          completedStepIds: ['scene-context'],
          authoredSteps: [{ id: 'dialogue-context', body: 'course body' }],
        },
      },
    }

    const exported = JSON.parse(exportProfile(profileWithBodies as LearningProfile))

    expect(exported).toMatchObject({
      schemaVersion: 1,
      updatedAt: '2026-08-05T10:00:00.000Z',
      courses: {
        '1-1': {
          currentStepId: 'dialogue-context',
          completedStepIds: ['scene-context'],
          experimentStates: {},
          answers: {},
        },
      },
    })
    expect(exported).not.toHaveProperty('courseBodies')
    expect(exported).not.toHaveProperty('localSecret')
    expect(exported.courses['1-1']).not.toHaveProperty('authoredSteps')
  })

  it('does not treat an initialized lesson location as savable learning data', () => {
    const profile = profileAt('2026-08-05T10:00:00.000Z')

    expect(hasSavableLearningData(profile)).toBe(false)
    expect(() => exportProfile(profile)).toThrow('本地没有可保存的学习档案。')

    profile.courses['0-1'].completedStepIds = ['scene-daily-agent']
    expect(hasSavableLearningData(profile)).toBe(true)
  })

  it('rejects damaged JSON, malformed profiles, and future versions before merge', () => {
    const current = profileAt('2026-08-05T10:00:00.000Z')

    expect(previewProfileImport('{not-json', current)).toEqual({
      status: 'invalid',
      message: '无法读取备份：文件不是有效的 JSON。',
    })
    expect(previewProfileImport(JSON.stringify({ schemaVersion: 1 }), current)).toEqual({
      status: 'invalid',
      message: '无法读取备份：档案结构不完整或字段类型不正确。',
    })
    expect(previewProfileImport(JSON.stringify({ schemaVersion: 2 }), current)).toEqual({
      status: 'future-version',
      message: '这个备份来自更新版本，当前版本暂时无法导入。',
    })
  })

  it('chooses course progress by completion, then answers, then valid profile time', () => {
    const current = profileAt('2026-08-05T10:00:00.000Z')
    current.courses['1-1'] = {
      currentStepId: 'current-step',
      completedStepIds: ['step-a', 'step-b'],
      experimentStates: { builder: ['current-choice'] },
      answers: { q1: 'current-answer' },
    }
    current.courses['1-2'] = {
      currentStepId: 'current-step',
      completedStepIds: ['step-a'],
      experimentStates: {},
      answers: { q1: 'current-answer' },
    }
    current.courses['1-3'] = {
      currentStepId: 'current-step',
      completedStepIds: ['step-a'],
      experimentStates: {},
      answers: { q1: 'current-answer' },
    }

    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.courses['1-1'] = {
      currentStepId: 'incoming-step',
      completedStepIds: ['step-a'],
      experimentStates: { builder: ['incoming-choice'] },
      answers: { q1: 'one', q2: 'two', q3: 'three' },
    }
    incoming.courses['1-2'] = {
      currentStepId: 'incoming-step',
      completedStepIds: ['step-a'],
      experimentStates: {},
      answers: { q1: 'one', q2: 'two' },
    }
    incoming.courses['1-3'] = {
      currentStepId: 'incoming-step',
      completedStepIds: ['step-a'],
      experimentStates: { builder: ['incoming-choice'] },
      answers: { q1: 'incoming-answer' },
    }

    const merged = mergeLearningProfiles(current, incoming)

    expect(merged.courses['1-1']).toMatchObject({
      currentStepId: 'incoming-step',
      completedStepIds: ['step-a', 'step-b'],
      experimentStates: { builder: ['current-choice'] },
      answers: { q1: 'current-answer' },
    })
    expect(merged.courses['1-2'].answers).toEqual({ q1: 'one', q2: 'two' })
    expect(merged.courses['1-3']).toMatchObject({
      currentStepId: 'incoming-step',
      experimentStates: { builder: ['incoming-choice'] },
      answers: { q1: 'incoming-answer' },
    })

    const invalidlyNewer = {
      ...incoming,
      updatedAt: 'not-a-date',
      courses: {
        ...incoming.courses,
        '1-3': {
          ...incoming.courses['1-3'],
          currentStepId: 'invalidly-newer-step',
          answers: { q1: 'invalidly-newer-answer' },
        },
      },
    }
    expect(mergeLearningProfiles(current, invalidlyNewer).courses['1-3']).toMatchObject({
      currentStepId: 'current-step',
      answers: { q1: 'current-answer' },
    })
  })

  it('keeps a newer valid current empty step over an invalid incoming nonempty step', () => {
    const current = profileAt('2026-08-05T11:00:00.000Z')
    current.courses['1-1'].currentStepId = ''
    const incoming = profileAt('not-a-date')
    incoming.courses['1-1'].currentStepId = 'incoming-step'

    expect(mergeLearningProfiles(current, incoming).courses['1-1'].currentStepId).toBe('')
  })

  it('uses a newer valid incoming empty step over an older current nonempty step', () => {
    const current = profileAt('2026-08-05T10:00:00.000Z')
    current.courses['1-1'].currentStepId = 'current-step'
    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.courses['1-1'].currentStepId = ''

    expect(mergeLearningProfiles(current, incoming).courses['1-1'].currentStepId).toBe('')
  })

  it('deduplicates stable IDs and uses newer valid wrong-answer and assessment values', () => {
    const current = {
      ...profileAt('2026-08-05T10:00:00.000Z'),
      favoriteContentIds: ['lesson-1-1', 'source-page-35'],
      wrongAnswers: [
        {
          questionId: 'missing-background',
          lessonId: '1-1',
          selectedOptionId: 'current-option',
          sourceRefIds: ['page-035'],
          mastered: false,
          recordedAt: '2026-08-05T08:00:00.000Z',
        },
      ],
      assessments: {
        pretest: {
          kind: 'pretest' as const,
          answers: { q1: 'current' },
          completedAt: '2026-08-05T09:30:00.000Z',
          score: 1,
        },
      },
    }
    const incoming = {
      ...profileAt('2026-08-05T11:00:00.000Z'),
      favoriteContentIds: ['source-page-35', 'lesson-1-2'],
      wrongAnswers: [
        {
          questionId: 'missing-background',
          lessonId: '1-1',
          selectedOptionId: 'incoming-option',
          sourceRefIds: ['page-035'],
          mastered: true,
          recordedAt: '2026-08-05T10:30:00.000Z',
        },
        {
          questionId: 'current-context',
          lessonId: '1-1',
          selectedOptionId: 'chat-only',
          sourceRefIds: ['figure-2-1'],
          mastered: false,
          recordedAt: '2026-08-05T10:40:00.000Z',
        },
      ],
      assessments: {
        pretest: {
          kind: 'pretest' as const,
          answers: { q1: 'incoming' },
          completedAt: '2026-08-05T09:00:00.000Z',
          score: 0,
        },
        posttest: {
          kind: 'posttest' as const,
          answers: { q2: 'incoming' },
          completedAt: '2026-08-05T10:45:00.000Z',
          score: 1,
        },
      },
    }

    const merged = mergeLearningProfiles(current, incoming)

    expect(merged.favoriteContentIds).toEqual([
      'lesson-1-1',
      'source-page-35',
      'lesson-1-2',
    ])
    expect(merged.wrongAnswers).toHaveLength(2)
    expect(merged.wrongAnswers.map(({ lessonId, questionId }) => `${lessonId}:${questionId}`)).toEqual([
      '1-1:missing-background',
      '1-1:current-context',
    ])
    expect(merged.wrongAnswers[0]).toMatchObject({
      selectedOptionId: 'incoming-option',
      mastered: true,
    })
    expect(merged.assessments).toEqual({
      pretest: current.assessments.pretest,
      posttest: incoming.assessments.posttest,
    })
  })

  it('never lets an invalid assessment completion date enter or win a merge', () => {
    const current = profileAt('2026-08-05T10:00:00.000Z')
    current.assessments.pretest = {
      kind: 'pretest',
      answers: { q1: 'valid-current' },
      completedAt: '2026-08-05T09:00:00.000Z',
      score: 1,
    }
    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.assessments.pretest = {
      kind: 'pretest',
      answers: { q1: 'invalid-incoming' },
      completedAt: '2026-02-30T09:00:00.000Z',
      score: 3,
    }
    incoming.assessments.posttest = {
      kind: 'posttest',
      answers: { q1: 'invalid-only-record' },
      completedAt: '2026-04-31T09:00:00.000Z',
      score: 3,
    }

    expect(mergeLearningProfiles(current, incoming).assessments).toEqual({
      pretest: current.assessments.pretest,
    })
  })

  it('summarizes only the number of local records that the import will overwrite', () => {
    const current = profileAt('2026-08-05T10:00:00.000Z')
    current.courses['1-1'] = {
      currentStepId: 'current-step',
      completedStepIds: ['step-a', 'step-b'],
      experimentStates: {},
      answers: {},
    }
    current.favoriteContentIds = ['lesson-1-1']

    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.courses['1-1'] = {
      currentStepId: 'incoming-step',
      completedStepIds: ['step-a'],
      experimentStates: {},
      answers: {},
    }
    incoming.courses['1-2'] = {
      currentStepId: 'incoming-step',
      completedStepIds: ['step-a'],
      experimentStates: {},
      answers: { q1: 'incoming' },
    }
    incoming.favoriteContentIds = ['lesson-1-2']

    const preview = previewProfileImport(JSON.stringify(incoming), current)

    expect(preview.status).toBe('ready')
    if (preview.status !== 'ready') throw new Error('Expected a ready preview')
    expect(preview.changeCount).toBe(3)
    expect(preview.conflictCount).toBe(1)
    expect(preview.candidate.favoriteContentIds).toEqual(['lesson-1-1', 'lesson-1-2'])
  })

  it('reports imported records even when an empty local profile has no conflicts', () => {
    const current = profileAt('2026-08-20T10:00:00.000Z')
    const incoming = profileAt('2026-08-18T10:00:00.000Z')
    incoming.courses['0-1'].completedStepIds = ['scene', 'dialogue']
    incoming.courses['0-1'].completedAt = '2026-08-18T09:00:00.000Z'
    incoming.favoriteContentIds = ['lesson-0-1']
    incoming.wrongAnswers = [{
      lessonId: '0-1',
      questionId: 'q1',
      selectedOptionId: 'wrong',
      sourceRefIds: [],
      mastered: false,
      recordedAt: '2026-08-18T09:00:00.000Z',
    }]

    const preview = previewProfileImport(JSON.stringify(incoming), current)

    expect(preview.status).toBe('ready')
    if (preview.status !== 'ready') throw new Error('Expected a ready preview')
    expect(preview.changeCount).toBe(3)
    expect(preview.conflictCount).toBe(0)
  })
})
