import { useEffect, useState } from 'react'
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
  onSignOut(): void | Promise<void>
  onClearLocal(): void
  onProfileImport(profile: LearningProfile): void
}

function StorageModeIcon({ mode }: { mode: 'cloud' | 'local' }): React.JSX.Element {
  if (mode === 'local') {
    return (
      <svg className="storage-mode-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M7 15.5h.01M11 15.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className="storage-mode-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.25 18.25h9.25a4 4 0 0 0 .55-7.96A5.5 5.5 0 0 0 6.6 9.5a4.4 4.4 0 0 0 .65 8.75Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  const effectiveMode = mode === 'cloud' && identity ? 'cloud' : 'local'
  const [selectedMode, setSelectedMode] = useState<'cloud' | 'local'>(effectiveMode)

  useEffect(() => {
    setSelectedMode(effectiveMode)
  }, [effectiveMode])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await onSignOut()
      setOpen(false)
    } finally {
      setSigningOut(false)
    }
  }

  function selectCloud() {
    setSelectedMode('cloud')
    if (identity) onUseCloud()
  }

  function selectLocal() {
    setSelectedMode('local')
    onUseLocal()
  }

  return (
    <div className="storage-mode-menu">
      <button
        className="header-icon-button storage-mode-trigger"
        type="button"
        aria-label="学习档案模式"
        aria-expanded={open}
        aria-controls="storage-mode-panel"
        data-tooltip={effectiveMode === 'local' ? '学习数据本地存储' : '学习数据云端存储'}
        onClick={() => setOpen((visible) => !visible)}
      >
        <StorageModeIcon mode={effectiveMode} />
      </button>

      {open && (
        <section className="storage-mode-panel" id="storage-mode-panel" aria-label="学习档案模式">
          <div className="storage-mode-panel-heading">
            <strong>学习档案</strong>
            <button type="button" aria-label="关闭学习档案模式菜单" onClick={() => setOpen(false)}>×</button>
          </div>

          <fieldset className={`storage-mode-options is-${selectedMode}`}>
            <legend className="sr-only">学习数据存储位置</legend>
            <label className={selectedMode === 'cloud' ? 'is-active' : undefined}>
              <input
                type="radio"
                name="storage-mode"
                value="cloud"
                checked={selectedMode === 'cloud'}
                onChange={selectCloud}
              />
              <span>云端</span>
            </label>
            <label className={selectedMode === 'local' ? 'is-active' : undefined}>
              <input
                type="radio"
                name="storage-mode"
                value="local"
                checked={selectedMode === 'local'}
                onChange={selectLocal}
              />
              <span>本地</span>
            </label>
          </fieldset>

          {selectedMode === 'cloud' ? (
            identity ? (
              <div className="storage-mode-cloud-user">
                <p>已登录</p>
                <strong className="storage-mode-identity">
                  {identity.displayName
                    ? `${identity.displayName}（${identity.email}）`
                    : identity.email}
                </strong>
                <button type="button" onClick={() => { void handleSignOut() }} disabled={signingOut}>
                  {signingOut ? '正在登出…' : '登出用户'}
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
