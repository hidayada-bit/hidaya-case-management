import { useSyncExternalStore } from 'react'
import { TRANSLATIONS } from './translations'

// Languages the app is available in. English is the source language; the others fall back to English for any text without a translation.
export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'am', label: 'አማርኛ' },
  { id: 'om', label: 'Afaan Oromoo' },
]
const KEY = 'hda-lang'
const valid = id => LANGS.some(l => l.id === id)
let lang = 'en'
try { const saved = localStorage.getItem(KEY); if (valid(saved)) lang = saved } catch { /* storage blocked: stay English */ }

const listeners = new Set()
export const getLang = () => lang
export function setLang(id) {
  if (!valid(id) || id === lang) return
  lang = id
  try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
  try { document.documentElement.lang = id === 'om' ? 'om' : id } catch { /* ignore */ }
  listeners.forEach(fn => fn())
}
export const subscribeLang = fn => { listeners.add(fn); return () => listeners.delete(fn) }
// Re-renders the calling component when the language changes.
export const useLang = () => useSyncExternalStore(subscribeLang, getLang)

// tl('Some English text {name}', { name }) -> text in the current language (English if there is no translation).
// A {word} that appears more than once can be given an array of values, used in order.
export function tl(key, params) {
  let s = (lang !== 'en' && TRANSLATIONS[lang]?.[key]) || key
  if (!params) return s
  const used = {}
  return s.replace(/\{([^{}]+)\}/g, (m, k) => {
    const v = params[k]
    if (v === undefined) return m
    if (Array.isArray(v)) { const i = used[k] || 0; used[k] = i + 1; return v[i] ?? '' }
    return v
  })
}
// English plural endings (s / ies / y) only make sense in English.
export const pl = suffix => (lang === 'en' ? suffix : '')
