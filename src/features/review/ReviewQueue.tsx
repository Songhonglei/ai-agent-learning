import { useId, useState } from 'react'
import { markWrongAnswerMastered } from '../../app/profileState'
import type { Lesson } from '../../shared/types/lesson'
import type { LearningProfile, WrongAnswer } from '../../shared/types/profile'
import { questionFavoriteId, sourceFavoriteId } from '../favorites/FavoriteButton'
import { appPath } from '../../shared/runtime/app-path'

export interface ReviewQueueProps {
  profile: LearningProfile
  lessons: Lesson[]
  onProfileChange: (next: LearningProfile) => void
}

type ReviewType = 'all' | 'wrong' | 'favorite'

interface ReviewItem {
  key: string
  type: Exclude<ReviewType, 'all'>
  lessonId: string
  kindLabel: string
  title: string
  detail: string
  questionId?: string
  wrongAnswer?: WrongAnswer
}

function shortPrompt(prompt: string): string {
  return prompt.split(/[，。？！]/, 1)[0]
}

export function isReviewableWrongAnswer(
  wrongAnswer: WrongAnswer,
  lessons: Lesson[],
): boolean {
  const lesson = lessons.find((candidate) => candidate.id === wrongAnswer.lessonId)
  return lesson?.quiz.some((candidate) => candidate.id === wrongAnswer.questionId) ?? false
}

export function isReviewableFavoriteContentId(
  contentId: string,
  lessons: Lesson[],
): boolean {
  return lessons.some((lesson) => (
    lesson.contentId === contentId
    || lesson.sourceRefs.some((source) => sourceFavoriteId(lesson.id, source.id) === contentId)
    || lesson.quiz.some((question) => questionFavoriteId(lesson.id, question.id) === contentId)
  ))
}

function wrongAnswerItem(wrongAnswer: WrongAnswer, lessons: Lesson[]): ReviewItem {
  const lesson = lessons.find((candidate) => candidate.id === wrongAnswer.lessonId)
  const question = lesson?.quiz.find((candidate) => candidate.id === wrongAnswer.questionId)
  const selectedOption = question?.options.find(
    (option) => option.id === wrongAnswer.selectedOptionId,
  )

  return {
    key: `wrong:${wrongAnswer.lessonId}:${wrongAnswer.questionId}`,
    type: 'wrong',
    lessonId: wrongAnswer.lessonId,
    kindLabel: '错题',
    title: question?.prompt ?? `题目 ${wrongAnswer.questionId}`,
    detail: selectedOption
      ? `上次选择：${selectedOption.label}`
      : `保留记录：${wrongAnswer.selectedOptionId}`,
    wrongAnswer,
    questionId: question ? wrongAnswer.questionId : undefined,
  }
}

function favoriteItem(contentId: string, lessons: Lesson[]): ReviewItem {
  const lessonFavorite = lessons.find((lesson) => lesson.contentId === contentId)
  if (lessonFavorite) {
    return {
      key: `favorite:${contentId}`,
      type: 'favorite',
      lessonId: lessonFavorite.id,
      kindLabel: '概念收藏',
      title: lessonFavorite.title,
      detail: lessonFavorite.objectives[0] ?? '已收藏的课程概念',
    }
  }

  for (const lesson of lessons) {
    const sourceRef = lesson.sourceRefs.find(
      (source) => sourceFavoriteId(lesson.id, source.id) === contentId,
    )
    if (sourceRef) {
      return {
        key: `favorite:${contentId}`,
        type: 'favorite',
        lessonId: lesson.id,
        kindLabel: '来源收藏',
        title: `来源 ${sourceRef.id}`,
        detail: sourceRef.conclusion,
      }
    }

    const question = lesson.quiz.find(
      (candidate) => questionFavoriteId(lesson.id, candidate.id) === contentId,
    )
    if (question) {
      return {
        key: `favorite:${contentId}`,
        type: 'favorite',
        lessonId: lesson.id,
        kindLabel: '题目收藏',
        title: question.prompt,
        detail: question.explanation,
        questionId: question.id,
      }
    }
  }

  return {
    key: `favorite:${contentId}`,
    type: 'favorite',
    lessonId: '',
    kindLabel: '收藏',
    title: '收藏内容暂不可用',
    detail: `已保留稳定内容 ID：${contentId}`,
  }
}

export function ReviewQueue({ profile, lessons, onProfileChange }: ReviewQueueProps) {
  const [typeFilter, setTypeFilter] = useState<ReviewType>('all')
  const [lessonFilter, setLessonFilter] = useState('all')
  const filterName = useId()
  const items: ReviewItem[] = [
    ...profile.wrongAnswers
      .filter((wrongAnswer) => (
        !wrongAnswer.mastered && isReviewableWrongAnswer(wrongAnswer, lessons)
      ))
      .map((wrongAnswer) => wrongAnswerItem(wrongAnswer, lessons)),
    ...profile.favoriteContentIds
      .filter((contentId) => isReviewableFavoriteContentId(contentId, lessons))
      .map((contentId) => favoriteItem(contentId, lessons)),
  ]
  const filteredItems = items.filter((item) => (
    (typeFilter === 'all' || item.type === typeFilter)
    && (lessonFilter === 'all' || item.lessonId === lessonFilter)
  ))

  function markMastered(item: ReviewItem) {
    if (!item.wrongAnswer) return
    onProfileChange(markWrongAnswerMastered(
      profile,
      item.wrongAnswer.lessonId,
      item.wrongAnswer.questionId,
    ))
  }

  return (
    <section className="review-queue" aria-labelledby={`${filterName}-title`}>
      <div className="review-heading">
        <div>
          <p className="review-kicker">错题与主动收藏 · 本地整理</p>
          <h2 id={`${filterName}-title`}>复习队列</h2>
        </div>
        <span>{filteredItems.length} 项</span>
      </div>

      <div className="review-filters">
        <fieldset>
          <legend>按类型筛选</legend>
          {([
            ['all', '全部'],
            ['wrong', '只看错题'],
            ['favorite', '只看收藏'],
          ] as const).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name={`${filterName}-type`}
                value={value}
                checked={typeFilter === value}
                onChange={() => setTypeFilter(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <label className="review-course-filter">
          <span>按课程筛选</span>
          <select value={lessonFilter} onChange={(event) => setLessonFilter(event.target.value)}>
            <option value="all">全部课程</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.id} · {lesson.title}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredItems.length === 0 ? (
        <div className="review-empty" role="status" aria-live="polite">
          <strong>当前没有待复习内容</strong>
          <p>可以回到地图继续学习，新的错题或收藏会自动出现在这里。</p>
          <a className="primary-link" href={appPath('/')}>返回学习地图</a>
        </div>
      ) : (
        <div className="review-list" aria-live="polite">
          {filteredItems.map((item) => (
            <article className="review-item" key={item.key}>
              <div className="review-item-meta">
                <span>{item.kindLabel}</span>
                {item.lessonId && <span>课程 {item.lessonId}</span>}
              </div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              {(item.questionId || item.wrongAnswer) && (
                <div className="review-item-actions">
                  {item.questionId && item.lessonId && (
                    <a href={appPath(`/lesson/${item.lessonId}#quiz-question-${item.lessonId}-${encodeURIComponent(item.questionId)}`)}>
                      查看原题
                    </a>
                  )}
                  {item.wrongAnswer && (
                    <button type="button" onClick={() => markMastered(item)}>
                      标记已掌握：{shortPrompt(item.title)}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
