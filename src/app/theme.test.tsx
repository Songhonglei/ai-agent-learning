import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonOne } from '../content/lesson-1-1'
import {
  loadLearningProfile,
  saveLearningProfile,
} from '../shared/storage/learningProfile'
import { createEmptyProfile, type LearningProfile } from '../shared/types/profile'
import { App } from './App'
import { ThemeToggle } from './theme'

function SavedThemeHarness() {
  const [profile, setProfile] = useState<LearningProfile>(createEmptyProfile)

  return (
    <ThemeToggle
      profile={profile}
      onProfileChange={(next) => {
        saveLearningProfile(next)
        setProfile(next)
      }}
    />
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('switches the document theme and saves it in the global learning profile', async () => {
    render(<SavedThemeHarness />)

    await userEvent.click(screen.getByRole('button', { name: '切换到深色主题' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(loadLearningProfile()).toMatchObject({
      status: 'loaded',
      profile: { theme: 'dark', currentLessonId: '0-1' },
    })
  })

  it('restores the current lesson step and theme from the global profile', () => {
    const profile = createEmptyProfile()
    profile.theme = 'dark'
    profile.currentLessonId = '1-1'
    profile.courses['1-1'].currentStepId = 'dialogue-context'
    profile.courses['1-1'].completedStepIds = ['scene-intro']
    saveLearningProfile(profile)
    window.history.pushState({}, '', '/lesson/1-1')

    render(<App />)

    expect(screen.getByText(lessonOne.steps[1].content)).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('shows a nonblocking message while navigation continues when saving fails', async () => {
    window.history.pushState({}, '', '/lesson/1-1')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable')
    })
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByRole('status')).toHaveTextContent('本地进度暂时无法保存，你仍可继续学习。')
    expect(screen.getByText(lessonOne.steps[1].content)).toBeInTheDocument()
  })
})
