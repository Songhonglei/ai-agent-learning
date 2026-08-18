import { describe, expect, it } from 'vitest'
import {
  evaluateFormulaSelection,
  formulaSelectionId,
  selectedFormulaPart,
} from './agentFormulaBuilderState'

describe('agent formula builder logic', () => {
  it('matches a task item to LLM, context, or tools', () => {
    const selection = [
      formulaSelectionId('priority', 'llm'),
      formulaSelectionId('calendar', 'context'),
      formulaSelectionId('query', 'tools'),
    ]

    expect(selectedFormulaPart(selection, 'calendar')).toBe('context')
    expect(evaluateFormulaSelection(selection)).toEqual({ completed: 3, correct: 3 })
    expect(evaluateFormulaSelection([formulaSelectionId('priority', 'tools')]))
      .toEqual({ completed: 1, correct: 0 })
  })
})
