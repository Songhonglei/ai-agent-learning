export const REQUIRED_CONTEXT_IDS = [
  'code-context',
  'workflow-constraint',
  'environment-context',
] as const

type RequiredContextId = typeof REQUIRED_CONTEXT_IDS[number]

const missingContextFeedback: Record<RequiredContextId, string> = {
  'code-context': '代码上下文缺失：可能误判现有实现和错误位置。',
  'workflow-constraint': '流程约束缺失：可能绕过评审、测试或发布流程。',
  'environment-context': '环境上下文缺失：可能使用不兼容的依赖或运行方式。',
}

export function evaluateContextSelection(selectedIds: string[]): {
  status: 'ready' | 'missing'
  missingIds: string[]
  message: string
} {
  const selected = new Set(selectedIds)
  const missingIds = REQUIRED_CONTEXT_IDS.filter((id) => !selected.has(id))

  if (missingIds.length === 0) {
    return {
      status: 'ready',
      missingIds: [],
      message: '必要的代码、流程和环境背景已齐全，可以继续分析；这只说明背景已具备，不代表结论一定正确。',
    }
  }

  return {
    status: 'missing',
    missingIds,
    message: missingIds.map((id) => missingContextFeedback[id]).join(' '),
  }
}
