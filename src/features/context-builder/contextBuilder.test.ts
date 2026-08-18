import { describe, expect, it } from 'vitest'
import { evaluateContextSelection, REQUIRED_CONTEXT_IDS } from './contextBuilder.ts'

describe('evaluateContextSelection', () => {
  it('reports ready only when the code, workflow, and environment contexts are selected', () => {
    expect([...REQUIRED_CONTEXT_IDS]).toEqual([
      'code-context',
      'workflow-constraint',
      'environment-context',
    ])

    expect(evaluateContextSelection([
      'code-context',
      'workflow-constraint',
      'environment-context',
    ])).toEqual({
      status: 'ready',
      missingIds: [],
      message: '必要的代码、流程和环境背景已齐全，可以继续分析；这只说明背景已具备，不代表结论一定正确。',
    })
  })

  it.each([
    ['code-context', '代码上下文', '错误位置'],
    ['workflow-constraint', '流程约束', '评审、测试或发布流程'],
    ['environment-context', '环境上下文', '不兼容的依赖或运行方式'],
  ])('names the missing %s block and its constraint risk', (missingId, label, risk) => {
    const result = evaluateContextSelection(
      REQUIRED_CONTEXT_IDS.filter((id) => id !== missingId),
    )

    expect(result.status).toBe('missing')
    expect(result.missingIds).toEqual([missingId])
    expect(result.message).toContain(label)
    expect(result.message).toContain(risk)
  })

  it('ignores irrelevant information when deciding whether requirements are met', () => {
    const requiredOnly = evaluateContextSelection(['code-context'])
    const withIrrelevantInformation = evaluateContextSelection([
      'code-context',
      'last-year-roadmap',
      'team-lunch-menu',
    ])

    expect(withIrrelevantInformation).toEqual(requiredOnly)
  })
})
