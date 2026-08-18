import { describe, expect, it } from 'vitest'
import {
  correctTeacherFeedback,
  incorrectTeacherFeedback,
  teacherFeedback,
} from './teacherFeedback'

describe('teacher feedback', () => {
  it('keeps at least fifteen varied phrases for both outcomes', () => {
    expect(correctTeacherFeedback).toHaveLength(18)
    expect(incorrectTeacherFeedback).toHaveLength(18)
    expect(new Set(correctTeacherFeedback).size).toBe(correctTeacherFeedback.length)
    expect(new Set(incorrectTeacherFeedback).size).toBe(incorrectTeacherFeedback.length)
  })

  it('assigns a stable varied phrase to each learning interaction', () => {
    expect(teacherFeedback('formula:calendar:context', true))
      .toBe(teacherFeedback('formula:calendar:context', true))
    expect(teacherFeedback('formula:calendar:tools', false))
      .toBe(teacherFeedback('formula:calendar:tools', false))
  })
})
