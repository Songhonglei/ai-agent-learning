import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { FaqItem } from '../../shared/types/lesson'
import { appPath } from '../../shared/runtime/app-path'

interface FaqPanelProps {
  lessonId: string
  items: FaqItem[]
}

interface CourseAnswer {
  answer: string
  citations: string[]
}

class CourseAnswerRequestError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readCourseAnswer(response: Response): Promise<CourseAnswer> {
  let responseText: string
  try {
    responseText = await response.text()
  } catch {
    throw new CourseAnswerRequestError('无法读取 AI 助教的响应，请稍后重试。')
  }

  if (!responseText.trim()) {
    throw new CourseAnswerRequestError(
      response.ok
        ? 'AI 助教返回了空结果，请稍后重试。'
        : 'AI 助教服务暂时不可用，请稍后重试。',
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(responseText) as unknown
  } catch {
    throw new CourseAnswerRequestError('AI 助教返回了无法识别的结果，请稍后重试。')
  }

  if (!isRecord(payload)) {
    throw new CourseAnswerRequestError('AI 助教返回了无法识别的结果，请稍后重试。')
  }

  if (!response.ok) {
    throw new CourseAnswerRequestError(
      typeof payload.error === 'string' && payload.error.trim()
        ? payload.error
        : 'AI 助教服务暂时不可用，请稍后重试。',
    )
  }

  if (typeof payload.answer !== 'string' || !payload.answer.trim()) {
    throw new CourseAnswerRequestError('AI 助教返回了空结果，请稍后重试。')
  }

  return {
    answer: payload.answer,
    citations: Array.isArray(payload.citations)
      ? payload.citations.filter((citation): citation is string => typeof citation === 'string')
      : [],
  }
}

export function FaqPanel({ lessonId, items }: FaqPanelProps) {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<CourseAnswer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [lessonId])

  function cancelQuestion() {
    requestRef.current?.abort()
    requestRef.current = null
    setIsAsking(false)
    setError('已取消本次提问，可以修改问题后重试。')
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim() || requestRef.current) return

    const controller = new AbortController()
    requestRef.current = controller
    let timedOut = false
    const timer = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 55_000)
    setIsAsking(true)
    setResult(null)
    setError(null)
    try {
      const response = await fetch(appPath('/api/course-answer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: lessonId, question: question.trim() }),
        signal: controller.signal,
      })
      const answer = await readCourseAnswer(response)
      if (requestRef.current === controller) setResult(answer)
    } catch (requestError) {
      if (requestRef.current !== controller) return
      setError(
        timedOut
          ? '等待 AI 助教超时，请重试；本课 FAQ 仍可使用。'
          : requestError instanceof CourseAnswerRequestError
          ? requestError.message
          : '无法连接 AI 助教服务，请稍后重试。',
      )
    } finally {
      window.clearTimeout(timer)
      if (requestRef.current === controller) {
        requestRef.current = null
        setIsAsking(false)
      }
    }
  }

  return (
    <section className="faq-panel" aria-labelledby="faq-panel-title">
      <div className="faq-heading">
        <div>
          <p className="faq-kicker">审核内容 · 始终可用</p>
          <h3 id="faq-panel-title">本课 FAQ</h3>
        </div>
        <span>本地问答</span>
      </div>
      <p className="faq-guidance">
        AI 助教只接收本课审核来源包作为回答依据；问题会发送到本站服务器，不会在浏览器中暴露模型密钥。
      </p>

      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>

      <form className="free-question" aria-label="自由提问" onSubmit={submitQuestion}>
        <label htmlFor="free-question">自由提问</label>
        <textarea
          id="free-question"
          aria-label="自由提问"
          value={question}
          maxLength={2000}
          disabled={isAsking}
          placeholder="例如：这节课的关键结论是什么？"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button className="primary-button" type="submit" disabled={!question.trim() || isAsking}>
          {isAsking ? '分析中…' : '提问'}
        </button>
        {isAsking && <button type="button" onClick={cancelQuestion}>取消提问</button>}
        {result && (
          <output className="free-question-answer" aria-live="polite">
            <strong>红叔的课程内回答</strong>
            <span>{result.answer}</span>
            {result.citations.length > 0 && (
              <small>
                依据：{result.citations.join(' · ')}
              </small>
            )}
          </output>
        )}
        {error && <p className="free-question-error" role="alert">{error}</p>}
      </form>
    </section>
  )
}
