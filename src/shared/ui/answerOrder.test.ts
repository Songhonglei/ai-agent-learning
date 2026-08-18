import { describe, expect, it } from 'vitest'
import { spreadCorrectOption, stableShuffle } from './answerOrder'

const options = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
] as const

describe('answer order', () => {
  it('keeps an item order stable for a given seed', () => {
    expect(stableShuffle(options, 'quiz:0-1')).toEqual(stableShuffle(options, 'quiz:0-1'))
  })

  it('spreads correct answers across a three-question group', () => {
    const positions = ['a', 'b', 'c'].map((correctId, index) => (
      spreadCorrectOption(options, correctId, 'lesson:quiz', index)
        .findIndex((option) => option.id === correctId)
    ))
    expect(new Set(positions)).toHaveLength(3)
  })
})
