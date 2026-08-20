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
    await user.click(screen.getByRole('radio', { name: '云端档案' }))

    expect(screen.getByRole('heading', { name: '登录学习档案' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeInTheDocument()
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

  it('closes the menu after a local profile is confirmed', async () => {
    const props = renderMenu('local')
    const incoming = createEmptyProfile()
    incoming.favoriteContentIds = ['lesson-0-1']
    incoming.updatedAt = '2026-08-20T10:00:00.000Z'
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    await user.upload(screen.getByLabelText('导入学习档案'), new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    await user.click(await screen.findByRole('button', { name: '确认导入' }))

    expect(props.onProfileImport).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '学习档案模式' }))
      .toHaveAttribute('aria-expanded', 'false')
  })

  it('switches to the requested storage mode from the radio group', async () => {
    const props = renderMenu('cloud', {
      accessToken: 'token',
      email: 'learner@example.com',
      displayName: 'Learner',
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    const modeSwitch = screen.getByRole('group', { name: '学习数据存储位置' })
    expect(modeSwitch).toHaveClass('is-cloud')

    await user.click(screen.getByRole('radio', { name: '本地档案' }))

    expect(props.onUseLocal).toHaveBeenCalledOnce()
    expect(modeSwitch).toHaveClass('is-local')
  })

  it('keeps anonymous learners in local storage until cloud login succeeds', async () => {
    const props = renderMenu('cloud')
    const user = userEvent.setup()

    const trigger = screen.getByRole('button', { name: '学习档案模式' })
    expect(trigger).toHaveAttribute('data-tooltip', '学习数据本地存储')

    await user.click(trigger)
    await user.click(screen.getByRole('radio', { name: '云端档案' }))

    expect(props.onUseCloud).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeInTheDocument()
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

  it('shows the signed-in learner on one compact identity line', async () => {
    renderMenu('cloud', {
      accessToken: 'token',
      email: 'learner@example.com',
      displayName: 'Learner',
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))

    expect(screen.getByText('Learner（learner@example.com）')).toBeInTheDocument()
  })

  it('signs out the authenticated learner before closing the menu', async () => {
    let finishSignOut: (() => void) | undefined
    const props = renderMenu('cloud', {
      accessToken: 'token',
      email: 'learner@example.com',
      displayName: 'Learner',
    })
    props.onSignOut.mockImplementation(() => new Promise<void>((resolve) => {
      finishSignOut = resolve
    }))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    await user.click(screen.getByRole('button', { name: '登出用户' }))

    expect(props.onSignOut).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '正在登出…' })).toBeDisabled()

    finishSignOut?.()
    expect(await screen.findByRole('button', { name: '学习档案模式' })).toHaveAttribute('aria-expanded', 'false')
  })
})
