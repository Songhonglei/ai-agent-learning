import { CourseAnswerError } from './course-answer.mjs'

export function createRequestGuard({ limit = 10, windowMs = 60_000, maxConcurrent = 4, now = Date.now } = {}) {
  const clients = new Map()
  let active = 0
  return {
    acquire(client) {
      const time = now()
      for (const [key, value] of clients) {
        if (value.resetAt <= time && value.active === 0) clients.delete(key)
      }
      let entry = clients.get(client)
      if (!entry) {
        if (clients.size >= 1024) throw new CourseAnswerError(503, 'AI_BUSY', '提问人数较多，请稍后重试。', 5)
        entry = { count: 0, resetAt: time + windowMs, active: 0 }
        clients.set(client, entry)
      }
      if (entry.resetAt <= time) { entry.count = 0; entry.resetAt = time + windowMs }
      if (entry.active > 0) throw new CourseAnswerError(429, 'REQUEST_IN_PROGRESS', '上一条提问仍在处理，请完成或取消后重试。', 2)
      if (entry.count >= limit) throw new CourseAnswerError(429, 'RATE_LIMITED', '提问过于频繁，请稍后重试；本课 FAQ 仍可使用。', Math.max(1, Math.ceil((entry.resetAt - time) / 1000)))
      if (active >= maxConcurrent) throw new CourseAnswerError(503, 'AI_BUSY', '提问人数较多，请稍后重试；本课 FAQ 仍可使用。', 2)
      entry.count += 1
      entry.active += 1
      active += 1
      let released = false
      const release = () => {
        if (released) return
        released = true
        active -= 1
        entry.active -= 1
      }
      release.remaining = Math.max(0, limit - entry.count)
      return release
    },
  }
}
