import type { Lesson } from '../shared/types/lesson'

export const lessonOne: Lesson = {
  id: '1-1',
  contentId: 'lesson-1-1',
  moduleId: 'module-1',
  title: 'Agent的记忆有边界',
  durationMinutes: 20,
  objectives: [
    '理解 Agent 在当前决策点只能使用当前上下文窗口中的信息。',
    '判断任务所需背景缺失时，为什么可能出现不符合约束的回答。',
    '在执行任务前先检查 Agent 此刻看得到什么。',
  ],
  sourceRefs: [
    {
      id: 'figure-2-1',
      pdfPage: 34,
      printedPage: 26,
      conclusion: '系统提示、用户消息、助手回复、工具调用及结果共同构成一次调用时可见的上下文；窗口有限，缺少关键信息或超出容量会导致判断失真。',
    },
    {
      id: 'page-035',
      pdfPage: 35,
      printedPage: 27,
      conclusion: '代码、流程和环境等任务背景会影响 Agent 在具体任务中的表现。',
    },
    {
      id: 'page-052',
      pdfPage: 52,
      printedPage: 44,
      conclusion: '缓存与稳定前缀会影响提示词组织、子 Agent 传参和会话恢复。',
      boundary: '这是生产级架构提醒，不进入本课互动判定或入门测验。',
    },
  ],
  steps: [
    {
      id: 'scene-intro',
      type: 'scene',
      content: '把“修复支付页异常”交给一位新同事：如果没有代码、团队流程和运行环境，他无法按当前约束开始判断。',
    },
    {
      id: 'dialogue-context',
      type: 'dialogue',
      speaker: 'hongshu',
      content: 'Agent 每次只能基于当前上下文窗口判断。规则、请求、既往回复和工具结果都可能在其中；它不只是聊天记录。窗口有限，缺少关键信息或超出容量会导致判断失真。',
    },
    {
      id: 'experiment-context-builder',
      type: 'experiment',
      content: '选择这次修复任务必须让 Agent 看见的上下文，再观察缺失信息会带来什么约束错误。',
      experimentId: 'context-builder',
      experimentKind: 'context-builder',
    },
    {
      id: 'quiz-context',
      type: 'quiz',
      content: '用三个情境判断：当前窗口是否具备完成任务所需的背景。',
    },
    {
      id: 'summary-check-visibility',
      type: 'summary',
      content: '先检查 Agent 此刻看得到什么。缺少代码、流程、环境或此前结果时，回答可能看似合理，却不符合当前任务约束。',
    },
    {
      id: 'free-question-faq',
      type: 'free-question',
      content: '先从本课审核 FAQ 快速核对，也可以继续向 AI 助教自由提问；回答会依据本课来源包并标注引用。',
    },
  ],
  quiz: [
    {
      id: 'missing-background',
      prompt: 'Agent 要修复异常，但当前窗口没有代码、团队流程和运行环境。最合适的判断是什么？',
      options: [
        { id: 'missing-context', label: '缺少任务背景，可能给出不符合当前约束的回答。' },
        { id: 'always-complete', label: '只要模型足够强，就能补齐全部任务背景。' },
        { id: 'more-instructions', label: '只要增加一条泛化指令，就不再需要这些背景。' },
      ],
      correctOptionId: 'missing-context',
      immediateFeedback: '对。任务所需背景不在当前上下文时，判断可能失真。',
      explanation: '先补齐代码、流程和环境等当前任务所需信息，再让 Agent 按约束分析。',
      sourceRefIds: ['page-035'],
    },
    {
      id: 'current-context',
      prompt: '下列哪组信息应根据任务需要进入当前上下文？',
      options: [
        { id: 'rules-request-history-tools', label: '规则、请求、既往回复以及相关工具调用和结果。' },
        { id: 'chat-only', label: '只有用户和助手的聊天记录。' },
        { id: 'unrelated-only', label: '与任务无关的信息，用来代替任务背景。' },
      ],
      correctOptionId: 'rules-request-history-tools',
      immediateFeedback: '对。上下文不只包含聊天记录。',
      explanation: '系统规则、用户请求、既往回复、工具调用及结果都会影响当前一次调用能看见什么。',
      sourceRefIds: ['figure-2-1', 'page-035'],
    },
    {
      id: 'information-quality',
      prompt: '同一 Agent 在信息充分与信息不足时表现不同，最贴近本课结论的原因是什么？',
      options: [
        { id: 'visible-information', label: '当前决策点可见的任务信息不同，约束判断也会不同。' },
        { id: 'fixed-personality', label: 'Agent 的人格在两次任务之间发生了变化。' },
        { id: 'unlimited-window', label: '上下文窗口总能自动保存全部所需信息。' },
      ],
      correctOptionId: 'visible-information',
      immediateFeedback: '对。当前可见信息不同，会改变任务约束是否可被正确判断。',
      explanation: '执行前先检查 Agent 此刻看得到什么，而不是把“忘记”理解成固定的人格问题。',
      sourceRefIds: ['figure-2-1', 'page-035'],
    },
  ],
  pretest: [
    {
      id: 'pretest-visible-context',
      prompt: '准备判断一个当前任务时，哪组材料可能属于 Agent 此刻可见的上下文？',
      options: [
        { id: 'task-context', label: '任务规则、用户请求、既往回复和相关工具结果。' },
        { id: 'latest-message', label: '只有最近一条用户消息，其他材料都不属于上下文。' },
        { id: 'unrelated-materials', label: '一批与当前任务无关的材料。' },
      ],
      correctOptionId: 'task-context',
      immediateFeedback: '对。当前上下文可以包含规则、请求、既往回复和工具结果。',
      explanation: '判断前应先确认完成当前任务所需的信息是否已经可见。',
      sourceRefIds: ['figure-2-1', 'page-035'],
    },
    {
      id: 'pretest-missing-background',
      prompt: 'Agent 接到修复支付页异常的任务，却没有代码、团队流程和运行环境。此时首先应怎样判断？',
      options: [
        { id: 'background-missing', label: '当前缺少必要任务背景，直接判断可能不符合任务约束。' },
        { id: 'ready-to-fix', label: '现有信息已经足够按团队约束完成修复。' },
        { id: 'generic-reminder', label: '只补一句“请认真分析”就等于补齐了任务背景。' },
      ],
      correctOptionId: 'background-missing',
      immediateFeedback: '对。缺少代码、流程和环境时，应先补齐任务所需背景。',
      explanation: '任务背景会限制 Agent 在具体任务中的判断是否符合当前约束。',
      sourceRefIds: ['page-035'],
    },
    {
      id: 'pretest-finite-window',
      prompt: '任务信息超出有限窗口，关键约束不再可见时，可能出现什么结果？',
      options: [
        { id: 'distorted-judgment', label: 'Agent 可能给出看似合理但不符合当前约束的判断。' },
        { id: 'automatic-recovery', label: '缺失的关键约束一定会自动回到当前窗口。' },
        { id: 'no-effect', label: '关键约束是否可见不会影响任务判断。' },
      ],
      correctOptionId: 'distorted-judgment',
      immediateFeedback: '对。有限窗口中的关键信息缺失可能导致判断失真。',
      explanation: 'Agent 只能基于当前决策点可见的信息进行判断。',
      sourceRefIds: ['figure-2-1'],
    },
  ],
  posttest: [
    {
      id: 'posttest-check-visibility',
      prompt: '让 Agent 执行一项带有明确流程约束的任务前，哪项检查最关键？',
      options: [
        { id: 'check-visible-information', label: '检查代码、流程、环境和相关结果此刻是否可见。' },
        { id: 'skip-background', label: '跳过任务背景，直接要求输出最终结论。' },
        { id: 'add-unrelated-context', label: '加入更多无关材料来代替缺失的任务信息。' },
      ],
      correctOptionId: 'check-visible-information',
      immediateFeedback: '对。执行前先检查 Agent 此刻看得到什么。',
      explanation: '当前任务所需背景可见，Agent 才能据此判断具体约束。',
      sourceRefIds: ['figure-2-1', 'page-035'],
    },
    {
      id: 'posttest-same-agent-different-context',
      prompt: '同一个 Agent 两次处理相同任务，一次信息充分、一次信息不足，表现为何可能不同？',
      options: [
        { id: 'different-visible-context', label: '两次当前可见的任务信息不同，约束判断也会不同。' },
        { id: 'context-does-not-matter', label: '当前可见信息不会影响具体任务表现。' },
        { id: 'task-changed', label: '只要表现不同，就说明任务本身一定已经改变。' },
      ],
      correctOptionId: 'different-visible-context',
      immediateFeedback: '对。当前决策点可见的信息会影响任务判断。',
      explanation: '信息充分与否会限制 Agent 在具体任务中的表现。',
      sourceRefIds: ['figure-2-1', 'page-035'],
    },
    {
      id: 'posttest-missing-tool-result',
      prompt: '当前窗口已有许多材料，但完成任务所需的工具结果没有被保留。应如何判断？',
      options: [
        { id: 'required-result-missing', label: '关键结果仍然缺失，Agent 可能无法按当前条件正确判断。' },
        { id: 'quantity-is-enough', label: '只要材料数量多，就一定具备完成任务的条件。' },
        { id: 'result-is-optional', label: '任务所需的工具结果是否可见都没有影响。' },
      ],
      correctOptionId: 'required-result-missing',
      immediateFeedback: '对。材料多不代表关键任务信息已经进入当前窗口。',
      explanation: '有限窗口中应优先确认任务所需背景和结果是否可见。',
      sourceRefIds: ['figure-2-1', 'page-035'],
    },
  ],
  faq: [
    {
      question: '为什么 Agent 会“忘记”重要信息？',
      answer: '在当前决策点，任务所需信息没有进入上下文窗口时，Agent 就拿不到它来判断。',
    },
    {
      question: '是不是把上下文放得越多越好？',
      answer: '本课只要求先确认当前任务需要的信息是否可见；不把“上下文越长越好”当作结论。',
    },
  ],
  relatedLessonIds: ['1-2', '1-3'],
}
