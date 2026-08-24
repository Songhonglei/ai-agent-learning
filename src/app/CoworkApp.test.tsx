import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile, type LearningProfile } from '../shared/types/profile'

const mocks = vi.hoisted(() => ({
  loadCoworkIdentity: vi.fn(),
  loadCloudProfile: vi.fn(),
  saveCloudProfile: vi.fn(),
}))

vi.mock('../shared/auth/cowork-sso', () => ({
  loadCoworkIdentity: mocks.loadCoworkIdentity,
}))

vi.mock('../shared/profile-api', () => ({
  loadCloudProfile: mocks.loadCloudProfile,
  saveCloudProfile: mocks.saveCloudProfile,
}))

import { CoworkApp } from './CoworkApp'

describe('Cowork deployment shell', () => {
  beforeEach(() => {
    mocks.loadCoworkIdentity.mockResolvedValue({
      userId: 'u-1',
      email: 'learner@xiaohongshu.com',
      displayName: '学习者',
      avatarUrl: 'https://avatar.example.com/learner.png',
    })
    mocks.loadCloudProfile.mockResolvedValue(createEmptyProfile())
    mocks.saveCloudProfile.mockImplementation(async (profile: LearningProfile) => profile)
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads a Cowork profile and exposes no registration or local storage mode', async () => {
    render(<CoworkApp />)
    expect(screen.getByText('课程加载中')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '你的学习地图' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Cowork SSO 已登录 · 学习者' })).toBeInTheDocument()
    expect(document.querySelector('.identity-avatar-image')).toHaveAttribute('src', 'https://avatar.example.com/learner.png')
    expect(document.querySelector('.identity-panel')).not.toBeInTheDocument()
    expect(screen.queryByText('发送验证码')).not.toBeInTheDocument()
    expect(screen.queryByText('本地档案')).not.toBeInTheDocument()
    expect(mocks.loadCloudProfile).toHaveBeenCalledOnce()
  })

  it('saves lesson progress only through the Cowork profile API', async () => {
    window.history.pushState({}, '', '/lesson/0-1')
    render(<CoworkApp />)
    await screen.findByRole('heading', { name: '你已经在用 Agent 了' })
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    await waitFor(() => expect(mocks.saveCloudProfile).toHaveBeenCalled())
    expect(mocks.saveCloudProfile.mock.calls.at(-1)?.[0]).toMatchObject({
      courses: { '0-1': { completedStepIds: ['scene-daily-agent'] } },
    })
  })

  it('keeps failed writes in memory without offering a browser fallback', async () => {
    mocks.saveCloudProfile.mockRejectedValueOnce(new Error('unavailable'))
    window.history.pushState({}, '', '/lesson/0-1')
    render(<CoworkApp />)
    await screen.findByRole('heading', { name: '你已经在用 Agent 了' })
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(await screen.findByText('学习进度暂未同步')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存到本机' })).not.toBeInTheDocument()
  })
})
