import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { B } from '../lib/theme'
import Icon from '../components/Icon'

// Admin-only: pair Android phones running "Hidaya Caller ID". When a registered family calls, the phone shows who it is.
// Pairing = the admin names the phone, a one-time token is generated and shown ONCE, and it is typed into the app.
// The token carries the project address + a one-time secret; the database stores only the secret's hash.

const ago = d => {
  if (!d) return 'never'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 60 * 24) return `${Math.floor(m / 60)} h ago`
  return `${Math.floor(m / 1440)} d ago`
}

// "HDA1." + base64url({ u: project address, k: public (anon) key, t: one-time secret })
const buildToken = secret => {
  const json = JSON.stringify({ u: import.meta.env.VITE_SUPABASE_URL, k: import.meta.env.VITE_SUPABASE_ANON_KEY, t: secret })
  return 'HDA1.' + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const btn = (bg, color = '#fff', extra = {}) => ({
  background: bg, color, border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', minHeight: 38, whiteSpace: 'nowrap', ...extra,
})

export default function CallerIdSettings({ toast, isMobile }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState(null)   // shown once
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('caller_id_devices').select('*').order('created_at', { ascending: false })
    if (error) { setMissing(true); setDevices([]) } else { setMissing(false); setDevices(data || []) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const pair = async () => {
    if (!name.trim()) { toast('Give the phone a name first', 'error'); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('create_caller_device', { p_name: name.trim() })
    setBusy(false)
    if (error) { toast(error.message, 'error'); return }
    setToken(buildToken(data))
    setName(''); setShowForm(false); setCopied(false)
    load()
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { toast('Could not copy — select the token and copy it by hand', 'error') }
  }

  const revoke = async d => {
    if (!window.confirm(`Revoke "${d.device_name}"? Its next sync will erase the family list from that phone and caller ID will stop.`)) return
    const { error } = await supabase.rpc('revoke_caller_device', { p_id: d.id })
    if (error) toast(error.message, 'error'); else { toast(`${d.device_name} revoked`, 'info'); load() }
  }
  const remove = async d => {
    if (!window.confirm(`Delete "${d.device_name}" from the list?${d.status === 'active' ? ' It is still active — it will be revoked.' : ''}`)) return
    if (d.status === 'active') await supabase.rpc('revoke_caller_device', { p_id: d.id })
    const { error } = await supabase.from('caller_id_devices').delete().eq('id', d.id)
    if (error) toast(error.message, 'error'); else load()
  }

  const card = { background: B.card, borderRadius: 16, border: `1px solid ${B.border}`, padding: isMobile ? 20 : 28, boxShadow: '0 2px 12px rgba(30,125,34,0.06)', marginTop: 16 }
  const input = { width: '100%', padding: '11px 14px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 16, color: B.text, background: B.input, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: B.text, flex: 1 }}>Caller ID phones</div>
        {!missing && !showForm && <button style={btn(B.green)} onClick={() => { setShowForm(true); setToken(null) }}><Icon name="plus" size={15} />Pair phone</button>}
      </div>
      <div style={{ fontSize: 12, color: B.textMid, marginBottom: 16, lineHeight: 1.5 }}>
        Phones running the <b>Hidaya Caller ID</b> app. When a registered family calls, the phone shows who is calling (name, Family ID, project / branch, photo).
        The list refreshes on each phone every 15 minutes. Only approved families are sent.
      </div>

      {missing && (
        <div style={{ background: B.errBg, color: B.errText, border: `1px solid ${B.errBorder}`, borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
          Caller ID is not set up in the database yet. Run <b>supabase/migrations/011_caller_id.sql</b> once in the Supabase SQL Editor, then reload.
        </div>
      )}

      {showForm && (
        <div style={{ border: `1.5px solid ${B.border}`, borderRadius: 12, padding: 14, marginBottom: 14, background: B.greenLight }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>Phone name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front desk Samsung" style={input}
            onKeyDown={e => { if (e.key === 'Enter') pair() }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button style={btn(B.card, B.text, { border: `1.5px solid ${B.border}` })} onClick={() => { setShowForm(false); setName('') }} disabled={busy}>Cancel</button>
            <button style={btn(B.green, '#fff', { opacity: busy ? 0.6 : 1 })} onClick={pair} disabled={busy}><Icon name="key" size={15} />{busy ? 'Creating…' : 'Create token'}</button>
          </div>
        </div>
      )}

      {token && (
        <div style={{ background: B.goldLight, border: `1px solid ${B.goldBorder}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, color: B.warnText, fontSize: 13, marginBottom: 8 }}>Pairing token — shown once. Type or paste it in the Android app now.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div style={{ flex: 1, background: '#fff', border: `1px solid ${B.goldBorder}`, borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#1a1a1a', wordBreak: 'break-all', userSelect: 'all', maxHeight: 110, overflow: 'auto' }}>{token}</div>
            <button style={btn(B.green, '#fff', { alignSelf: 'flex-start' })} onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={15} />{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div style={{ fontSize: 12, color: B.warnText, marginTop: 8, lineHeight: 1.5 }}>
            It won't be shown again. If it is lost, revoke this phone and pair it again. Anyone holding the token can read the family list, so don't share it in a chat group or a screenshot.
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button style={btn('transparent', B.warnText, { border: `1.5px solid ${B.goldBorder}`, minHeight: 34 })} onClick={() => setToken(null)}>I've entered it — hide</button>
          </div>
        </div>
      )}

      {loading && <div style={{ color: B.textMid, fontSize: 13 }}>Loading…</div>}
      {!loading && !missing && devices.length === 0 && <div style={{ color: B.textMid, fontSize: 13, padding: '8px 0' }}>No phones paired yet. Tap “Pair phone”.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {devices.map(d => (
          <div key={d.id} style={{ border: `1px solid ${B.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: B.text }}>{d.device_name}</div>
              <div style={{ fontSize: 12, color: B.textMid }}>
                {d.paired_by_name ? `Paired by ${d.paired_by_name} · ` : ''}Last sync: {ago(d.last_sync_at)}
              </div>
            </div>
            <span style={{ background: d.status === 'active' ? B.greenLight : B.errBg, color: d.status === 'active' ? B.okText : B.errText, border: `1px solid ${d.status === 'active' ? B.border : B.errBorder}`, borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800 }}>
              {d.status === 'active' ? 'Active' : 'Revoked'}
            </span>
            {d.status === 'active' && <button style={btn(B.card, B.errText, { border: `1.5px solid ${B.errBorder}`, minHeight: 34 })} onClick={() => revoke(d)}>Revoke</button>}
            <button title="Delete" aria-label="Delete" style={btn(B.card, B.textMid, { border: `1.5px solid ${B.border}`, minHeight: 34, padding: '6px 10px' })} onClick={() => remove(d)}><Icon name="trash" size={15} /></button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: B.textMid, marginTop: 14, lineHeight: 1.6 }}>
        Tip: do <b>not</b> save families' numbers in the phone's Contacts — Android may skip caller ID for saved contacts.
        If a phone stops updating, allow the app to run in the background (turn off battery optimisation for it).
      </div>
    </div>
  )
}
