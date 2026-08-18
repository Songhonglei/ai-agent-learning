export const mentorQuotes = [
  '别急着给答案，先把问题看清。',
  '会用工具很重要，知道何时停下更重要。',
  '一个好判断，往往从补齐背景开始。',
  '模型会猜，证据会说话。',
  '任务不是跑得快，而是走得明白。',
  '先分清目标，再决定下一步。',
  '看见约束，才算真正开始做事。',
  '把过程讲清楚，结果才值得相信。',
  '不确定不是失败，是提醒你去查证。',
  '工具会放大能力，也会放大疏忽。',
  '知道自己不知道什么，是很强的能力。',
  '好 Agent 不逞强，会在关键处向人确认。',
  '信息多不等于信息够，相关才重要。',
  '每次反馈，都是下一步的线索。',
  '先让任务可验证，再谈自动化。',
  '慢半步核对，常常省下后面十步。',
  '把复杂问题拆开，答案才会出现。',
  '规则不是束缚，是让协作更稳的扶手。',
  '把意图说清楚，工具才帮得上忙。',
  'Learn the pattern, not just the answer.',
] as const

export function randomMentorQuote(random = Math.random): string {
  return mentorQuotes[Math.floor(random() * mentorQuotes.length)] ?? mentorQuotes[0]
}
