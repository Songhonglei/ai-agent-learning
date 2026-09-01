import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { learningMapModules, learningMapNodes } from '../content/learning-map'
import { lessonById } from '../content/lessons'
import { LearningMap } from '../features/learning-map/LearningMap'
import { LearningProfilePage } from '../features/learning-profile/LearningProfilePage'
import { LessonPlayer } from '../features/lesson-player/LessonPlayer'
import { StorageModeMenu } from '../features/account/StorageModeMenu'
import {
  LEARNING_PROFILE_STORAGE_KEY,
  loadLearningProfile,
  parseLearningProfileValue,
  readLearningProfileStorage,
  reconcileProfileStorageEvent,
  saveLearningProfile,
  type ProfileLoadResult,
} from '../shared/storage/learningProfile'
import {
  createEmptyProfile,
  type AssessmentResult,
  type CourseProgress,
  type LearningProfile,
  type WrongAnswer,
} from '../shared/types/profile'
import { StatusPanel } from '../shared/ui/StatusPanel'
import { ProjectFooter } from '../shared/ui/ProjectFooter'
import { ThemeToggle } from './theme'
import agentLearningLogo from '../assets/brand/agent-learning-logo-v2.svg'

type ProfileLoadStatus = ProfileLoadResult['status']
type ProfileLoadIssue = Exclude<ProfileLoadStatus, 'loaded' | 'empty'>

function isProfileLoadIssue(status: ProfileLoadStatus): status is ProfileLoadIssue {
  return status !== 'loaded' && status !== 'empty'
}

function validTime(value: string): number | null {
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function profileIsNewer(candidate: LearningProfile, current: LearningProfile): boolean {
  const candidateTime = validTime(candidate.updatedAt)
  const currentTime = validTime(current.updatedAt)
  if (candidateTime === null) return false
  if (currentTime === null || candidateTime > currentTime) return true
  return candidateTime === currentTime && !profileDataEqual(candidate, current)
}

function profileDataEqual(left: LearningProfile, right: LearningProfile): boolean {
  return JSON.stringify({ ...left, updatedAt: '' }) === JSON.stringify({ ...right, updatedAt: '' })
}

function timestampAfter(...values: string[]): string {
  const latestKnownTime = values.reduce((latest, value) => {
    const time = validTime(value)
    return time === null ? latest : Math.max(latest, time)
  }, Date.now())
  return new Date(latestKnownTime + 1).toISOString()
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function localValueIfUncontested<T>(base: T, requested: T, canonical: T): T {
  return !sameValue(requested, base) && sameValue(canonical, base)
    ? requested
    : canonical
}

function applyMembershipDelta(
  base: string[],
  requested: string[],
  canonical: string[],
): string[] {
  const removed = new Set(base.filter((value) => !requested.includes(value)))
  const merged = canonical.filter((value) => !removed.has(value))

  for (const value of requested) {
    if (!base.includes(value) && !merged.includes(value)) merged.push(value)
  }
  return merged
}

function applyStringRecordDelta(
  base: Record<string, string>,
  requested: Record<string, string>,
  canonical: Record<string, string>,
): Record<string, string> {
  const merged = { ...canonical }
  for (const key of new Set([...Object.keys(base), ...Object.keys(requested)])) {
    if (requested[key] === base[key]) continue
    if (canonical[key] !== base[key]) continue

    if (requested[key] === undefined) delete merged[key]
    else merged[key] = requested[key]
  }
  return merged
}

function applyExperimentDelta(
  base: Record<string, string[]>,
  requested: Record<string, string[]>,
  canonical: Record<string, string[]>,
): Record<string, string[]> {
  const merged = Object.fromEntries(
    Object.entries(canonical).map(([id, selectedIds]) => [id, [...selectedIds]]),
  )
  for (const id of new Set([...Object.keys(base), ...Object.keys(requested)])) {
    const baseSelection = base[id] ?? []
    const requestedSelection = requested[id] ?? []
    if (sameValue(requestedSelection, baseSelection)) continue

    const selection = applyMembershipDelta(
      baseSelection,
      requestedSelection,
      canonical[id] ?? [],
    )
    if (requested[id] === undefined && selection.length === 0) delete merged[id]
    else merged[id] = selection
  }
  return merged
}

function mergeCourseDelta(
  base: CourseProgress,
  requested: CourseProgress,
  canonical: CourseProgress,
): CourseProgress {
  const completedAt = localValueIfUncontested(
    base.completedAt,
    requested.completedAt,
    canonical.completedAt,
  )
  return {
    currentStepId: localValueIfUncontested(
      base.currentStepId,
      requested.currentStepId,
      canonical.currentStepId,
    ),
    completedStepIds: applyMembershipDelta(
      base.completedStepIds,
      requested.completedStepIds,
      canonical.completedStepIds,
    ),
    experimentStates: applyExperimentDelta(
      base.experimentStates,
      requested.experimentStates,
      canonical.experimentStates,
    ),
    answers: applyStringRecordDelta(base.answers, requested.answers, canonical.answers),
    ...(completedAt === undefined ? {} : { completedAt }),
  }
}

function wrongAnswerId(wrongAnswer: WrongAnswer): string {
  return `${wrongAnswer.lessonId}\u0000${wrongAnswer.questionId}`
}

function cloneWrongAnswer(wrongAnswer: WrongAnswer): WrongAnswer {
  return { ...wrongAnswer, sourceRefIds: [...wrongAnswer.sourceRefIds] }
}

function mergeWrongAnswerDelta(
  base: WrongAnswer[],
  requested: WrongAnswer[],
  canonical: WrongAnswer[],
): WrongAnswer[] {
  const baseById = new Map(base.map((item) => [wrongAnswerId(item), item]))
  const requestedById = new Map(requested.map((item) => [wrongAnswerId(item), item]))
  const canonicalById = new Map(canonical.map((item) => [wrongAnswerId(item), item]))

  for (const id of new Set([...baseById.keys(), ...requestedById.keys()])) {
    const baseItem = baseById.get(id)
    const requestedItem = requestedById.get(id)
    if (sameValue(requestedItem, baseItem)) continue
    if (!sameValue(canonicalById.get(id), baseItem)) continue

    if (requestedItem === undefined) canonicalById.delete(id)
    else canonicalById.set(id, cloneWrongAnswer(requestedItem))
  }
  return [...canonicalById.values()].map(cloneWrongAnswer)
}

function cloneAssessment(assessment: AssessmentResult): AssessmentResult {
  return { ...assessment, answers: { ...assessment.answers } }
}

function mergeAssessmentDelta(
  base: LearningProfile['assessments'],
  requested: LearningProfile['assessments'],
  canonical: LearningProfile['assessments'],
): LearningProfile['assessments'] {
  const merged: LearningProfile['assessments'] = {}
  for (const kind of ['pretest', 'posttest'] as const) {
    const selected = localValueIfUncontested(
      base[kind],
      requested[kind],
      canonical[kind],
    )
    if (selected !== undefined) merged[kind] = cloneAssessment(selected)
  }
  return merged
}

function mergeStaleProfileUpdate(
  canonical: LearningProfile,
  staleBase: LearningProfile,
  requested: LearningProfile,
): LearningProfile {
  const courses = Object.fromEntries(
    Object.keys(canonical.courses).map((lessonId) => [
      lessonId,
      mergeCourseDelta(
        staleBase.courses[lessonId],
        requested.courses[lessonId],
        canonical.courses[lessonId],
      ),
    ]),
  )
  const merged: LearningProfile = {
    ...canonical,
    theme: localValueIfUncontested(staleBase.theme, requested.theme, canonical.theme),
    currentLessonId: localValueIfUncontested(
      staleBase.currentLessonId,
      requested.currentLessonId,
      canonical.currentLessonId,
    ),
    courses,
    wrongAnswers: mergeWrongAnswerDelta(
      staleBase.wrongAnswers,
      requested.wrongAnswers,
      canonical.wrongAnswers,
    ),
    favoriteContentIds: applyMembershipDelta(
      staleBase.favoriteContentIds,
      requested.favoriteContentIds,
      canonical.favoriteContentIds,
    ),
    assessments: mergeAssessmentDelta(
      staleBase.assessments,
      requested.assessments,
      canonical.assessments,
    ),
  }
  if (profileDataEqual(merged, canonical)) return canonical

  return {
    ...merged,
    updatedAt: timestampAfter(canonical.updatedAt, requested.updatedAt),
  }
}

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

function initialProfileState() {
  const result = loadLearningProfile()
  return {
    profile: result.status === 'loaded' ? result.profile : createEmptyProfile(),
    loadStatus: result.status,
  }
}

export function VisitorApp() {
  const [initial] = useState(initialProfileState)
  const [profile, setProfile] = useState(initial.profile)
  const profileRef = useRef(profile)
  const loadStatusRef = useRef<ProfileLoadStatus>(initial.loadStatus)
  const pendingBaselineRef = useRef<LearningProfile | null>(null)
  const pendingRecoveryReplacementRef = useRef<LearningProfile | null>(null)
  const [loadStatus, setLoadStatus] = useState<ProfileLoadStatus>(initial.loadStatus)
  const [showLoadIssue, setShowLoadIssue] = useState(isProfileLoadIssue(initial.loadStatus))
  const [hasWriteError, setHasWriteError] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  function applyProfile(next: LearningProfile) {
    profileRef.current = next
    setProfile(next)
  }

  function updateLoadStatus(next: ProfileLoadStatus) {
    loadStatusRef.current = next
    setLoadStatus(next)
    setShowLoadIssue(isProfileLoadIssue(next))
    if (next !== 'malformed') setResetConfirmation(false)
  }

  function updateProfile(next: LearningProfile) {
    const current = profileRef.current
    if (isProfileLoadIssue(loadStatusRef.current)) {
      if (pendingBaselineRef.current === null) pendingBaselineRef.current = current
      applyProfile(next)
      setShowLoadIssue(true)
      return
    }

    const storedResult = loadLearningProfile()
    if (storedResult.status !== 'loaded' && storedResult.status !== 'empty') {
      if (pendingBaselineRef.current === null) pendingBaselineRef.current = current
      applyProfile(next)
      updateLoadStatus(storedResult.status)
      setHasWriteError(false)
      return
    }

    const intentBaseline = pendingBaselineRef.current ?? current
    const hasNewerCanonical = storedResult.status === 'loaded'
      && profileIsNewer(storedResult.profile, intentBaseline)
    const candidate = hasNewerCanonical
      ? mergeStaleProfileUpdate(storedResult.profile, intentBaseline, next)
      : next
    const failureBaseline = hasNewerCanonical
      ? storedResult.profile
      : intentBaseline
    applyProfile(candidate)
    if (saveLearningProfile(candidate)) {
      pendingBaselineRef.current = null
      updateLoadStatus('loaded')
      setHasWriteError(false)
      return
    }

    pendingBaselineRef.current = failureBaseline
    setHasWriteError(true)
  }

  useEffect(() => {
    function reconcileStoredProfile(event: StorageEvent) {
      if (event.key !== LEARNING_PROFILE_STORAGE_KEY || event.newValue === null) return

      let canonicalValue: string | null
      try {
        canonicalValue = localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)
      } catch {
        if (pendingBaselineRef.current === null) updateLoadStatus('read-error')
        else setHasWriteError(true)
        return
      }

      if (canonicalValue !== event.newValue) return

      const parsedEventValue = parseLearningProfileValue(event.newValue)
      if (parsedEventValue.status === 'future-version') {
        pendingRecoveryReplacementRef.current = null
        updateLoadStatus('future-version')
        setHasWriteError(false)
        return
      }

      const pendingBaseline = pendingBaselineRef.current
      const reconciled = reconcileProfileStorageEvent(
        event,
        pendingBaseline ?? profileRef.current,
      )
      if (reconciled === null) return

      pendingRecoveryReplacementRef.current = null
      updateLoadStatus('loaded')
      if (pendingBaseline !== null) {
        const merged = mergeStaleProfileUpdate(
          reconciled,
          pendingBaseline,
          profileRef.current,
        )
        pendingBaselineRef.current = reconciled
        applyProfile(merged)
        setHasWriteError(true)
        return
      }

      applyProfile(reconciled)
      setHasWriteError(false)
    }

    window.addEventListener('storage', reconcileStoredProfile)
    return () => window.removeEventListener('storage', reconcileStoredProfile)
  }, [])

  function retryStorage() {
    const pendingReplacement = pendingRecoveryReplacementRef.current
    if (pendingReplacement !== null) {
      replaceMalformedProfile(pendingReplacement)
      return
    }

    if (hasWriteError) {
      updateProfile(profileRef.current)
      return
    }

    const result = loadLearningProfile()
    if (isProfileLoadIssue(result.status)) {
      updateLoadStatus(result.status)
      return
    }

    const pendingBaseline = pendingBaselineRef.current
    if (pendingBaseline === null) {
      updateLoadStatus(result.status)
      if (result.status === 'loaded') applyProfile(result.profile)
      else applyProfile(createEmptyProfile())
      setHasWriteError(false)
      return
    }

    const canonical = result.status === 'loaded' ? result.profile : createEmptyProfile()
    const candidate = result.status === 'loaded'
      ? mergeStaleProfileUpdate(canonical, pendingBaseline, profileRef.current)
      : profileRef.current
    applyProfile(candidate)
    updateLoadStatus(result.status)
    if (saveLearningProfile(candidate)) {
      pendingBaselineRef.current = null
      updateLoadStatus('loaded')
      setHasWriteError(false)
      return
    }

    pendingBaselineRef.current = canonical
    setHasWriteError(true)
  }

  function replaceMalformedProfile(next: LearningProfile) {
    if (
      loadStatusRef.current !== 'malformed'
      && pendingRecoveryReplacementRef.current === null
    ) return

    const storedResult = readLearningProfileStorage()
    if (storedResult.status === 'future-version') {
      pendingRecoveryReplacementRef.current = null
      updateLoadStatus('future-version')
      setHasWriteError(false)
      return
    }

    if (storedResult.status === 'read-error') {
      pendingRecoveryReplacementRef.current = next
      updateLoadStatus('read-error')
      setHasWriteError(false)
      return
    }

    if (storedResult.status === 'loaded') {
      pendingRecoveryReplacementRef.current = null
      const pendingBaseline = pendingBaselineRef.current
      const candidate = pendingBaseline === null
        ? storedResult.profile
        : mergeStaleProfileUpdate(
            storedResult.profile,
            pendingBaseline,
            profileRef.current,
          )
      applyProfile(candidate)
      updateLoadStatus('loaded')
      if (profileDataEqual(candidate, storedResult.profile)) {
        pendingBaselineRef.current = null
        setHasWriteError(false)
        return
      }

      if (saveLearningProfile(candidate)) {
        pendingBaselineRef.current = null
        setHasWriteError(false)
        return
      }

      pendingBaselineRef.current = storedResult.profile
      setHasWriteError(true)
      return
    }

    applyProfile(next)
    if (saveLearningProfile(next)) {
      pendingBaselineRef.current = null
      pendingRecoveryReplacementRef.current = null
      updateLoadStatus('loaded')
      setHasWriteError(false)
      return
    }

    pendingRecoveryReplacementRef.current = next
    setHasWriteError(true)
  }

  function confirmProfileImport(next: LearningProfile) {
    if (loadStatusRef.current === 'malformed') {
      replaceMalformedProfile(next)
      return
    }
    if (isProfileLoadIssue(loadStatusRef.current)) {
      setShowLoadIssue(true)
      return
    }
    updateProfile(next)
  }

  function confirmMalformedReset() {
    if (loadStatusRef.current !== 'malformed') return
    setResetConfirmation(false)
    replaceMalformedProfile(createEmptyProfile())
  }

  function clearLocalProfile() {
    if (!window.confirm('确定清空这台设备中的学习进度、收藏与错题吗？此操作无法撤销。')) return
    updateProfile({
      ...createEmptyProfile(),
      theme: profileRef.current.theme,
    })
  }

  const importBlockedMessage = loadStatus === 'future-version'
    ? '当前本地档案来自更新版本，已启用只读保护，不能用导入文件覆盖。'
    : loadStatus === 'read-error' || loadStatus === 'migration-error'
      ? '请先重试并恢复本地档案读取，再导入备份，避免覆盖尚未读取的进度。'
      : undefined

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="shell">
        <header className={headerCollapsed ? 'app-header is-collapsed' : 'app-header'}>
          <a className="brand" href="/">
            <span className="brand-mark-wrap" aria-hidden="true">
              <img className="brand-mark" src={agentLearningLogo} alt="" />
              <span className="brand-breath-light" />
            </span>
            <span>Agent 入门课</span>
          </a>
          <StorageModeMenu
            profile={profile}
            mode="local"
            identity={null}
            configured={false}
            onUseCloud={() => {}}
            onUseLocal={() => {}}
            onSignOut={() => {}}
            onClearLocal={clearLocalProfile}
            onProfileImport={confirmProfileImport}
          />
          <a className="header-icon-button profile-link" href="/profile" aria-label="学习档案" title="学习档案">
            <span aria-hidden="true">▣</span>
          </a>
          <ThemeToggle profile={profile} onProfileChange={updateProfile} />
          <button
            className="header-icon-button header-toggle"
            type="button"
            aria-expanded={!headerCollapsed}
            aria-label={headerCollapsed ? '展开顶部导航' : '收起顶部导航'}
            title={headerCollapsed ? '展开顶部导航' : '收起顶部导航'}
            onClick={() => setHeaderCollapsed((collapsed) => !collapsed)}
          >
            <span aria-hidden="true">{headerCollapsed ? '↓' : '↑'}</span>
          </button>
        </header>

        {hasWriteError && (
          <StatusPanel
            status="local-storage-error"
            onRetry={retryStorage}
            onContinue={() => setHasWriteError(false)}
          />
        )}

        {!hasWriteError && showLoadIssue && isProfileLoadIssue(loadStatus) && (
          <StatusPanel
            status="profile-load-error"
            issue={loadStatus}
            onRetry={retryStorage}
            onContinue={() => setShowLoadIssue(false)}
            resetConfirmation={resetConfirmation}
            onRequestReset={() => setResetConfirmation(true)}
            onCancelReset={() => setResetConfirmation(false)}
            onConfirmReset={confirmMalformedReset}
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
                  onProfileImport={confirmProfileImport}
                  importBlockedMessage={importBlockedMessage}
                />
              )}
            />
            <Route path="*" element={<StatusPanel status="unknown-route" />} />
          </Routes>
        </div>
        <ProjectFooter />
      </div>
    </BrowserRouter>
  )
}
