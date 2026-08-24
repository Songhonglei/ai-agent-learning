import { useState } from 'react'
import type { CoworkIdentity } from '../../shared/auth/cowork-sso'

interface CoworkIdentityMenuProps {
  identity: CoworkIdentity | null
  state: 'loading' | 'ready' | 'error'
}

function identityInitial(identity: CoworkIdentity | null): string {
  const source = identity?.displayName.trim() || identity?.email.trim() || '我'
  return Array.from(source)[0]?.toUpperCase() ?? '我'
}

export function CoworkIdentityMenu({ identity, state }: CoworkIdentityMenuProps): React.JSX.Element {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('')
  const ready = state === 'ready' && identity !== null
  const showAvatar = ready && Boolean(identity.avatarUrl) && failedAvatarUrl !== identity.avatarUrl
  const label = ready
    ? `Cowork SSO 已登录 · ${identity.displayName || identity.email}`
    : state === 'loading'
      ? '正在识别 Cowork 账户'
      : 'Cowork SSO 身份暂不可用'

  return (
    <div className="identity-menu">
      <span
        className={`header-icon-button identity-trigger${ready ? ' is-ready' : ''}`}
        role="img"
        aria-label={label}
        data-tooltip={label}
      >
        {showAvatar ? (
          <img
            className="identity-avatar-image"
            src={identity.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedAvatarUrl(identity.avatarUrl)}
          />
        ) : (
          <span className="identity-avatar-fallback" aria-hidden="true">{identityInitial(identity)}</span>
        )}
      </span>
    </div>
  )
}
