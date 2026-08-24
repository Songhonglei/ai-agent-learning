import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import { createEmptyProfile, type LearningProfile } from '../../shared/types/profile'
import { LessonPlayer } from '../lesson-player/LessonPlayer'

function quizProfile(): LearningProfile {
  const profile = createEmptyProfile()
  return {
    ...profile,
    courses: {
      ...profile.courses,
      [lessonOne.id]: {
        ...profile.courses[lessonOne.id],
        currentStepId: 'quiz-context',
        completedStepIds: [
          'scene-intro',
          'dialogue-context',
          'experiment-context-builder',
        ],
      },
    },
  }
}

function QuizLessonHarness({ onChange }: { onChange?: (profile: LearningProfile) => void }) {
  const [profile, setProfile] = useState(quizProfile)

  function updateProfile(next: LearningProfile) {
    setProfile(next)
    onChange?.(next)
  }

  return (
    <LessonPlayer
      lesson={lessonOne}
      courseProgress={profile.courses[lessonOne.id]}
      profile={profile}
      onProfileChange={updateProfile}
    />
  )
}

describe('Quiz', () => {
  afterEach(cleanup)

  it('keeps all three source-bounded scenario questions in the lesson', () => {
    render(<QuizLessonHarness />)

    const quiz = screen.getByRole('region', { name: '三道情境测验' })
    expect(within(quiz).getAllByRole('group')).toHaveLength(3)
    for (const question of lessonOne.quiz) {
      expect(within(quiz).getByRole('group', {
        name: (accessibleName) => accessibleName.endsWith(question.prompt),
      })).toBeInTheDocument()
    }
  })

  it('records one stable wrong-answer entry and retains it after a correct retry', async () => {
    const user = userEvent.setup()
    let latestProfile = quizProfile()
    render(<QuizLessonHarness onChange={(profile) => { latestProfile = profile }} />)

    await user.click(screen.getByRole('radio', {
      name: '只要模型足够强，就能补齐全部任务背景。',
    }))
    await user.click(screen.getByRole('radio', {
      name: '只要增加一条泛化指令，就不再需要这些背景。',
    }))

    expect(latestProfile.wrongAnswers).toHaveLength(1)
    expect(latestProfile.wrongAnswers[0]).toMatchObject({
      lessonId: '1-1',
      questionId: 'missing-background',
      selectedOptionId: 'more-instructions',
      sourceRefIds: ['page-035'],
      mastered: false,
    })

    await user.click(screen.getByRole('radio', {
      name: '缺少任务背景，可能给出不符合当前约束的回答。',
    }))

    expect(latestProfile.wrongAnswers).toHaveLength(1)
    expect(latestProfile.wrongAnswers[0].selectedOptionId).toBe('more-instructions')
  })

  it('gives all three feedback levels after a wrong answer and still continues', async () => {
    const user = userEvent.setup()
    render(<QuizLessonHarness />)

    await user.click(screen.getByRole('radio', {
      name: '只要模型足够强，就能补齐全部任务背景。',
    }))

    expect(screen.getByRole('status', { name: '第 1 题反馈' })).toHaveTextContent('这个选项忽略了当前情境中的必要条件')
    expect(screen.getByRole('heading', { name: '即时判断' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '深度解析' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '原书依据' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '第 1 题反馈' })).toHaveTextContent('PDF 35')
    expect(screen.getByRole('status', { name: '第 1 题反馈' })).toHaveTextContent('page-035')

    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).toBeEnabled()
    await user.click(nextButton)

    expect(screen.getByRole('heading', { name: '本课小结' })).toBeInTheDocument()
  })

  it('keeps selected options neutral while feedback carries the result state', async () => {
    const user = userEvent.setup()
    render(<QuizLessonHarness />)

    const wrongRadio = screen.getByRole('radio', {
      name: '只要模型足够强，就能补齐全部任务背景。',
    })
    await user.click(wrongRadio)
    expect(wrongRadio.closest('label')).not.toHaveClass('is-correct', 'is-wrong')
    expect(screen.getByRole('status', { name: '第 1 题反馈' })).toHaveClass('quiz-feedback-wrong')

    const correctRadio = screen.getByRole('radio', {
      name: '缺少任务背景，可能给出不符合当前约束的回答。',
    })
    await user.click(correctRadio)
    expect(correctRadio.closest('label')).not.toHaveClass('is-correct', 'is-wrong')
    expect(screen.getByRole('status', { name: '第 1 题反馈' })).toHaveClass('quiz-feedback-correct')
  })

  it('favorites a question with a stable lesson and question identifier', async () => {
    const user = userEvent.setup()
    let latestProfile = quizProfile()
    render(<QuizLessonHarness onChange={(profile) => { latestProfile = profile }} />)

    await user.click(screen.getByRole('button', { name: '收藏题目：Agent 要修复异常' }))

    expect(latestProfile.favoriteContentIds).toContain('question:1-1:missing-background')
    expect(screen.getByRole('button', { name: '取消收藏题目：Agent 要修复异常' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
