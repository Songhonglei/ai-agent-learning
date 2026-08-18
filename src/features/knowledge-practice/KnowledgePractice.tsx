import { teacherFeedback } from '../../shared/ui/teacherFeedback'
import { spreadCorrectOption } from '../../shared/ui/answerOrder'

type PracticeKind = 'knowledge-freshness' | 'knowledge-retrieval' | 'memory-layers' | 'tool-chain' | 'react-cycle' | 'evaluation-case' | 'collaboration-case'

interface KnowledgePracticeProps {
  kind: PracticeKind
  selectedIds: string[]
  onSelectionChange(ids: string[]): void
}

const practices = {
  'knowledge-freshness': {
    title: '哪些问题需要查阅更新资料？',
    intro: '三道情境题',
    options: ['可以主要依靠通用知识解释', '需要连接已维护的资料再回答'],
    cards: [
      ['office', '解释“会议纪要”通常包含什么。', 0],
      ['policy', '查询本公司本周生效的差旅报销规则。', 1],
      ['history', '概括一段已经提供的项目背景。', 0],
    ],
    correct: '判断正确。通用概念与已经给出的材料可直接处理；时效性、组织特有或需要精确依据的信息，应先取回可信资料。',
  },
  'knowledge-retrieval': {
    title: '为问题找到最相关的公司资料',
    intro: '资料匹配练习',
    options: ['员工手册：远程办公申请流程', '采购指南：供应商准入与审批', '会议室使用说明'],
    cards: [
      ['remote', '员工想知道居家办公前需要完成什么申请。', 0],
      ['vendor', '团队准备引入新的外部供应商。', 1],
      ['room', '同事需要预订带投屏设备的会议室。', 2],
    ],
    correct: '判断正确。RAG 的关键不是“让模型猜”，而是先为当前问题取回相关、受维护的资料，再把资料带入回答上下文。',
  },
  'memory-layers': {
    title: '把信息放到合适的记忆层',
    intro: '分类练习',
    options: ['当前会话线索', '用户长期偏好', '业务任务状态'],
    cards: [
      ['draft', '这次会议纪要还缺一项待确认的预算数字。', 0],
      ['preference', '用户长期偏好简洁、先给结论再给细节。', 1],
      ['approval', '采购申请处于“等待财务审批”阶段。', 2],
    ],
    correct: '判断正确。当前线索服务这一轮任务；长期偏好跨会话帮助个性化；业务状态记录任务走到哪一步。',
  },
  'tool-chain': { title: '为任务选出合适的工具角色', intro: '工具角色练习', options: ['感知：查找或读取资料', '执行：对外产生操作', '协作：通知或请求他人确认'], cards: [['search', '先找出最新的差旅制度。', 0], ['submit', '把已确认的报销单提交到系统。', 1], ['confirm', '把高风险付款交给负责人确认。', 2]], correct: '判断正确。工具分工帮助 Agent 知道先获取什么信息、何时会改变外部世界，以及何时必须交还人类。' },
  'react-cycle': { title: '判断任务循环的当前步骤', intro: '循环步骤练习', options: ['思考：根据目标和已知信息决定下一步', '行动：调用工具或执行允许的操作', '观察：读取工具返回的结果'], cards: [['plan', '发现缺少当前汇率，决定查询汇率服务。', 0], ['call', '向汇率服务发起查询。', 1], ['result', '收到“1 USD = …”的查询结果。', 2]], correct: '判断正确。观察到结果后，Agent 还要重新判断是否足够、是否应继续，或在异常时停止并交还人类。' },
  'evaluation-case': { title: '为案例补上缺失的评估层', intro: '评估案例练习', options: ['评估环境：准备可重复的任务场景', '判断标准：定义可验证的通过条件', '改进闭环：把发现变成下一轮检查'], cards: [['scene', '让 Agent 在相同的客户取消订单场景中完成任务。', 0], ['rubric', '检查是否既更新订单状态，也说清退款时间。', 1], ['iterate', '把线上出现的失败案例加入后续回归检查。', 2]], correct: '判断正确。评估不是只看一次答案；环境、标准和改进闭环共同帮助团队知道系统哪里可靠、哪里还要修。' },
  'collaboration-case': { title: '判断何时值得拆成多个 Agent', intro: '协作判断练习', options: ['单 Agent 更合适', '多 Agent 可带来清晰价值'], cards: [['rewrite', '两个人工角色只是轮流重读同一段文案，没有新资料或工具反馈。', 0], ['parallel', '多个独立地区的资料需要并行收集，最后再汇总。', 1], ['review', '审阅者能运行测试并把新结果反馈给执行者。', 1]], correct: '判断正确。多 Agent 的价值来自新信息、并行能力或隔离需求；只有重复同一上下文时，不应为了“多”而多。' },
} as const

export function KnowledgePractice({ kind, selectedIds, onSelectionChange }: KnowledgePracticeProps) {
  const practice = practices[kind]
  const selected = new Map(
    selectedIds.map((entry): [string, string] => {
      const [cardId, optionId = ''] = entry.split(':', 2)
      return [cardId, optionId]
    }),
  )
  const completed = practice.cards.filter(([id]) => selected.has(id)).length
  const allCorrect = practice.cards.every(([id, , answer]) => selected.get(id) === String(answer))

  function choose(cardId: string, optionIndex: number) {
    onSelectionChange([
      ...selectedIds.filter((entry) => !entry.startsWith(`${cardId}:`)),
      `${cardId}:${optionIndex}`,
    ])
  }

  return (
    <section className="knowledge-practice" aria-labelledby={`${kind}-title`}>
      <div>
        <p>{practice.intro}</p>
        <h3 id={`${kind}-title`}>{practice.title}</h3>
        <span>{completed} / {practice.cards.length} 已判断</span>
      </div>
      {practice.cards.map(([id, prompt, answer], cardIndex) => {
        const choice = selected.get(id)
        const orderedOptions = spreadCorrectOption(
          practice.options.map((label, index) => ({ id: String(index), label })),
          String(answer),
          `${kind}:cards`,
          cardIndex,
        )
        return (
          <fieldset key={id}>
            <legend>{prompt}</legend>
            {orderedOptions.map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name={`${kind}-${id}`}
                  checked={choice === option.id}
                  onChange={() => choose(id, Number(option.id))}
                />
                {option.label}
              </label>
            ))}
            {choice !== undefined && (
              <p className={choice === String(answer) ? 'prompt-result is-correct' : 'prompt-result is-wrong'} role="status">
                {choice === String(answer)
                  ? teacherFeedback(`${kind}:${id}`, true)
                  : `${teacherFeedback(`${kind}:${id}:${choice}`, false)} 先判断信息的时效、来源与任务用途，再选择合适的位置。`}
              </p>
            )}
          </fieldset>
        )
      })}
      {allCorrect && <p className="prompt-result is-correct" role="status">{practice.correct}</p>}
    </section>
  )
}
