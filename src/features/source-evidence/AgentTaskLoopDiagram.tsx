const stages = [
  ['目标', '明确要推进的任务'],
  ['读取信息', '看见规则、资料和当前状态'],
  ['调用工具', '查询、操作或沟通'],
  ['查看结果', '把反馈带回下一步判断'],
] as const

export function AgentTaskLoopDiagram() {
  return (
    <figure className="agent-loop-figure agent-task-loop-figure" aria-label="Agent 任务循环示意图">
      <div className="agent-loop-heading">
        <div>
          <p>日常任务</p>
          <h3>不是一次回答，而是持续推进</h3>
        </div>
        <span>目标驱动</span>
      </div>
      <ol>
        {stages.map(([title, detail]) => (
          <li key={title}>
            <div>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
          </li>
        ))}
      </ol>
      <figcaption>
        Agent 围绕目标读取信息、使用工具、查看结果，并继续调整下一步；这与单次生成答案的任务过程不同。
      </figcaption>
    </figure>
  )
}
