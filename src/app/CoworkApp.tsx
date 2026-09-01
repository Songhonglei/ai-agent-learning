import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { learningMapModules, learningMapNodes } from '../content/learning-map'
import { lessonById } from '../content/lessons'
import { CoworkIdentityMenu } from '../features/account/CoworkIdentityMenu'
import { LearningMap } from '../features/learning-map/LearningMap'
import { LearningProfilePage } from '../features/learning-profile/LearningProfilePage'
import { LessonPlayer } from '../features/lesson-player/LessonPlayer'
import { loadCoworkIdentity, type CoworkIdentity } from '../shared/auth/cowork-sso'
import { loadCloudProfile, saveCloudProfile } from '../shared/profile-api'
import { createEmptyProfile, type LearningProfile } from '../shared/types/profile'
import { StatusPanel } from '../shared/ui/StatusPanel'
import { appPath, deploymentBasePath } from '../shared/runtime/app-path'
import { ThemeToggle } from './theme'
import agentLearningLogo from '../assets/brand/agent-learning-logo-v2.svg'

function LearningMapPage({ profile }: { profile: LearningProfile }) {
  if (learningMapNodes.length === 0) return <StatusPanel status="empty" />
  return <LearningMap modules={learningMapModules} nodes={learningMapNodes} profile={profile} />
}

interface LessonPageProps {
  profile: LearningProfile
  onProfileChange(next: LearningProfile): void
}

function LessonPage({ profile, onProfileChange }: LessonPageProps) {
  const { lessonId } = useParams()
  const lesson = lessonId ? lessonById.get(lessonId) : undefined
  if (!lesson) return <StatusPanel status="unknown-route" />
  const activeLesson = lesson

  function updateLessonProfile(next: LearningProfile) {
    onProfileChange(next.currentLessonId === activeLesson.id ? next : {
      ...next,
      currentLessonId: activeLesson.id,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <LessonPlayer
      lesson={activeLesson}
      courseProgress={profile.courses[activeLesson.id]}
      profile={profile}
      onProfileChange={updateLessonProfile}
      persistenceLabel="Cowork 自动同步"
    />
  )
}

export function CoworkApp() {
  const [profile, setProfile] = useState(createEmptyProfile)
  const profileRef = useRef(profile)
  const pendingProfileRef = useRef<LearningProfile | null>(null)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const [profileState, setProfileState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [hasWriteError, setHasWriteError] = useState(false)
  const [identity, setIdentity] = useState<CoworkIdentity | null>(null)
  const [identityState, setIdentityState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  function applyProfile(next: LearningProfile) {
    profileRef.current = next
    setProfile(next)
  }

  async function refreshProfile() {
    setProfileState('loading')
    try {
      const loaded = await loadCloudProfile()
      if (!mountedRef.current) return
      applyProfile(loaded)
      setProfileState('ready')
      setHasWriteError(false)
    } catch {
      if (mountedRef.current) setProfileState('error')
    }
  }

  async function refreshIdentity() {
    setIdentityState('loading')
    try {
      const loaded = await loadCoworkIdentity()
      if (!mountedRef.current) return
      setIdentity(loaded)
      setIdentityState('ready')
    } catch {
      if (!mountedRef.current) return
      setIdentity(null)
      setIdentityState('error')
    }
  }

  async function flushProfileWrites() {
    if (savingRef.current) return
    savingRef.current = true
    try {
      while (pendingProfileRef.current) {
        const candidate = pendingProfileRef.current
        pendingProfileRef.current = null
        try {
          const saved = await saveCloudProfile(candidate)
          if (!mountedRef.current) return
          if (!pendingProfileRef.current) applyProfile(saved)
          setProfileState('ready')
          setHasWriteError(false)
        } catch {
          if (!mountedRef.current) return
          pendingProfileRef.current = pendingProfileRef.current ?? candidate
          setHasWriteError(true)
          return
        }
      }
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    mountedRef.current = true
    void Promise.all([refreshProfile(), refreshIdentity()])
    return () => {
      mountedRef.current = false
    }
  }, [])

  function updateProfile(next: LearningProfile) {
    applyProfile(next)
    pendingProfileRef.current = next
    void flushProfileWrites()
  }

  function retryProfile() {
    if (hasWriteError) {
      pendingProfileRef.current = profileRef.current
      setHasWriteError(false)
      void flushProfileWrites()
      return
    }
    void refreshProfile()
  }

  const routes = (
    <Routes>
      <Route path="/" element={<LearningMapPage profile={profile} />} />
      <Route path="/lesson/:lessonId" element={<LessonPage profile={profile} onProfileChange={updateProfile} />} />
      <Route
        path="/profile"
        element={(
          <LearningProfilePage
            profile={profile}
            onProfileChange={updateProfile}
            onProfileImport={updateProfile}
            importBlockedMessage={hasWriteError ? '同步恢复后再导入，避免覆盖尚未保存的学习变化。' : undefined}
            storageEyebrow="Cowork SSO 安全同步"
            storageDescription="集中查看学习记录、测评、错题与收藏；档案按当前公司账号保存。"
          />
        )}
      />
      <Route path="*" element={<StatusPanel status="unknown-route" />} />
    </Routes>
  )

  return (
    <BrowserRouter basename={deploymentBasePath() || undefined} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="shell">
        <header className={headerCollapsed ? 'app-header is-collapsed' : 'app-header'}>
          <a className="brand" href={appPath('/')}>
            <span className="brand-mark-wrap" aria-hidden="true">
              <img className="brand-mark" src={agentLearningLogo} alt="" />
              <span className="brand-breath-light" />
            </span>
            <span>Agent 入门课</span>
          </a>
          <CoworkIdentityMenu identity={identity} state={identityState} />
          <a className="header-icon-button profile-link" href={appPath('/profile')} aria-label="学习档案" data-tooltip="学习档案">
            <span aria-hidden="true">▣</span>
          </a>
          <ThemeToggle profile={profile} onProfileChange={updateProfile} />
          <button
            className="header-icon-button header-toggle"
            type="button"
            aria-expanded={!headerCollapsed}
            aria-label={headerCollapsed ? '展开顶部导航' : '收起顶部导航'}
            data-tooltip={headerCollapsed ? '展开顶部导航' : '收起顶部导航'}
            onClick={() => setHeaderCollapsed((collapsed) => !collapsed)}
          >
            <span aria-hidden="true">{headerCollapsed ? '↓' : '↑'}</span>
          </button>
        </header>

        {hasWriteError ? (
          <StatusPanel
            status="cloud-error"
            operation="write"
            platform="cowork"
            onRetry={retryProfile}
            onContinue={() => setHasWriteError(false)}
          />
        ) : null}

        {!hasWriteError && profileState === 'error' ? (
          <StatusPanel
            status="cloud-error"
            operation="read"
            platform="cowork"
            onRetry={retryProfile}
            onContinue={() => setProfileState('ready')}
          />
        ) : null}

        <div className="app-frame">
          {profileState === 'loading'
            ? <StatusPanel status="loading" platform="cowork" onRetry={refreshProfile} />
            : routes}
        </div>
      </div>
    </BrowserRouter>
  )
}
