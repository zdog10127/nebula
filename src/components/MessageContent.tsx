import type { ReactNode } from 'react'

const MENTION_PATTERN = /@(\w+)/g

// Purely a visual treatment: any @word is highlighted, regardless of whether it
// resolves to a real member. The backend computes the authoritative mention list
// (used for notifications/unread) separately — see MessageDto.mentionedUserIds.
export default function MessageContent({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  MENTION_PATTERN.lastIndex = 0

  while ((match = MENTION_PATTERN.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(
      <span key={match.index} className="rounded bg-accent-soft px-1 font-medium text-accent">
        {match[0]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return <p className="whitespace-pre-wrap break-words text-[15px] text-foreground/90">{parts}</p>
}
