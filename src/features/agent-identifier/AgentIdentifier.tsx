import {
  evaluateIdentifierSelection,
  IDENTIFIER_SCENARIOS,
  identifierSelectionId,
  selectedIdentifierAnswer,
  type IdentifierAnswer,
} from './agentIdentifierState'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'

interface AgentIdentifierProps {
  selectedIds: string[]
  onSelectionChange(selectedIds: string[]): void
}

const options: Array<{ id: IdentifierAnswer; label: string }> = [
  { id: 'chat', label: '仅聊天回答' },
  { id: 'agent', label: '具备 Agent 工作方式' },
  { id: 'unknown', label: '信息不足，不能断定' },
]

export function AgentIdentifier({
  selectedIds,
  onSelectionChange,
}: AgentIdentifierProps): React.JSX.Element {
  const result = evaluateIdentifierSelection(selectedIds)

  function selectAnswer(scenarioId: string, answerId: IdentifierAnswer) {
    const next = selectedIds.filter((id) => !id.startsWith(`${scenarioId}:`))
    onSelectionChange([...next, identifierSelectionId(scenarioId, answerId)])
  }

  return (
    <div className="agent-identifier" aria-labelledby="agent-identifier-title">
      <div className="agent-identifier-heading">
        <div>
          <p className="agent-identifier-kicker">情境辨析</p>
          <h3 id="agent-identifier-title">身边的 Agent 识别器</h3>
        </div>
        <span>{result.completed} / {IDENTIFIER_SCENARIOS.length} 已判断</span>
      </div>

      <div className="agent-identifier-list">
        {IDENTIFIER_SCENARIOS.map((scenario, scenarioIndex) => {
          const answer = selectedIdentifierAnswer(selectedIds, scenario.id)
          const isCorrect = answer === scenario.correctId
          const orderedOptions = spreadCorrectOption(
            options,
            scenario.correctId,
            'agent-identifier:scenarios',
            scenarioIndex,
          )
          return (
            <fieldset className="agent-identifier-card" key={scenario.id}>
              <legend>{scenario.title}</legend>
              <p>{scenario.description}</p>
              <div className="agent-identifier-options">
                {orderedOptions.map((option) => (
                  <label key={option.id}>
                    <input
                      type="radio"
                      name={`agent-identifier-${scenario.id}`}
                      checked={answer === option.id}
                      onChange={() => selectAnswer(scenario.id, option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {answer && (
                <p className={isCorrect ? 'agent-identifier-feedback is-correct' : 'agent-identifier-feedback is-wrong'} role="status">
                  <strong>{isCorrect ? '判断准确' : '换个角度'}</strong>
                  <span>{scenario.feedback}</span>
                </p>
              )}
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}
