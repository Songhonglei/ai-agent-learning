import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { learningMapModules, learningMapNodes } from '../content/learning-map'
import { lessonById } from '../content/lessons'
import { LearningMap } from '../features/learning-map/LearningMap'
import { LearningProfilePage } from '../features/learning-profile/LearningProfilePage'
import { LessonPlayer } from '../features/lesson-player/LessonPlayer'
import { CourseAssessmentPage } from '../features/course-assessment/CourseAssessment'
import { loadCloudProfile, saveCloudProfileWithMerge, type CloudProfileSnapshot } from '../shared/profile-api'
import { mergeStaleProfileUpdate } from '../shared/profile-sync-merge'
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
  readLearningProfileStorage,
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
import { ProjectFooter } from '../shared/ui/ProjectFooter'
import { StorageModeMenu } from '../features/account/StorageModeMenu'
import { LocalProgressSync } from '../features/account/LocalProgressSync'
import { appPath, deploymentBasePath } from '../shared/runtime/app-path'
import { ThemeToggle } from './theme'
import agentLearningLogo from '../assets/brand/agent-learning-logo-v2.svg'
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
  const identityRef = useRef(identity)
  identityRef.current = identity
  const cloudSession = useRef({ controller: new AbortController(), snapshot: null as CloudProfileSnapshot | null, failedBase: null as LearningProfile | null })
  const cloudReadSequence = useRef(0)
  const [cloudMerged, setCloudMerged] = useState(false)
  const cloudWriteQueue = useRef<Promise<void>>(Promise.resolve())
  const cloudWriteSequence = useRef(0)
  const [cloudSaving, setCloudSaving] = useState(false)
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

  function resetCloudSession() {
    cloudSession.current.controller.abort()
    cloudSession.current = { controller: new AbortController(), snapshot: null, failedBase: null }
    cloudReadSequence.current += 1
    cloudWriteSequence.current += 1
    cloudWriteQueue.current = Promise.resolve()
    setPendingCloudProfile(null)
    setCloudSaving(false)
    setCloudMerged(false)
  }

  async function refreshCloudProfile(accessToken = identityRef.current?.accessToken) {
    const session = cloudSession.current
    const sequence = ++cloudReadSequence.current
    const email = identityRef.current?.email
    setCloudState('loading')
    try {
      const snapshot = await loadCloudProfile(accessToken, session.controller.signal)
      if (cloudSession.current !== session || sequence !== cloudReadSequence.current
        || identityRef.current?.email !== email || session.controller.signal.aborted) return
      session.snapshot = snapshot
      const savedLocalProfile = loadLearningProfile()
      if (savedLocalProfile.status === 'loaded' && hasLearningActivity(savedLocalProfile.profile)) {
        setPendingCloudProfile(snapshot.profile)
      }
      applyProfile(snapshot.profile)
      activateStorageMode('cloud')
      setCloudState('ready')
      setHasWriteError(false)
    } catch {
      if (cloudSession.current !== session || sequence !== cloudReadSequence.current || session.controller.signal.aborted) return
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
      const previousEmail = identityRef.current?.email
      identityRef.current = nextIdentity
      setIdentity(nextIdentity)
      if (nextIdentity && previousEmail === nextIdentity.email && !cloudSession.current.controller.signal.aborted) return
      resetCloudSession()
      applyProfile(createEmptyProfile())
      setAuthState(nextIdentity ? 'authenticated' : 'anonymous')
      if (nextIdentity && loadStorageModePreference() === 'local') {
        if (!restoreLocalProfile()) {
          activateStorageMode('local')
          setCloudState('ready')
          setHasLocalWriteError(true)
        }
      }
      else if (nextIdentity) { activateStorageMode('cloud'); void refreshCloudProfile(nextIdentity.accessToken) }
      else enterAnonymousLocalMode()
    }

    let identityReadSequence = 0
    function refreshLearnerIdentity() {
      const sequence = ++identityReadSequence
      void getLearnerIdentity()
        .then((next) => { if (sequence === identityReadSequence) applyLearnerIdentity(next) })
        .catch(() => {
          if (!subscribed || sequence !== identityReadSequence) return
          // A transient session-read failure must not log out an active learner.
          if (identityRef.current) return
          setAuthState('anonymous')
          enterAnonymousLocalMode()
        })
    }

    refreshLearnerIdentity()
    const unsubscribe = subscribeLearnerIdentity((nextIdentity) => {
      identityReadSequence += 1
      applyLearnerIdentity(nextIdentity)
    })

    function refreshIdentityWhenVisible() {
      if (document.visibilityState === 'visible') refreshLearnerIdentity()
    }

    window.addEventListener('focus', refreshLearnerIdentity)
    document.addEventListener('visibilitychange', refreshIdentityWhenVisible)
    return () => {
      subscribed = false
      cloudSession.current.controller.abort()
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

  function saveLocalSafely(next: LearningProfile) {
    const stored = readLearningProfileStorage()
    return (stored.status === 'loaded' || stored.status === 'empty') && saveLearningProfile(next)
  }

  async function updateProfile(next: LearningProfile) {
    if (storageModeRef.current === 'cloud' && cloudState === 'loading') return
    const base = profileRef.current
    applyProfile(next)
    if (storageModeRef.current === 'local') {
      setHasLocalWriteError(!saveLocalSafely(next))
      return
    }

    const session = cloudSession.current
    const email = identityRef.current?.email
    const sequence = ++cloudWriteSequence.current
    setCloudSaving(true)
    setCloudMerged(false)
    const isCurrent = () => cloudSession.current === session && !session.controller.signal.aborted
      && storageModeRef.current === 'cloud' && identityRef.current?.email === email
    const operation = cloudWriteQueue.current.catch(() => {}).then(async () => {
      if (!isCurrent()) return
      const mergeBase = session.failedBase ?? base
      try {
        const token = identityRef.current?.accessToken
        const snapshot = session.snapshot ?? await loadCloudProfile(token, session.controller.signal)
        if (!isCurrent()) return
        const saved = await saveCloudProfileWithMerge(snapshot, mergeBase, next, token, session.controller.signal)
        if (!isCurrent()) return
        session.snapshot = saved
        session.failedBase = null
        // Apply remote changes without replacing edits made while this write was in flight.
        applyProfile(mergeStaleProfileUpdate(saved.profile, next, profileRef.current))
        if (saved.merged) setCloudMerged(true)
        if (sequence === cloudWriteSequence.current) {
          setCloudState('ready')
          setHasWriteError(false)
        }
      } catch {
        if (!isCurrent()) return
        session.failedBase ??= mergeBase
        if (sequence === cloudWriteSequence.current) setHasWriteError(true)
      }
    })
    cloudWriteQueue.current = operation
    await operation
    if (isCurrent() && sequence === cloudWriteSequence.current) setCloudSaving(false)
  }

  useEffect(() => {
    if (!cloudSaving || storageMode !== 'cloud') return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [cloudSaving, storageMode])

  function restoreLocalProfile() {
    const saved = loadLearningProfile()
    if (saved.status === 'loaded') applyProfile(saved.profile)
    else if (saved.status === 'empty') applyProfile(createEmptyProfile())
    else return false

    resetCloudSession()
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

    const candidate = hasWriteError || cloudSaving || cloudSession.current.failedBase !== null
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
    resetCloudSession()
    activateStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
    setHasLocalWriteError(false)
  }

  function useCloudProfile() {
    if (storageModeRef.current === 'cloud') return
    saveStorageModePreference('cloud')
    if (!identity) return
    resetCloudSession()
    activateStorageMode('cloud')
    setHasWriteError(false)
    setHasLocalWriteError(false)
    void refreshCloudProfile(identity.accessToken)
  }

  function clearLocalProfile() {
    if (!window.confirm('确定清空这台设备中的学习进度、测评、收藏与错题吗？此操作无法撤销。')) return
    const emptyProfile = {
      ...createEmptyProfile(),
      theme: profileRef.current.theme,
    }
    applyProfile(emptyProfile)
    resetCloudSession()
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
    resetCloudSession()
    activateStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
    setHasLocalWriteError(false)
    window.setTimeout(() => window.location.reload(), 0)
  }

  async function signOut() {
    try {
      await signOutLearner()
      identityRef.current = null
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
      // Never retain an old account's data when the local backup cannot be read.
      applyProfile(createEmptyProfile())
      setHasLocalWriteError(true)
    }
    resetCloudSession()
    activateStorageMode('local')
    setCloudState('ready')
    setHasWriteError(false)
  }

  function keepCloudProfile() {
    if (!pendingCloudProfile) return
    setPendingCloudProfile(null)
  }

  async function mergeLocalProfile() {
    if (!pendingCloudProfile || !identity) return
    const saved = loadLearningProfile()
    if (saved.status !== 'loaded') {
      keepCloudProfile()
      return
    }

    const merged = mergeLearningProfiles(profileRef.current, saved.profile)
    setPendingCloudProfile(null)
    await updateProfile(merged)
  }

  function retryCloudProfile() {
    if (storageMode === 'local') {
      if (saveLocalSafely(profileRef.current)) setHasLocalWriteError(false)
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
      if (saveLocalSafely(profileRef.current)) setHasLocalWriteError(false)
      else setHasLocalWriteError(true)
      return
    }
    useLocalProfile()
  }

  return (
    <BrowserRouter basename={deploymentBasePath() || undefined}>
      <div className="shell">
        <header className={headerCollapsed ? 'app-header is-collapsed' : 'app-header'}>
          <a className="brand" href={appPath('/')}>
            <span className="brand-mark-wrap" aria-hidden="true">
              <img className="brand-mark" src={agentLearningLogo} alt="" />
              <span className="brand-breath-light" />
            </span>
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

        {cloudSaving && storageMode === 'cloud' && <p role="status">正在保存学习档案，请稍候再刷新或离开。</p>}
        {cloudMerged && !cloudSaving && storageMode === 'cloud' && <p role="status">已合并其他窗口的学习进度并保存。</p>}
        <div className="app-frame">
          {cloudState === 'loading' ? <p role="status">正在读取学习档案…</p> : <Routes>
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
            <Route path="/assessment" element={<CourseAssessmentPage profile={profile} onProfileChange={updateProfile} />} />
            <Route path="/assessment/:kind" element={<CourseAssessmentPage profile={profile} onProfileChange={updateProfile} />} />
            <Route path="*" element={<StatusPanel status="unknown-route" />} />
          </Routes>}
        </div>
        <ProjectFooter />
      </div>
    </BrowserRouter>
  )
}

export function App() {
  return isLearnerAuthConfigured() ? <InternetAccountApp /> : <VisitorApp />
}
