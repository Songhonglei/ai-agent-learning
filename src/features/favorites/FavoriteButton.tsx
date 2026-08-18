export interface FavoriteButtonProps {
  contentId: string
  isFavorite: boolean
  label: string
  onToggle: (contentId: string) => void
}

export function questionFavoriteId(lessonId: string, questionId: string): string {
  return `question:${lessonId}:${questionId}`
}

export function sourceFavoriteId(lessonId: string, sourceRefId: string): string {
  return `source:${lessonId}:${sourceRefId}`
}

export function FavoriteButton({
  contentId,
  isFavorite,
  label,
  onToggle,
}: FavoriteButtonProps) {
  const action = isFavorite ? '取消收藏' : '收藏'

  return (
    <button
      className="favorite-button"
      type="button"
      aria-label={`${action}${label}`}
      aria-pressed={isFavorite}
      onClick={() => onToggle(contentId)}
    >
      <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
      {action}
    </button>
  )
}
