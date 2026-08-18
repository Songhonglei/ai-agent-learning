import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import { SourceEvidence } from './SourceEvidence'

describe('SourceEvidence', () => {
  afterEach(cleanup)

  it('shows the three approved source IDs and their audited PDF pages', () => {
    render(<SourceEvidence lessonId={lessonOne.id} sourceRefs={lessonOne.sourceRefs} />)

    for (const [id, page] of [
      ['figure-2-1', 34],
      ['page-035', 35],
      ['page-052', 52],
    ] as const) {
      const source = screen.getByRole('article', { name: `来源 ${id}` })
      expect(source).toHaveAttribute('id', `source-${id}`)
      expect(source).toHaveTextContent(id)
      expect(source).toHaveTextContent(`PDF ${page}`)
      const sourceLink = within(source).getByRole('link', { name: id })
      expect(sourceLink).toHaveAttribute('href', `/resources/original-document.pdf#page=${page}`)
      expect(sourceLink).toHaveAttribute('target', '_blank')
    }
  })

  it('separates teachable conclusions from the cache-boundary reminder', () => {
    render(<SourceEvidence lessonId={lessonOne.id} sourceRefs={lessonOne.sourceRefs} />)

    expect(screen.getAllByText('本课可讲结论')).toHaveLength(2)

    const cacheBoundary = screen.getByRole('article', { name: '来源 page-052' })
    expect(within(cacheBoundary).getByText('缓存扩展边界')).toBeInTheDocument()
    expect(cacheBoundary).toHaveTextContent('不进入本课互动判定或入门测验')
  })
})
