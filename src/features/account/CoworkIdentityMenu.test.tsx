import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoworkIdentityMenu } from './CoworkIdentityMenu'

describe('CoworkIdentityMenu', () => {
  afterEach(cleanup)

  it('shows SSO identity without registration or a storage switch', async () => {
    render(
      <CoworkIdentityMenu
        identity={{ userId: 'u-1', email: 'learner@xiaohongshu.com', displayName: '小红' }}
        state="ready"
        onRetry={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cowork SSO 账户' }))
    expect(screen.getByText('小红')).toBeInTheDocument()
    expect(screen.getByText('learner@xiaohongshu.com')).toBeInTheDocument()
    expect(screen.getByText(/学习进度自动同步/)).toBeInTheDocument()
    expect(screen.queryByText('云端档案')).not.toBeInTheDocument()
    expect(screen.queryByText('本地档案')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /验证码/ })).not.toBeInTheDocument()
  })

  it('offers an explicit identity retry', async () => {
    const onRetry = vi.fn()
    render(<CoworkIdentityMenu identity={null} state="error" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cowork SSO 账户' }))
    await userEvent.click(screen.getByRole('button', { name: '重新识别' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
