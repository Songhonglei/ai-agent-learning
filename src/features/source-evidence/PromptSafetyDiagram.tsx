const layers = [
  ['可信规则', '明确权限与不可突破的边界'],
  ['用户请求', '定义当前要完成的任务'],
  ['外部材料', '可阅读、可引用，但不自动成为指令'],
  ['高风险行动', '权限检查并要求人工确认'],
] as const

export function PromptSafetyDiagram() {
  return (
    <figure className="prompt-safety-figure" aria-label="提示注入分层防御示意图">
      <div className="prompt-safety-heading">
        <div>
          <p>分层防御</p>
          <h3>先辨来源，再决定行动</h3>
        </div>
        <span>外部材料不是命令</span>
      </div>
      <ol>
        {layers.map(([title, detail], index) => (
          <li key={title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
          </li>
        ))}
      </ol>
      <figcaption>
        来源标记、指令与数据分离、权限边界和高风险确认共同降低提示注入风险。
      </figcaption>
    </figure>
  )
}
