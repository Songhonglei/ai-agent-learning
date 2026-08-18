export const IDENTIFIER_SCENARIOS = [
  {
    id: 'draft',
    title: '润色一段通知',
    description: '系统根据你粘贴的文字，返回一版更清楚的通知。',
    correctId: 'chat',
    feedback: '它完成了一次文字生成；仅凭这段描述，还看不出它是否会围绕目标读取信息、调用工具并继续推进。',
  },
  {
    id: 'travel',
    title: '准备出差方案',
    description: '系统读取日历和差旅规则，查询候选行程，比较结果后整理方案，等待你确认。',
    correctId: 'agent',
    feedback: '它围绕目标读取信息、调用工具并根据返回结果推进任务，具备 Agent 工作方式。',
  },
  {
    id: 'label',
    title: '只写着“智能 Agent”',
    description: '产品页面只给出这个名称，没有描述它在具体任务中如何工作。',
    correctId: 'unknown',
    feedback: '产品名称不是充分证据；还需要了解它是否读取信息、行动并根据结果继续推进。',
  },
] as const

export type IdentifierAnswer = typeof IDENTIFIER_SCENARIOS[number]['correctId']

export function identifierSelectionId(scenarioId: string, answerId: IdentifierAnswer): string {
  return `${scenarioId}:${answerId}`
}

export function selectedIdentifierAnswer(selectedIds: string[], scenarioId: string): string | undefined {
  return selectedIds.find((id) => id.startsWith(`${scenarioId}:`))?.split(':')[1]
}

export function evaluateIdentifierSelection(selectedIds: string[]): { completed: number; correct: number } {
  const completed = IDENTIFIER_SCENARIOS.filter((scenario) => (
    selectedIdentifierAnswer(selectedIds, scenario.id) !== undefined
  ))
  const correct = completed.filter((scenario) => (
    selectedIdentifierAnswer(selectedIds, scenario.id) === scenario.correctId
  ))
  return { completed: completed.length, correct: correct.length }
}
