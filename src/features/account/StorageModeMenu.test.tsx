import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from '../../shared/types/profile'
import { StorageModeMenu } from './StorageModeMenu'

function renderMenu(
  mode: 'cloud' | 'local' = 'local',
  identity: { accessToken: string; email: string; displayName: string } | null = null,
) {
  const props = {
    profile: createEmptyProfile(),
    mode,
    identity,
    configured: true,
    onUseCloud: vi.fn(),
    onUseLocal: vi.fn(),
    onSignOut: vi.fn(),
    onClearLocal: vi.fn(),
    onProfileImport: vi.fn(),
  }
  render(<StorageModeMenu {...props} />)
  return props
}

describe('StorageModeMenu', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('moves cloud login into the compact header menu', async () => {
    renderMenu()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    await user.click(screen.getByRole('radio', { name: '云端' }))

    expect(screen.getByRole('heading', { name: '登录学习档案' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送登录链接' })).toBeInTheDocument()
  })

  it('offers local backup, restore, and clear actions only in local mode', async () => {
    const props = renderMenu('local')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))

    expect(screen.getByRole('button', { name: '导出学习档案' })).toBeInTheDocument()
    expect(screen.getByLabelText('导入学习档案')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '清空本地学习档案' }))
    expect(props.onClearLocal).toHaveBeenCalledOnce()
  })

  it('switches to the requested storage mode from the radio group', async () => {
    const props = renderMenu('cloud', {
      accessToken: 'token',
      email: 'learner@example.com',
      displayName: 'Learner',
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    await user.click(screen.getByRole('radio', { name: '本地' }))

    expect(props.onUseLocal).toHaveBeenCalledOnce()
  })

  it('keeps anonymous learners in local storage until cloud login succeeds', async () => {
    const props = renderMenu('cloud')
    const user = userEvent.setup()

    const trigger = screen.getByRole('button', { name: '学习档案模式' })
    expect(trigger).toHaveAttribute('data-tooltip', '学习数据本地存储')

    await user.click(trigger)
    await user.click(screen.getByRole('radio', { name: '云端' }))

    expect(props.onUseCloud).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '发送登录链接' })).toBeInTheDocument()
  })

  it('shows cloud storage only for an authenticated learner', () => {
    renderMenu('cloud', {
      accessToken: 'token',
      email: 'learner@example.com',
      displayName: 'Learner',
    })

    expect(screen.getByRole('button', { name: '学习档案模式' }))
      .toHaveAttribute('data-tooltip', '学习数据云端存储')
  })
})
