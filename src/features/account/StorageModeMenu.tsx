import { useState } from 'react'
import type { LearningProfile } from '../../shared/types/profile'
import type { LearnerIdentity } from '../../shared/auth/learner-auth'
import { AccountGate } from './AccountGate'
import { ProfileTransfer } from '../profile-transfer/ProfileTransfer'

interface StorageModeMenuProps {
  profile: LearningProfile
  mode: 'cloud' | 'local'
  identity: LearnerIdentity | null
  configured: boolean
  onUseCloud(): void
  onUseLocal(): void
  onSignOut(): void
  onClearLocal(): void
  onProfileImport(profile: LearningProfile): void
}

export function StorageModeMenu({
  profile,
  mode,
  identity,
  configured,
  onUseCloud,
  onUseLocal,
  onSignOut,
  onClearLocal,
  onProfileImport,
}: StorageModeMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      onSignOut()
      setOpen(false)
    } finally {
      setSigningOut(false)
    }
  }

  function selectCloud() {
    onUseCloud()
  }

  function selectLocal() {
    onUseLocal()
  }

  return (
    <div className="storage-mode-menu">
      <button
        className={mode === 'local' ? 'header-icon-button storage-mode-trigger is-local' : 'header-icon-button storage-mode-trigger'}
        type="button"
        aria-label="学习档案模式"
        aria-expanded={open}
        aria-controls="storage-mode-panel"
        data-tooltip={mode === 'local' ? '本地学习档案' : '云端学习档案'}
        onClick={() => setOpen((visible) => !visible)}
      >
        <span aria-hidden="true">{mode === 'local' ? '⌂' : '☁'}</span>
      </button>

      {open && (
        <section className="storage-mode-panel" id="storage-mode-panel" aria-label="学习档案模式">
          <div className="storage-mode-panel-heading">
            <strong>学习档案</strong>
            <button type="button" aria-label="关闭学习档案模式菜单" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="storage-mode-tabs" role="tablist" aria-label="学习档案模式切换">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'cloud'}
              className={mode === 'cloud' ? 'is-active' : undefined}
              onClick={selectCloud}
            >
              云端
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'local'}
              className={mode === 'local' ? 'is-active' : undefined}
              onClick={selectLocal}
            >
              本地
            </button>
          </div>

          {mode === 'cloud' ? (
            identity ? (
              <div className="storage-mode-cloud-user">
                <p>已登录</p>
                <strong>{identity.displayName || identity.email}</strong>
                {identity.displayName && <span>{identity.email}</span>}
                <button type="button" onClick={() => { void handleSignOut() }} disabled={signingOut}>
                  {signingOut ? '正在退出…' : '退出登录'}
                </button>
              </div>
            ) : (
              <AccountGate configured={configured} onUseLocal={selectLocal} compact />
            )
          ) : (
            <div className="storage-mode-local">
              <ProfileTransfer profile={profile} onConfirm={onProfileImport} compact />
              <button
                aria-label="清空本地学习档案"
                className="storage-mode-clear"
                type="button"
                onClick={onClearLocal}
              >
                清空
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
