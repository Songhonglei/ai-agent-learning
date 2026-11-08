import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEARNING_PROFILE_STORAGE_KEY } from '../shared/storage/learningProfile'
import { STORAGE_MODE_PREFERENCE_KEY } from '../shared/storage/storageMode'
import { createEmptyProfile, type LearningProfile } from '../shared/types/profile'

const cloudProfile = createEmptyProfile()
const auth = vi.hoisted(() => ({ notify: null as null | ((identity: { accessToken: string; email: string; displayName: string } | null) => void) }))

vi.mock('../shared/auth/learner-auth', () => ({
  getLearnerIdentity: vi.fn(async () => ({
    accessToken: 'access-token',
    email: 'learner@example.com',
    displayName: 'Learner',
  })),
  isLearnerAuthConfigured: vi.fn(() => true),
  signOutLearner: vi.fn(async () => undefined),
  subscribeLearnerIdentity: vi.fn((callback) => { auth.notify = callback; return () => undefined }),
}))

vi.mock('../shared/profile-api', () => ({
  loadCloudProfile: vi.fn(async () => ({ profile: cloudProfile, revision: '"profile-empty"' })),
  saveCloudProfileWithMerge: vi.fn(async (_snapshot, _base, profile: LearningProfile) => ({ profile, revision: '"profile-empty"' })),
}))

import { App } from './App'
import { getLearnerIdentity } from '../shared/auth/learner-auth'
import { loadCloudProfile, saveCloudProfileWithMerge } from '../shared/profile-api'

describe('App authenticated storage mode', () => {
  beforeEach(() => {
    vi.mocked(getLearnerIdentity).mockResolvedValue({ accessToken: 'access-token', email: 'learner@example.com', displayName: 'Learner' })
    vi.mocked(loadCloudProfile).mockResolvedValue({ profile: cloudProfile, revision: '"profile-empty"' })
    vi.mocked(saveCloudProfileWithMerge).mockImplementation(async (_snapshot, _base, profile) => ({ profile, revision: '"profile-empty"' }))
  })
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
    vi.mocked(saveCloudProfileWithMerge).mockImplementation((_snapshot, _base, profile) => new Promise((resolve) => pending.push({ profile, resolve: (saved) => resolve({ profile: saved, revision: '"profile-empty"' }) })))
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
    vi.mocked(saveCloudProfileWithMerge).mockImplementation(async (_snapshot, _base, profile) => ({ profile, revision: '"profile-empty"' }))
  })
  it('ignores an old account read that finishes after logout', async () => {
    let finish!: (value: { profile: LearningProfile; revision: string }) => void
    vi.mocked(loadCloudProfile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    window.history.pushState({}, '', '/')
    render(<App />)
    await waitFor(() => expect(loadCloudProfile).toHaveBeenCalled())
    await act(async () => { auth.notify!(null) })
    const old = createEmptyProfile()
    old.courses['0-1'].completedAt = '2026-11-01T00:00:00.000Z'
    await act(async () => { finish({ profile: old, revision: 'old' }) })
    expect(screen.queryByRole('link', { name: /再次学习：0-1/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '学习档案模式' })).toHaveAttribute('data-tooltip', '学习数据本地存储')
  })

  it('ignores old reads after switching accounts and cancels the previous session', async () => {
    let finish!: (value: { profile: LearningProfile; revision: string }) => void
    vi.mocked(loadCloudProfile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    window.history.pushState({}, '', '/')
    render(<App />)
    await waitFor(() => expect(loadCloudProfile).toHaveBeenCalledTimes(1))
    const previousSignal = vi.mocked(loadCloudProfile).mock.calls[0][1]!
    await act(async () => { auth.notify!({ accessToken: 'other', email: 'other@example.com', displayName: 'Other' }) })
    await waitFor(() => expect(loadCloudProfile).toHaveBeenCalledTimes(2))
    const old = createEmptyProfile(); old.courses['0-1'].completedAt = '2026-11-01T00:00:00.000Z'
    await act(async () => { finish({ profile: old, revision: 'old' }) })
    expect(previousSignal.aborted).toBe(true)
    expect(screen.queryByRole('link', { name: /再次学习：0-1/ })).not.toBeInTheDocument()
  })

  it('does not let an initial stale session read undo a newer auth notification', async () => {
    let finish!: (value: Awaited<ReturnType<typeof getLearnerIdentity>>) => void
    vi.mocked(getLearnerIdentity).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    window.history.pushState({}, '', '/')
    render(<App />)
    await act(async () => { auth.notify!(null) })
    await act(async () => { finish({ accessToken: 'old', email: 'old@example.com', displayName: 'Old' }) })
    expect(loadCloudProfile).not.toHaveBeenCalled()
  })

  it('ignores an in-flight save after logout and leaves no saving banner', async () => {
    let finish!: (value: { profile: LearningProfile; revision: string }) => void
    vi.mocked(saveCloudProfileWithMerge).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const user = userEvent.setup()
    window.history.pushState({}, '', '/assessment/pretest')
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '开始作答课程前测' }))
    await waitFor(() => expect(saveCloudProfileWithMerge).toHaveBeenCalled())
    const saved = vi.mocked(saveCloudProfileWithMerge).mock.calls[0][2]
    await act(async () => { auth.notify!(null) })
    await act(async () => { finish({ profile: saved, revision: 'old' }) })
    expect(screen.queryByText('正在保存学习档案，请稍候再刷新或离开。')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始作答课程前测' })).toBeInTheDocument()
  })

  it('keeps pending edits across token refresh and uses the renewed token for the next save', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/assessment/pretest')
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '开始作答课程前测' }))
    await act(async () => { auth.notify!({ accessToken: 'renewed', email: 'learner@example.com', displayName: 'Learner' }) })
    await user.click(screen.getAllByRole('radio')[1])
    await waitFor(() => expect(saveCloudProfileWithMerge).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), expect.anything(), 'renewed', expect.anything()))
    expect(loadCloudProfile).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('radio')[1]).toBeChecked()
  })

  it('retries all unsaved changes after an earlier queued write fails', async () => {
    const user = userEvent.setup()
    vi.mocked(saveCloudProfileWithMerge).mockRejectedValueOnce(new Error('offline'))
    window.history.pushState({}, '', '/assessment/pretest')
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '开始作答课程前测' }))
    await waitFor(() => expect(saveCloudProfileWithMerge).toHaveBeenCalledTimes(1))
    await user.click(screen.getAllByRole('radio')[1])
    await waitFor(() => expect(saveCloudProfileWithMerge).toHaveBeenCalledTimes(2))
    const [, base, requested] = vi.mocked(saveCloudProfileWithMerge).mock.calls[1]
    expect(base.courseAssessments.pretest).toBeUndefined()
    expect(Object.keys(requested.courseAssessments.pretest!.answers)).toHaveLength(1)
  })

  it('loads the account in React StrictMode and cleans up aborted initial work', async () => {
    window.history.pushState({}, '', '/')
    render(<StrictMode><App /></StrictMode>)
    await waitFor(() => expect(screen.getByRole('button', { name: '学习档案模式' })).toHaveAttribute('data-tooltip', '学习数据云端存储'))
    expect(screen.queryByText('正在读取学习档案…')).not.toBeInTheDocument()
  })

  it('keeps local mode when a previous cloud read finishes after switching storage', async () => {
    let finish!: (value: { profile: LearningProfile; revision: string }) => void
    vi.mocked(loadCloudProfile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    render(<App />)
    await waitFor(() => expect(loadCloudProfile).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    await user.click(screen.getByRole('radio', { name: '本地档案' }))
    await act(async () => { finish({ profile: cloudProfile, revision: 'old' }) })
    expect(screen.getByRole('button', { name: '学习档案模式' })).toHaveAttribute('data-tooltip', '学习数据本地存储')
  })

  it('clears old account data on logout even when the local backup is corrupt, without overwriting it', async () => {
    const old = createEmptyProfile(); old.courses['0-1'].completedAt = '2026-11-01T00:00:00.000Z'
    vi.mocked(loadCloudProfile).mockResolvedValue({ profile: old, revision: 'old' })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, '{corrupt')
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    render(<App />)
    await screen.findByRole('link', { name: /再次学习：0-1/ })
    await act(async () => { auth.notify!(null) })
    expect(screen.queryByRole('link', { name: /再次学习：0-1/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /切换到深色主题/ }))
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe('{corrupt')
  })

  it('shows local recovery instead of hanging when the preferred local backup is unreadable', async () => {
    localStorage.setItem(STORAGE_MODE_PREFERENCE_KEY, 'local')
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify({ schemaVersion: 999 }))
    window.history.pushState({}, '', '/')
    render(<App />)
    await waitFor(() => expect(screen.queryByText('正在读取学习档案…')).not.toBeInTheDocument())
    expect(loadCloudProfile).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(JSON.stringify({ schemaVersion: 999 }))
  })

})
