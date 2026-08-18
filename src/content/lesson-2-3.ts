import type { Lesson } from '../shared/types/lesson'

export const lessonTwoThree: Lesson = {
  id: '2-3', contentId: 'lesson-2-3', moduleId: 'module-2', title: 'Agent怎么记住“你是谁”', durationMinutes: 18,
  objectives: ['区分当前会话、用户长期记忆和业务任务状态。', '理解长期记忆应保存可复用、可审查的信息。', '知道记忆更新需要处理新旧信息冲突。'],
  sourceRefs: [
    { id: 'page-078', pdfPage: 78, printedPage: 70, conclusion: '用户记忆面向单个用户的偏好、习惯和需求，知识库则面向所有用户共享的领域资料。' },
    { id: 'page-080', pdfPage: 80, printedPage: 72, conclusion: '记忆层次可区分当前会话轨迹、跨会话用户长期记忆和任务逻辑阶段等不同用途。' },
    { id: 'figure-3-2', pdfPage: 81, printedPage: 73, conclusion: '同一条用户信息可用不同粒度与结构保存；简单性、表达力、更新和检索之间存在取舍。' },
  ],
  steps: [
    { id: 'scene-memory', type: 'scene', content: '你每次都说“先给结论再给细节”，Agent 却总要重新问。它需要的不是把整段聊天永久背下来，而是把稳定偏好以可检查的方式保存和取回。' },
    { id: 'dialogue-memory', type: 'dialogue', speaker: 'hongshu', content: '“记忆”不是一个抽屉。当前会话线索服务这一轮任务；用户长期记忆服务跨会话个性化；业务状态记录任务走到哪一步。不同用途的信息应分层存放，更新时还要处理新旧冲突。' },
    { id: 'experiment-memory', type: 'experiment', content: '把三条本地练习信息放到当前会话、用户长期偏好或业务任务状态中。', experimentId: 'memory-layers', experimentKind: 'memory-layers' },
    { id: 'quiz-memory', type: 'quiz', content: '用三个场景判断合适的记忆层和更新原则。' },
    { id: 'summary-memory', type: 'summary', content: '好的 Agent 记忆是选择性、可审查且按用途组织的。不是保存越多越好，也不能让过期或矛盾信息一直并存。' },
    { id: 'faq-memory', type: 'free-question', content: '自由提问目前只提供本课审核过的 FAQ；模型服务尚未启用。' },
  ],
  quiz: [
    { id: 'preference', prompt: '“用户长期偏好先给结论”最适合放在哪里？', options: [{ id: 'long', label: '用户长期记忆。' }, { id: 'current', label: '仅本次会话的临时线索。' }, { id: 'status', label: '当前采购审批阶段。' }], correctOptionId: 'long', immediateFeedback: '对。稳定、可复用的偏好可服务未来会话。', explanation: '长期记忆用于跨会话的个性化与连续性。', sourceRefIds: ['page-078', 'page-080'] },
    { id: 'state', prompt: '“等待财务审批”最贴近哪一类信息？', options: [{ id: 'state', label: '业务任务状态。' }, { id: 'profile', label: '用户长期偏好。' }, { id: 'all', label: '所有聊天原文。' }], correctOptionId: 'state', immediateFeedback: '对。它描述任务的逻辑阶段。', explanation: '任务状态和用户偏好解决的不是同一个问题。', sourceRefIds: ['page-080'] },
    { id: 'update', prompt: '用户说“我已经搬到上海”，旧记录还是“住在北京”，稳妥做法是什么？', options: [{ id: 'update', label: '核对后更新或标记旧记录，避免矛盾信息同时生效。' }, { id: 'both', label: '不加判断地永久保留两条互相冲突的当前事实。' }, { id: 'forget', label: '从此不再保存任何用户信息。' }], correctOptionId: 'update', immediateFeedback: '对。记忆更新需要处理新旧信息关系。', explanation: '长期记忆应可审查、可更新，而非无限堆叠。', sourceRefIds: ['page-080', 'figure-3-2'] },
  ],
  faq: [{ question: '是不是把所有聊天记录保存下来就够了？', answer: '不够。长期记忆强调选择、结构与更新；整段原文可能难以检索，也可能保留过期或无关信息。' }, { question: '越复杂的记忆格式越好吗？', answer: '不一定。原书强调简单性、表达力、更新与检索之间有取舍，应按信息用途选择。' }],
  relatedLessonIds: ['2-1', '2-2'],
}
