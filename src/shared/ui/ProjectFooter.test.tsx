import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectFooter } from './ProjectFooter'

describe('ProjectFooter', () => {
  afterEach(cleanup)

  it('offers a quiet link to the open-source repository', () => {
    render(<ProjectFooter />)

    const link = screen.getByRole('link', { name: /GitHub/ })
    expect(link).toHaveAttribute('href', 'https://github.com/Songhonglei/ai-agent-learning')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
