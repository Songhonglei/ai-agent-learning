import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { lessonOne } from '../../content/lesson-1-1'
import { lessonFourTwo } from '../../content/lesson-4-2'
import { fullyAuthoredLessonIds } from '../../content/learning-map'
import { createEmptyProfile, type LearningProfile } from '../../shared/types/profile'
import { LessonPlayer } from './LessonPlayer'

function profileAt(stepId = lessonOne.steps[0].id): LearningProfile {
  const profile = createEmptyProfile()
  return {
    ...profile,
    courses: {
      ...profile.courses,
      [lessonOne.id]: {
        ...profile.courses[lessonOne.id],
        currentStepId: stepId,
      },
    },
  }
}

function PlayerHarness({
  lesson = lessonOne,
  initialProfile = profileAt(),
}: {
  lesson?: typeof lessonOne
  initialProfile?: LearningProfile
}) {
  const [profile, setProfile] = useState(initialProfile)

  return (
    <LessonPlayer
      lesson={lesson}
      courseProgress={profile.courses[lesson.id]}
      profile={profile}
      onProfileChange={setProfile}
    />
  )
}

describe('LessonPlayer', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it('renders the scripted scene and advances through global course progress', async () => {
    render(<PlayerHarness />)

    expect(screen.getByText(lessonOne.steps[0].content)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByText(lessonOne.steps[1].content)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '红叔' }).getAttribute('src')).toMatch(/^data:image\/svg\+xml,|hongshu-avatar/)
    expect(screen.getByText('步骤 2 / 6')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看来源依据' })).toHaveAttribute(
      'href',
      '#source-evidence',
    )
  })

  it('restores the step, experiment selection and answer from CourseProgress', () => {
    const profile = profileAt('quiz-context')
    profile.courses[lessonOne.id] = {
      ...profile.courses[lessonOne.id],
      completedStepIds: ['scene-intro', 'dialogue-context', 'experiment-context-builder'],
      experimentStates: { 'context-builder': ['code-context'] },
      answers: { 'missing-background': 'always-complete' },
    }

    render(<PlayerHarness initialProfile={profile} />)

    expect(screen.getByRole('checkbox', { name: /代码上下文/ })).toBeChecked()
    expect(screen.getByRole('radio', {
      name: '只要模型足够强，就能补齐全部任务背景。',
    })).toBeChecked()
    expect(screen.getByRole('heading', { name: '情境测验' })).toBeInTheDocument()
  })

  it('persists experiment selections through profile state operations', async () => {
    const user = userEvent.setup()
    render(<PlayerHarness />)

    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('checkbox', { name: /代码上下文/ }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('button', { name: '上一步' }))

    expect(screen.getByRole('checkbox', { name: /代码上下文/ })).toBeChecked()
  })

  it('shows the pretest at the lesson entrance without blocking navigation', async () => {
    render(<PlayerHarness />)

    expect(screen.getByRole('region', { name: '课前测验' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '课前测验' })).getAllByRole('group')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '下一步' })).toBeEnabled()
  })

  it('offers the posttest after the final lesson step is completed', async () => {
    const user = userEvent.setup()
    render(<PlayerHarness initialProfile={profileAt('free-question-faq')} />)

    await user.click(screen.getByRole('button', { name: '完成本课' }))

    expect(screen.getByRole('region', { name: '课后测验' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '课后测验' })).getAllByRole('group')).toHaveLength(3)
    expect(screen.getByRole('navigation', { name: '课程完成后导航' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到地图' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '进入下一章节 1-2' })).toHaveAttribute('href', '/lesson/1-2')
  })

  it('celebrates only after every authored lesson is complete', () => {
    const profile = createEmptyProfile()

    for (const lessonId of fullyAuthoredLessonIds) {
      profile.courses[lessonId] = {
        ...profile.courses[lessonId],
        completedAt: '2026-08-18T00:00:00.000Z',
      }
    }
    profile.courses[lessonFourTwo.id] = {
      ...profile.courses[lessonFourTwo.id],
      currentStepId: lessonFourTwo.steps.at(-1)?.id ?? '',
    }

    render(<PlayerHarness lesson={lessonFourTwo} initialProfile={profile} />)

    expect(screen.getByText('恭喜你，完成 Agent 入门课！')).toBeInTheDocument()
    expect(screen.getByText('学习地图已全部点亮')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到学习地图' })).toHaveAttribute('href', '/')
    expect(document.querySelectorAll('.graduation-confetti i')).toHaveLength(12)
    expect(screen.queryByRole('link', { name: /进入下一章节/ })).not.toBeInTheDocument()
  })

  it('keeps the Red Uncle avatar in the main lesson flow for collapsed layouts', () => {
    render(<PlayerHarness />)

    expect(within(screen.getByRole('main')).getByRole('img', { name: '红叔' }).getAttribute('src')).toMatch(/^data:image\/svg\+xml,|hongshu-avatar/)
  })

  it('opens the audited in-page source evidence without leaving the lesson', async () => {
    window.history.replaceState({}, '', '/lesson/1-1')
    render(<PlayerHarness />)

    await userEvent.click(screen.getByRole('link', { name: '查看来源依据' }))

    const sourceEntry = screen.getByRole('region', { name: '来源依据入口' })
    expect(sourceEntry).toHaveAttribute('id', 'source-evidence')
    expect(sourceEntry).toHaveTextContent('figure-2-1')
    expect(sourceEntry).toHaveTextContent('PDF 34')
    expect(window.location.hash).toBe('#source-evidence')
  })

  it('opens the matching quiz question from a review deep link', async () => {
    window.history.replaceState({}, '', '/lesson/1-1#quiz-question-1-1-missing-background')
    render(<PlayerHarness />)

    expect(await screen.findByRole('heading', { name: '情境测验' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: lessonOne.quiz[0].prompt })).toHaveAttribute(
      'id',
      'quiz-question-1-1-missing-background',
    )
  })

  it('continues step navigation after opening a review deep link', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/lesson/1-1#quiz-question-1-1-missing-background')
    render(<PlayerHarness />)

    await screen.findByRole('heading', { name: '情境测验' })
    await user.click(screen.getByRole('button', { name: '上一步' }))
    expect(screen.getByText(lessonOne.steps[2].content)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByRole('heading', { name: '情境测验' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText(lessonOne.steps[4].content)).toBeInTheDocument()
  })

  it('shows only the audited FAQ when the free-question step is reached', () => {
    render(<PlayerHarness initialProfile={profileAt('free-question-faq')} />)

    expect(screen.getByText('本地问答')).toBeInTheDocument()
    expect(screen.getByText(lessonOne.faq[0].question)).toBeInTheDocument()
  })

})
