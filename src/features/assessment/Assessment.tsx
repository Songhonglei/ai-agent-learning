import { useState } from 'react'
import type { QuizQuestion } from '../../shared/types/lesson'
import type {
  AssessmentKind,
  AssessmentResult,
} from '../../shared/types/profile'
import { appPath } from '../../shared/runtime/app-path'
import { teacherFeedback } from '../../shared/ui/teacherFeedback'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'

export interface AssessmentProps {
  kind: AssessmentKind
  questions: QuizQuestion[]
  existing?: AssessmentResult
  onComplete: (result: AssessmentResult) => void
}

const assessmentLabels: Record<AssessmentKind, { title: string; kicker: string }> = {
  pretest: { title: '课前测验', kicker: '先凭当前理解作答 · 不影响学习' },
  posttest: { title: '课后测验', kicker: '完成课程后回看 · 不作用户分层' },
}

export function Assessment({ kind, questions, existing, onComplete }: AssessmentProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => ({ ...(existing?.answers ?? {}) }),
  )
  const [completed, setCompleted] = useState<AssessmentResult | undefined>(existing)
  const result = completed ?? existing
  const label = assessmentLabels[kind]
  const answeredCount = questions.filter((question) => answers[question.id] !== undefined).length

  function complete() {
    if (result || questions.length === 0 || answeredCount !== questions.length) return

    const nextResult: AssessmentResult = {
      kind,
      answers: { ...answers },
      completedAt: new Date().toISOString(),
      score: questions.filter(
        (question) => answers[question.id] === question.correctOptionId,
      ).length,
    }
    setCompleted(nextResult)
    onComplete(nextResult)
  }

  return (
    <section className="assessment-panel" aria-label={label.title}>
      <div className="assessment-heading">
        <div>
          <p className="assessment-kicker">{label.kicker}</p>
          <h2>{label.title}</h2>
        </div>
        <span>{result ? '已完成' : `${answeredCount} / ${questions.length} 已答`}</span>
      </div>

      {questions.length === 0 && (
        <div className="assessment-empty" role="status">
          <p>暂时没有可用的测评题目。</p>
          <a href={appPath('/')}>返回学习地图</a>
        </div>
      )}

      {result ? (
        <div className="assessment-result" role="status" aria-live="polite">
          <strong>得分 {result.score} / {questions.length}</strong>
          <span>结果只用于对照本次学习，不生成能力标签。</span>
        </div>
      ) : (
        <>
          <div className="assessment-questions">
            {questions.map((question, questionIndex) => {
              const selectedOptionId = answers[question.id]
              const isCorrect = selectedOptionId === question.correctOptionId
              const titleId = `${kind}-${question.id}-title`
              const orderedOptions = spreadCorrectOption(
                question.options,
                question.correctOptionId,
                `${kind}:${questions.map(({ id }) => id).join(':')}`,
                questionIndex,
              )

              return (
                <section
                  aria-labelledby={titleId}
                  className="assessment-question"
                  key={question.id}
                  role="group"
                >
                  <h3 className="assessment-question-title" id={titleId}>
                    <span>第 {questionIndex + 1} 题</span>
                    {question.prompt}
                  </h3>
                  <div className="assessment-options">
                    {orderedOptions.map((option) => (
                      <label key={option.id}>
                        <input
                          type="radio"
                          name={`${kind}-${question.id}`}
                          value={option.id}
                          checked={selectedOptionId === option.id}
                          onChange={() => setAnswers((current) => ({
                            ...current,
                            [question.id]: option.id,
                          }))}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {selectedOptionId && (
                    <p className="assessment-feedback" role="status" aria-live="polite">
                      <strong>{teacherFeedback(`${kind}:${question.id}`, isCorrect)}</strong>
                      {question.explanation} 可以继续作答或进入课程。
                    </p>
                  )}
                </section>
              )
            })}
          </div>
          {questions.length > 0 && (
            <button
              className="primary-button assessment-submit"
              type="button"
              disabled={answeredCount !== questions.length}
              onClick={complete}
            >
              完成{label.title}
            </button>
          )}
        </>
      )}
    </section>
  )
}
