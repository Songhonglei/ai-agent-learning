const stages = [
  ['目标', '要完成什么'],
  ['输入', '使用哪些资料'],
  ['步骤', '按什么顺序推进'],
  ['异常', '遇到条件变化怎么办'],
  ['完成标准', '怎样算任务完成'],
] as const

export function PromptFlowDiagram() {
  return (
    <figure className="prompt-flow-figure" aria-label="流程驱动提示词示意图">
      <div className="prompt-flow-heading">
        <div>
          <p>流程组织</p>
          <h3>让规则形成可执行路径</h3>
        </div>
        <span>当前阶段清楚</span>
      </div>
      <ol>
        {stages.map(([title, detail], index) => (
          <li key={title}>
            <span aria-hidden="true">{index + 1}</span>
            <strong>{title}</strong>
            <small>{detail}</small>
          </li>
        ))}
      </ol>
      <figcaption>
        提示词按目标、输入、步骤、异常和完成标准组织，帮助 Agent 判断当前该做什么。
      </figcaption>
    </figure>
  )
}
