import { useEffect, useMemo, useRef } from 'react'
import {
  completeAssessment,
  recordWrongAnswer,
  toggleFavorite,
  updateCourseProgress,
} from '../../app/profileState'
import type { CourseProgress, LearningProfile } from '../../shared/types/profile'
import type { Lesson, LessonStep } from '../../shared/types/lesson'
import { FaqPanel } from '../ask-hongshu/FaqPanel'
import { Assessment } from '../assessment/Assessment'
import { AgentFormulaBuilder } from '../agent-formula-builder/AgentFormulaBuilder'
import { AgentIdentifier } from '../agent-identifier/AgentIdentifier'
import { PromptCompare } from '../prompt-compare/PromptCompare'
import { PromptSafety } from '../prompt-safety/PromptSafety'
import { KnowledgePractice } from '../knowledge-practice/KnowledgePractice'
import { ContextBuilder } from '../context-builder/ContextBuilder.tsx'
import {
  FavoriteButton,
} from '../favorites/FavoriteButton'
import { Quiz } from '../quiz/Quiz'
import { SourceEvidence } from '../source-evidence/SourceEvidence'
import hongshuAvatar from '../../assets/brand/hongshu-avatar.svg'
import { appPath } from '../../shared/runtime/app-path'
import { fullyAuthoredLessonIds, learningMapLessonIds } from '../../content/learning-map'
import { randomMentorQuote } from '../../shared/ui/mentorQuotes'

export interface LessonPlayerProps {
  lesson: Lesson
  courseProgress: CourseProgress
  profile: LearningProfile
  onProfileChange: (next: LearningProfile) => void
}

const stepLabels: Record<LessonStep['type'], string> = {
  scene: '情境导入',
  dialogue: '对话讲解',
  experiment: '互动实验',
  quiz: '情境测验',
  summary: '本课小结',
  'free-question': '自由提问',
}

export function LessonPlayer({
  lesson,
  courseProgress,
  profile,
  onProfileChange,
}: LessonPlayerProps): React.JSX.Element {
  const mentorQuote = useMemo(() => randomMentorQuote(), [lesson.id])
  const openedQuestionAnchor = useRef<string | null>(null)
  const configuredIndex = lesson.steps.findIndex(
    (step) => step.id === courseProgress.currentStepId,
  )
  const currentIndex = configuredIndex < 0 ? 0 : configuredIndex
  const currentStep = lesson.steps[currentIndex]

  const visibleSteps = lesson.steps.slice(0, currentIndex + 1)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < lesson.steps.length - 1
  const availableLessonIds = learningMapLessonIds.filter((lessonId) => fullyAuthoredLessonIds.includes(lessonId))
  const nextLessonId = availableLessonIds[availableLessonIds.indexOf(lesson.id) + 1]
  const hasCompletedLearningMap = availableLessonIds.length > 0
    && availableLessonIds.every((lessonId) => profile.courses[lessonId]?.completedAt)

  function applyCourseProgress(update: Partial<CourseProgress>) {
    onProfileChange(updateCourseProgress(profile, lesson.id, update))
  }

  useEffect(() => {
    const anchorId = window.location.hash.slice(1)
    const anchorPrefix = `quiz-question-${lesson.id}-`
    if (!anchorId.startsWith(anchorPrefix)) {
      openedQuestionAnchor.current = null
      return
    }

    const questionId = decodeURIComponent(anchorId.slice(anchorPrefix.length))
    const quizStepIndex = lesson.steps.findIndex((step) => step.type === 'quiz')
    if (!lesson.quiz.some((question) => question.id === questionId) || quizStepIndex < 0) return

    const anchorKey = `${lesson.id}:${questionId}`
    if (openedQuestionAnchor.current === anchorKey) return

    if (currentIndex !== quizStepIndex) {
      applyCourseProgress({ currentStepId: lesson.steps[quizStepIndex].id })
      return
    }

    openedQuestionAnchor.current = anchorKey

    const timer = window.setTimeout(() => {
      const target = document.getElementById(anchorId)
      if (typeof target?.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentIndex, lesson, profile, onProfileChange])

  if (!currentStep) {
    return (
      <section className="lesson-empty" role="status">
        <h1>{lesson.title}</h1>
        <p>这门课程还没有可学习的步骤。</p>
        <a className="primary-link" href={appPath('/')}>返回学习地图</a>
      </section>
    )
  }

  function goToStep(nextIndex: number) {
    const nextStep = lesson.steps[nextIndex]
    if (!nextStep) return

    applyCourseProgress({
      currentStepId: nextStep.id,
      completedStepIds: nextIndex > currentIndex
        ? [...new Set([...courseProgress.completedStepIds, currentStep.id])]
        : courseProgress.completedStepIds,
    })
  }

  function finishLesson() {
    if (hasNext || courseProgress.completedAt) return

    applyCourseProgress({
      completedStepIds: [...new Set([...courseProgress.completedStepIds, currentStep.id])],
      completedAt: new Date().toISOString(),
    })
  }

  function updateExperiment(experimentId: string, selectedIds: string[]) {
    applyCourseProgress({
      experimentStates: {
        ...courseProgress.experimentStates,
        [experimentId]: selectedIds,
      },
    })
  }

  function answerQuestion(questionId: string, optionId: string) {
    const question = lesson.quiz.find((candidate) => candidate.id === questionId)
    let next = updateCourseProgress(profile, lesson.id, {
      answers: {
        ...courseProgress.answers,
        [questionId]: optionId,
      },
    })

    if (question && optionId !== question.correctOptionId) {
      next = recordWrongAnswer(next, {
        questionId,
        lessonId: lesson.id,
        selectedOptionId: optionId,
        sourceRefIds: [...question.sourceRefIds],
        mastered: false,
        recordedAt: new Date().toISOString(),
      })
    }

    onProfileChange(next)
  }

  function toggleContent(contentId: string) {
    onProfileChange(toggleFavorite(profile, contentId))
  }

  return (
    <article className="lesson-layout">
      <aside className="lesson-outline" aria-label="课程目录">
        <a className="back-link" href={appPath('/')}>← 返回学习地图</a>
        <p className="outline-title">本课步骤</p>
        <ol>
          {lesson.steps.map((step, index) => (
            <li className={index === currentIndex ? 'outline-current' : ''} key={step.id}>
              <span aria-hidden="true">{index < currentIndex ? '✓' : index === currentIndex ? '●' : '○'}</span>
              {stepLabels[step.type]}
            </li>
          ))}
        </ol>
      </aside>

      <main className="lesson-main">
        <div className="lesson-content" id="lesson-top">
          <p className="crumb">学习地图 / {lesson.id}</p>
          <div className="lesson-title-row">
            <h1>{lesson.title}</h1>
            <FavoriteButton
              contentId={lesson.contentId}
              isFavorite={profile.favoriteContentIds.includes(lesson.contentId)}
              label="本课概念"
              onToggle={toggleContent}
            />
          </div>
          <div className="lesson-meta">
            <span>预计 {lesson.durationMinutes} 分钟</span>
            <span>步骤 {currentIndex + 1} / {lesson.steps.length}</span>
            <span>本地自动保存</span>
          </div>
          <progress
            className="lesson-progress"
            aria-label="本课进度"
            max={lesson.steps.length}
            value={currentIndex + 1}
          />

          {lesson.pretest && (
            <Assessment
              kind="pretest"
              questions={lesson.pretest}
              existing={profile.assessments.pretest}
              onComplete={(result) => onProfileChange(completeAssessment(profile, result))}
            />
          )}

          <div className="lesson-script" aria-live="polite">
            {visibleSteps.map((step, index) => (
              <section
                className={`script-card script-${step.type}`}
                aria-current={index === currentIndex ? 'step' : undefined}
                key={step.id}
              >
                <h2>{stepLabels[step.type]}</h2>
                {step.speaker === 'hongshu' && <strong className="speaker-label">红叔：</strong>}
                <p>{step.content}</p>
                {step.experimentId && step.experimentKind === 'context-builder' && (
                  <ContextBuilder
                    selectedIds={courseProgress.experimentStates[step.experimentId] ?? []}
                    onSelectionChange={(selectedIds) => updateExperiment(
                      step.experimentId as string,
                      selectedIds,
                    )}
                  />
                )}
                {step.experimentId && step.experimentKind === 'agent-identifier' && (
                  <AgentIdentifier
                    selectedIds={courseProgress.experimentStates[step.experimentId] ?? []}
                    onSelectionChange={(selectedIds) => updateExperiment(step.experimentId as string, selectedIds)}
                  />
                )}
                {step.experimentId && step.experimentKind === 'agent-formula-builder' && (
                  <AgentFormulaBuilder
                    selectedIds={courseProgress.experimentStates[step.experimentId] ?? []}
                    onSelectionChange={(selectedIds) => updateExperiment(step.experimentId as string, selectedIds)}
                  />
                )}
                {step.experimentId && step.experimentKind === 'prompt-compare' && (
                  <PromptCompare
                    selectedIds={courseProgress.experimentStates[step.experimentId] ?? []}
                    onSelectionChange={(selectedIds) => updateExperiment(
                      step.experimentId as string,
                      selectedIds,
                    )}
                  />
                )}
                {step.experimentId && step.experimentKind === 'prompt-safety' && (
                  <PromptSafety
                    selectedIds={courseProgress.experimentStates[step.experimentId] ?? []}
                    onSelectionChange={(selectedIds) => updateExperiment(
                      step.experimentId as string,
                      selectedIds,
                    )}
                  />
                )}
                {step.experimentId && (
                  step.experimentKind === 'knowledge-freshness'
                  || step.experimentKind === 'knowledge-retrieval'
                  || step.experimentKind === 'memory-layers'
                  || step.experimentKind === 'tool-chain'
                  || step.experimentKind === 'react-cycle'
                  || step.experimentKind === 'evaluation-case'
                  || step.experimentKind === 'collaboration-case'
                ) && (
                  <KnowledgePractice
                    kind={step.experimentKind}
                    selectedIds={courseProgress.experimentStates[step.experimentId] ?? []}
                    onSelectionChange={(selectedIds) => updateExperiment(
                      step.experimentId as string,
                      selectedIds,
                    )}
                  />
                )}
                {step.type === 'quiz' && (
                  <Quiz
                    lessonId={lesson.id}
                    questions={lesson.quiz}
                    sourceRefs={lesson.sourceRefs}
                    answers={courseProgress.answers}
                    favoriteContentIds={profile.favoriteContentIds}
                    onAnswer={answerQuestion}
                    onToggleFavorite={toggleContent}
                  />
                )}
                {step.type === 'free-question' && <FaqPanel lessonId={lesson.id} items={lesson.faq} />}
              </section>
            ))}
          </div>

          <nav className="lesson-navigation" aria-label="课程步骤导航">
            <button type="button" onClick={() => goToStep(currentIndex - 1)} disabled={!hasPrevious}>
              上一步
            </button>
            <a href="#source-evidence">查看来源依据</a>
            {hasNext ? (
              <button className="primary-button" type="button" onClick={() => goToStep(currentIndex + 1)}>
                下一步
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={finishLesson}
                disabled={courseProgress.completedAt !== undefined}
              >
                {courseProgress.completedAt ? '本课已完成' : '完成本课'}
              </button>
            )}
          </nav>

          {courseProgress.completedAt && !hasNext && (
            hasCompletedLearningMap ? (
              <nav className="lesson-end-actions lesson-graduation" aria-label="课程完成后导航" aria-live="polite">
                <div className="graduation-confetti" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
                </div>
                <div className="graduation-copy">
                  <span>学习地图已全部点亮</span>
                  <strong>恭喜你，完成 Agent 入门课！</strong>
                  <p>从这里出发，把学到的判断带回真实任务。</p>
                </div>
                <a className="primary-link" href={appPath('/')}>回到学习地图</a>
              </nav>
            ) : (
              <nav className="lesson-end-actions" aria-label="课程完成后导航">
                <strong>本课完成，下一站你决定。</strong>
                <a href={appPath('/')}>回到地图</a>
                {nextLessonId && (
                  <a
                    aria-label={`进入下一章节 ${nextLessonId}`}
                    className="primary-link"
                    href={appPath(`/lesson/${nextLessonId}`)}
                  >
                    下一章节
                  </a>
                )}
              </nav>
            )
          )}

          {courseProgress.completedAt && lesson.posttest && (
            <Assessment
              kind="posttest"
              questions={lesson.posttest}
              existing={profile.assessments.posttest}
              onComplete={(result) => onProfileChange(completeAssessment(profile, result))}
            />
          )}

          <SourceEvidence lessonId={lesson.id} sourceRefs={lesson.sourceRefs} />
        </div>

        <aside className="mentor-panel" aria-label="本课导师">
          <img src={hongshuAvatar} alt="红叔" />
          <div>
            <strong>红叔</strong>
            <span>本课导师</span>
          </div>
          <p>{mentorQuote}</p>
        </aside>
      </main>
    </article>
  )
}
