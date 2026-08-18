const layers = [
  ['评估环境', '在哪里、用什么情境检查'],
  ['判断标准', '以什么可验证条件判定'],
  ['改进决策', '发现后如何修正并回归检查'],
] as const

export function EvaluationDiagram() {
  return (
    <figure className="memory-layers-figure evaluation-diagram" aria-label="Agent 评估三层示意图">
      <div className="prompt-flow-heading">
        <div>
          <p>评估体系</p>
          <h3>评估要能指导下一次改进</h3>
        </div>
        <span>三层检查</span>
      </div>
      <ol>
        {layers.map(([title, detail]) => (
          <li key={title}>
            <div>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
          </li>
        ))}
      </ol>
      <figcaption>评估环境、可验证标准和改进决策共同构成检查 Agent 的基本路径。</figcaption>
    </figure>
  )
}
