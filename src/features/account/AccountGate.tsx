import { useEffect, useState, type FormEvent } from 'react'
import { sendLearnerOtp, verifyLearnerOtp } from '../../shared/auth/learner-auth'

interface AccountGateProps {
  configured: boolean
  onUseLocal: () => void
  compact?: boolean
}

export function AccountGate({ configured, onUseLocal, compact = false }: AccountGateProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'awaiting-code' | 'verifying' | 'authenticated'>('idle')
  const [retryAfter, setRetryAfter] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = window.setTimeout(() => setRetryAfter(retryAfter - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [retryAfter])

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
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
      await sendLearnerOtp(name, address)
      setSubmittedEmail(address)
      setStatus('awaiting-code')
      setRetryAfter(60)
    } catch {
      setStatus('idle')
      setError('暂时无法发送验证码，请稍后重试。')
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedToken = token.replace(/\s/g, '')
    if (!/^\d{6}$/.test(normalizedToken)) {
      setError('请输入 6 位验证码。')
      return
    }

    setStatus('verifying')
    setError('')
    try {
      await verifyLearnerOtp(submittedEmail, normalizedToken)
      setRetryAfter(0)
      setStatus('authenticated')
    } catch {
      setStatus('awaiting-code')
      setError('验证码无效或已过期，请重新输入。')
    }
  }

  async function resendOtp() {
    if (retryAfter > 0) return
    setStatus('sending')
    setError('')
    try {
      await sendLearnerOtp(displayName.trim(), submittedEmail)
      setStatus('awaiting-code')
      setRetryAfter(60)
    } catch {
      setStatus('awaiting-code')
      setError('暂时无法重新发送验证码，请稍后重试。')
    }
  }

  function changeEmail() {
    setStatus('idle')
    setSubmittedEmail('')
    setToken('')
    setRetryAfter(0)
    setError('')
  }

  if (!configured) {
    if (compact) {
      return <p className="account-gate-unavailable" role="status">登录暂不可用</p>
    }

    return (
      <section className="account-gate" role="status" aria-live="polite">
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
      {compact ? (
        <h2 className="sr-only" id="account-gate-title">登录学习档案</h2>
      ) : (
        <>
          <p className="status-kicker">跨设备继续学习</p>
          <h2 id="account-gate-title">创建你的学习档案</h2>
          <p>输入名称和邮箱，使用验证码登录并同步学习进度。</p>
        </>
      )}
      {status === 'authenticated' ? (
        <div className="account-gate-success" role="status">
          登录成功，正在加载云端学习档案…
        </div>
      ) : status === 'awaiting-code' || status === 'verifying' || (status === 'sending' && submittedEmail) ? (
        <div className="account-otp-step">
          <div className="account-otp-sent" role="status">
            <strong>验证码已发送</strong>
            <span>{submittedEmail}</span>
          </div>
          <form className="account-otp-form" onSubmit={verifyOtp}>
            <label>
              验证码
              <input
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </label>
            {error && <p className="account-gate-error" role="alert">{error}</p>}
            <div className="status-actions account-otp-actions">
              <button className="primary-button" type="submit" disabled={status === 'verifying' || status === 'sending'}>
                {status === 'verifying' ? '验证中…' : '验证并登录'}
              </button>
              <button type="button" onClick={changeEmail}>更换邮箱</button>
              <button type="button" onClick={() => { void resendOtp() }} disabled={retryAfter > 0 || status === 'sending'}>
                {retryAfter > 0 ? `${retryAfter} 秒后重发` : status === 'sending' ? '发送中…' : '重新发送'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <form className="account-gate-form" onSubmit={requestOtp}>
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
            <button
              aria-label={compact ? '发送验证码' : undefined}
              className="primary-button"
              type="submit"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? '发送中…' : '发送验证码'}
            </button>
            {!compact && <button type="button" onClick={onUseLocal}>暂时仅在本机学习</button>}
          </div>
        </form>
      )}
    </section>
  )
}
