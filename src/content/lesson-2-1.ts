import type { Lesson } from '../shared/types/lesson'

export const lessonTwoOne: Lesson = {
  id: '2-1', contentId: 'lesson-2-1', moduleId: 'module-2', title: 'AI为什么不知道昨天的新闻', durationMinutes: 16,
  objectives: ['理解模型已有知识与实时、组织特有资料的区别。', '判断何时应先查阅可信资料。', '知道知识库需要维护时效和来源。'],
  sourceRefs: [
    { id: 'page-088', pdfPage: 88, printedPage: 80, conclusion: '基座模型的训练资料可能不包含最新进展；检索可把外部资料带入当前回答所需的上下文。' },
    { id: 'outline-100-085', pdfPage: 100, printedPage: 92, conclusion: '知识库的时效与治理是长期使用知识检索时需要处理的主题。' },
    { id: 'page-078', pdfPage: 78, printedPage: 70, conclusion: '用户个体记忆与面向所有用户的共享知识库尺度不同，但都会面临知识过期与检索不准的问题。' },
  ],
  steps: [
    { id: 'scene-freshness', type: 'scene', content: '你问“本公司这周的差旅报销标准是什么”，AI 给出一段流畅答案。但这类规则会更新，流畅不等于它引用的是当前版本。' },
    { id: 'dialogue-freshness', type: 'dialogue', speaker: 'hongshu', content: '模型学到的通用知识像一份旧参考书；它可以解释概念，却未必知道昨天发生的事或你们公司刚更新的制度。需要准确、时效或组织内部依据时，应先取回受维护的资料。' },
    { id: 'experiment-freshness', type: 'experiment', content: '判断三类问题：哪些可以主要依靠通用知识，哪些必须先连接可信、已维护的资料。', experimentId: 'knowledge-freshness', experimentKind: 'knowledge-freshness' },
    { id: 'quiz-freshness', type: 'quiz', content: '用三个情境判断何时需要检索支持。' },
    { id: 'summary-freshness', type: 'summary', content: '不是所有问题都要检索；但实时变化、组织特有或需要精确出处的问题，不能把模型已有知识当作当前事实。' },
    { id: 'faq-freshness', type: 'free-question', content: '先从本课审核 FAQ 快速核对，也可以继续向 AI 助教自由提问；回答会依据本课来源包并标注引用。' },
  ],
  quiz: [
    { id: 'current-policy', prompt: '要回答“本周生效的报销规则”，最稳妥的第一步是什么？', options: [{ id: 'retrieve', label: '先查阅已维护的公司规则资料。' }, { id: 'guess', label: '直接把通用印象当作当前规则。' }, { id: 'old', label: '只凭模型训练时期的知识作答。' }], correctOptionId: 'retrieve', immediateFeedback: '对。时效性和组织特有信息需要可信资料支撑。', explanation: '模型已有知识不等于当前、组织内的真实版本。', sourceRefIds: ['page-088', 'outline-100-085'] },
    { id: 'provided-material', prompt: '用户已经提供了一段需要概括的项目背景，是否必然还要检索外部知识库？', options: [{ id: 'no', label: '不必然；先处理已经提供且足够的材料。' }, { id: 'always', label: '任何问题都必须先检索。' }, { id: 'never', label: '检索资料永远没有价值。' }], correctOptionId: 'no', immediateFeedback: '对。检索应服务于缺少、时效或需验证的信息。', explanation: '是否检索取决于任务需要，而不是固定仪式。', sourceRefIds: ['page-088'] },
    { id: 'governance', prompt: '知识库长期使用时，哪项风险需要被持续处理？', options: [{ id: 'stale', label: '资料过期或检索结果不准确。' }, { id: 'perfect', label: '入库后资料会自动永远正确。' }, { id: 'same', label: '所有用户资料和公司资料没有区别。' }], correctOptionId: 'stale', immediateFeedback: '对。知识库需要时效与治理。', explanation: '共享知识与用户记忆的尺度不同，但都可能遇到过期和检索不准。', sourceRefIds: ['outline-100-085', 'page-078'] },
  ],
  faq: [{ question: 'RAG 会让答案永远正确吗？', answer: '不会。它只能把检索到的资料带入当前上下文；资料是否最新、是否相关、是否被正确使用仍要检查。' }, { question: '训练数据截止日期是唯一问题吗？', answer: '不是。组织内部资料、权限边界、资料更新和检索准确性同样会影响回答是否可靠。' }],
  relatedLessonIds: ['2-2', '2-3'],
}
