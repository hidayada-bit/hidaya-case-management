import { LANGS, getLang, setLang, useLang } from '../lib/i18n'
import { supabase } from '../lib/supabase'

// Three pills: English · አማርኛ · Afaan Oromoo. The choice is kept on this device and, when signed in, on the user's profile.
export default function LanguageSwitcher({ userId, compact = false, style }) {
  const current = useLang()
  const pick = id => {
    setLang(id)
    if (userId) supabase.from('users').update({ language: id }).eq('id', userId).then(() => {}, () => {})
  }
  return (
    <div role="group" aria-label="Language / ቋንቋ / Afaan" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...style }}>
      {LANGS.map(l => {
        const on = current === l.id
        return (
          <button key={l.id} type="button" onClick={() => pick(l.id)} aria-pressed={on}
            style={{
              padding: compact ? '5px 11px' : '9px 16px', borderRadius: 20, fontSize: compact ? 12 : 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${on ? '#1e7d22' : '#c9d6c9'}`, background: on ? '#1e7d22' : '#fff', color: on ? '#fff' : '#33423a', minHeight: compact ? 30 : 40,
            }}>{l.label}</button>
        )
      })}
    </div>
  )
}
export { getLang }
