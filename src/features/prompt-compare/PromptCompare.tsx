import { teacherFeedback } from '../../shared/ui/teacherFeedback'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'

interface PromptCompareProps { selectedIds: string[]; onSelectionChange(ids: string[]): void }

export function PromptCompare({ selectedIds, onSelectionChange }: PromptCompareProps): React.JSX.Element {
  const selected = selectedIds[0]
  const choices = [
    { id: 'scattered', title: 'Prompt A · 规则堆砌', copy: '要专业。不要遗漏。先检查问题。可能要分类。注意敏感信息。按需总结。例外情况自行判断。不要太长。', good: false },
    { id: 'flow', title: 'Prompt B · 清晰流程', copy: '目标：整理客户反馈。步骤：1. 去重并分类；2. 标记需要人工确认的敏感项；3. 按“问题 / 证据 / 建议”输出；4. 缺少依据时明确说明。完成标准：每条建议都能回溯到反馈。', good: true },
  ] as const
  const answer = choices.find((choice) => choice.id === selected)
  const correctChoice = choices.find((choice) => choice.good)
  const orderedChoices = correctChoice
    ? spreadCorrectOption(choices, correctChoice.id, 'prompt-compare', 0)
    : choices
  return <div className="prompt-compare" aria-labelledby="prompt-compare-title"><div><p>提示词对比</p><h3 id="prompt-compare-title">哪份提示词更适合执行？</h3></div><fieldset><legend>同样是整理客户反馈，选择更清楚的任务组织方式</legend>{orderedChoices.map((choice) => <label key={choice.id}><input type="radio" name="prompt-compare" checked={selected === choice.id} onChange={() => onSelectionChange([choice.id])}/><span><strong>{choice.title}</strong><small>{choice.copy}</small></span></label>)}</fieldset>{answer && <p className={answer.good ? 'prompt-result is-correct' : 'prompt-result is-wrong'} role="status"><strong>{teacherFeedback(`prompt-compare:${answer.id}`, answer.good)}</strong>{answer.good ? '流程把目标、步骤、异常和完成标准排成可执行路径；不代表规则越多越好。' : '规则本身不一定错，但散落、重复且没有优先级时，Agent 难以知道当前该做什么。'}</p>}</div>
}
