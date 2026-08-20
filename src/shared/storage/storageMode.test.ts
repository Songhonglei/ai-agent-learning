import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadStorageModePreference,
  saveStorageModePreference,
  STORAGE_MODE_PREFERENCE_KEY,
} from './storageMode'

describe('storage mode preference', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('persists only supported storage modes', () => {
    expect(loadStorageModePreference()).toBeNull()
    expect(saveStorageModePreference('local')).toBe(true)
    expect(loadStorageModePreference()).toBe('local')

    localStorage.setItem(STORAGE_MODE_PREFERENCE_KEY, 'unknown')
    expect(loadStorageModePreference()).toBeNull()
  })

  it('fails safely when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('unavailable')
    })
    expect(saveStorageModePreference('cloud')).toBe(false)
  })
})
