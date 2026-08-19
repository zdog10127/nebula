interface AvatarProps {
  url?: string | null
  name: string
  size?: number
  className?: string
}

export default function Avatar({ url, name, size = 32, className = '' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.4) }

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={style}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-bold text-accent ${className}`}
      style={style}
    >
      {initials(name)}
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}
