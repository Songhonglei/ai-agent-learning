import type { Lesson } from '../shared/types/lesson'

export const lessonZeroOne: Lesson = {
  id: '0-1',
  contentId: 'lesson-0-1',
  moduleId: 'module-0',
  title: '你已经在用 Agent 了',
  durationMinutes: 15,
  objectives: [
    '从日常任务中识别 Agent 的工作方式。',
    '区分单次聊天回答与围绕目标推进任务的系统。',
    '知道产品名称或聊天界面本身不足以证明它一定是 Agent。',
  ],
  sourceRefs: [
    {
      id: 'page-015',
      pdfPage: 15,
      printedPage: 7,
      conclusion: '原书列举代码协作、研究、浏览器和手机任务等形态；共同点是自主规划步骤、调用多种工具，并根据结果持续调整策略。',
    },
    {
      id: 'page-016',
      pdfPage: 16,
      printedPage: 8,
      conclusion: '不同 Agent 会读取不同环境信息、使用不同手段行动，并形成“理解需求 → 行动 → 根据结果继续”的任务策略。',
    },
    {
      id: 'page-019',
      pdfPage: 19,
      printedPage: 11,
      conclusion: 'Agent 可以在当前任务内根据上下文即时调整行为。',
      boundary: '外部制品更新和模型参数更新属于后续课程的技术内容，本课不展开。',
    },
  ],
  steps: [
    {
      id: 'scene-daily-agent',
      type: 'scene',
      content: '同样是“帮我准备下周出差”：一个工具只写出一封邮件草稿；另一个会读取日历和差旅规则、查询可选行程、根据结果整理方案，再等待你确认下一步。你很可能已经在使用后者的工作方式。',
    },
    {
      id: 'dialogue-agent-workflow',
      type: 'dialogue',
      speaker: 'hongshu',
      content: '别急着看产品名字。判断一个系统是不是在按 Agent 的方式工作，要看它是否围绕目标读取相关信息、调用工具行动、查看结果，并继续调整下一步。它不是只被动地“一问一答”。',
    },
    {
      id: 'experiment-agent-identifier',
      type: 'experiment',
      content: '读完每个场景的行为描述，再判断它是“仅聊天回答”“具备 Agent 工作方式”还是“信息不足，不能断定”。',
      experimentId: 'agent-identifier',
      experimentKind: 'agent-identifier',
    },
    {
      id: 'quiz-agent-identifier',
      type: 'quiz',
      content: '用三个情境，把产品标签和实际工作方式分开判断。',
    },
    {
      id: 'summary-agent-signals',
      type: 'summary',
      content: '认 Agent，看的是任务过程：有目标、看得到相关信息、能使用手段、会根据结果继续推进。只有聊天窗口或“Agent”标签，都不足以下结论。',
    },
    {
      id: 'free-question-faq',
      type: 'free-question',
      content: '自由提问目前只提供本课审核过的 FAQ；模型服务尚未启用。',
    },
  ],
  quiz: [
    {
      id: 'single-answer-or-workflow',
      prompt: '用户让系统“把这段会议纪要润色得更清楚”，系统只返回一版改写文本。根据本课，最合适的判断是什么？',
      options: [
        { id: 'single-answer', label: '这是一次聊天回答；仅凭这一行为还看不出它是否在按 Agent 方式推进任务。' },
        { id: 'always-agent', label: '只要系统使用 AI 生成文字，就一定是 Agent。' },
        { id: 'never-useful', label: '不是 Agent 的系统就没有任何办公价值。' },
      ],
      correctOptionId: 'single-answer',
      immediateFeedback: '对。单次生成文字本身不足以证明它正在围绕目标推进多步任务。',
      explanation: '本课区分的是当前任务中的工作方式，不是给产品贴高低标签。',
      sourceRefIds: ['page-015'],
    },
    {
      id: 'feedback-loop',
      prompt: '一个系统读取项目资料、调用检索和日历工具、根据返回结果调整候选方案，再请用户确认。哪项最能说明它具备 Agent 工作方式？',
      options: [
        { id: 'goal-tools-feedback', label: '它围绕目标读取信息、使用工具，并根据结果继续调整。' },
        { id: 'chat-window', label: '它恰好有一个聊天窗口。' },
        { id: 'product-label', label: '产品说明中写了“智能”。' },
      ],
      correctOptionId: 'goal-tools-feedback',
      immediateFeedback: '对。信息、行动和反馈共同构成持续推进任务的过程。',
      explanation: '是否为 Agent 工作方式取决于可观察的任务推进过程，不取决于界面或名称。',
      sourceRefIds: ['page-015', 'page-016'],
    },
    {
      id: 'insufficient-evidence',
      prompt: '某产品自称“下一代 Agent”，但只说明它能和你聊天，没有说明它如何获取任务信息、使用什么手段或是否会依据结果继续推进。最严谨的判断是什么？',
      options: [
        { id: 'need-behavior', label: '信息不足；还需要看它在具体任务中的实际工作方式。' },
        { id: 'label-is-proof', label: '产品名称已经足以证明它是 Agent。' },
        { id: 'chat-disproves', label: '只要能聊天，就一定不是 Agent。' },
      ],
      correctOptionId: 'need-behavior',
      immediateFeedback: '对。产品标签和聊天界面都不是充分证据。',
      explanation: '回到目标、信息、行动和反馈，才能判断任务是否在被持续推进。',
      sourceRefIds: ['page-015', 'page-016'],
    },
  ],
  faq: [
    {
      question: '有聊天窗口的工具一定不是 Agent 吗？',
      answer: '不一定。聊天窗口只是交互界面；要看它在具体任务中会不会读取信息、使用工具，并根据结果继续推进。',
    },
    {
      question: 'Agent 会不会绕过我的确认直接办事？',
      answer: '工具能做什么仍受权限和产品边界约束。涉及外部行动时，应以清晰授权和确认机制为前提。',
    },
  ],
  relatedLessonIds: ['0-2', '3-2'],
}
