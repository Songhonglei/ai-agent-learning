import { createCourseAnswerHandler } from '../server/app.mjs'
import { createRequestGuard } from '../server/request-guard.mjs'
import { guestClientKey } from '../server/guest-ai-limit.mjs'

export default createCourseAnswerHandler({
  guard: createRequestGuard({ limit: 12 }),
  clientKey: guestClientKey,
})
