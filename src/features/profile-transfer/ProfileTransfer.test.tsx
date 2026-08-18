import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from '../../shared/types/profile'
import { ProfileTransfer } from './ProfileTransfer'

function profileAt(updatedAt: string) {
  return { ...createEmptyProfile(), updatedAt }
}

describe('ProfileTransfer', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reads a local file, waits for explicit confirmation, and cancellation does not save', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const current = profileAt('2026-08-05T10:00:00.000Z')
    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.favoriteContentIds = ['lesson-1-1']
    render(<ProfileTransfer profile={current} onConfirm={onConfirm} />)

    const input = screen.getByLabelText('导入学习档案')
    await user.upload(input, new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))

    expect(await screen.findByText('确认导入前，请检查这些取舍')).toBeInTheDocument()
    expect(screen.getByText(/合并：收藏/)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '取消导入' }))
    expect(screen.queryByText('确认导入前，请检查这些取舍')).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.upload(input, new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    await user.click(await screen.findByRole('button', { name: '确认导入' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      favoriteContentIds: ['lesson-1-1'],
      updatedAt: '2026-08-05T11:00:00.000Z',
    }))
  })

  it('shows understandable local errors and never confirms invalid or future files', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ProfileTransfer
        profile={profileAt('2026-08-05T10:00:00.000Z')}
        onConfirm={onConfirm}
      />,
    )
    const input = screen.getByLabelText('导入学习档案')

    await user.upload(input, new File(['{not-json'], 'broken.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('文件不是有效的 JSON')
    expect(screen.queryByRole('button', { name: '确认导入' })).not.toBeInTheDocument()

    await user.upload(input, new File(
      [JSON.stringify({ schemaVersion: 2 })],
      'future.json',
      { type: 'application/json' },
    ))
    expect(await screen.findByRole('alert')).toHaveTextContent('来自更新版本')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('invalidates a ready preview when the current profile changes', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const current = profileAt('2026-08-05T10:00:00.000Z')
    const incoming = profileAt('2026-08-05T11:00:00.000Z')
    incoming.favoriteContentIds = ['incoming-favorite']
    const { rerender } = render(
      <ProfileTransfer profile={current} onConfirm={onConfirm} />,
    )

    await user.upload(screen.getByLabelText('导入学习档案'), new File(
      [JSON.stringify(incoming)],
      'learning-profile.json',
      { type: 'application/json' },
    ))
    expect(await screen.findByRole('button', { name: '确认导入' })).toBeInTheDocument()

    const changed = profileAt('2026-08-05T10:00:00.000Z')
    changed.favoriteContentIds = ['current-tab-favorite']
    rerender(<ProfileTransfer profile={changed} onConfirm={onConfirm} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('学习档案已更新')
    expect(screen.queryByRole('button', { name: '确认导入' })).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('prepares the projected profile as a local JSON download', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:learning-profile')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const profile = {
      ...profileAt('2026-08-05T10:00:00.000Z'),
      unknownRoot: 'do-not-download',
    }
    render(<ProfileTransfer profile={profile} onConfirm={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '导出学习档案' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    await expect(blob.text()).resolves.not.toContain('unknownRoot')
    expect(click).toHaveBeenCalledOnce()
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:learning-profile'))
  })
})
