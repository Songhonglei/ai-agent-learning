import { afterEach, describe, expect, it } from 'vitest'
import { appPath, deploymentBasePath } from './app-path'

describe('Cowork deployment paths', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('keeps routes and API requests under the Cowork app alias', () => {
    window.history.replaceState({}, '', '/s/hongshu-agent-course/lesson/1-1')

    expect(deploymentBasePath()).toBe('/s/hongshu-agent-course')
    expect(appPath('/')).toBe('/s/hongshu-agent-course/')
    expect(appPath('/lesson/1-1')).toBe('/s/hongshu-agent-course/lesson/1-1')
    expect(appPath('/api/profile')).toBe('/s/hongshu-agent-course/api/profile')
  })

  it('keeps local development paths unchanged', () => {
    window.history.replaceState({}, '', '/lesson/1-1')
    expect(deploymentBasePath()).toBe('')
    expect(appPath('/profile')).toBe('/profile')
  })
})
