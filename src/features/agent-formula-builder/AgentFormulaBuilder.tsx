import {
  evaluateFormulaSelection,
  FORMULA_ITEMS,
  formulaSelectionId,
  selectedFormulaPart,
  type FormulaPart,
} from './agentFormulaBuilderState'
import { teacherFeedback } from '../../shared/ui/teacherFeedback'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'

interface AgentFormulaBuilderProps {
  selectedIds: string[]
  onSelectionChange(selectedIds: string[]): void
}

const parts: Array<{ id: FormulaPart; label: string; note: string }> = [
  { id: 'llm', label: '大脑 · LLM', note: '理解、比较、规划、决定下一步' },
  { id: 'context', label: '眼睛 · 上下文', note: '当前能看到的规则、信息和结果' },
  { id: 'tools', label: '手脚 · 工具', note: '查询、操作或沟通的手段' },
]

export function AgentFormulaBuilder({
  selectedIds,
  onSelectionChange,
}: AgentFormulaBuilderProps): React.JSX.Element {
  const result = evaluateFormulaSelection(selectedIds)

  function selectPart(itemId: string, part: FormulaPart) {
    const next = selectedIds.filter((id) => !id.startsWith(`${itemId}:`))
    onSelectionChange([...next, formulaSelectionId(itemId, part)])
  }

  return (
    <div className="formula-builder" aria-labelledby="formula-builder-title">
      <div className="formula-builder-heading">
        <div>
          <p className="formula-builder-kicker">三要素练习</p>
          <h3 id="formula-builder-title">把任务放回三要素</h3>
        </div>
        <span>{result.correct} / {FORMULA_ITEMS.length} 已匹配</span>
      </div>
      <p className="formula-builder-guide">先看它是“想什么”“看什么”还是“做什么”，再选择对应位置。</p>

      <div className="formula-builder-list">
        {FORMULA_ITEMS.map((item, itemIndex) => {
          const selected = selectedFormulaPart(selectedIds, item.id)
          const isCorrect = selected === item.correctPart
          const orderedParts = spreadCorrectOption(
            parts,
            item.correctPart,
            'agent-formula:items',
            itemIndex,
          )
          return (
            <fieldset className="formula-builder-item" key={item.id}>
              <legend>{item.label}</legend>
              <div className="formula-builder-options">
                {orderedParts.map((part) => (
                  <label key={part.id} title={part.note}>
                    <input
                      type="radio"
                      name={`formula-builder-${item.id}`}
                      checked={selected === part.id}
                      onChange={() => selectPart(item.id, part.id)}
                    />
                    <span>{part.label}</span>
                  </label>
                ))}
              </div>
              {selected && (
                <p className={isCorrect ? 'formula-builder-feedback is-correct' : 'formula-builder-feedback is-wrong'} role="status">
                  {teacherFeedback(`formula:${item.id}:${selected}`, isCorrect)}
                  {!isCorrect && ' 这是 Agent 此刻要想、要看，还是要动手做的事？'}
                </p>
              )}
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}
