import type { Lesson } from '../shared/types/lesson'
import { lessonZeroOne } from './lesson-0-1'
import { lessonZeroTwo } from './lesson-0-2'
import { lessonOne } from './lesson-1-1'
import { lessonOneTwo } from './lesson-1-2'
import { lessonOneThree } from './lesson-1-3'
import { lessonTwoOne } from './lesson-2-1'
import { lessonTwoTwo } from './lesson-2-2'
import { lessonTwoThree } from './lesson-2-3'
import { lessonThreeOne } from './lesson-3-1'
import { lessonThreeTwo } from './lesson-3-2'
import { lessonFourOne } from './lesson-4-1'
import { lessonFourTwo } from './lesson-4-2'

export const authoredLessons: Lesson[] = [
  lessonZeroOne,
  lessonZeroTwo,
  lessonOne,
  lessonOneTwo,
  lessonOneThree,
  lessonTwoOne,
  lessonTwoTwo,
  lessonTwoThree,
  lessonThreeOne,
  lessonThreeTwo,
  lessonFourOne,
  lessonFourTwo,
]

export const lessonById = new Map(authoredLessons.map((lesson) => [lesson.id, lesson]))
