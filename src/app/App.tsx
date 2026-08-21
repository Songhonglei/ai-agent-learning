import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { learningMapModules, learningMapNodes } from '../content/learning-map'
import { lessonById } from '../content/lessons'
import { LearningMap } from '../features/learning-map/LearningMap'
import { LearningProfilePage } from '../features/learning-profile/LearningProfilePage'
import { LessonPlayer } from '../features/lesson-player/LessonPlayer'
import { loadCloudProfile, saveCloudProfile } from '../shared/profile-api'
import {
  getLearnerIdentity,
  isLearnerAuthConfigured,
  signOutLearner,
  type LearnerIdentity,
  subscribeLearnerIdentity,
} from '../shared/auth/learner-auth'
import {
  confirmLocalFallback,
  hasConfirmedLocalFallback,
  loadLearningProfile,
  reconcileProfileStorageEvent,
  saveLearningProfile,
} from '../shared/storage/learningProfile'
import {
  loadStorageModePreference,
  saveStorageModePreference,
} from '../shared/storage/storageMode'
import { mergeLearningProfiles } from '../shared/profile-transfer/transfer'
import {
  createEmptyProfile,
  hasLearningActivity,
  type LearningProfile,
} from '../shared/types/profile'
import { StatusPanel } from '../shared/ui/StatusPanel'
import { StorageModeMenu } from '../features/account/StorageModeMenu'
import { LocalProgressSync } from '../features/account/LocalProgressSync'
import { appPath, deploymentBasePath } from '../shared/runtime/app-path'
import { ThemeToggle } from './theme'
import agentLearningLogo from '../assets/brand/agent-learning-logo.svg'
import { VisitorApp } from './VisitorApp'

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

function InternetAccountApp() {
  const [profile, setProfile] = useState(createEmptyProfile)
  const profileRef = useRef(profile)
  const storageModeRef = useRef<'cloud' | 'local'>('local')
  const [cloudState, setCloudState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [identity, setIdentity] = useState<LearnerIdentity | null>(null)
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authenticated' | 'unconfigured'>('checking')
  const [hasWriteError, setHasWriteError] = useState(false)
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('local')
  const [hasLocalWriteError, setHasLocalWriteError] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [pendingCloudProfile, setPendingCloudProfile] = useState<LearningProfile | null>(null)

  function applyProfile(next: LearningProfile) {
    profileRef.current = next
    setProfile(next)
  }

  function activateStorageMode(next: 'cloud' | 'local') {
    storageModeRef.current = next
    setStorageMode(next)
  }

  async function refreshCloudProfile(accessToken = identity?.accessToken) {
    setCloudState('loading')
    try {
      const cloudProfile = await loadCloudProfile(accessToken)
      const savedLocalProfile = loadLearningProfile()
      if (
        storageModeRef.current === 'local'
        && savedLocalProfile.status === 'loaded'
        && hasLearningActivity(savedLocalProfile.profile)
      ) {
        setPendingCloudProfile(cloudProfile)
        applyProfile(cloudProfile)
        activateStorageMode('cloud')
        setCloudState('ready')
        setHasWriteError(false)
        return
      }
      applyProfile(cloudProfile)
      activateStorageMode('cloud')
      setCloudState('ready')
      setHasWriteError(false)
    } catch {
      if (hasConfirmedLocalFallback() && restoreLocalProfile()) return
      setCloudState('error')
    }
  }

  useEffect(() => {
    if (!isLearnerAuthConfigured()) {
      setAuthState('unconfigured')
      const saved = loadLearningProfile()
      if (saved.status === 'loaded') {
        applyProfile(saved.profile)
      }
      activateStorageMode('local')
      setCloudState('ready')
      return
    }

    let subscribed = true
    let activeAccessToken: string | null | undefined
    function applyLearnerIdentity(nextIdentity: LearnerIdentity | null) {
      if (!subscribed) return
      const nextAccessToken = nextIdentity?.accessToken ?? null
      if (nextAccessToken === activeAccessToken) return
      activeAccessToken = nextAccessToken
      setIdentity(nextIdentity)
      setAuthState(nextIdentity ? 'authenticated' : 'anonymous')
      if (nextIdentity && loadStorageModePreference() === 'local') restoreLocalProfile()
      else if (nextIdentity) void refreshCloudProfile(nextIdentity.accessToken)
      else enterAnonymousLocalMode()
    }

    function refreshLearnerIdentity() {
      void getLearnerIdentity()
        .then(applyLearnerIdentity)
        .catch(() => {
          if (!subscribed) return
          setAuthState('anonymous')
          enterAnonymousLocalMode()
        })
    }

    refreshLearnerIdentity()
    const unsubscribe = subscribeLearnerIdentity((nextIdentity) => {
      applyLearnerIdentity(nextIdentity)
    })

    function refreshIdentityWhenVisible() {
      if (document.visibilityState === 'visible') refreshLearnerIdentity()
    }

    window.addEventListener('focus', refreshLearnerIdentity)
    document.addEventListener('visibilitychange', refreshIdentityWhenVisible)
    return () => {
      subscribed = false
      unsubscribe()
      window.removeEventListener('focus', refreshLearnerIdentity)
      document.removeEventListener('visibilitychange', refreshIdentityWhenVisible)
    }
  }, [])

  useEffect(() => {
    function synchronizeLocalProfile(event: StorageEvent) {
      if (storageModeRef.current !== 'local') return
      const next = reconcileProfileStorageEvent(event, profileRef.current)
      if (!next) return
      applyProfile(next)
      setHasLocalWriteError(false)
    }

    window.addEventListener('storage', synchronizeLocalProfile)
    return () => window.removeEventListener('storage', synchronizeLocalProfile)
  }, [])

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
      applyProfile(await saveCloudProfile(next, identity?.accessToken))
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

    activateStorageMode('local')
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
    saveStorageModePreference('local')
    activateStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
    setHasLocalWriteError(false)
  }

  function useCloudProfile() {
    saveStorageModePreference('cloud')
    if (!identity) return
    activateStorageMode('cloud')
    setHasWriteError(false)
    setHasLocalWriteError(false)
    if (identity) void refreshCloudProfile(identity.accessToken)
  }

  function clearLocalProfile() {
    if (!window.confirm('确定清空这台设备中的学习进度、收藏与错题吗？此操作无法撤销。')) return
    const emptyProfile = {
      ...createEmptyProfile(),
      theme: profileRef.current.theme,
    }
    applyProfile(emptyProfile)
    activateStorageMode('local')
    if (saveLearningProfile(emptyProfile)) {
      setHasLocalWriteError(false)
      return
    }
    setHasLocalWriteError(true)
  }

  function importLocalProfile(next: LearningProfile) {
    if (
      !confirmLocalFallback()
      || !saveLearningProfile(next)
      || !saveStorageModePreference('local')
    ) {
      setHasLocalWriteError(true)
      return
    }

    applyProfile(next)
    activateStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
    setHasLocalWriteError(false)
    window.setTimeout(() => window.location.reload(), 0)
  }

  async function signOut() {
    try {
      await signOutLearner()
      setIdentity(null)
      setAuthState('anonymous')
      enterAnonymousLocalMode()
    } catch {
      setHasWriteError(true)
    }
  }

  function enterAnonymousLocalMode() {
    const saved = loadLearningProfile()
    if (saved.status === 'loaded') {
      applyProfile(saved.profile)
      setHasLocalWriteError(false)
    } else if (saved.status === 'empty') {
      applyProfile({
        ...createEmptyProfile(),
        theme: profileRef.current.theme,
      })
      setHasLocalWriteError(false)
    } else {
      setHasLocalWriteError(true)
    }
    activateStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
  }

  function keepCloudProfile() {
    if (!pendingCloudProfile) return
    applyProfile(pendingCloudProfile)
    activateStorageMode('cloud')
    setPendingCloudProfile(null)
  }

  async function mergeLocalProfile() {
    if (!pendingCloudProfile || !identity) return
    const saved = loadLearningProfile()
    if (saved.status !== 'loaded') {
      keepCloudProfile()
      return
    }

    const merged = mergeLearningProfiles(pendingCloudProfile, saved.profile)
    applyProfile(merged)
    activateStorageMode('cloud')
    setPendingCloudProfile(null)
    try {
      applyProfile(await saveCloudProfile(merged, identity.accessToken))
      setHasWriteError(false)
    } catch {
      setHasWriteError(true)
    }
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
          <StorageModeMenu
            profile={profile}
            mode={storageMode}
            identity={identity}
            configured={authState !== 'unconfigured'}
            onUseCloud={useCloudProfile}
            onUseLocal={useLocalProfile}
            onSignOut={signOut}
            onClearLocal={clearLocalProfile}
            onProfileImport={importLocalProfile}
          />
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

        {pendingCloudProfile && (
          <LocalProgressSync
            onMerge={() => { void mergeLocalProfile() }}
            onKeepCloud={keepCloudProfile}
          />
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

export function App() {
  return isLearnerAuthConfigured() ? <InternetAccountApp /> : <VisitorApp />
}
