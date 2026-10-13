import { useState, useEffect, useCallback } from 'react'

const KEY = 'hda-theme'

const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light') return v
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const applyTheme = t => {
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0b1a0c' : '#0d3b0f')
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
