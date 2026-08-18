import { describe, expect, it } from 'vitest'
import { spreadCorrectOption } from '../shared/ui/answerOrder'
import { authoredLessons } from './lessons'

function correctPositions(
  questions: NonNullable<(typeof authoredLessons)[number]['quiz']>,
  seed: string,
): number[] {
  return questions.map((question, index) => (
    spreadCorrectOption(question.options, question.correctOptionId, seed, index)
      .findIndex((option) => option.id === question.correctOptionId)
  ))
}

describe('course answer order', () => {
  it('spreads each course quiz across answer positions without changing its correct option', () => {
    for (const lesson of authoredLessons) {
      const positions = correctPositions(lesson.quiz, `${lesson.id}:quiz`)
      expect(new Set(positions).size, lesson.id).toBe(Math.min(lesson.quiz.length, 3))
    }
  })
})
