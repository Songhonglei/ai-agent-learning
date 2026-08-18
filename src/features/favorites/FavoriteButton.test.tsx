import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FavoriteButton } from './FavoriteButton'

describe('FavoriteButton', () => {
  afterEach(cleanup)

  it('toggles one stable content identifier with native pressed state', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    function Harness() {
      const [isFavorite, setIsFavorite] = useState(false)
      return (
        <FavoriteButton
          contentId="source:1-1:page-035"
          isFavorite={isFavorite}
          label="来源 page-035"
          onToggle={(contentId) => {
            onToggle(contentId)
            setIsFavorite((current) => !current)
          }}
        />
      )
    }

    render(<Harness />)

    const addButton = screen.getByRole('button', { name: '收藏来源 page-035' })
    expect(addButton).toHaveAttribute('aria-pressed', 'false')
    await user.click(addButton)

    expect(onToggle).toHaveBeenLastCalledWith('source:1-1:page-035')
    expect(screen.getByRole('button', { name: '取消收藏来源 page-035' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
