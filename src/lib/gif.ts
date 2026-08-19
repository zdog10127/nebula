const GIF_URL_PATTERN = /^https?:\/\/\S+\.(gif|webp)(\?\S*)?$/i
const GIF_HOST_PATTERN = /^https?:\/\/\S*(tenor\.com|giphy\.com)\/\S+$/i

export function embeddableGifUrl(content: string): string | null {
  const trimmed = content.trim()
  if (trimmed.includes(' ') || trimmed.includes('\n')) return null
  if (GIF_URL_PATTERN.test(trimmed) || GIF_HOST_PATTERN.test(trimmed)) return trimmed
  return null
}
