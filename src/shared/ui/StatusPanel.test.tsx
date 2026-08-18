import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusPanel } from './StatusPanel'

describe('StatusPanel', () => {
  afterEach(cleanup)

  it('offers a retry when lesson content is loading', async () => {
    const onRetry = vi.fn()
    render(<StatusPanel status="loading" onRetry={onRetry} />)

    expect(screen.getByText('课程加载中')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试加载' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('returns to the learning map when lesson content is empty', () => {
    render(<StatusPanel status="empty" />)

    expect(screen.getByText('暂时没有课程内容')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回学习地图' })).toHaveAttribute('href', '/')
  })

  it('lets a learner retry local storage or continue without saved progress', async () => {
    const onRetry = vi.fn()
    const onContinue = vi.fn()
    const user = userEvent.setup()
    render(
      <StatusPanel
        status="profile-load-error"
        issue="read-error"
        onRetry={onRetry}
        onContinue={onContinue}
        resetConfirmation={false}
        onRequestReset={vi.fn()}
        onCancelReset={vi.fn()}
        onConfirmReset={vi.fn()}
      />,
    )

    expect(screen.getByText('暂时无法读取学习档案')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重试本地读取' }))
    await user.click(screen.getByRole('button', { name: '继续学习' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('asks before falling back from an unavailable cloud archive to this browser', async () => {
    const onUseLocal = vi.fn()
    const user = userEvent.setup()
    render(
      <StatusPanel
        status="cloud-error"
        operation="read"
        onRetry={vi.fn()}
        onUseLocal={onUseLocal}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('云端学习档案暂不可用')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存到本机' }))
    expect(onUseLocal).toHaveBeenCalledOnce()
  })

  it('requires a second explicit confirmation before resetting malformed storage', async () => {
    const onRequestReset = vi.fn()
    const onConfirmReset = vi.fn()
    const user = userEvent.setup()
    const commonProps = {
      status: 'profile-load-error' as const,
      issue: 'malformed' as const,
      onRetry: vi.fn(),
      onContinue: vi.fn(),
      onRequestReset,
      onCancelReset: vi.fn(),
      onConfirmReset,
    }
    const { rerender } = render(
      <StatusPanel {...commonProps} resetConfirmation={false} />,
    )

    expect(screen.getByText('学习档案已损坏')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '选择有效备份' })).toHaveAttribute('href', '/profile')
    await user.click(screen.getByRole('button', { name: '重置损坏档案' }))
    expect(onRequestReset).toHaveBeenCalledOnce()
    expect(onConfirmReset).not.toHaveBeenCalled()

    rerender(<StatusPanel {...commonProps} resetConfirmation />)
    expect(screen.getByRole('alert')).toHaveTextContent('无法撤销')
    await user.click(screen.getByRole('button', { name: '确认重置为空档案' }))
    expect(onConfirmReset).toHaveBeenCalledOnce()
  })

  it('explains an unknown route and links back to the map', () => {
    render(<StatusPanel status="unknown-route" />)

    expect(screen.getByText('没有找到这个页面')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回学习地图' })).toHaveAttribute('href', '/')
  })
})
