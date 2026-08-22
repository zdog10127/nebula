import { useTheme } from '../lib/ThemeContext'
import type { ThemePreset } from '../lib/ThemeContext'

// Purely decorative, ambient flourish for the login/register screens — the one place that's
// guaranteed to show it edge-to-edge (everywhere inside the app shell itself is covered by
// opaque sidebars/panels on purpose, for legibility). Drop this inside any container that
// already has `relative overflow-hidden` and it fills it. Switching themes changes this too,
// not just the flat colors — that's the "something that changes more" ask.
const BLOB_COLORS: Record<Exclude<ThemePreset, 'terminal'>, [string, string, string]> = {
  nebula: ['#22d3ee', '#6366f1', '#0ea5e9'],
  aurora: ['#c084fc', '#f472b6', '#22d3ee'],
  daylight: ['#f59e0b', '#fb923c', '#fde68a'],
  sakura: ['#fb7185', '#f9a8d4', '#fda4af'],
  oled: ['#22d3ee', '#22d3ee', '#22d3ee'],
}

export default function ThemeBackdrop() {
  const { preset } = useTheme()

  if (preset === 'terminal') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40" aria-hidden="true">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(57,255,106,0.07)_0px,rgba(57,255,106,0.07)_1px,transparent_1px,transparent_3px)]" />
        <div className="absolute -top-1/3 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />
      </div>
    )
  }

  const [a, b, c] = BLOB_COLORS[preset]
  const opacityClass = preset === 'oled' ? 'opacity-[0.08]' : 'opacity-40'

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${opacityClass}`} aria-hidden="true">
      <div
        className="animate-blob-drift-1 absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: a }}
      />
      <div
        className="animate-blob-drift-2 absolute -bottom-32 -left-20 h-[380px] w-[380px] rounded-full blur-[110px]"
        style={{ background: b }}
      />
      <div
        className="animate-blob-drift-3 absolute -bottom-20 -right-16 h-[360px] w-[360px] rounded-full blur-[110px]"
        style={{ background: c }}
      />
    </div>
  )
}
