import { describe, expect, it } from 'vitest'
import {
  evaluateIdentifierSelection,
  identifierSelectionId,
  selectedIdentifierAnswer,
} from './agentIdentifierState'

describe('agent identifier logic', () => {
  it('tracks each scenario and scores only evidence-based judgments', () => {
    const selection = [
      identifierSelectionId('draft', 'chat'),
      identifierSelectionId('travel', 'agent'),
      identifierSelectionId('label', 'unknown'),
    ]

    expect(selectedIdentifierAnswer(selection, 'travel')).toBe('agent')
    expect(evaluateIdentifierSelection(selection)).toEqual({ completed: 3, correct: 3 })
    expect(evaluateIdentifierSelection([identifierSelectionId('draft', 'agent')]))
      .toEqual({ completed: 1, correct: 0 })
  })
})
