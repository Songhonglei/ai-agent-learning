import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { CoworkIdentityMenu } from './CoworkIdentityMenu'

describe('CoworkIdentityMenu', () => {
  afterEach(cleanup)

  it('shows the SSO avatar without opening an account menu', () => {
    const { container } = render(
      <CoworkIdentityMenu
        identity={{
          userId: 'u-1',
          email: 'learner@xiaohongshu.com',
          displayName: '小红',
          avatarUrl: 'https://avatar.example.com/xiaohong.png',
        }}
        state="ready"
      />,
    )
    const identityIcon = screen.getByRole('img', { name: 'Cowork SSO 已登录 · 小红' })
    expect(identityIcon).not.toHaveAttribute('aria-expanded')
    expect(container.querySelector('.identity-avatar-image')).toHaveAttribute(
      'src',
      'https://avatar.example.com/xiaohong.png',
    )
    expect(container.querySelector('.identity-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses a quiet fallback without exposing retry or logout controls', () => {
    render(<CoworkIdentityMenu identity={null} state="error" />)
    expect(screen.getByRole('img', { name: 'Cowork SSO 身份暂不可用' })).toBeInTheDocument()
    expect(screen.getByText('我')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
