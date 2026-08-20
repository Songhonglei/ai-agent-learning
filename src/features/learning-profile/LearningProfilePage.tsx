import { fullyAuthoredLessonIds, learningMapModules } from '../../content/learning-map'
import { authoredLessons, lessonById } from '../../content/lessons'
import { lessonOne } from '../../content/lesson-1-1'
import type { AssessmentKind, LearningProfile } from '../../shared/types/profile'
import { ProfileTransfer } from '../profile-transfer/ProfileTransfer'
import { appPath } from '../../shared/runtime/app-path'
import {
  isReviewableFavoriteContentId,
  isReviewableWrongAnswer,
  ReviewQueue,
} from '../review/ReviewQueue'

export interface LearningProfilePageProps {
  profile: LearningProfile
  onProfileChange(next: LearningProfile): void
  onProfileImport?(next: LearningProfile): void
  importBlockedMessage?: string
  storageEyebrow?: string
  storageDescription?: string
}

const courseSummaries = learningMapModules.flatMap((module) => module.lessons)

function assessmentText(profile: LearningProfile, kind: AssessmentKind): string {
  const result = profile.assessments[kind]
  const label = kind === 'pretest' ? '课前测验' : '课后测验'
  if (!result) return `${label}尚未完成`

  const total = kind === 'pretest'
    ? (lessonOne.pretest?.length ?? 0)
    : (lessonOne.posttest?.length ?? 0)
  return `${label} ${result.score} / ${total}`
}

function formattedUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return '更新时间暂不可用'
  return `最近更新 ${date.toLocaleString('zh-CN', { hour12: false })}`
}

export function LearningProfilePage({
  profile,
  onProfileChange,
  onProfileImport,
  importBlockedMessage,
  storageEyebrow = '只保存在当前浏览器',
  storageDescription = '集中查看真实学习记录、测评、错题与收藏，并在本机备份或恢复。',
}: LearningProfilePageProps): React.JSX.Element {
  const currentProgress = profile.courses[profile.currentLessonId]
  const unansweredWrongCount = profile.wrongAnswers.filter((item) => (
    !item.mastered && isReviewableWrongAnswer(item, authoredLessons)
  )).length
  const favoriteCount = profile.favoriteContentIds.filter((contentId) => (
    isReviewableFavoriteContentId(contentId, authoredLessons)
  )).length
  const currentLessonId = fullyAuthoredLessonIds.includes(profile.currentLessonId)
    ? profile.currentLessonId
    : authoredLessons[0]?.id ?? ''
  const currentCourse = courseSummaries.find((course) => course.id === currentLessonId)

  return (
    <main className="profile-page" aria-label="学习档案内容">
      <header className="profile-hero">
        <div>
          <p className="eyebrow">{storageEyebrow}</p>
          <h1>学习档案</h1>
          <p>{storageDescription}</p>
        </div>
        <div className="profile-hero-meta">
          <span>当前课程</span>
          <strong>{currentCourse ? `${currentCourse.id} ${currentCourse.title}` : profile.currentLessonId}</strong>
          <small>{formattedUpdatedAt(profile.updatedAt)}</small>
        </div>
      </header>

      <section className="profile-overview" aria-labelledby="profile-overview-title">
        <div className="profile-section-heading">
          <div>
            <p className="profile-section-kicker">12 课档案位 · {authoredLessons.length} 课已开放</p>
            <h2 id="profile-overview-title">课程进度概览</h2>
          </div>
          <a href={appPath(`/lesson/${currentLessonId}`)}>继续学习 {currentLessonId}</a>
        </div>

        <div className="profile-stats">
          <article>
            <strong>{authoredLessons.filter((lesson) => profile.courses[lesson.id]?.completedAt).length} / {authoredLessons.length}</strong>
            <span>开放课程完成</span>
          </article>
          <article>
            <strong>{currentProgress?.completedStepIds.length ?? 0} / {lessonById.get(currentLessonId)?.steps.length ?? 0}</strong>
            <span>{currentLessonId} 已完成步骤</span>
          </article>
          <article>
            <strong>{unansweredWrongCount}</strong>
            <span>{unansweredWrongCount} 道未掌握错题</span>
          </article>
          <article>
            <strong>{favoriteCount}</strong>
            <span>{favoriteCount} 项收藏</span>
          </article>
        </div>

        <ol className="profile-course-list" aria-label="十二课档案状态">
          {courseSummaries.map((course) => {
            const isAuthored = fullyAuthoredLessonIds.includes(course.id)
            const courseProgress = profile.courses[course.id]
            return (
              <li className={isAuthored ? 'profile-course profile-course-open' : 'profile-course'} key={course.id}>
                <div>
                  <strong>{course.id} {course.title}</strong>
                  <span>{isAuthored ? '课程已开放' : '课程未开放'}</span>
                </div>
                {isAuthored ? (
                  <em>
                    {courseProgress?.completedAt
                      ? '本课已完成'
                      : `${courseProgress?.completedStepIds.length ?? 0} / ${lessonById.get(course.id)?.steps.length ?? 0} 步骤`}
                  </em>
                ) : (
                  <em>等待课程内容</em>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="profile-assessments" aria-labelledby="profile-assessments-title">
        <div className="profile-section-heading">
          <div>
            <p className="profile-section-kicker">只做前后对照 · 不生成能力标签</p>
            <h2 id="profile-assessments-title">前后测结果</h2>
          </div>
        </div>
        <div className="profile-assessment-results">
          <p>{assessmentText(profile, 'pretest')}</p>
          <p>{assessmentText(profile, 'posttest')}</p>
        </div>
      </section>

      <section className="profile-records" aria-labelledby="profile-records-title">
        <div className="profile-section-heading">
          <div>
            <p className="profile-section-kicker">错题与收藏会在这里合并整理</p>
            <h2 id="profile-records-title">错题、收藏与复习</h2>
          </div>
        </div>
        <ReviewQueue
          profile={profile}
          lessons={authoredLessons}
          onProfileChange={onProfileChange}
        />
      </section>

      <ProfileTransfer
        profile={profile}
        onConfirm={onProfileImport ?? onProfileChange}
        blockedMessage={importBlockedMessage}
      />
    </main>
  )
}
