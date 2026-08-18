import { evaluateContextSelection } from './contextBuilder.ts'
import { stableShuffle } from '../../shared/ui/answerOrder'

interface ContextBuilderProps {
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
}

const contextBlocks = [
  {
    id: 'code-context',
    category: '代码',
    title: '代码上下文',
    description: '支付页组件、报错堆栈和相关改动',
  },
  {
    id: 'workflow-constraint',
    category: '流程',
    title: '流程约束',
    description: '先补回归测试，经评审后才能发布',
  },
  {
    id: 'environment-context',
    category: '环境',
    title: '环境上下文',
    description: '当前框架版本、依赖和运行方式',
  },
  {
    id: 'last-year-roadmap',
    category: '无关',
    title: '去年产品路线图',
    description: '与这次支付页异常没有直接关系',
  },
] as const

const orderedContextBlocks = stableShuffle(contextBlocks, 'context-builder:blocks')

export function ContextBuilder({ selectedIds, onSelectionChange }: ContextBuilderProps) {
  const selection = new Set(selectedIds)
  const result = evaluateContextSelection(selectedIds)

  function toggleContext(id: string) {
    const nextSelection = new Set(selectedIds)

    if (nextSelection.has(id)) {
      nextSelection.delete(id)
    } else {
      nextSelection.add(id)
    }

    onSelectionChange([...nextSelection])
  }

  return (
    <div className="context-builder" aria-labelledby="context-builder-title">
      <div className="context-builder-heading">
        <div>
          <h3 id="context-builder-title">给 Agent 拼出当前上下文</h3>
        </div>
        <span>{selection.size} 项已选</span>
      </div>

      <fieldset className="context-block-list">
        <legend>选择修复支付页异常所需的信息块</legend>
        {orderedContextBlocks.map((block) => (
          <label className="context-block" key={block.id}>
            <input
              type="checkbox"
              checked={selection.has(block.id)}
              onChange={() => toggleContext(block.id)}
            />
            <span className="context-block-copy">
              <span className="context-block-category">{block.category}</span>
              <strong>{block.title}</strong>
              <span>{block.description}</span>
            </span>
            <span className="context-block-check" aria-hidden="true">
              {selection.has(block.id) ? '已选' : '选择'}
            </span>
          </label>
        ))}
      </fieldset>

      <p
        className={`context-builder-status context-builder-status-${result.status}`}
        role="status"
        aria-live="polite"
      >
        <strong>{result.status === 'ready' ? '可以继续分析' : `还缺 ${result.missingIds.length} 类必要背景`}</strong>
        <span>{result.message}</span>
      </p>
    </div>
  )
}
