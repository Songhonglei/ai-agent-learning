export const correctTeacherFeedback = [
  '这题抓得很准。',
  '对，就是这个意思。',
  '判断到位，继续。',
  'Nice，这个线索你看到了。',
  '答得漂亮，逻辑顺了。',
  '嗯，关键点抓住了。',
  '很好，这一步没跑偏。',
  '正解，思路很清楚。',
  '没错，继续往下推。',
  '稳，这个判断成立。',
  'Good call，方向对了。',
  '说得通，证据也对上了。',
  '对味了，这正是要找的。',
  '这一题拿下。',
  '你已经把重点拎出来了。',
  '漂亮，判断和材料一致。',
  'Yep，答案在这里。',
  '看得细，这个区分很重要。',
] as const

export const incorrectTeacherFeedback = [
  '先别急，再看一眼题干。',
  '差一点，关键线索还没用上。',
  '这个方向容易混，咱们换个角度。',
  '不急，回到任务目标再想想。',
  'Almost，少看了一层条件。',
  '这里踩到常见坑了，没关系。',
  '先停一下，看看它实际在做什么。',
  '这次不对，但思路可以往证据靠。',
  '再推一步，别只看表面词。',
  'Hmm，题干里还有个限定没抓住。',
  '答案不在这边，看看下一步动作。',
  '别灰心，把场景拆开会更清楚。',
  '这道题有迷惑性，再读一遍。',
  '还差一块拼图：目标、信息还是行动？',
  '再校准一下，重点是题目给出的条件。',
  'Not quite，先区分事实和标签。',
  '换条思路：先问“为什么”。',
  '这次先记下，下一题把它赢回来。',
] as const

function stableIndex(seed: string, length: number): number {
  let hash = 0
  for (const character of seed) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0
  return hash % length
}

export function teacherFeedback(seed: string, isCorrect: boolean): string {
  const phrases = isCorrect ? correctTeacherFeedback : incorrectTeacherFeedback
  return phrases[stableIndex(seed, phrases.length)]
}
