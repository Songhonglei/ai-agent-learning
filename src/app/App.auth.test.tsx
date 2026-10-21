import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LEARNING_PROFILE_STORAGE_KEY } from '../shared/storage/learningProfile'
import { STORAGE_MODE_PREFERENCE_KEY } from '../shared/storage/storageMode'
import { createEmptyProfile, type LearningProfile } from '../shared/types/profile'

const cloudProfile = createEmptyProfile()

vi.mock('../shared/auth/learner-auth', () => ({
  getLearnerIdentity: vi.fn(async () => ({
    accessToken: 'access-token',
    email: 'learner@example.com',
    displayName: 'Learner',
  })),
  isLearnerAuthConfigured: vi.fn(() => true),
  signOutLearner: vi.fn(async () => undefined),
  subscribeLearnerIdentity: vi.fn(() => () => undefined),
}))

vi.mock('../shared/profile-api', () => ({
  loadCloudProfile: vi.fn(async () => cloudProfile),
  saveCloudProfile: vi.fn(async (profile: LearningProfile) => profile),
}))

import { App } from './App'
import { saveCloudProfile } from '../shared/profile-api'

describe('App authenticated storage mode', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('enters cloud mode immediately after login while offering to merge local progress', async () => {
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify({
      ...createEmptyProfile(),
      currentLessonId: '1-1',
      updatedAt: '2026-08-19T08:00:00.000Z',
    }))
    window.history.pushState({}, '', '/')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '要合并到这个学习档案吗？' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '学习档案模式' }))
        .toHaveAttribute('data-tooltip', '学习数据云端存储')
    })
  })

  it('enters cloud mode without prompting when the saved local profile has no learning activity', async () => {
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify({
      ...createEmptyProfile(),
      theme: 'dark',
      updatedAt: '2026-08-21T08:00:00.000Z',
    }))
    window.history.pushState({}, '', '/')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '学习档案模式' }))
        .toHaveAttribute('data-tooltip', '学习数据云端存储')
    })
    expect(screen.queryByRole('heading', { name: '要合并到这个学习档案吗？' }))
      .not.toBeInTheDocument()
  })

  it('restores the imported local profile after reload even when the learner is signed in', async () => {
    const localProfile = createEmptyProfile()
    localProfile.courses['0-1'].completedStepIds = ['scene-daily-agent']
    localProfile.courses['0-1'].completedAt = '2026-08-20T10:00:00.000Z'
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(localProfile))
    localStorage.setItem(STORAGE_MODE_PREFERENCE_KEY, 'local')
    window.history.pushState({}, '', '/')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '学习档案模式' }))
        .toHaveAttribute('data-tooltip', '学习数据本地存储')
    })
    expect(screen.getByRole('link', { name: /再次学习：0-1/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '要合并到这个学习档案吗？' }))
      .not.toBeInTheDocument()
  })

  it('queues assessment saves, keeps newer answers visible, and warns until the final write is saved', async () => {
    const user = userEvent.setup()
    const pending: Array<{ profile: LearningProfile; resolve(profile: LearningProfile): void }> = []
    vi.mocked(saveCloudProfile).mockImplementation((profile) => new Promise((resolve) => pending.push({ profile, resolve })))
    window.history.pushState({}, '', '/assessment/pretest')
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '开始作答课程前测' }))
    await waitFor(() => expect(pending).toHaveLength(1))
    await user.click(screen.getAllByRole('radio')[1])
    expect(screen.getAllByRole('radio')[1]).toBeChecked()
    expect(pending).toHaveLength(1)
    expect(screen.getByText('正在保存学习档案，请稍候再刷新或离开。')).toBeInTheDocument()
    pending[0].resolve(pending[0].profile)
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(screen.getAllByRole('radio')[1]).toBeChecked()
    expect(Object.keys(pending[1].profile.courseAssessments.pretest!.answers)).toHaveLength(1)
    pending[1].resolve(pending[1].profile)
    await waitFor(() => expect(screen.queryByText('正在保存学习档案，请稍候再刷新或离开。')).not.toBeInTheDocument())
    vi.mocked(saveCloudProfile).mockImplementation(async (profile) => profile)
  })
})
