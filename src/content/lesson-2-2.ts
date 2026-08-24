import type { Lesson } from '../shared/types/lesson'

export const lessonTwoTwo: Lesson = {
  id: '2-2', contentId: 'lesson-2-2', moduleId: 'module-2', title: 'RAG：给AI装上“公司内网”', durationMinutes: 18,
  objectives: ['理解 RAG 先检索、再增强、后生成的基本过程。', '知道企业知识库为当前问题提供受维护的资料。', '判断适合使用 RAG 的办公场景。'],
  sourceRefs: [
    { id: 'outline-087-076', pdfPage: 87, printedPage: 79, conclusion: 'RAG 是为 Agent 构建知识获取管道的基础主题。' },
    { id: 'page-088', pdfPage: 88, printedPage: 80, conclusion: 'RAG 可以先取回外部知识片段，并把它们作为上下文供模型生成回答。' },
    { id: 'page-089', pdfPage: 89, printedPage: 81, conclusion: 'RAG 查询过程可概括为检索、增强与生成：先找相关材料，再连同问题组织上下文，最后生成回答。' },
  ],
  steps: [
    { id: 'scene-rag', type: 'scene', content: '同事问“新供应商怎么准入”，答案不该靠 AI 猜。更合理的做法是先从公司的采购制度里找到相关条款，再根据条款解释下一步。' },
    { id: 'dialogue-rag', type: 'dialogue', speaker: 'hongshu', content: 'RAG 可以把它理解为“给当前问题带资料”：先检索相关文档，再把问题和文档片段一起交给模型组织回答。它不是把整个公司网盘塞进模型，也不是替代资料维护。' },
    { id: 'experiment-retrieval', type: 'experiment', content: '为三个办公问题选择最相关的虚构公司资料，体验“先找对资料，再组织回答”的第一步。', experimentId: 'knowledge-retrieval', experimentKind: 'knowledge-retrieval' },
    { id: 'quiz-rag', type: 'quiz', content: '用三个情境判断 RAG 的角色和适用边界。' },
    { id: 'summary-rag', type: 'summary', content: 'RAG 的价值在于让当前回答有机会基于相关、受维护的资料；能否可信，还取决于资料质量、检索相关性和使用方式。' },
    { id: 'faq-rag', type: 'free-question', content: '先从本课审核 FAQ 快速核对，也可以继续向 AI 助教自由提问；回答会依据本课来源包并标注引用。' },
  ],
  quiz: [
    { id: 'order', prompt: 'RAG 的基本工作顺序最接近哪项？', options: [{ id: 'rag', label: '先检索相关资料，组织进上下文，再生成回答。' }, { id: 'all', label: '先生成答案，再寻找能支持它的资料。' }, { id: 'training', label: '把每份公司文档都重新训练进模型参数。' }], correctOptionId: 'rag', immediateFeedback: '对。RAG 是检索、增强、生成的过程。', explanation: '检索到的相关资料被带入当前问题的上下文。', sourceRefIds: ['page-089'] },
    { id: 'use-case', prompt: '下列哪类任务最适合优先考虑 RAG？', options: [{ id: 'policy', label: '根据持续维护的内部制度回答流程问题。' }, { id: 'poem', label: '给一段已提供文字润色语气。' }, { id: 'magic', label: '要求系统无需资料也保证所有事实正确。' }], correctOptionId: 'policy', immediateFeedback: '对。需要组织内、可维护资料支撑的问题适合检索。', explanation: 'RAG 用于知识获取，不是对所有任务的强制步骤。', sourceRefIds: ['outline-087-076', 'page-088'] },
    { id: 'boundary', prompt: '对 RAG 的哪种理解更稳妥？', options: [{ id: 'boundary', label: '它帮助取回资料，但不替代资料更新和结果核对。' }, { id: 'perfect', label: '接入知识库后答案会自动绝对正确。' }, { id: 'all-files', label: '必须一次塞入所有文件才算 RAG。' }], correctOptionId: 'boundary', immediateFeedback: '对。资料、检索与生成都要被检查。', explanation: 'RAG 把相关片段加入上下文，不能绕过知识治理。', sourceRefIds: ['page-088', 'page-089'] },
  ],
  faq: [{ question: 'RAG 是不是企业网盘？', answer: '不是。企业资料是知识来源；RAG 是围绕当前问题检索相关片段并用于回答的过程。' }, { question: '为什么不把所有文档都放进一次提示词？', answer: '当前任务只需要相关资料。大量无关内容会增加判断负担，也不能代替检索与治理。' }],
  relatedLessonIds: ['2-1', '2-3'],
}
