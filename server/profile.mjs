export function isProfilePayload(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.schemaVersion === 1
    && (value.theme === 'light' || value.theme === 'dark')
    && typeof value.currentLessonId === 'string'
    && value.courses && typeof value.courses === 'object'
    && Array.isArray(value.wrongAnswers)
    && Array.isArray(value.favoriteContentIds)
    && value.assessments && typeof value.assessments === 'object'
    && typeof value.updatedAt === 'string'
}
