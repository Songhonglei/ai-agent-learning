import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { learningMapModules, learningMapNodes } from '../content/learning-map'
import { lessonById } from '../content/lessons'
import { LearningMap } from '../features/learning-map/LearningMap'
import { LearningProfilePage } from '../features/learning-profile/LearningProfilePage'
import { LessonPlayer } from '../features/lesson-player/LessonPlayer'
import { loadCloudProfile, saveCloudProfile } from '../shared/profile-api'
import {
  confirmLocalFallback,
  hasConfirmedLocalFallback,
  loadLearningProfile,
  saveLearningProfile,
} from '../shared/storage/learningProfile'
import {
  createEmptyProfile,
  type LearningProfile,
} from '../shared/types/profile'
import { StatusPanel } from '../shared/ui/StatusPanel'
import { appPath, deploymentBasePath } from '../shared/runtime/app-path'
import { ThemeToggle } from './theme'
import agentLearningLogo from '../assets/brand/agent-learning-logo.svg'

function LearningMapPage({ profile }: { profile: LearningProfile }) {
  if (learningMapNodes.length === 0) {
    return <StatusPanel status="empty" />
  }

  return (
    <LearningMap
      modules={learningMapModules}
      nodes={learningMapNodes}
      profile={profile}
    />
  )
}

interface LessonPageProps {
  profile: LearningProfile
  onProfileChange: (next: LearningProfile) => void
}

function LessonPage({ profile, onProfileChange }: LessonPageProps) {
  const { lessonId } = useParams()
  const lesson = lessonId ? lessonById.get(lessonId) : undefined
  if (!lesson) return <StatusPanel status="unknown-route" />
  const activeLesson = lesson

  function updateLessonProfile(next: LearningProfile) {
    if (next.currentLessonId === activeLesson.id) {
      onProfileChange(next)
      return
    }

    onProfileChange({
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
    />
  )
}

export function App() {
  const [profile, setProfile] = useState(createEmptyProfile)
  const profileRef = useRef(profile)
  const [cloudState, setCloudState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [hasWriteError, setHasWriteError] = useState(false)
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('cloud')
  const [hasLocalWriteError, setHasLocalWriteError] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  function applyProfile(next: LearningProfile) {
    profileRef.current = next
    setProfile(next)
  }

  async function refreshCloudProfile() {
    setCloudState('loading')
    try {
      applyProfile(await loadCloudProfile())
      setStorageMode('cloud')
      setCloudState('ready')
      setHasWriteError(false)
    } catch {
      if (hasConfirmedLocalFallback() && restoreLocalProfile()) return
      setCloudState('error')
    }
  }

  useEffect(() => { void refreshCloudProfile() }, [])

  async function updateProfile(next: LearningProfile) {
    applyProfile(next)
    if (storageMode === 'local') {
      if (saveLearningProfile(next)) {
        setHasLocalWriteError(false)
        return
      }
      setHasLocalWriteError(true)
      return
    }

    try {
      applyProfile(await saveCloudProfile(next))
      setCloudState('ready')
      setHasWriteError(false)
    } catch {
      setHasWriteError(true)
    }
  }

  function restoreLocalProfile() {
    const saved = loadLearningProfile()
    if (saved.status === 'loaded') applyProfile(saved.profile)
    else if (saved.status !== 'empty') return false

    setStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
    setHasLocalWriteError(false)
    return true
  }

  function useLocalProfile() {
    const saved = loadLearningProfile()
    if (saved.status !== 'loaded' && saved.status !== 'empty') {
      setHasLocalWriteError(true)
      return
    }

    const candidate = hasWriteError
      ? profileRef.current
      : saved.status === 'loaded'
        ? saved.profile
        : profileRef.current
    if (!confirmLocalFallback() || !saveLearningProfile(candidate)) {
      setHasLocalWriteError(true)
      return
    }

    applyProfile(candidate)
    setStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
    setHasLocalWriteError(false)
  }

  function retryCloudProfile() {
    if (storageMode === 'local') {
      if (saveLearningProfile(profileRef.current)) setHasLocalWriteError(false)
      else setHasLocalWriteError(true)
      return
    }
    if (hasWriteError) {
      void updateProfile(profileRef.current)
      return
    }
    void refreshCloudProfile()
  }

  function retryLocalStorage() {
    if (storageMode === 'local') {
      if (saveLearningProfile(profileRef.current)) setHasLocalWriteError(false)
      else setHasLocalWriteError(true)
      return
    }
    useLocalProfile()
  }

  return (
    <BrowserRouter basename={deploymentBasePath() || undefined} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="shell">
        <header className={headerCollapsed ? 'app-header is-collapsed' : 'app-header'}>
          <a className="brand" href={appPath('/')}>
            <img className="brand-mark" src={agentLearningLogo} alt="" />
            <span>Agent 入门课</span>
          </a>
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

        {storageMode === 'local' && !hasLocalWriteError && (
          <p className="storage-message" role="status">
            本机模式：学习进度正保存到当前浏览器。
          </p>
        )}

        {hasLocalWriteError && (
          <StatusPanel
            status="local-storage-error"
            onRetry={retryLocalStorage}
            onContinue={() => setHasLocalWriteError(false)}
          />
        )}

        {storageMode === 'cloud' && hasWriteError && (
          <StatusPanel
            status="cloud-error"
            operation="write"
            onRetry={retryCloudProfile}
            onUseLocal={useLocalProfile}
            onContinue={() => setHasWriteError(false)}
          />
        )}

        {storageMode === 'cloud' && !hasWriteError && cloudState === 'error' && (
          <StatusPanel
            status="cloud-error"
            operation="read"
            onRetry={retryCloudProfile}
            onUseLocal={useLocalProfile}
            onContinue={() => setCloudState('ready')}
          />
        )}

        <div className="app-frame">
          <Routes>
            <Route path="/" element={<LearningMapPage profile={profile} />} />
            <Route
              path="/lesson/:lessonId"
              element={(
                <LessonPage
                  profile={profile}
                  onProfileChange={updateProfile}
                />
              )}
            />
            <Route
              path="/profile"
              element={(
                <LearningProfilePage
                  profile={profile}
                  onProfileChange={updateProfile}
                  onProfileImport={updateProfile}
                />
              )}
            />
            <Route path="*" element={<StatusPanel status="unknown-route" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
