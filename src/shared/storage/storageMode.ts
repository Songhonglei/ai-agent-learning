export type StorageMode = 'cloud' | 'local'

export const STORAGE_MODE_PREFERENCE_KEY = 'ai-agent-learning:storage-mode'

export function loadStorageModePreference(): StorageMode | null {
  try {
    const value = localStorage.getItem(STORAGE_MODE_PREFERENCE_KEY)
    return value === 'cloud' || value === 'local' ? value : null
  } catch {
    return null
  }
}

export function saveStorageModePreference(mode: StorageMode): boolean {
  try {
    localStorage.setItem(STORAGE_MODE_PREFERENCE_KEY, mode)
    return true
  } catch {
    return false
  }
}
