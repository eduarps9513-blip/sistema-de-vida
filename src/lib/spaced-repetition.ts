// SM-2 Spaced Repetition Algorithm (simplified)
export interface SM2Result {
  interval: number
  easeFactor: number
  repetitions: number
  nextReviewDate: Date
}

/**
 * Calculate next review interval using SM-2 algorithm
 * @param quality 0-5 (0-2 = forgot, 3-5 = remembered)
 */
export function calculateSM2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result {
  let newInterval: number
  let newEaseFactor = easeFactor
  let newRepetitions = repetitions

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 3
    } else {
      newInterval = Math.round(interval * easeFactor)
    }
    newEaseFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * 0.08
    )
    newRepetitions = repetitions + 1
  } else {
    // Incorrect response — restart
    newInterval = 1
    newRepetitions = 0
    newEaseFactor = Math.max(1.3, easeFactor - 0.2)
  }

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)
  nextReviewDate.setHours(0, 0, 0, 0)

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    nextReviewDate,
  }
}

export function getInitialEntry() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: tomorrow,
  }
}
