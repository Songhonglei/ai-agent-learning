import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile, type LearningProfile } from '../../shared/types/profile'
import { LearningProfilePage } from './LearningProfilePage'

function ProfileHarness({ initial }: { initial: LearningProfile }) {
  const [profile, setProfile] = useState(initial)
  return <LearningProfilePage profile={profile} onProfileChange={setProfile} />
}

describe('LearningProfilePage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('combines progress, assessments, wrongs, favorites, review, and backup locally', () => {
    const profile = createEmptyProfile()
    profile.wrongAnswers = [{
      lessonId: '1-1',
      questionId: 'missing-background',
      selectedOptionId: 'always-complete',
      sourceRefIds: ['page-035'],
      mastered: false,
      recordedAt: '2026-08-05T10:00:00.000Z',
    }]
    profile.favoriteContentIds = ['lesson-1-1']
    profile.assessments.pretest = {
      kind: 'pretest',
      answers: {},
      completedAt: '2026-08-05T09:00:00.000Z',
      score: 2,
    }

    render(<ProfileHarness initial={profile} />)

    expect(screen.getByRole('heading', { name: '学习档案' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '课程进度概览' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '前后测结果' })).toBeInTheDocument()
    expect(screen.getByText('课前测验 2 / 3')).toBeInTheDocument()
    expect(screen.getByText('课后测验尚未完成')).toBeInTheDocument()
    expect(screen.getByText('1 道未掌握错题')).toBeInTheDocument()
    expect(screen.getByText('1 项收藏')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '复习队列' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '备份与迁移学习档案' })).toBeInTheDocument()
  })

  it('falls back to the first course when the stored current lesson is unknown', () => {
    const profile = createEmptyProfile()
    profile.currentLessonId = '9-9' as never
    render(<ProfileHarness initial={profile} />)

    expect(screen.getByText('0-1 你已经在用Agent了', { selector: '.profile-hero-meta strong' })).toBeInTheDocument()
    expect(screen.getByText('0 道未掌握错题')).toBeInTheDocument()
    expect(screen.getByText('0 项收藏')).toBeInTheDocument()
    expect(screen.getByText('当前没有待复习内容')).toBeInTheDocument()
    expect(screen.queryByText(/invented-question|invented-answer|lesson-4-1/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /标记已掌握/ })).not.toBeInTheDocument()
  })

  it('writes review changes only through the supplied profile callback', async () => {
    const profile = createEmptyProfile()
    profile.wrongAnswers = [{
      lessonId: '1-1',
      questionId: 'missing-background',
      selectedOptionId: 'always-complete',
      sourceRefIds: ['page-035'],
      mastered: false,
      recordedAt: '2026-08-05T10:00:00.000Z',
    }]
    render(<ProfileHarness initial={profile} />)

    await userEvent.click(screen.getByRole('button', { name: /标记已掌握/ }))

    expect(screen.getByText('0 道未掌握错题')).toBeInTheDocument()
  })
})
