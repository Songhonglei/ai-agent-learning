import { useState } from 'react'
import type { CoworkIdentity } from '../../shared/auth/cowork-sso'
import { appPath } from '../../shared/runtime/app-path'

interface CoworkIdentityMenuProps {
  identity: CoworkIdentity | null
  state: 'loading' | 'ready' | 'error'
  onRetry(): void
}

function identityInitial(identity: CoworkIdentity | null): string {
  const source = identity?.displayName.trim() || identity?.email.trim() || '我'
  return Array.from(source)[0]?.toUpperCase() ?? '我'
}

export function CoworkIdentityMenu({ identity, state, onRetry }: CoworkIdentityMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ready = state === 'ready' && identity !== null
  const label = ready
    ? `Cowork SSO 已登录 · ${identity.displayName || identity.email}`
    : state === 'loading'
      ? '正在识别 Cowork 账户'
      : 'Cowork SSO 身份暂不可用'

  return (
    <div className="identity-menu">
      <button
        className={`header-icon-button identity-trigger${ready ? ' is-ready' : ''}`}
        type="button"
        aria-label="Cowork SSO 账户"
        aria-expanded={open}
        aria-controls="identity-panel"
        data-tooltip={label}
        onClick={() => setOpen((visible) => !visible)}
      >
        <span aria-hidden="true">{identityInitial(identity)}</span>
      </button>

      {open ? (
        <section className="identity-panel" id="identity-panel" aria-label="Cowork SSO 账户信息">
          <div className="identity-panel-heading">
            <div>
              <span className={`identity-status-dot is-${state}`} aria-hidden="true" />
              <strong>Cowork 账户</strong>
            </div>
            <button type="button" aria-label="关闭 Cowork 账户菜单" onClick={() => setOpen(false)}>×</button>
          </div>

          {ready ? (
            <div className="identity-card">
              <span className="identity-avatar" aria-hidden="true">{identityInitial(identity)}</span>
              <div>
                <p>SSO 已登录</p>
                <strong>{identity.displayName || identity.email}</strong>
                {identity.displayName && identity.email ? <span>{identity.email}</span> : null}
              </div>
            </div>
          ) : state === 'loading' ? (
            <p className="identity-message" role="status">正在从 Cowork 读取公司身份…</p>
          ) : (
            <div className="identity-message" role="alert">
              <p>暂时无法读取 SSO 身份，请从 Cowork 入口重新打开或重试。</p>
              <button type="button" onClick={onRetry}>重新识别</button>
            </div>
          )}

          <div className="identity-sync-note">
            <span aria-hidden="true">↻</span>
            <p><strong>学习进度自动同步</strong>按当前公司账号安全保存，无需另行登录。</p>
          </div>
          <a className="identity-profile-link" href={appPath('/profile')}>打开学习档案</a>
        </section>
      ) : null}
    </div>
  )
}
