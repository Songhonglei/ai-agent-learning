import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import { createEmptyProfile, type LearningProfile } from '../../shared/types/profile'
import { ReviewQueue } from './ReviewQueue'

function reviewProfile(): LearningProfile {
  return {
    ...createEmptyProfile(),
    wrongAnswers: [
      {
        lessonId: '1-1',
        questionId: 'missing-background',
        selectedOptionId: 'always-complete',
        sourceRefIds: ['page-035'],
        mastered: false,
        recordedAt: '2026-08-05T09:00:00.000Z',
      },
      {
        lessonId: '1-1',
        questionId: 'current-context',
        selectedOptionId: 'chat-only',
        sourceRefIds: ['figure-2-1'],
        mastered: true,
        recordedAt: '2026-08-05T09:10:00.000Z',
      },
    ],
    favoriteContentIds: [
      'lesson-1-1',
      'source:1-1:figure-2-1',
      'question:1-1:current-context',
    ],
  }
}

function ReviewHarness({ initialProfile = reviewProfile() }: { initialProfile?: LearningProfile }) {
  const [profile, setProfile] = useState(initialProfile)
  return (
    <ReviewQueue
      profile={profile}
      lessons={[lessonOne]}
      onProfileChange={setProfile}
    />
  )
}

describe('ReviewQueue', () => {
  afterEach(cleanup)

  it('shows only unmastered wrong answers and stable favorites by default', () => {
    render(<ReviewHarness />)

    expect(screen.getByText(lessonOne.quiz[0].prompt)).toBeInTheDocument()
    expect(screen.getByText(lessonOne.quiz[1].prompt)).toBeInTheDocument()
    expect(screen.getByText(lessonOne.title)).toBeInTheDocument()
    expect(screen.getByText(lessonOne.sourceRefs[0].conclusion)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '查看原题' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '查看原题' })[0]).toHaveAttribute(
      'href',
      '/lesson/1-1#quiz-question-1-1-missing-background',
    )
    expect(screen.getAllByRole('link', { name: '查看原题' })[1]).toHaveAttribute(
      'href',
      '/lesson/1-1#quiz-question-1-1-current-context',
    )
  })

  it('filters the queue with native type and course controls', async () => {
    const user = userEvent.setup()
    render(<ReviewHarness />)

    await user.click(screen.getByRole('radio', { name: '只看错题' }))
    expect(screen.getByText(lessonOne.quiz[0].prompt)).toBeInTheDocument()
    expect(screen.queryByText(lessonOne.title)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '只看收藏' }))
    expect(screen.queryByText(lessonOne.quiz[0].prompt)).not.toBeInTheDocument()
    expect(screen.getByText(lessonOne.title)).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '按课程筛选' }), '1-1')
    expect(screen.getByText(lessonOne.sourceRefs[0].conclusion)).toBeInTheDocument()
  })

  it('removes a wrong answer from the default queue after it is marked mastered', async () => {
    const user = userEvent.setup()
    const profile = reviewProfile()
    profile.favoriteContentIds = []
    profile.wrongAnswers = [profile.wrongAnswers[0]]
    render(<ReviewHarness initialProfile={profile} />)

    await user.click(screen.getByRole('button', { name: '标记已掌握：Agent 要修复异常' }))

    expect(screen.queryByText(lessonOne.quiz[0].prompt)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('当前没有待复习内容')
    expect(screen.getByRole('link', { name: '返回学习地图' })).toHaveAttribute('href', '/')
  })
})
