import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { learningMapModules, learningMapNodes } from '../../content/learning-map'
import { createEmptyProfile } from '../../shared/types/profile'
import { LearningMap } from './LearningMap'

describe('LearningMap', () => {
  afterEach(cleanup)

  it('shows the six frozen nodes and exposes the opened lessons as direct links', () => {
    render(
      <LearningMap
        modules={learningMapModules}
        nodes={learningMapNodes}
        profile={createEmptyProfile()}
      />,
    )

    const map = screen.getByRole('list', { name: '学习路径' })
    expect(within(map).getAllByRole('heading', { level: 2 })).toHaveLength(6)
    const lessonOneAction = within(map).getByRole('link', { name: '开始学习：1-1 Agent的记忆有边界' })
    expect(lessonOneAction).toHaveClass('lesson-action-start')
    expect(lessonOneAction).toHaveAttribute('href', '/lesson/1-1')
    expect(within(map).getByRole('link', { name: '开始学习：0-1 你已经在用Agent了' })).toHaveAttribute('href', '/lesson/0-1')
    expect(within(map).getByRole('link', { name: '开始学习：0-2 三句话理解Agent' })).toHaveAttribute('href', '/lesson/0-2')
    expect(within(map).getByRole('link', { name: '开始学习：1-2 给Agent下命令的艺术' })).toHaveAttribute('href', '/lesson/1-2')
    expect(within(map).getByRole('link', { name: '开始学习：1-3 Agent的眼睛会被蒙蔽' })).toHaveAttribute('href', '/lesson/1-3')
    expect(within(map).getAllByRole('link')).toHaveLength(12)
    expect(within(map).queryAllByText('推荐按顺序学习')).toHaveLength(0)
    expect(screen.getByText('12/12')).toBeInTheDocument()
    expect(screen.queryByText('课程开放')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /课程状态/ })).not.toBeInTheDocument()
  })

  it('uses the map configuration to show progress for an authored introduction lesson', () => {
    const profile = createEmptyProfile()
    profile.currentLessonId = '0-1'
    profile.courses['0-1'].completedAt = '2026-08-05T10:00:00.000Z'
    profile.courses['0-1'].completedStepIds = ['invented-step']
    render(
      <LearningMap
        modules={learningMapModules}
        nodes={learningMapNodes}
        profile={profile}
      />,
    )

    const lessonTitle = screen.getByText('你已经在用Agent了')
    const lessonCard = lessonTitle.closest('li')

    expect(lessonCard).not.toBeNull()
    expect(within(lessonCard!).getByRole('link', { name: '再次学习：0-1 你已经在用Agent了' })).toHaveClass('lesson-action-replay')
    expect(within(lessonCard!).getByLabelText('已完成')).toBeInTheDocument()
    expect(lessonCard).toHaveClass('lesson-intro-complete')
    expect(lessonCard!.closest('.map-node')).toHaveClass('map-node-current')
  })
})
