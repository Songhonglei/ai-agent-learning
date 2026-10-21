import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import { FaqPanel } from './FaqPanel'

describe('FaqPanel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
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
  it('turns an empty server response into a readable retry message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })))
    const user = userEvent.setup()
    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)

    await user.type(screen.getByRole('textbox', { name: '自由提问' }), '最好的 Agent 有什么特点？')
    await user.click(screen.getByRole('button', { name: '提问' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('AI 助教服务暂时不可用，请稍后重试。')
    expect(screen.queryByText(/Unexpected end of JSON input/)).not.toBeInTheDocument()
  })

  it('does not expose raw browser errors when the request cannot connect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const user = userEvent.setup()
    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)

    await user.type(screen.getByRole('textbox', { name: '自由提问' }), '怎么判断 Agent 是否可靠？')
    await user.click(screen.getByRole('button', { name: '提问' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('无法连接 AI 助教服务，请稍后重试。')
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  })

  it('cancels a request and ignores its late response after a successful retry', async () => {
    let resolveOld: (value: Response) => void = () => {}
    const fetchSpy = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ answer: '这是重试后的回答。', citations: ['page-035'] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    const user = userEvent.setup()
    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)
    const textbox = screen.getByRole('textbox', { name: '自由提问' })
    expect(textbox).toHaveAttribute('maxlength', '2000')
    await user.type(textbox, '什么是上下文？')
    await user.click(screen.getByRole('button', { name: '提问' }))
    expect(textbox).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '取消提问' }))
    expect(fetchSpy.mock.calls[0][1].signal.aborted).toBe(true)
    expect(screen.getByRole('alert')).toHaveTextContent('已取消')
    await user.click(screen.getByRole('button', { name: '提问' }))
    expect(await screen.findByText('这是重试后的回答。')).toBeInTheDocument()
    await act(async () => { resolveOld(new Response(JSON.stringify({ answer: '过期回答', citations: [] }), { status: 200 })) })
    expect(screen.queryByText('过期回答')).not.toBeInTheDocument()
    expect(screen.getByText('这是重试后的回答。')).toBeInTheDocument()
  })

  it('aborts a stalled request after 55 seconds and allows retry', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, { signal }: RequestInit) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    })))
    render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)
    fireEvent.change(screen.getByRole('textbox', { name: '自由提问' }), { target: { value: '什么是上下文？' } })
    fireEvent.click(screen.getByRole('button', { name: '提问' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(55_000) })
    expect(screen.getByRole('alert')).toHaveTextContent('等待 AI 助教超时')
    expect(screen.getByRole('button', { name: '提问' })).toBeEnabled()
  })

  it('aborts its pending request when leaving the question panel', async () => {
    const fetchSpy = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchSpy)
    const { unmount } = render(<FaqPanel lessonId={lessonOne.id} items={lessonOne.faq} />)
    fireEvent.change(screen.getByRole('textbox', { name: '自由提问' }), { target: { value: '什么是上下文？' } })
    fireEvent.click(screen.getByRole('button', { name: '提问' }))
    const options = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    unmount()
    expect(options[1].signal?.aborted).toBe(true)
  })
})
