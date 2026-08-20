import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LEARNING_PROFILE_STORAGE_KEY,
} from '../shared/storage/learningProfile'
import { LESSON_PROGRESS_STORAGE_KEY } from '../shared/storage/lessonProgress'
import { createEmptyProfile, type LearningProfile } from '../shared/types/profile'
import { App } from './App'

function profileAt(updatedAt: string): LearningProfile {
  return { ...createEmptyProfile(), updatedAt }
}

function dispatchProfileEvent(oldValue: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', {
    key: LEARNING_PROFILE_STORAGE_KEY,
    oldValue,
    newValue,
  }))
}

describe('App routes and global learning profile', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
    vi.restoreAllMocks()
  })

  it('keeps the map, lesson, and learning profile routes reachable', () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(screen.getByRole('heading', { name: '你的学习地图' })).toBeInTheDocument()

    act(() => {
      window.history.pushState({}, '', '/lesson/1-1')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('heading', { name: 'Agent的记忆有边界' })).toBeInTheDocument()

    act(() => {
      window.history.pushState({}, '', '/profile')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('heading', { name: '学习档案' })).toBeInTheDocument()
  })

  it('keeps the global navigation sticky-ready while allowing people to collapse and reopen it', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/')
    render(<App />)

    const collapse = screen.getByRole('button', { name: '收起顶部导航' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')

    await user.click(collapse)
    const expand = screen.getByRole('button', { name: '展开顶部导航' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')

    await user.click(expand)
    expect(screen.getByRole('button', { name: '收起顶部导航' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows a recoverable unknown-route page instead of silently redirecting', () => {
    window.history.pushState({}, '', '/not-a-real-page')
    render(<App />)

    expect(screen.getByText('没有找到这个页面')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回学习地图' })).toHaveAttribute('href', '/')
  })

  it('migrates the legacy 1-1 key on first global load and restores theme and course state', () => {
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify({
      currentStepId: 'quiz-context',
      completedStepIds: ['scene-intro', 'dialogue-context', 'experiment-context-builder'],
      selectedContextIds: ['code-context'],
      answers: { 'missing-background': 'always-complete' },
      theme: 'dark',
    }))
    window.history.pushState({}, '', '/lesson/1-1')

    render(<App />)

    expect(screen.getByText('步骤 4 / 6')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /代码上下文/ })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      theme: 'dark',
      currentLessonId: '1-1',
      courses: {
        '1-1': {
          currentStepId: 'quiz-context',
          completedStepIds: ['scene-intro', 'dialogue-context', 'experiment-context-builder'],
          experimentStates: { 'context-builder': ['code-context'] },
          answers: { 'missing-background': 'always-complete' },
        },
      },
    })
  })

  it('keeps learning available when the global profile cannot be saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByText('本地进度暂时不可用')).toBeInTheDocument()
    expect(screen.getByText('步骤 2 / 6')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试保存当前进度' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '继续学习' })).toBeEnabled()
  })

  it('saves progress locally while the learner is anonymous', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/lesson/0-1')
    render(<App />)

    expect(screen.getByRole('button', { name: '学习档案模式' }))
      .toHaveAttribute('data-tooltip', '学习数据本地存储')

    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      courses: {
        '0-1': { completedStepIds: ['scene-daily-agent'] },
      },
    })
  })

  it('imports into local storage, switches to local mode, and schedules a page refresh', async () => {
    const user = userEvent.setup()
    const incoming = profileAt('2026-08-18T12:43:29.229Z')
    incoming.courses['0-1'].completedStepIds = [
      'scene-daily-agent',
      'dialogue-agent-loop',
    ]
    incoming.courses['0-1'].completedAt = '2026-08-18T12:40:00.000Z'
    incoming.favoriteContentIds = ['lesson-0-1']
    window.history.pushState({}, '', '/')
    render(<App />)

    await user.click(screen.getByRole('button', { name: '学习档案模式' }))
    await user.upload(screen.getByLabelText('导入学习档案'), new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))

    expect(await screen.findByText(/将写入学习记录/)).toHaveTextContent('2 项')
    const setTimeout = vi.spyOn(window, 'setTimeout').mockImplementation(() => 1)
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))

    expect(screen.getByRole('button', { name: '学习档案模式' }))
      .toHaveAttribute('data-tooltip', '学习数据本地存储')
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      courses: {
        '0-1': {
          completedStepIds: ['scene-daily-agent', 'dialogue-agent-loop'],
        },
      },
      favoriteContentIds: ['lesson-0-1'],
    })
    expect(setTimeout).toHaveBeenCalled()
  })

  it('merges pending in-memory learning with concurrent canonical changes on write retry', async () => {
    const user = userEvent.setup()
    const savedProfile = profileAt('2026-08-05T10:00:00.000Z')
    savedProfile.courses['1-1'] = {
      currentStepId: 'experiment-context-builder',
      completedStepIds: ['scene-intro', 'dialogue-context'],
      experimentStates: {},
      answers: {},
    }
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(savedProfile))
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })
    await user.click(screen.getByRole('checkbox', { name: /代码上下文/ }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('radio', {
      name: '只要模型足够强，就能补齐全部任务背景。',
    }))
    await user.click(screen.getByRole('button', { name: '收藏本课概念' }))

    expect(screen.getByText('步骤 4 / 6')).toBeInTheDocument()
    expect(screen.getByRole('radio', {
      name: '只要模型足够强，就能补齐全部任务背景。',
    })).toBeChecked()
    setItem.mockRestore()

    const concurrentProfile: LearningProfile = {
      ...savedProfile,
      theme: 'dark',
      favoriteContentIds: ['source:1-1:page-035'],
      assessments: {
        pretest: {
          kind: 'pretest',
          answers: { 'pretest-visible-context': 'task-context' },
          completedAt: '2026-09-01T10:30:00.000Z',
          score: 1,
        },
      },
      updatedAt: '2026-09-01T11:00:00.000Z',
    }
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(concurrentProfile))

    await user.click(screen.getByRole('button', { name: '重试保存当前进度' }))

    expect(screen.queryByText('本地进度暂时不可用')).not.toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      theme: 'dark',
      courses: {
        '1-1': {
          currentStepId: 'quiz-context',
          completedStepIds: ['scene-intro', 'dialogue-context', 'experiment-context-builder'],
          experimentStates: { 'context-builder': ['code-context'] },
          answers: { 'missing-background': 'always-complete' },
        },
      },
      wrongAnswers: [{
        lessonId: '1-1',
        questionId: 'missing-background',
        selectedOptionId: 'always-complete',
        mastered: false,
      }],
      favoriteContentIds: ['source:1-1:page-035', 'lesson-1-1'],
      assessments: {
        pretest: {
          kind: 'pretest',
          answers: { 'pretest-visible-context': 'task-context' },
          completedAt: '2026-09-01T10:30:00.000Z',
          score: 1,
        },
      },
    })
  })

  it('surfaces an initial global read error and restores the whole profile on retry', async () => {
    const savedProfile = profileAt('2026-08-05T10:00:00.000Z')
    savedProfile.theme = 'dark'
    savedProfile.currentLessonId = '1-1'
    savedProfile.courses['1-1'].currentStepId = 'dialogue-context'
    savedProfile.courses['1-1'].completedStepIds = ['scene-intro']
    vi.spyOn(Storage.prototype, 'getItem')
      .mockImplementationOnce(() => {
        throw new DOMException('Storage is unavailable')
      })
      .mockReturnValue(JSON.stringify(savedProfile))
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    expect(screen.getByText('暂时无法读取学习档案')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试本地读取' }))

    expect(screen.queryByText('暂时无法读取学习档案')).not.toBeInTheDocument()
    expect(screen.getByText('步骤 2 / 6')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('rebases learning done after an initial read failure onto the recovered canonical profile', async () => {
    const canonical = profileAt('2026-08-05T10:00:00.000Z')
    canonical.theme = 'dark'
    canonical.favoriteContentIds = ['source:1-1:page-035']
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(canonical))
    const originalGetItem = Storage.prototype.getItem
    let shouldFail = true
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (shouldFail) {
        shouldFail = false
        throw new DOMException('Storage is unavailable')
      }
      return originalGetItem.call(this, key)
    })
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '继续学习' }))
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('步骤 2 / 6')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '重试本地读取' }))

    expect(screen.queryByText('暂时无法读取学习档案')).not.toBeInTheDocument()
    expect(screen.getByText('步骤 2 / 6')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      theme: 'dark',
      favoriteContentIds: ['source:1-1:page-035'],
      courses: {
        '1-1': {
          currentStepId: 'dialogue-context',
          completedStepIds: ['scene-intro'],
        },
      },
    })
  })

  it('persists the in-memory session when retry finds canonical storage empty', async () => {
    const originalGetItem = Storage.prototype.getItem
    let shouldFail = true
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (shouldFail) {
        shouldFail = false
        throw new DOMException('Storage is unavailable')
      }
      return originalGetItem.call(this, key)
    })
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '继续学习' }))
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    await userEvent.click(screen.getByRole('button', { name: '重试本地读取' }))

    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      currentLessonId: '1-1',
      courses: {
        '1-1': {
          currentStepId: 'dialogue-context',
          completedStepIds: ['scene-intro'],
        },
      },
    })
  })

  it('recovers malformed global JSON only after an explicit reset confirmation', async () => {
    const malformed = '{not-json'
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, malformed)
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(screen.getByText('学习档案已损坏')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重置损坏档案' }))
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(malformed)
    expect(screen.getByRole('alert')).toHaveTextContent('无法撤销')

    await userEvent.click(screen.getByRole('button', { name: '确认重置为空档案' }))

    expect(screen.queryByText('学习档案已损坏')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      schemaVersion: 1,
      favoriteContentIds: [],
      wrongAnswers: [],
    })
  })

  it('permits a confirmed valid backup to replace malformed global JSON', async () => {
    const user = userEvent.setup()
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, '{not-json')
    const backup = profileAt('2026-08-05T11:00:00.000Z')
    backup.theme = 'dark'
    backup.favoriteContentIds = ['lesson-1-1']
    window.history.pushState({}, '', '/profile')
    render(<App />)

    await user.upload(screen.getByLabelText('导入学习档案'), new File(
      [JSON.stringify(backup)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    await user.click(await screen.findByRole('button', { name: '确认导入' }))

    expect(screen.queryByText('学习档案已损坏')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      schemaVersion: 1,
      favoriteContentIds: ['lesson-1-1'],
    })
  })

  it('does not reset malformed data when a future version becomes canonical before confirmation', async () => {
    const malformed = '{not-json'
    const futureProfile = JSON.stringify({ schemaVersion: 2, futureField: 'keep-reset-race' })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, malformed)
    window.history.pushState({}, '', '/')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '重置损坏档案' }))
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, futureProfile)
    await userEvent.click(screen.getByRole('button', { name: '确认重置为空档案' }))

    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(futureProfile)
    expect(screen.getByText('学习档案版本较新')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重置损坏档案' })).not.toBeInTheDocument()
  })

  it('does not import over a future version that becomes canonical during backup preview', async () => {
    const user = userEvent.setup()
    const futureProfile = JSON.stringify({ schemaVersion: 2, futureField: 'keep-import-race' })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, '{not-json')
    const backup = profileAt('2026-08-05T11:00:00.000Z')
    backup.favoriteContentIds = ['lesson-1-1']
    window.history.pushState({}, '', '/profile')
    render(<App />)

    await user.upload(screen.getByLabelText('导入学习档案'), new File(
      [JSON.stringify(backup)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    expect(await screen.findByRole('button', { name: '确认导入' })).toBeInTheDocument()
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, futureProfile)
    await user.click(screen.getByRole('button', { name: '确认导入' }))

    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(futureProfile)
    expect(screen.getByText('学习档案版本较新')).toBeInTheDocument()
    expect(screen.getByLabelText('导入学习档案')).toBeDisabled()
  })

  it('rechecks canonical storage before retrying a failed malformed recovery write', async () => {
    const malformed = '{not-json'
    const futureProfile = JSON.stringify({ schemaVersion: 2, futureField: 'keep-retry-race' })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, malformed)
    window.history.pushState({}, '', '/')
    render(<App />)

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })
    await userEvent.click(screen.getByRole('button', { name: '重置损坏档案' }))
    await userEvent.click(screen.getByRole('button', { name: '确认重置为空档案' }))
    expect(screen.getByText('本地进度暂时不可用')).toBeInTheDocument()
    setItem.mockRestore()

    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, futureProfile)
    await userEvent.click(screen.getByRole('button', { name: '重试保存当前进度' }))

    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(futureProfile)
    expect(screen.getByText('学习档案版本较新')).toBeInTheDocument()
  })

  it('enters future-version protection when a canonical future storage event arrives', () => {
    const malformed = '{not-json'
    const futureProfile = JSON.stringify({ schemaVersion: 2, futureField: 'keep-event-race' })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, malformed)
    window.history.pushState({}, '', '/')
    render(<App />)

    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, futureProfile)
    act(() => dispatchProfileEvent(malformed, futureProfile))

    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(futureProfile)
    expect(screen.getByText('学习档案版本较新')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重置损坏档案' })).not.toBeInTheDocument()
  })

  it('does not overwrite a future profile or its legacy fallback while learning in memory', async () => {
    const futureProfile = JSON.stringify({ schemaVersion: 2, futureField: true })
    const legacyProgress = JSON.stringify({
      currentStepId: 'dialogue-context',
      completedStepIds: ['scene-intro'],
      selectedContextIds: [],
      answers: {},
      theme: 'dark',
    })
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, futureProfile)
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, legacyProgress)
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '继续学习' }))
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByText('步骤 2 / 6')).toBeInTheDocument()
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(futureProfile)
    expect(localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)).toBe(legacyProgress)

    act(() => {
      window.history.pushState({}, '', '/profile')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByText('学习档案版本较新')).toBeInTheDocument()
    expect(screen.getByLabelText('导入学习档案')).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('只读保护')
  })

  it('updates the restored current lesson only after activity in the open lesson', async () => {
    const savedProfile = profileAt('2026-08-05T10:00:00.000Z')
    savedProfile.currentLessonId = '0-1'
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(savedProfile))
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      currentLessonId: '1-1',
      courses: { '1-1': { currentStepId: 'dialogue-context' } },
    })
  })

  it('reconciles only the latest canonical valid profile from another tab', () => {
    const staleProfile = profileAt('2026-09-01T09:00:00.000Z')
    staleProfile.courses['1-1'].currentStepId = 'dialogue-context'
    const newerProfile = profileAt('2026-09-01T11:00:00.000Z')
    newerProfile.theme = 'dark'
    newerProfile.courses['1-1'].currentStepId = 'quiz-context'
    newerProfile.courses['1-1'].completedStepIds = [
      'scene-intro', 'dialogue-context', 'experiment-context-builder',
    ]
    const serializedNewerProfile = JSON.stringify(newerProfile)
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, serializedNewerProfile)
    act(() => dispatchProfileEvent(null, serializedNewerProfile))
    act(() => dispatchProfileEvent(null, JSON.stringify(staleProfile)))

    expect(screen.getByText('步骤 4 / 6')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('rechecks and merges a newer canonical profile before a stale-tab action', async () => {
    const user = userEvent.setup()
    const staleProfile = profileAt('2026-09-01T09:00:00.000Z')
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(staleProfile))
    window.history.pushState({}, '', '/lesson/1-1')
    render(<App />)

    const newerProfile = profileAt('2026-09-01T11:00:00.000Z')
    newerProfile.theme = 'dark'
    newerProfile.courses['1-1'] = {
      currentStepId: 'quiz-context',
      completedStepIds: [
        'scene-intro', 'dialogue-context', 'experiment-context-builder',
      ],
      experimentStates: { 'context-builder': ['workflow-constraint'] },
      answers: { 'missing-background': 'missing-context' },
    }
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(newerProfile))

    await user.click(screen.getByRole('button', { name: '收藏本课概念' }))

    expect(screen.getByText('步骤 4 / 6')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      theme: 'dark',
      courses: {
        '1-1': {
          currentStepId: 'quiz-context',
          completedStepIds: [
            'scene-intro', 'dialogue-context', 'experiment-context-builder',
          ],
          experimentStates: { 'context-builder': ['workflow-constraint'] },
          answers: { 'missing-background': 'missing-context' },
        },
      },
      favoriteContentIds: ['lesson-1-1'],
    })
  })

  it('writes an imported profile only after confirmation and cancellation changes nothing', async () => {
    const user = userEvent.setup()
    const current = profileAt('2026-08-05T10:00:00.000Z')
    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.favoriteContentIds = ['lesson-1-1']
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(current))
    window.history.pushState({}, '', '/profile')
    render(<App />)

    const profilePage = screen.getByRole('main', { name: '学习档案内容' })
    const input = within(profilePage).getByLabelText('导入学习档案')
    await user.upload(input, new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    await user.click(await within(profilePage).findByRole('button', { name: '取消导入' }))

    expect(within(profilePage).getByText('0 项收藏')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toEqual(current)

    await user.upload(input, new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    await user.click(await within(profilePage).findByRole('button', { name: '确认导入' }))

    expect(within(profilePage).getByText('1 项收藏')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY) ?? '')).toMatchObject({
      favoriteContentIds: ['lesson-1-1'],
      updatedAt: '2026-08-05T11:00:00.000Z',
    })
  })

  it('accepts a same-time canonical tab update and invalidates an open import preview', async () => {
    const user = userEvent.setup()
    const current = profileAt('2026-08-05T10:00:00.000Z')
    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.favoriteContentIds = ['lesson-1-1']
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(current))
    window.history.pushState({}, '', '/profile')
    render(<App />)

    await user.upload(screen.getByLabelText('导入学习档案'), new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    expect(await screen.findByRole('button', { name: '确认导入' })).toBeInTheDocument()

    const sameTimeCanonical = profileAt('2026-08-05T10:00:00.000Z')
    sameTimeCanonical.theme = 'dark'
    sameTimeCanonical.favoriteContentIds = ['source:1-1:page-035']
    const serializedCanonical = JSON.stringify(sameTimeCanonical)
    localStorage.setItem(LEARNING_PROFILE_STORAGE_KEY, serializedCanonical)
    act(() => dispatchProfileEvent(JSON.stringify(current), serializedCanonical))

    expect(await screen.findByRole('alert')).toHaveTextContent('学习档案已更新')
    expect(screen.queryByRole('button', { name: '确认导入' })).not.toBeInTheDocument()
    expect(screen.getByText('1 项收藏')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(LEARNING_PROFILE_STORAGE_KEY)).toBe(serializedCanonical)
  })
})
