import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountGate } from './AccountGate'

const { sendLearnerMagicLink } = vi.hoisted(() => ({
  sendLearnerMagicLink: vi.fn(),
}))

vi.mock('../../shared/auth/learner-auth', () => ({ sendLearnerMagicLink }))

describe('AccountGate', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps an unconfigured deployment usable through explicit local storage', async () => {
    const onUseLocal = vi.fn()
    render(<AccountGate configured={false} onUseLocal={onUseLocal} />)

    expect(screen.getByRole('heading', { name: '暂时使用本机学习' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '保存到本机' }))
    expect(onUseLocal).toHaveBeenCalledOnce()
  })

  it('validates the display name and email before requesting a magic link', async () => {
    render(<AccountGate configured onUseLocal={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '发送登录链接' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请输入 2 至 60 个字符的名称。')
    expect(sendLearnerMagicLink).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('名称'), 'Alex')
    await user.type(screen.getByLabelText('邮箱'), 'learner@example')
    await user.click(screen.getByRole('button', { name: '发送登录链接' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请输入有效的邮箱地址。')
    expect(sendLearnerMagicLink).not.toHaveBeenCalled()
  })

  it('sends the trimmed learner identity and confirms the next step', async () => {
    sendLearnerMagicLink.mockResolvedValue(undefined)
    render(<AccountGate configured onUseLocal={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('名称'), ' 红叔 ')
    await user.type(screen.getByLabelText('邮箱'), ' LEARNER@EXAMPLE.COM ')
    await user.click(screen.getByRole('button', { name: '发送登录链接' }))

    expect(sendLearnerMagicLink).toHaveBeenCalledWith('红叔', 'learner@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent('登录链接已发送')
  })
})
