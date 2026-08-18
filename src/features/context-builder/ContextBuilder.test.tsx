import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ContextBuilder } from './ContextBuilder.tsx'

function BuilderHarness() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  return <ContextBuilder selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
}

describe('ContextBuilder', () => {
  afterEach(cleanup)

  it('lets keyboard users select blocks and announces specific missing risks', async () => {
    const user = userEvent.setup()
    render(<BuilderHarness />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('代码上下文')
    expect(status).toHaveTextContent('流程约束')
    expect(status).toHaveTextContent('环境上下文')

    await user.tab()
    expect(screen.getByRole('checkbox', { name: /代码上下文/ })).toHaveFocus()
    await user.keyboard('[Space]')

    expect(screen.getByRole('checkbox', { name: /代码上下文/ })).toBeChecked()
    expect(status).not.toHaveTextContent('错误位置')
    expect(status).toHaveTextContent('评审、测试或发布流程')
    expect(status).toHaveTextContent('不兼容的依赖或运行方式')
  })

  it('reports that necessary background is present after all three required blocks are selected', async () => {
    const user = userEvent.setup()
    render(<BuilderHarness />)

    await user.click(screen.getByRole('checkbox', { name: /代码上下文/ }))
    await user.click(screen.getByRole('checkbox', { name: /流程约束/ }))
    await user.click(screen.getByRole('checkbox', { name: /环境上下文/ }))

    expect(screen.getByRole('status')).toHaveTextContent('必要的代码、流程和环境背景已齐全')
  })
})
