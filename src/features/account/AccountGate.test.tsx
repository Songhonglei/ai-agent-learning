import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountGate } from './AccountGate'

const { sendLearnerOtp, verifyLearnerOtp } = vi.hoisted(() => ({
  sendLearnerOtp: vi.fn(),
  verifyLearnerOtp: vi.fn(),
}))

vi.mock('../../shared/auth/learner-auth', () => ({ sendLearnerOtp, verifyLearnerOtp }))

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

  it('validates the display name and email before requesting an OTP', async () => {
    render(<AccountGate configured onUseLocal={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '发送验证码' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请输入 2 至 60 个字符的名称。')
    expect(sendLearnerOtp).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('名称'), 'Alex')
    await user.type(screen.getByLabelText('邮箱'), 'learner@example')
    await user.click(screen.getByRole('button', { name: '发送验证码' }))
    expect(screen.getByRole('alert')).toHaveTextContent('请输入有效的邮箱地址。')
    expect(sendLearnerOtp).not.toHaveBeenCalled()
  })

  it('sends the OTP to the normalized learner email and shows the verification step', async () => {
    sendLearnerOtp.mockResolvedValue(undefined)
    render(<AccountGate configured onUseLocal={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('名称'), ' 红叔 ')
    await user.type(screen.getByLabelText('邮箱'), ' LEARNER@EXAMPLE.COM ')
    await user.click(screen.getByRole('button', { name: '发送验证码' }))

    expect(sendLearnerOtp).toHaveBeenCalledWith('红叔', 'learner@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent('验证码已发送')
    expect(screen.getByLabelText('验证码')).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it('verifies the OTP in the current page and reports a successful login', async () => {
    sendLearnerOtp.mockResolvedValue(undefined)
    verifyLearnerOtp.mockResolvedValue({
      accessToken: 'access-token',
      email: 'learner@example.com',
      displayName: '红叔',
    })
    render(<AccountGate configured onUseLocal={vi.fn()} compact />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('名称'), '红叔')
    await user.type(screen.getByLabelText('邮箱'), 'learner@example.com')
    await user.click(screen.getByRole('button', { name: '发送验证码' }))
    await user.type(await screen.findByLabelText('验证码'), '123456')
    await user.click(screen.getByRole('button', { name: '验证并登录' }))

    expect(verifyLearnerOtp).toHaveBeenCalledWith('learner@example.com', '123456')
    expect(await screen.findByRole('status')).toHaveTextContent('登录成功')
  })

  it('rejects an incomplete OTP without calling Supabase', async () => {
    sendLearnerOtp.mockResolvedValue(undefined)
    render(<AccountGate configured onUseLocal={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('名称'), '红叔')
    await user.type(screen.getByLabelText('邮箱'), 'learner@example.com')
    await user.click(screen.getByRole('button', { name: '发送验证码' }))
    await user.type(await screen.findByLabelText('验证码'), '123')
    await user.click(screen.getByRole('button', { name: '验证并登录' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请输入 6 位验证码。')
    expect(verifyLearnerOtp).not.toHaveBeenCalled()
  })
})
