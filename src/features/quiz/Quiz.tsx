import type { QuizQuestion, SourceRef } from '../../shared/types/lesson'
import { teacherFeedback } from '../../shared/ui/teacherFeedback'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'
import { FavoriteButton, questionFavoriteId } from '../favorites/FavoriteButton'

interface QuizProps {
  lessonId: string
  questions: QuizQuestion[]
  sourceRefs: SourceRef[]
  answers: Record<string, string>
  favoriteContentIds: string[]
  onAnswer: (questionId: string, optionId: string) => void
  onToggleFavorite: (contentId: string) => void
}

function shortPrompt(prompt: string): string {
  return prompt.split(/[，。？！]/, 1)[0]
}

export function Quiz({
  lessonId,
  questions,
  sourceRefs,
  answers,
  favoriteContentIds,
  onAnswer,
  onToggleFavorite,
}: QuizProps) {
  return (
    <section className="quiz-panel" aria-label="三道情境测验">
      <div className="quiz-heading">
        <div>
          <p className="quiz-kicker">三道情境题</p>
          <h3>先看当前窗口，再作判断</h3>
        </div>
        <span>{Object.keys(answers).filter((id) => questions.some((question) => question.id === id)).length} / {questions.length} 已答</span>
      </div>

      {questions.map((question, questionIndex) => {
        const selectedOptionId = answers[question.id]
        const selectedOption = question.options.find((option) => option.id === selectedOptionId)
        const correctOption = question.options.find((option) => option.id === question.correctOptionId)
        const isCorrect = selectedOptionId === question.correctOptionId
        const orderedOptions = spreadCorrectOption(
          question.options,
          question.correctOptionId,
          `${lessonId}:quiz`,
          questionIndex,
        )
        const evidence = question.sourceRefIds
          .map((sourceId) => sourceRefs.find((sourceRef) => sourceRef.id === sourceId))
          .filter((sourceRef): sourceRef is SourceRef => sourceRef !== undefined)
        const contentId = questionFavoriteId(lessonId, question.id)

        return (
          <section
            aria-labelledby={`${lessonId}-${question.id}-title`}
            className="quiz-question"
            id={`quiz-question-${lessonId}-${question.id}`}
            key={question.id}
            role="group"
          >
            <div className="quiz-question-meta">
              <span>第 {questionIndex + 1} 题</span>
              <FavoriteButton
                contentId={contentId}
                isFavorite={favoriteContentIds.includes(contentId)}
                label={`题目：${shortPrompt(question.prompt)}`}
                onToggle={onToggleFavorite}
              />
            </div>
            <h4 className="quiz-question-title" id={`${lessonId}-${question.id}-title`}>
              {question.prompt}
            </h4>

            <div className="quiz-options">
              {orderedOptions.map((option) => (
                <label className="quiz-option" key={option.id}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={() => onAnswer(question.id, option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            {selectedOption && correctOption && (
              <section
                className={isCorrect ? 'quiz-feedback quiz-feedback-correct' : 'quiz-feedback quiz-feedback-wrong'}
                role="status"
                aria-label={`第 ${questionIndex + 1} 题反馈`}
                aria-live="polite"
              >
                <div>
                  <h4>即时判断</h4>
                  <p>
                    {isCorrect
                      ? `${teacherFeedback(`${lessonId}:${question.id}`, true)} ${question.immediateFeedback}`
                      : `${teacherFeedback(`${lessonId}:${question.id}`, false)} 这个选项忽略了当前情境中的必要条件；答错也不会阻断课程。`}
                  </p>
                </div>
                <div>
                  <h4>深度解析</h4>
                  <p>
                    {!isCorrect && `你选择了“${selectedOption.label}”；更合适的是“${correctOption.label}”。`}
                    {question.explanation}
                  </p>
                </div>
                <div>
                  <h4>原书依据</h4>
                  <ul>
                    {evidence.map((sourceRef) => (
                      <li key={sourceRef.id}>
                        <strong>PDF {sourceRef.pdfPage} · {sourceRef.id}</strong>
                        <span>{sourceRef.conclusion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </section>
        )
      })}
    </section>
  )
}
