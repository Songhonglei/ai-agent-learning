import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { courseTestQuestions } from '../../content/course-assessment'
import { learningMapNodes } from '../../content/learning-map'
import { authoredLessons, lessonById } from '../../content/lessons'
import { completedLessonCount, editCourseTest, hasCourseLearning, isBaselineComparable, scoreAttempt } from '../../shared/courseAssessment'
import type { AssessmentKind, LearningProfile } from '../../shared/types/profile'
import type { CourseTestAttempt } from '../../shared/types/courseAssessment'
import { appPath } from '../../shared/runtime/app-path'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'

const labels = { pretest: '课程前测', posttest: '结课后测' }
const percent = (value: number) => `${Number(value.toFixed(1))}%`
const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}`

function resultLabel(attempt: CourseTestAttempt | undefined) {
  if (!attempt) return '未开始'
  if (!attempt.completedAt) return `作答中 ${Object.keys(attempt.answers).length}/24`
  return `${scoreAttempt(attempt).score} / 24${attempt.kind === 'pretest' && attempt.learningStarted ? ' · 补测' : ''}`
}

export function CourseAssessmentEntry({ profile }: { profile: LearningProfile }) {
  const records = profile.courseAssessments
  return (
    <aside className="course-test-entry" aria-label="全课程测评入口">
      <div><strong>全课程测评</strong><p>先测再学，结课后对照。每次 24 题，覆盖全部 12 课。</p></div>
      <nav aria-label="课程测评导航">
        <a href={appPath('/assessment/pretest')}>{records.pretest?.completedAt ? '查看课程前测' : records.pretest ? '继续课程前测' : '开始课程前测'}</a>
        <a href={appPath('/assessment/posttest')}>结课后测{!records.posttest?.completedAt && completedLessonCount(profile) < 12 ? `（${completedLessonCount(profile)}/12课）` : ''}</a>
        <a href={appPath('/assessment')}>结果对照</a>
      </nav>
    </aside>
  )
}

export function CourseAssessmentResults({ profile }: { profile: LearningProfile }) {
  const { pretest, posttest } = profile.courseAssessments
  const pre = pretest?.completedAt ? scoreAttempt(pretest) : null
  const post = posttest?.completedAt ? scoreAttempt(posttest) : null
  const comparable = isBaselineComparable(profile.courseAssessments)
  const rows = [...learningMapNodes.map((node) => ({ id: node.id, title: node.title, lessons: node.lessonIds })),
    ...authoredLessons.map((lesson) => ({ id: lesson.id, title: `${lesson.id} ${lesson.title}`, lessons: [lesson.id] }))]
  return (
    <section className="course-test-results" aria-labelledby="course-test-results-heading">
      <h2 id="course-test-results-heading">全课程结果对照</h2>
      <div className="course-test-scorecards">
        <article><span>课程前测</span><strong>{resultLabel(pretest)}</strong>{pre && <small>正确率 {percent(pre.percent)}</small>}</article>
        <article><span>结课后测</span><strong>{resultLabel(posttest)}</strong>{post && <small>正确率 {percent(post.percent)}</small>}</article>
        <article><span>前后变化</span><strong>{comparable && pre && post ? `${signed(post.score - pre.score)} 分` : '待有效对照'}</strong>
          {comparable && pre && post && <small>正确率 {signed(post.percent - pre.percent)} 个百分点</small>}</article>
      </div>
      <p className="course-test-note">
        {pretest?.learningStarted
          ? '前测提交前已有学习记录，已标为补测；仍展示两次分数，不计算学习提升。'
          : pre && post && !comparable
            ? '前测未在后测开始前提交，当前记录不计算学习提升。'
            : !pre ? '尚无已提交的全课程前测，后测可单独完成；缺少前测时不计算提升。'
              : !post ? '完成全部 12 课并提交结课后测后，可查看前后变化。'
                : '前测在学习记录产生前提交，可作本次学习的自测基线。'}
      </p>
      {(pre || post) && (
        <>
          <h3>六个主题与逐课表现</h3>
          <p>每课各 2 题。前后测采用不同情境；两套题难度尚未经过统计校准。分数变化供个人复盘，不代表课程因果效果或能力认证。</p>
          <table className="course-test-comparison">
            <caption className="sr-only">六个主题和十二课的前后测成绩</caption>
            <thead><tr><th scope="col">主题 / 课程</th><th scope="col">前测</th><th scope="col">后测</th><th scope="col">变化</th></tr></thead>
            <tbody>{rows.map((row) => {
              const before = pre && pretest ? scoreAttempt(pretest, row.lessons) : null
              const after = post && posttest ? scoreAttempt(posttest, row.lessons) : null
              return <tr key={row.id} className={row.lessons.length === 1 && row.id.includes('-') && lessonById.has(row.id) ? '' : 'course-test-topic-row'}>
                <th scope="row">{lessonById.has(row.id) ? <a href={appPath(`/lesson/${row.id}`)}>{row.title}</a> : row.title}</th>
                <td>{before ? `${before.score}/${before.total}` : '—'}</td><td>{after ? `${after.score}/${after.total}` : '—'}</td>
                <td>{comparable && before && after ? `${signed(after.score - before.score)}分` : '—'}</td>
              </tr>
            })}</tbody>
          </table>
          {post && posttest && <div className="course-test-recommendations"><h3>接下来复习什么</h3>
            {authoredLessons.filter((lesson) => scoreAttempt(posttest, [lesson.id]).score < 2).length === 0
              ? <p>这次后测全部答对。可回到课内练习，用自己的办公场景继续检验理解。</p>
              : <ul>{authoredLessons.filter((lesson) => scoreAttempt(posttest, [lesson.id]).score < 2).map((lesson) => (
                <li key={lesson.id}><a href={appPath(`/lesson/${lesson.id}`)}>复习 {lesson.id} {lesson.title}</a><span> · 后测 {scoreAttempt(posttest, [lesson.id]).score}/2</span></li>
              ))}</ul>}
          </div>}
        </>
      )}
    </section>
  )
}

function TestRunner({ kind, attempt, profile, onProfileChange }: {
  kind: AssessmentKind; attempt: CourseTestAttempt; profile: LearningProfile; onProfileChange(next: LearningProfile): void
}) {
  const [confirming, setConfirming] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const confirmRef = useRef<HTMLHeadingElement>(null)
  const questions = courseTestQuestions[kind]
  const question = questions[attempt.currentQuestion]
  const answered = Object.keys(attempt.answers).length
  useEffect(() => { titleRef.current?.focus() }, [question.id])
  useEffect(() => { if (confirming) confirmRef.current?.focus() }, [confirming])
  function go(index: number) { setConfirming(false); onProfileChange(editCourseTest(profile, kind, { currentQuestion: index })) }
  return (
    <section className="course-test-runner" aria-label={`${labels[kind]}答题区`}>
      <div className="course-test-progress"><span role="status" aria-live="polite">已答 {answered} / 24 题</span><span>当前第 {attempt.currentQuestion + 1} 题</span></div>
      <progress aria-label="测评作答进度" max={24} value={answered} />
      <p className="course-test-note">提交前不显示答案或解析；可修改、跳题或离开后继续。答案随学习档案保存，若页面提示保存失败，请先重试保存。</p>
      <div className="course-test-question-grid" role="group" aria-label="题号导航">{questions.map((q, index) => (
        <button key={q.id} type="button" aria-label={`第 ${index + 1} 题，${attempt.answers[q.id] ? '已答' : '未答'}`}
          aria-current={index === attempt.currentQuestion ? 'step' : undefined}
          className={attempt.answers[q.id] ? 'is-answered' : ''} onClick={() => go(index)}>{index + 1}<span className="sr-only">{attempt.answers[q.id] ? '已答' : '未答'}</span></button>
      ))}</div>
      <fieldset className="course-test-question" key={question.id} aria-labelledby="course-test-question-title">
        <legend className="sr-only">第 {attempt.currentQuestion + 1} 题</legend>
        <p className="eyebrow">{question.lessonId} · {lessonById.get(question.lessonId)?.title}</p>
        <h2 tabIndex={-1} ref={titleRef} id="course-test-question-title">{question.prompt}</h2>
        <div className="assessment-options">{spreadCorrectOption(question.options, question.correctOptionId, `course-${kind}`, attempt.currentQuestion).map((option) => (
          <label key={option.id}><input type="radio" name={question.id} value={option.id}
            aria-labelledby={`answer-${option.id}`} checked={attempt.answers[question.id] === option.id}
            onChange={() => { setConfirming(false); onProfileChange(editCourseTest(profile, kind, { questionId: question.id, optionId: option.id })) }} />
            <span id={`answer-${option.id}`}>{option.label}</span></label>
        ))}</div>
      </fieldset>
      <div className="course-test-actions">
        <button type="button" disabled={attempt.currentQuestion === 0} onClick={() => go(attempt.currentQuestion - 1)}>上一题</button>
        <button type="button" disabled={attempt.currentQuestion === questions.length - 1} onClick={() => go(attempt.currentQuestion + 1)}>下一题</button>
        <button type="button" className="primary-button" disabled={answered !== questions.length} onClick={() => setConfirming(true)}>提交{labels[kind]}</button>
      </div>
      {answered !== questions.length && <p>还剩 {questions.length - answered} 题未答，全部作答后即可提交。</p>}
      {confirming && <section className="course-test-confirm" aria-label="测评提交确认">
        <h3 tabIndex={-1} ref={confirmRef}>确认提交这次{labels[kind]}？</h3>
        <p>24 题已作答。提交后保留本次首次结果，不再修改答案；课内练习仍可继续使用。</p>
        <div className="course-test-actions"><button type="button" onClick={() => setConfirming(false)}>返回检查</button>
          <button type="button" className="primary-button" onClick={() => onProfileChange(editCourseTest(profile, kind, { submit: true }))}>确认提交{kind === 'pretest' ? '前测' : '后测'}</button></div>
      </section>}
    </section>
  )
}

function TestReview({ attempt }: { attempt: CourseTestAttempt }) {
  return <section className="course-test-review" aria-label="已提交测评解析"><h2>作答回顾</h2>
    <p>以下解析只在提交后开放，本次结果保留用于对照。离开前请确认页面未提示保存失败。</p>
    {courseTestQuestions[attempt.kind].map((q, index) => {
      const correct = attempt.answers[q.id] === q.correctOptionId
      return <details key={q.id}><summary>第 {index + 1} 题 · {q.lessonId} · {correct ? '答对' : '待复习'}</summary>
        <h3>{q.prompt}</h3><p>你的答案：{q.options.find((o) => o.id === attempt.answers[q.id])?.label}</p>
        <p>参考答案：{q.options.find((o) => o.id === q.correctOptionId)?.label}</p><p>{q.explanation}</p>
        <p>审核来源：{q.sourceRefIds.join('、')}</p><a href={appPath(`/lesson/${q.lessonId}#source-evidence`)}>回看 {q.lessonId} 课程与来源</a>
      </details>
    })}
  </section>
}

export function CourseAssessmentPage({ profile, onProfileChange }: { profile: LearningProfile; onProfileChange(next: LearningProfile): void }) {
  const { kind: routeKind } = useParams()
  if (routeKind !== undefined && routeKind !== 'pretest' && routeKind !== 'posttest') return <main className="course-test-page"><h1>找不到这项测评</h1><a href={appPath('/assessment')}>返回课程测评</a></main>
  const kind = routeKind as AssessmentKind | undefined
  const attempt = kind ? profile.courseAssessments[kind] : undefined
  const locked = kind === 'posttest' && !attempt?.completedAt && completedLessonCount(profile) < authoredLessons.length
  return <main className="course-test-page">
    <header className="course-test-hero"><p className="eyebrow">12 课 · 每课 2 题 · 独立情境卷</p><h1>{kind ? labels[kind] : '课程测评与结果对照'}</h1>
      <p>测评独立于课内练习。每题 1 分，不限时；首次提交后保留结果。测评不是考试认证，也不影响课程浏览。</p>
      <nav aria-label="测评页面导航"><a href={appPath('/')}>返回学习地图</a><a href={appPath('/assessment')}>结果对照</a><a href={appPath('/profile')}>学习档案与备份</a></nav>
    </header>
    {!kind && <><CourseAssessmentEntry profile={profile} /><CourseAssessmentResults profile={profile} /></>}
    {kind && locked && <section className="course-test-start" role="status"><h2>完成 12 课后开启后测</h2>
      <p>当前已完成 {completedLessonCount(profile)} / 12 课。请在每课末尾点击“完成本课”，再回来作答。</p><a href={appPath('/')}>继续学习未完成课程</a></section>}
    {kind && !locked && !attempt && <section className="course-test-start"><h2>准备开始{labels[kind]}</h2>
      <p>共 24 题，建议预留约 10–15 分钟，按自己当前的理解作答。可随时暂停后继续。</p>
      {kind === 'pretest' && hasCourseLearning(profile) && <p role="note">你已有学习记录，本次前测将标为“补测”，不用于计算学习提升。</p>}
      {kind === 'posttest' && !profile.courseAssessments.pretest?.completedAt && <p role="note">尚未提交课程前测。可以单独完成后测，但不计算前后提升。</p>}
      <button className="primary-button" type="button" onClick={() => onProfileChange(editCourseTest(profile, kind))}>开始作答{labels[kind]}</button></section>}
    {kind && !locked && attempt && !attempt.completedAt && <TestRunner key={kind} kind={kind} attempt={attempt} profile={profile} onProfileChange={onProfileChange} />}
    {kind && attempt?.completedAt && <><div role="status" className="course-test-completed"><h2>{labels[kind]}已提交</h2><p>得分 {scoreAttempt(attempt).score} / 24 · 正确率 {percent(scoreAttempt(attempt).percent)}</p></div>
      <CourseAssessmentResults profile={profile} /><TestReview attempt={attempt} /></>}
  </main>
}
