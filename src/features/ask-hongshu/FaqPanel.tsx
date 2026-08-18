import { useState, type FormEvent } from 'react'
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

export function FaqPanel({ lessonId, items }: FaqPanelProps) {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<CourseAnswer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim() || isAsking) return

    setIsAsking(true)
    setResult(null)
    setError(null)
    try {
      const response = await fetch(appPath('/api/course-answer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: lessonId, question: question.trim() }),
      })
      const payload = await response.json().catch(() => null) as (CourseAnswer & { error?: string }) | null
      if (!response.ok || !payload?.answer) throw new Error(payload?.error ?? 'AI 助教暂时无法回答，请稍后重试。')
      setResult({ answer: payload.answer, citations: payload.citations ?? [] })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI 助教暂时无法回答，请稍后重试。')
    } finally {
      setIsAsking(false)
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
          placeholder="例如：这节课的关键结论是什么？"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button className="primary-button" type="submit" disabled={!question.trim() || isAsking}>
          {isAsking ? '分析中…' : '提问'}
        </button>
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
