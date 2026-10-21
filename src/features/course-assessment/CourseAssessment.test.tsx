import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { courseTestQuestions } from '../../content/course-assessment'
import { createEmptyProfile, type LearningProfile } from '../../shared/types/profile'
import { editCourseTest } from '../../shared/courseAssessment'
import { CourseAssessmentPage } from './CourseAssessment'

afterEach(cleanup)
function Harness({ initial = createEmptyProfile(), path = '/assessment/pretest' }: { initial?: LearningProfile; path?: string }) {
  const [profile, setProfile] = useState(initial)
  return <MemoryRouter initialEntries={[path]}><Routes><Route path="/assessment/:kind" element={<CourseAssessmentPage profile={profile} onProfileChange={setProfile} />} /><Route path="/assessment" element={<CourseAssessmentPage profile={profile} onProfileChange={setProfile} />} /></Routes></MemoryRouter>
}

describe('whole-course assessment UI', () => {
  it('keeps answers neutral until final confirmation, supports editing and locks the submitted attempt', async () => {
    const user = userEvent.setup()
    let profile = editCourseTest(createEmptyProfile(), 'pretest')
    for (const q of courseTestQuestions.pretest.slice(0, 23)) profile = editCourseTest(profile, 'pretest', { questionId: q.id, optionId: 'a' })
    profile = editCourseTest(profile, 'pretest', { currentQuestion: 23 })
    render(<Harness initial={profile} />)
    expect(screen.getByRole('button', { name: '提交课程前测' })).toBeDisabled()
    await user.click(screen.getAllByRole('radio')[0])
    expect(screen.queryByText(/参考答案/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '已提交测评解析' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '提交课程前测' }))
    await user.click(screen.getByRole('button', { name: '返回检查' }))
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: '提交课程前测' }))
    await user.click(screen.getByRole('button', { name: '确认提交前测' }))
    expect(screen.getByRole('heading', { name: '课程前测已提交' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '已提交测评解析' })).getAllByText(/第 \d+ 题/)).toHaveLength(24)
  })

  it('blocks direct access to posttest until all lessons are completed', () => {
    render(<Harness path="/assessment/posttest" />)
    expect(screen.getByRole('heading', { name: '完成 12 课后开启后测' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '开始作答结课后测' })).not.toBeInTheDocument()
  })

  it('does not mistake existing 1-1 results for a whole-course baseline', () => {
    const profile = createEmptyProfile()
    profile.assessments.pretest = { kind: 'pretest', score: 3, answers: {}, completedAt: new Date().toISOString() }
    render(<Harness path="/assessment" initial={profile} />)
    expect(screen.getByText('尚无已提交的全课程前测，后测可单独完成；缺少前测时不计算提升。')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an explicit supplementary-baseline notice for existing learners', () => {
    const profile = createEmptyProfile()
    profile.courses['0-1'].completedStepIds = ['scene']
    render(<Harness initial={profile} />)
    expect(screen.getByRole('note')).toHaveTextContent('补测')
  })
})
