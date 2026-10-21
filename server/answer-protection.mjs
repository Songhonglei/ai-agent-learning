export class CourseAnswerError extends Error {
  constructor(status, code, message, retryAfter) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

export const OUT_OF_SCOPE_MESSAGE = '本课审核资料未覆盖这个问题。'

function isExplicitRefusal(answer) {
  return answer.replace(/\s+/gu, '').replace(/[。.!！]$/u, '')
    === OUT_OF_SCOPE_MESSAGE.replace(/。$/u, '')
}

function citedSourceIds(answer) {
  return [...new Set(answer.match(/\b(?:page|figure|outline|experiment|table)-\d+(?:-\d+)*\b/g) ?? [])]
}

export function approvedSourceIds(context) {
  // Only the source-ID column grants membership; narrative references do not.
  return new Set(context.split('\n').flatMap((line) => {
    const firstColumn = line.match(/^\|\s*([^|]+)\|/u)?.[1] ?? ''
    return citedSourceIds(firstColumn)
  }))
}

function withoutInlineCitations(answer) {
  return answer
    .replace(/\s*<sources>[\s\S]*?<\/sources>/gi, '')
    .replace(/\[(?:page|figure|outline|experiment|table)-\d+(?:-\d+)*\]\([^)]*\)/g, '')
    .replace(/[\[`]*(?:page|figure|outline|experiment|table)-\d+(?:-\d+)*[\]`]*/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

export function checkedAnswer(rawAnswer, context) {
  const tags = [...rawAnswer.matchAll(/<sources>([\s\S]*?)<\/sources>/gi)]
  // Preserve IDs actually supplied in the body, including legacy inline citations.
  const citations = [...new Set([
    ...tags.flatMap((tag) => tag[1].trim().split(/[,，;；\s]+/u).filter(Boolean)),
    ...citedSourceIds(rawAnswer),
  ])]
  const approved = approvedSourceIds(context)
  // Check body IDs as well, so an empty or valid tag cannot hide a made-up ID.
  if ([...citations, ...citedSourceIds(rawAnswer)].some((id) => !approved.has(id))) {
    throw new CourseAnswerError(502, 'AI_SOURCE_INVALID', 'AI 回答的参考资料未通过校验，请换个问法重试；本课 FAQ 仍可使用。')
  }
  const answer = withoutInlineCitations(rawAnswer)
  if (!answer) throw new CourseAnswerError(502, 'AI_EMPTY_ANSWER', 'AI 助教返回了空结果，请重试。')
  if (isExplicitRefusal(answer)) {
    if (citations.length > 0) throw new CourseAnswerError(502, 'AI_SOURCE_INVALID', 'AI 回答的参考资料未通过校验，请换个问法重试；本课 FAQ 仍可使用。')
    return { answer: `${OUT_OF_SCOPE_MESSAGE}可以参考本课 FAQ，或换个与本课内容有关的问题。`, citations: [] }
  }
  if (citations.length === 0) {
    throw new CourseAnswerError(502, 'AI_SOURCE_MISSING', 'AI 回答未提供可核验的课程来源，请重试；本课 FAQ 仍可使用。')
  }
  return { answer, citations }
}

export async function withModelDeadline(operation, { timeoutMs, signal }) {
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  let timer
  let onAbort
  try {
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(new CourseAnswerError(499, 'REQUEST_CANCELLED', '已取消本次提问。'))
      controller.signal.addEventListener('abort', onAbort, { once: true })
      if (controller.signal.aborted) onAbort()
    })
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new CourseAnswerError(504, 'AI_TIMEOUT', 'AI 助教回答超时，请重试；本课 FAQ 仍可使用。'))
        controller.abort()
      }, timeoutMs)
    })
    return await Promise.race([operation(controller.signal), timedOut, aborted])
  } catch (error) {
    if (error instanceof CourseAnswerError) throw error
    throw new CourseAnswerError(502, 'AI_CONNECTION_ERROR', '无法连接 AI 助教服务，请稍后重试；本课 FAQ 仍可使用。')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
    if (onAbort) controller.signal.removeEventListener('abort', onAbort)
  }
}
