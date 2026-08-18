import { describe, expect, it } from 'vitest'
import { mentorQuotes, randomMentorQuote } from './mentorQuotes'

describe('mentor quotes', () => {
  it('keeps a varied quote library and selects within its bounds', () => {
    expect(mentorQuotes).toHaveLength(20)
    expect(new Set(mentorQuotes).size).toBe(mentorQuotes.length)
    expect(randomMentorQuote(() => 0)).toBe(mentorQuotes[0])
    expect(randomMentorQuote(() => 0.9999)).toBe(mentorQuotes.at(-1))
  })
})
