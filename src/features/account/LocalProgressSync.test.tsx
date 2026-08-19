import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LocalProgressSync } from './LocalProgressSync'

describe('LocalProgressSync', () => {
  it('lets the learner choose whether local progress is merged', async () => {
    const onMerge = vi.fn()
    const onKeepCloud = vi.fn()
    render(<LocalProgressSync onMerge={onMerge} onKeepCloud={onKeepCloud} />)

    await userEvent.click(screen.getByRole('button', { name: '合并并同步' }))
    expect(onMerge).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: '暂不合并' }))
    expect(onKeepCloud).toHaveBeenCalledOnce()
  })
})
