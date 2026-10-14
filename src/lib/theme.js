import { useState, useEffect, useCallback } from 'react'

// ── Colour tokens ───────────────────────────────────────────────────────────
// Every colour in the UI goes through these CSS variables. Light values live in
// index.html (:root) and night values in `html.dark`, so switching theme is just
// toggling one class — no filters, so photos and logos are never altered.
export const B = {
  green: 'var(--c-green)', greenDark: 'var(--c-green-dark)', greenLight: 'var(--c-green-light)', greenMid: 'var(--c-green-mid)',
  gold: 'var(--c-gold)', goldDark: 'var(--c-gold-dark)', goldLight: 'var(--c-gold-light)', goldMid: 'var(--c-gold-mid)',
  sidebar: 'var(--c-sidebar)', sidebarMid: 'var(--c-sidebar-mid)',
  white: 'var(--c-card)', card: 'var(--c-card)', input: 'var(--c-input)', bg: 'var(--c-bg)',
  border: 'var(--c-border)', text: 'var(--c-text)', textMid: 'var(--c-text-mid)', textLight: 'var(--c-text-light)',
}

const KEY = 'hda-theme'

const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light') return v
  } catch { /* storage unavailable */ }
  return 'light'
}

export const applyTheme = t => {
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0a1f0c' : '#0d3b0f')
}

// Apply as early as possible (called from main.jsx) to avoid a light flash.
export const initTheme = () => applyTheme(read())

export function useTheme() {
  const [theme, setTheme] = useState(read)
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])
  const toggle = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle, isDark: theme === 'dark' }
}
