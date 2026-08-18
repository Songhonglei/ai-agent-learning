import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { ContextWindowDiagram } from './ContextWindowDiagram'

describe('ContextWindowDiagram', () => {
  afterEach(cleanup)

  it('redraws every context role and the current generation marker with semantic HTML', () => {
    render(<ContextWindowDiagram />)

    const diagram = screen.getByRole('figure', { name: '上下文窗口示意图' })
    expect(within(diagram).getByText('系统提示')).toBeInTheDocument()
    expect(within(diagram).getByText('用户消息')).toBeInTheDocument()
    expect(within(diagram).getByText('助手回复')).toBeInTheDocument()
    expect(within(diagram).getByText('工具调用')).toBeInTheDocument()
    expect(within(diagram).getByText('工具结果')).toBeInTheDocument()
    expect(within(diagram).getByText('当前生成位置')).toBeInTheDocument()
    expect(within(diagram).getByText(/上下文窗口容量有限/)).toBeInTheDocument()
  })

  it('keeps a complete visible text alternative next to the redraw', () => {
    render(<ContextWindowDiagram />)

    const alternative = screen.getByRole('note', { name: '图 2-1 完整文字说明' })
    expect(alternative).toBeVisible()
    expect(alternative).toHaveTextContent('系统提示')
    expect(alternative).toHaveTextContent('用户消息')
    expect(alternative).toHaveTextContent('助手回复')
    expect(alternative).toHaveTextContent('工具调用')
    expect(alternative).toHaveTextContent('工具结果')
    expect(alternative).toHaveTextContent('当前生成位置')
    expect(alternative).toHaveTextContent('有限')
  })
})
