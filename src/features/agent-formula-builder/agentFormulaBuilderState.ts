export const FORMULA_ITEMS = [
  { id: 'priority', label: '比较参会人优先级并决定下一步', correctPart: 'llm' },
  { id: 'calendar', label: '参会人日历和已确认的会议结果', correctPart: 'context' },
  { id: 'rules', label: '会议时长、时区和组织规则', correctPart: 'context' },
  { id: 'query', label: '查询成员空闲时间', correctPart: 'tools' },
  { id: 'invite', label: '生成并发送待确认邀请', correctPart: 'tools' },
  { id: 'plan', label: '在冲突出现后调整候选方案', correctPart: 'llm' },
] as const

export type FormulaPart = 'llm' | 'context' | 'tools'

export function formulaSelectionId(itemId: string, part: FormulaPart): string {
  return `${itemId}:${part}`
}

export function selectedFormulaPart(selectedIds: string[], itemId: string): string | undefined {
  return selectedIds.find((id) => id.startsWith(`${itemId}:`))?.split(':')[1]
}

export function evaluateFormulaSelection(selectedIds: string[]): { completed: number; correct: number } {
  const completed = FORMULA_ITEMS.filter((item) => selectedFormulaPart(selectedIds, item.id) !== undefined)
  const correct = completed.filter((item) => selectedFormulaPart(selectedIds, item.id) === item.correctPart)
  return { completed: completed.length, correct: correct.length }
}
