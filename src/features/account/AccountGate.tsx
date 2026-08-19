import { useState, type FormEvent } from 'react'
import { sendLearnerMagicLink } from '../../shared/auth/learner-auth'

interface AccountGateProps {
  configured: boolean
  onUseLocal: () => void
  compact?: boolean
}

export function AccountGate({ configured, onUseLocal, compact = false }: AccountGateProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = displayName.trim()
    const address = email.trim().toLowerCase()
    if (name.length < 2 || name.length > 60) {
      setError('请输入 2 至 60 个字符的名称。')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError('请输入有效的邮箱地址。')
      return
    }
    setStatus('sending')
    setError('')
    try {
      await sendLearnerMagicLink(name, address)
      setStatus('sent')
    } catch {
      setStatus('idle')
      setError('暂时无法发送登录链接，请稍后重试。')
    }
  }

  if (!configured) {
    return (
      <section className={compact ? 'account-gate account-gate-compact' : 'account-gate'} role="status" aria-live="polite">
        <p className="status-kicker">云端学习档案正在配置</p>
        <h2>暂时使用本机学习</h2>
        <p>站点管理员尚未完成邮箱登录服务配置。你仍可将进度明确保存到当前浏览器，之后也可以导出备份。</p>
        <div className="status-actions">
          <button className="primary-button" type="button" onClick={onUseLocal}>保存到本机</button>
        </div>
      </section>
    )
  }

  return (
    <section className={compact ? 'account-gate account-gate-compact' : 'account-gate'} aria-labelledby="account-gate-title">
      <p className="status-kicker">跨设备继续学习</p>
      <h2 id="account-gate-title">{compact ? '登录云端档案' : '创建你的学习档案'}</h2>
      <p>{compact ? '输入名称和邮箱，登录后即可跨设备同步进度。' : '输入名称和邮箱。我们会发送一次性登录链接，用于安全保存并同步你的学习进度。'}</p>
      {status === 'sent' ? (
        <div className="account-gate-success" role="status">
          登录链接已发送，请在邮箱中打开它；返回本页后会自动进入你的学习档案。
        </div>
      ) : (
        <form className="account-gate-form" onSubmit={submit}>
          <label>
            名称
            <input value={displayName} maxLength={60} autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            邮箱
            <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          {error && <p className="account-gate-error" role="alert">{error}</p>}
          <div className="status-actions">
            <button className="primary-button" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? '正在发送…' : '发送登录链接'}
            </button>
            <button type="button" onClick={onUseLocal}>暂时仅在本机学习</button>
          </div>
        </form>
      )}
    </section>
  )
}
