import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { deriveAccentVariants } from './color'

export type ThemePreset = 'nebula' | 'aurora' | 'terminal' | 'daylight' | 'sakura' | 'oled'

export const THEME_PRESETS: readonly ThemePreset[] = ['nebula', 'aurora', 'terminal', 'daylight', 'sakura', 'oled']

const PRESET_KEY = 'nebula:themePreset'
const CUSTOM_ACCENT_KEY = 'nebula:customAccent'
const CUSTOM_CSS_KEY = 'nebula:customCss'
const CUSTOM_STYLE_EL_ID = 'nebula-custom-css'

const ACCENT_VAR_NAMES = [
  ['--color-accent', 'accent'],
  ['--color-accent-hover', 'accentHover'],
  ['--color-accent-active', 'accentActive'],
  ['--color-accent-soft', 'accentSoft'],
  ['--color-accent-border', 'accentBorder'],
] as const

interface ThemeContextValue {
  preset: ThemePreset
  setPreset: (preset: ThemePreset) => void
  customAccent: string | null
  setCustomAccent: (hex: string | null) => void
  customCss: string
  setCustomCss: (css: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readPreset(): ThemePreset {
  const stored = localStorage.getItem(PRESET_KEY)
  return stored && (THEME_PRESETS as readonly string[]).includes(stored) ? (stored as ThemePreset) : 'nebula'
}

function readCustomAccent(): string | null {
  const stored = localStorage.getItem(CUSTOM_ACCENT_KEY)
  return stored && /^#[0-9a-fA-F]{6}$/.test(stored) ? stored : null
}

function ensureCustomStyleEl(): HTMLStyleElement {
  let el = document.getElementById(CUSTOM_STYLE_EL_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = CUSTOM_STYLE_EL_ID
    document.head.appendChild(el)
  }
  return el
}

// Deliberately NOT scoped per-user-id like other localStorage prefs in this app (e.g. muted
// servers) — appearance should already be right on the login screen, before anyone is signed
// in, so it lives under a plain device-wide key instead.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>(readPreset)
  const [customAccent, setCustomAccentState] = useState<string | null>(readCustomAccent)
  const [customCss, setCustomCssState] = useState<string>(() => localStorage.getItem(CUSTOM_CSS_KEY) ?? '')

  useEffect(() => {
    document.documentElement.dataset.themePreset = preset
  }, [preset])

  useEffect(() => {
    const root = document.documentElement.style
    if (!customAccent) {
      for (const [cssVar] of ACCENT_VAR_NAMES) root.removeProperty(cssVar)
      return
    }
    const variants = deriveAccentVariants(customAccent)
    for (const [cssVar, key] of ACCENT_VAR_NAMES) root.setProperty(cssVar, variants[key])
  }, [customAccent])

  useEffect(() => {
    ensureCustomStyleEl().textContent = customCss
  }, [customCss])

  function setPreset(next: ThemePreset) {
    setPresetState(next)
    localStorage.setItem(PRESET_KEY, next)
  }

  function setCustomAccent(hex: string | null) {
    setCustomAccentState(hex)
    if (hex) localStorage.setItem(CUSTOM_ACCENT_KEY, hex)
    else localStorage.removeItem(CUSTOM_ACCENT_KEY)
  }

  function setCustomCss(css: string) {
    setCustomCssState(css)
    localStorage.setItem(CUSTOM_CSS_KEY, css)
  }

  return (
    <ThemeContext.Provider value={{ preset, setPreset, customAccent, setCustomAccent, customCss, setCustomCss }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
