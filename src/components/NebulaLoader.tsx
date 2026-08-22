// An orbiting-dot spinner instead of a generic spinning ring — keeps the same "orbit" motif
// as the logo and the voice-room iconography, rather than a borrowed default. Pure CSS
// (Tailwind's built-in `animate-spin`), theme-aware since it only uses `--color-accent` /
// `--color-border`, no per-theme-preset special-casing needed.
export default function NebulaLoader({ size = 28, className = '' }: { size?: number; className?: string }) {
  const dotSize = Math.max(4, size * 0.22)
  return (
    <div className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }} role="status" aria-label="Carregando">
      <div className="absolute inset-0 rounded-full border-2 border-border" />
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1s' }}>
        <span
          className="absolute rounded-full bg-accent"
          style={{
            width: dotSize,
            height: dotSize,
            top: -dotSize / 2 + 1,
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 6px var(--color-accent)',
          }}
        />
      </div>
    </div>
  )
}
