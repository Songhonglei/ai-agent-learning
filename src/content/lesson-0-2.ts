import type { Lesson } from '../shared/types/lesson'

export const lessonZeroTwo: Lesson = {
  id: '0-2',
  contentId: 'lesson-0-2',
  moduleId: 'module-0',
  title: '三句话理解 Agent',
  durationMinutes: 18,
  objectives: [
    '说出 Agent = LLM + 上下文 + 工具。',
    '用大脑、眼睛、手脚解释三部分各自的作用。',
    '在一个办公任务中拆分“想什么、看什么、做什么”。',
  ],
  sourceRefs: [
    {
      id: 'figure-0-1',
      pdfPage: 10,
      printedPage: 2,
      conclusion: 'Agent 由 LLM（大脑）、上下文（眼睛）和工具（手脚）构成；三者共同作用于 Agent。',
    },
    {
      id: 'page-015',
      pdfPage: 15,
      printedPage: 7,
      conclusion: 'LLM 负责理解、思考、规划和决策；上下文提供当前可见信息；工具把决策转成对外部世界的行动。',
    },
    {
      id: 'page-020',
      pdfPage: 20,
      printedPage: 12,
      conclusion: '工具定义、历史记录和工具结果等共同影响 Agent 能否连贯推进任务。',
    },
  ],
  steps: [
    {
      id: 'scene-three-parts',
      type: 'scene',
      content: '把“为团队找一个都能参加的会议时间”交给 Agent：它得先理解优先级，再看成员日历和会议规则，最后查询空档、生成待确认邀请。这三件事恰好对应大脑、眼睛和手脚。',
    },
    {
      id: 'dialogue-agent-formula',
      type: 'dialogue',
      speaker: 'hongshu',
      content: '三句话记住：LLM 是大脑，负责理解和决定下一步；上下文是眼睛，提供此刻能看到的任务信息；工具是手脚，把决定变成查询、操作或沟通。Agent = LLM + 上下文 + 工具。',
    },
    {
      id: 'experiment-formula-builder',
      type: 'experiment',
      content: '把会议安排任务里的六项内容放回正确位置：大脑、眼睛或手脚。',
      experimentId: 'agent-formula-builder',
      experimentKind: 'agent-formula-builder',
    },
    {
      id: 'quiz-agent-formula',
      type: 'quiz',
      content: '用三个题检查：你能不能把任务里的信息、判断和行动分开。',
    },
    {
      id: 'summary-three-parts',
      type: 'summary',
      content: 'Agent 不是单一模型。大脑负责想下一步，眼睛提供此刻需要的信息，手脚把决定落实为行动；行动结果还会成为下一步要看的信息。',
    },
    {
      id: 'free-question-faq',
      type: 'free-question',
      content: '自由提问目前只提供本课审核过的 FAQ；模型服务尚未启用。',
    },
  ],
  quiz: [
    {
      id: 'brain-mapping',
      prompt: '在“安排会议”任务中，比较参会人优先级并决定先找哪些时间，最对应哪一部分？',
      options: [
        { id: 'llm', label: 'LLM（大脑）' },
        { id: 'context', label: '上下文（眼睛）' },
        { id: 'tools', label: '工具（手脚）' },
      ],
      correctOptionId: 'llm',
      immediateFeedback: '对。理解条件并决定下一步，是大脑承担的工作。',
      explanation: 'LLM 在当前信息基础上理解请求、思考并决定下一步。',
      sourceRefIds: ['figure-0-1', 'page-015'],
    },
    {
      id: 'context-mapping',
      prompt: '参会人日历、会议规则和已经确认的结果，最应该归为哪一部分？',
      options: [
        { id: 'context', label: '上下文（眼睛）' },
        { id: 'llm', label: 'LLM（大脑）' },
        { id: 'tools', label: '工具（手脚）' },
      ],
      correctOptionId: 'context',
      immediateFeedback: '对。这些都是当前决策时需要看见的信息。',
      explanation: '上下文不只是用户刚输入的一句话，也包括任务进展和已经得到的结果。',
      sourceRefIds: ['figure-0-1', 'page-015', 'page-020'],
    },
    {
      id: 'tool-result-mapping',
      prompt: 'Agent 已经调用日历查询，但当前看不到查询结果。最贴近本课证据的判断是什么？',
      options: [
        { id: 'result-matters', label: '缺少行动结果，可能无法可靠决定下一步，甚至重复操作。' },
        { id: 'result-irrelevant', label: '只要调用过工具，结果是否可见都不重要。' },
        { id: 'tool-is-brain', label: '工具会自动替代大脑完成所有判断。' },
      ],
      correctOptionId: 'result-matters',
      immediateFeedback: '对。行动结果会回到当前可见信息，帮助 Agent 决定下一步。',
      explanation: '原书消融实验显示，缺少工具结果会让 Agent 盲目执行，可能陷入循环。',
      sourceRefIds: ['page-020'],
    },
  ],
  faq: [
    {
      question: '上下文是不是只有聊天记录？',
      answer: '不是。当前任务可见的环境信息、规则、历史、任务进展和工具结果都可能属于上下文。',
    },
    {
      question: '有了工具，Agent 就一定能把事办好吗？',
      answer: '不一定。它还需要理解任务、看见必要信息，并在权限和产品边界内正确使用工具。',
    },
  ],
  relatedLessonIds: ['0-1', '1-1', '3-1'],
}
