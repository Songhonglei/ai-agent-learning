const parts = [
  ['LLM', '大脑', '理解请求，思考并决定下一步'],
  ['上下文', '眼睛', '提供当前可见的规则、信息和结果'],
  ['工具', '手脚', '把决定落实为查询、操作或沟通'],
] as const

export function AgentFormulaDiagram() {
  return (
    <figure className="agent-formula-figure" aria-label="Agent 三要素示意图">
      <div className="agent-formula-heading">
        <div>
          <p>图 0-1</p>
          <h3>Agent = LLM + 上下文 + 工具</h3>
        </div>
        <span>缺一不可</span>
      </div>
      <ol>
        {parts.map(([technical, metaphor, detail]) => (
          <li key={technical}>
            <span>{metaphor}</span>
            <strong>{technical}</strong>
            <small>{detail}</small>
          </li>
        ))}
      </ol>
      <figcaption>Agent 由 LLM（大脑）、上下文（眼睛）和工具（手脚）构成；三者共同作用于 Agent。</figcaption>
    </figure>
  )
}
