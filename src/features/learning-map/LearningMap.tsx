import type {
  LearningMapModule,
  LearningMapNode,
} from '../../content/learning-map'
import { fullyAuthoredLessonIds } from '../../content/learning-map'
import type { LearningProfile } from '../../shared/types/profile'
import { appPath } from '../../shared/runtime/app-path'

interface LearningMapProps {
  modules: LearningMapModule[]
  nodes: LearningMapNode[]
  profile: LearningProfile
}

export function LearningMap({ modules, nodes, profile }: LearningMapProps) {
  const currentLessonId = fullyAuthoredLessonIds.includes(profile.currentLessonId)
    ? profile.currentLessonId
    : fullyAuthoredLessonIds[0]
  const lessonById = new Map(
    modules.flatMap((module) =>
      module.lessons.map((lesson) => [lesson.id, lesson] as const),
    ),
  )
  return (
    <section className="map-panel" aria-labelledby="learning-map-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI AGENT · 零基础学习路径</p>
          <h1 id="learning-map-heading">你的学习地图</h1>
          <p>从日常任务出发，按顺序认识 Agent 的上下文、知识、工具与协作方式。</p>
        </div>
        <div className="map-heading-actions">
          <p className="map-count"><strong>{fullyAuthoredLessonIds.length}/12</strong></p>
        </div>
      </div>

      <ol className="learning-path" aria-label="学习路径">
        {nodes.map((node, nodeIndex) => (
          <li
            className={[
              'map-node',
              currentLessonId !== undefined && node.lessonIds.includes(currentLessonId) ? 'map-node-current' : '',
              node.lessonIds.length > 0 && node.lessonIds.every((lessonId) => (
                fullyAuthoredLessonIds.includes(lessonId)
                && profile.courses[lessonId]?.completedAt !== undefined
              )) ? 'map-node-complete' : '',
            ].filter(Boolean).join(' ')}
            key={node.id}
          >
            <div className="node-marker" aria-hidden="true">{nodeIndex + 1}</div>
            <h2>{node.title}</h2>
            <p>{node.lessonIds.length} 课</p>
            <ul className="lesson-intros" aria-label={`${node.title}课程`}>
              {node.lessonIds.map((lessonId) => {
                const lesson = lessonById.get(lessonId)
                if (!lesson) return null

                const isAuthored = fullyAuthoredLessonIds.includes(lesson.id)
                const lessonCompleted = isAuthored
                  && profile.courses[lesson.id]?.completedAt !== undefined
                const lessonStarted = isAuthored
                  && profile.courses[lesson.id]?.completedStepIds.length > 0
                const lessonActionLabel = lessonCompleted
                  ? '再次学习'
                  : lessonStarted
                    ? '继续学习'
                    : '开始学习'
                return (
                  <li
                    className={[
                      'lesson-intro',
                      isAuthored ? 'lesson-intro-open' : '',
                      lessonCompleted ? 'lesson-intro-complete' : '',
                      lessonStarted && !lessonCompleted ? 'lesson-intro-started' : '',
                    ].filter(Boolean).join(' ')}
                    key={lesson.id}
                  >
                    {isAuthored ? (
                      <>
                        <span className="lesson-code">{lesson.id}</span>
                        <strong className="lesson-title">{lesson.title}</strong>
                        <span
                          aria-label={lessonCompleted ? '已完成' : lessonStarted ? '学习中' : '待开始'}
                          className={lessonCompleted ? 'lesson-status is-complete' : lessonStarted ? 'lesson-status is-started' : 'lesson-status'}
                          title={lessonCompleted ? '已完成' : lessonStarted ? '学习中' : '待开始'}
                        >
                          <span aria-hidden="true">{lessonCompleted ? '✓' : lessonStarted ? '↗' : '○'}</span>
                        </span>
                        <a
                          aria-label={`${lessonActionLabel}：${lesson.id} ${lesson.title}`}
                          className={`primary-link lesson-action ${lessonCompleted ? 'lesson-action-replay' : lessonStarted ? 'lesson-action-continue' : 'lesson-action-start'}`}
                          href={appPath(`/lesson/${lesson.id}`)}
                        >
                          {lessonActionLabel}
                        </a>
                      </>
                    ) : (
                      <>
                        <span>{lesson.introduction}</span>
                        <em>推荐按顺序学习</em>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}
