export interface LearningMapLesson {
  id: string
  title: string
  introduction: string
}

export interface LearningMapModule {
  id: string
  title: string
  lessons: LearningMapLesson[]
}

export interface LearningMapNode {
  id: string
  title: string
  lessonIds: string[]
}

export const learningMapModules: LearningMapModule[] = [
  {
    id: 'module-0',
    title: '破冰与基础认知',
    lessons: [
      {
        id: '0-1',
        title: '你已经在用Agent了',
        introduction: '从日常 Agent 体验出发，认识这些工具如何围绕目标推进任务。',
      },
      {
        id: '0-2',
        title: '三句话理解Agent',
        introduction: '用简明轮廓认识 Agent 的目标、行动和反馈。',
      },
    ],
  },
  {
    id: 'module-1',
    title: 'Agent如何"看世界"',
    lessons: [
      {
        id: '1-1',
        title: 'Agent的记忆有边界',
        introduction: '通过一个修复任务，认识当前上下文如何影响 Agent 的判断。',
      },
      {
        id: '1-2',
        title: '给Agent下命令的艺术',
        introduction: '认识清晰指令如何帮助 Agent 理解目标、流程和边界。',
      },
      {
        id: '1-3',
        title: 'Agent的眼睛会被蒙蔽',
        introduction: '了解输入信息受限时，Agent 为什么可能形成不完整判断。',
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Agent如何"记事和找资料"',
    lessons: [
      {
        id: '2-1',
        title: 'AI为什么不知道昨天的新闻',
        introduction: '认识知识时效与当前可见信息之间的关系。',
      },
      {
        id: '2-2',
        title: 'RAG：给AI装上"公司内网"',
        introduction: '了解检索如何把组织资料带入当前任务。',
      },
      {
        id: '2-3',
        title: 'Agent怎么记住"你是谁"',
        introduction: '区分当前对话信息与可持续保存的用户信息。',
      },
    ],
  },
  {
    id: 'module-3',
    title: 'Agent如何"动手"',
    lessons: [
      {
        id: '3-1',
        title: 'Agent的工具箱',
        introduction: '认识 Agent 调用外部能力完成任务的基本方式。',
      },
      {
        id: '3-2',
        title: '思考→行动→观察，再循环',
        introduction: '了解思考、行动和观察如何组成任务循环。',
      },
    ],
  },
  {
    id: 'module-4',
    title: '评估与多Agent',
    lessons: [
      {
        id: '4-1',
        title: '怎么判断AI产品做得好不好',
        introduction: '从目标、结果与过程三个方面认识评估。',
      },
      {
        id: '4-2',
        title: '多个Agent怎么协作',
        introduction: '认识多个 Agent 分工协作时的基本结构。',
      },
    ],
  },
]

export const learningMapLessonIds = learningMapModules.flatMap((module) =>
  module.lessons.map((lesson) => lesson.id),
)

export const learningMapNodes: LearningMapNode[] = [
  { id: 'know-agent', title: '认识 Agent', lessonIds: ['0-1', '0-2'] },
  { id: 'understand-context', title: '看懂上下文', lessonIds: ['1-1', '1-2', '1-3'] },
  { id: 'memory-and-knowledge', title: '记忆与知识', lessonIds: ['2-1', '2-2', '2-3'] },
  { id: 'tools-and-action', title: '工具与行动', lessonIds: ['3-1', '3-2'] },
  { id: 'evaluate-agent', title: '评估 Agent', lessonIds: ['4-1'] },
  { id: 'multi-agent', title: '多 Agent', lessonIds: ['4-2'] },
]

export const fullyAuthoredLessonIds = authoredLessons.map((lesson) => lesson.id)
import { authoredLessons } from './lessons'
