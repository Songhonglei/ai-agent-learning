const contextItems = [
  { kind: '规则', title: '系统提示', detail: '定义角色、边界与必须遵守的规则' },
  { kind: '请求', title: '用户消息', detail: '提出当前要完成的具体任务' },
  { kind: '历史', title: '助手回复', detail: '保留此前已经形成的判断与表达' },
  { kind: '行动', title: '工具调用', detail: '记录为任务执行的操作与参数' },
  { kind: '观察', title: '工具结果', detail: '把操作返回的事实带回当前判断' },
] as const

export function ContextWindowDiagram() {
  return (
    <figure className="context-window-figure" aria-label="上下文窗口示意图">
      <div className="context-window-heading">
        <div>
          <p className="context-window-kicker">图 2-1</p>
          <h3>一次调用，此刻能看见什么</h3>
        </div>
        <span>有限窗口</span>
      </div>

      <div className="context-window-frame">
        <ol className="context-window-sequence">
          {contextItems.map((item, index) => (
            <li key={item.title}>
              <span className="context-window-index" aria-hidden="true">{index + 1}</span>
              <span className="context-window-copy">
                <small>{item.kind}</small>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
            </li>
          ))}
          <li className="current-generation">
            <span className="generation-pulse" aria-hidden="true" />
            <span className="context-window-copy">
              <small>正在发生</small>
              <strong>当前生成位置</strong>
              <span>Agent 只基于窗口内当前可见的信息继续生成</span>
            </span>
          </li>
        </ol>

        <p className="context-window-limit">
          <strong>上下文窗口容量有限</strong>
          缺少任务关键信息，或重要信息超出可见窗口，都可能让当前判断偏离约束。
        </p>
      </div>

      <aside className="context-window-text" role="note" aria-label="图 2-1 完整文字说明">
        <strong>图 2-1 完整文字说明</strong>
        <p>
          当前上下文窗口可依次包含系统提示、用户消息、助手回复、工具调用和工具结果；
          Agent 在当前生成位置继续输出。窗口容量有限，缺少任务关键信息或重要信息超出窗口，
          都可能使当前判断不符合任务约束。
        </p>
      </aside>
    </figure>
  )
}
