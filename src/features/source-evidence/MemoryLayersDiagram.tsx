const layers = [
  ['当前会话', '这轮任务正在处理的资料与线索'],
  ['用户长期记忆', '跨会话可复用的稳定偏好与事实'],
  ['业务任务状态', '任务所处阶段，例如等待确认或审批'],
] as const

export function MemoryLayersDiagram() {
  return (
    <figure className="memory-layers-figure" aria-label="Agent 记忆层次示意图">
      <div className="prompt-flow-heading">
        <div>
          <p>记忆层次</p>
          <h3>同一条信息，先问它服务什么</h3>
        </div>
        <span>按用途存放</span>
      </div>
      <ol>
        {layers.map(([title, detail]) => (
          <li key={title}>
            <div><strong>{title}</strong><small>{detail}</small></div>
          </li>
        ))}
      </ol>
      <figcaption>当前任务线索、跨会话用户信息和业务任务阶段解决不同问题，不应混作同一种“记忆”。</figcaption>
    </figure>
  )
}
