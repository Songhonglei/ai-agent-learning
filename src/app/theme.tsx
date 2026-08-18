import { useEffect } from 'react'
import type { LearningProfile } from '../shared/types/profile'

interface ThemeToggleProps {
  profile: LearningProfile
  onProfileChange: (next: LearningProfile) => void
}

export function ThemeToggle({ profile, onProfileChange }: ThemeToggleProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme
  }, [profile.theme])

  const nextTheme = profile.theme === 'light' ? 'dark' : 'light'
  const nextThemeLabel = nextTheme === 'dark' ? '深色' : '浅色'

  return (
    <button
      className="header-icon-button theme-toggle"
      type="button"
      aria-label={`切换到${nextThemeLabel}主题`}
      data-tooltip={`切换到${nextThemeLabel}主题`}
      onClick={() => onProfileChange({
        ...profile,
        theme: nextTheme,
        updatedAt: new Date().toISOString(),
      })}
    >
      <span aria-hidden="true">{profile.theme === 'light' ? '◐' : '☀︎'}</span>
    </button>
  )
}
