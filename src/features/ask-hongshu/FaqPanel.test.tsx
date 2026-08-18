import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import { FaqPanel } from './FaqPanel'

describe('FaqPanel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('serves only the audited 1-1 FAQ without making a network request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const user = userEvent.setup()

    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)

    expect(screen.getAllByRole('group')).toHaveLength(2)
    for (const item of lessonOne.faq) {
      await user.click(screen.getByText(item.question))
      expect(screen.getByText(item.answer)).toBeInTheDocument()
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends the course id and question to the server-side AI endpoint', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      answer: '先检查当前窗口是否包含任务所需信息。[page-035]',
      citations: ['page-035'],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    const user = userEvent.setup()
    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)

    const freeQuestion = screen.getByRole('textbox', { name: '自由提问' })
    expect(screen.getByRole('button', { name: '提问' })).toBeDisabled()
    await user.type(freeQuestion, lessonOne.faq[0].question)
    await user.click(screen.getByRole('button', { name: '提问' }))

    expect(await screen.findByText(/先检查当前窗口/)).toBeInTheDocument()
    expect(screen.getByText('依据：page-035')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'page-035' })).not.toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledWith('/api/course-answer', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ courseId: '1-1', question: lessonOne.faq[0].question }),
    }))
  })

  it('shows a recoverable server configuration error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'AI 服务尚未完成服务器配置。',
    }), { status: 503 })))
    const user = userEvent.setup()
    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)

    await user.type(screen.getByRole('textbox', { name: '自由提问' }), '今天上海天气怎么样？')
    await user.click(screen.getByRole('button', { name: '提问' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('AI 服务尚未完成服务器配置。')
  })
})
