import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { B } from '../lib/theme'
import Icon from './Icon'

const ICON = { submission: 'clipboard', family: 'users', document: 'attach', payment: 'wallet', bank: 'bank', case: 'pending', settings: 'settings', agreement: 'agreement', general: 'info' }
const COLOR = { submission: B.goldDark, family: B.green, document: B.infoText, payment: B.okText, bank: B.goldDark, case: B.orange, settings: B.textMid, agreement: B.goldDark, general: B.textMid }

const ago = d => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d)) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// Bell with a red unread counter + dropdown of the latest staff activity.
export default function NotificationBell({ user, onOpenFamily, isMobile }) {
  const key = `hda-notif-seen-${user?.id}`
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(key) || '1970-01-01T00:00:00Z' } catch { return '1970-01-01T00:00:00Z' } })
  const box = useRef(null)
  const [people, setPeople] = useState({}) // user id -> { name, photo }

  useEffect(() => {
    supabase.from('users').select('id,full_name,profile_photo_url').then(({ data }) => {
      const m = {}; (data || []).forEach(u => { m[u.id] = { name: u.full_name, photo: u.profile_photo_url } }); setPeople(m)
    })
  }, [])

  const load = useCallback(async () => {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(60)
    if (data) setItems(data)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, p => setItems(x => [p.new, ...x.filter(i => i.id !== p.new.id)].slice(0, 60)))
      .subscribe()
    const t = setInterval(load, 60000)
    return () => { clearInterval(t); supabase.removeChannel(ch) }
  }, [load])

  useEffect(() => {
    if (!open) return
    const h = e => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const isUnread = i => i.actor_id !== user?.id && new Date(i.created_at) > new Date(seen)
  const unread = items.filter(isUnread).length

  const markAllRead = () => {
    const now = new Date().toISOString()
    setSeen(now)
    try { localStorage.setItem(key, now) } catch { /* ignore */ }
  }

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label={`Notifications${unread ? `, ${unread} new` : ''}`} title="Notifications"
        style={{ position: 'relative', background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#e53935', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px ${B.card}`, animation: 'fadeIn .25s ease' }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: isMobile ? 'fixed' : 'absolute', top: isMobile ? 62 : 44, right: isMobile ? 8 : 0, left: isMobile ? 8 : 'auto',
          width: isMobile ? 'auto' : 380, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, boxShadow: '0 18px 50px rgba(0,0,0,0.35)', zIndex: 200, overflow: 'hidden', animation: 'fadeIn .18s ease',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', gap: 8, background: B.greenLight }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: B.text }}>Notifications</span>
            {unread > 0 && <span style={{ background: '#e53935', color: '#fff', borderRadius: 10, padding: '0 7px', fontSize: 11, fontWeight: 800 }}>{unread} new</span>}
            <button onClick={markAllRead} disabled={!unread} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: unread ? 'pointer' : 'default', color: unread ? B.green : B.textLight, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Mark all read</button>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {items.length === 0 && <div style={{ padding: '36px 16px', textAlign: 'center', color: B.textLight, fontSize: 13 }}>No activity yet.</div>}
            {items.map(i => {
              const un = isUnread(i)
              const c = COLOR[i.category] || B.textMid
              return (
                <div key={i.id} onClick={() => { if (i.family_id) { onOpenFamily?.(i.family_id); setOpen(false) } }}
                  style={{ display: 'flex', gap: 11, padding: '11px 16px', borderBottom: `1px solid ${B.greenLight}`, cursor: i.family_id ? 'pointer' : 'default', background: un ? B.greenLight : 'transparent', transition: 'background .15s' }}
                  onMouseEnter={e => { if (i.family_id) e.currentTarget.style.background = B.greenLight }}
                  onMouseLeave={e => { e.currentTarget.style.background = un ? B.greenLight : 'transparent' }}>
                  {(() => {
                    const who = people[i.actor_id] || {}
                    const nm = who.name || i.actor_name || '?'
                    const initials = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
                    return (
                      <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }} title={nm}>
                        {who.photo
                          ? <img src={who.photo} alt={nm} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${B.border}` }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: B.greenLight, color: B.greenDark, border: `1.5px solid ${B.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{initials}</div>}
                        <span style={{ position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: '50%', background: B.card, border: `1.5px solid ${c}`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ICON[i.category] || 'info'} size={9} /></span>
                      </div>
                    )
                  })()}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, color: B.text, lineHeight: 1.4 }}>{i.message}</div>
                    <div style={{ fontSize: 11, color: B.textLight, marginTop: 2 }}>{ago(i.created_at)}</div>
                  </div>
                  {un && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53935', marginTop: 6, flexShrink: 0 }} />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
