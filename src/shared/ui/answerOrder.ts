function seededRandom(seed: string): () => number {
  let state = 2166136261
  for (const character of seed) {
    state ^= character.charCodeAt(0)
    state = Math.imul(state, 16777619)
  }

  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function stableShuffle<T>(items: readonly T[], seed: string): T[] {
  const shuffled = [...items]
  const random = seededRandom(seed)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function spreadCorrectOption<T extends { id: string }>(
  options: readonly T[],
  correctOptionId: string,
  groupSeed: string,
  questionIndex: number,
): T[] {
  const correctOption = options.find((option) => option.id === correctOptionId)
  if (!correctOption || options.length < 2) return [...options]

  const correctSlots = stableShuffle(
    Array.from({ length: options.length }, (_, index) => index),
    `${groupSeed}:correct-slots`,
  )
  const targetIndex = correctSlots[questionIndex % correctSlots.length]
  const distractors = stableShuffle(
    options.filter((option) => option.id !== correctOptionId),
    `${groupSeed}:${questionIndex}:distractors`,
  )

  return [
    ...distractors.slice(0, targetIndex),
    correctOption,
    ...distractors.slice(targetIndex),
  ]
}
