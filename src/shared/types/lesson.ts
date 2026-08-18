export type LessonStepType =
  | 'scene'
  | 'dialogue'
  | 'experiment'
  | 'quiz'
  | 'summary'
  | 'free-question'

export interface LessonProgress {
  currentStepId: string
  completedStepIds: string[]
  selectedContextIds: string[]
  answers: Record<string, string>
  theme: 'light' | 'dark'
}

export interface SourceRef {
  id: string
  pdfPage: number
  printedPage: number
  conclusion: string
  boundary?: string
}

export interface StepOption {
  id: string
  label: string
}

export interface LessonStep {
  id: string
  type: LessonStepType
  speaker?: 'hongshu' | 'learner' | 'system'
  content: string
  options?: StepOption[]
  experimentId?: string
  experimentKind?: 'context-builder' | 'agent-identifier' | 'agent-formula-builder' | 'prompt-compare' | 'prompt-safety' | 'knowledge-freshness' | 'knowledge-retrieval' | 'memory-layers' | 'tool-chain' | 'react-cycle' | 'evaluation-case' | 'collaboration-case'
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: StepOption[]
  correctOptionId: string
  immediateFeedback: string
  explanation: string
  sourceRefIds: SourceRef['id'][]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface Lesson {
  id: string
  contentId: string
  moduleId: string
  title: string
  durationMinutes: number
  objectives: string[]
  sourceRefs: SourceRef[]
  steps: LessonStep[]
  quiz: QuizQuestion[]
  pretest?: QuizQuestion[]
  posttest?: QuizQuestion[]
  faq: FaqItem[]
  relatedLessonIds: string[]
}
