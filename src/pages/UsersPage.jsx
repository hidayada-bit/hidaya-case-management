import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { ROLES, ASSIGNABLE_ROLES, roleLabel } from '../lib/permissions'

const B = {
  green: '#1e7d22', greenDark: '#145717', greenLight: '#e8f5e9', greenMid: '#2e9e33',
  gold: '#f5a800', goldLight: '#fff8e1', goldDark: '#c87d00', sidebar: '#0d3b0f', sidebarMid: '#145717',
  border: '#c8e6c9', text: '#1a2e1a', textMid: '#4a6b4a', textLight: '#7a9b7a',
}

const selectStyle = {
  padding: '9px 10px', border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13,
  color: B.text, fontFamily: 'inherit', background: '#fafff9', minHeight: 40, maxWidth: '100%',
}
const smallBtn = (bg, color, border) => ({
  background: bg, color, border: border || 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5,
  fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 38, fontFamily: 'inherit',
})
const initials = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

function Person({ u }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
      {u.profile_photo_url
        ? <img src={u.profile_photo_url} alt="" style={{ width: 42, height: 42, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg, ${B.green}, ${B.greenMid})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{initials(u.full_name)}</div>}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: B.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</div>
        <div style={{ fontSize: 12, color: B.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</div>
      </div>
    </div>
  )
}

function PendingRow({ u, onApprove, onReject, busy }) {
  const [role, setRole] = useState('data_collector')
  return (
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Person u={u} />
      <div style={{ fontSize: 11, color: B.textLight, whiteSpace: 'nowrap' }}>
        Requested {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
      </div>
      <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle} aria-label="Role to assign">
        {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={busy} onClick={() => onApprove(u, role)} style={smallBtn(`linear-gradient(135deg, ${B.green}, ${B.greenMid})`, '#fff')}>
          <Icon name="approve" size={15} />Approve
        </button>
        <button disabled={busy} onClick={() => onReject(u)} style={smallBtn('#fef2f2', '#dc2626', '1.5px solid #fecaca')}>
          <Icon name="reject" size={15} />Decline
        </button>
      </div>
    </div>
  )
}

export default function UsersPage({ currentUser, toast, isMobile }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (error) toast('Failed to load users: ' + error.message, 'error')
    setUsers(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (u, patch, okMsg) => {
    setBusy(true)
    const { error } = await supabase.from('users').update(patch).eq('id', u.id)
    setBusy(false)
    if (error) { toast(error.message, 'error'); return }
    toast(okMsg)
    load()
  }

  const approve = (u, role) => update(u, { status: 'approved', role, approved_by: currentUser.id, approved_at: new Date().toISOString() }, `${u.full_name} approved as ${roleLabel(role)}`)
  const reject = u => update(u, { status: 'rejected' }, `${u.full_name} declined`)
  const revoke = u => { if (window.confirm(`Remove access for ${u.full_name}?`)) update(u, { status: 'rejected' }, 'Access removed') }
  const restore = u => update(u, { status: 'approved' }, `${u.full_name} restored`)
  const changeRole = (u, role) => update(u, { role }, `Role updated to ${roleLabel(role)}`)

  const pending = users.filter(u => u.status === 'pending')
  const active = users.filter(u => u.status === 'approved')
  const removed = users.filter(u => u.status === 'rejected')

  const card = { background: '#fff', borderRadius: 14, border: `1px solid ${B.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,125,34,0.06)', marginBottom: 18 }
  const cardHead = (icon, title, count, tint) => (
    <div style={{ padding: '13px 18px', background: tint || B.greenLight, borderBottom: `1px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, fontWeight: 800, color: B.textMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      <Icon name={icon} size={15} />{title}
      <span style={{ marginLeft: 'auto', background: '#fff', border: `1px solid ${B.border}`, borderRadius: 20, padding: '1px 10px', fontSize: 11, color: B.green }}>{count}</span>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 940, margin: '0 auto' }}>
      <div style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(245,168,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="userCog" size={28} color={B.gold} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>Staff & Access</div>
          <div style={{ fontSize: 12, color: '#a5d6a7' }}>Approve access requests and assign each person a team role</div>
        </div>
      </div>

      {/* Pending */}
      <div style={{ ...card, borderColor: pending.length ? '#ffe082' : B.border }}>
        {cardHead('clock', 'Access requests', pending.length, pending.length ? B.goldLight : B.greenLight)}
        {loading ? <div style={{ padding: 24, textAlign: 'center', color: B.textLight, fontSize: 13 }}>Loading…</div>
          : pending.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: B.textLight, fontSize: 13 }}>No pending requests.</div>
          : pending.map(u => <PendingRow key={u.id} u={u} onApprove={approve} onReject={reject} busy={busy} />)}
      </div>

      {/* Active */}
      <div style={card}>
        {cardHead('users', 'Active staff', active.length)}
        {active.map(u => {
          const self = u.id === currentUser.id
          return (
            <div key={u.id} style={{ padding: '13px 18px', borderBottom: `1px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Person u={u} />
              <select value={u.role} disabled={busy || self} onChange={e => changeRole(u, e.target.value)} style={selectStyle} aria-label={`Role for ${u.full_name}`} title={self ? 'You cannot change your own role' : ''}>
                {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
              {self
                ? <span style={{ fontSize: 11, color: B.textLight, fontWeight: 700, minWidth: 90, textAlign: 'center' }}>You</span>
                : <button disabled={busy} onClick={() => revoke(u)} style={smallBtn('#fff', '#dc2626', '1.5px solid #fecaca')}><Icon name="reject" size={15} />Remove</button>}
            </div>
          )
        })}
        {!loading && active.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: B.textLight, fontSize: 13 }}>No active staff.</div>}
      </div>

      {/* Removed */}
      {removed.length > 0 && (
        <div style={card}>
          {cardHead('reject', 'Declined / removed', removed.length, '#f3f4f6')}
          {removed.map(u => (
            <div key={u.id} style={{ padding: '13px 18px', borderBottom: `1px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', opacity: 0.85 }}>
              <Person u={u} />
              <button disabled={busy} onClick={() => restore(u)} style={smallBtn(B.greenLight, B.greenDark, `1.5px solid ${B.border}`)}><Icon name="approve" size={15} />Restore</button>
            </div>
          ))}
        </div>
      )}

      {/* Role guide */}
      <div style={{ ...card, marginBottom: 0 }}>
        {cardHead('shield', 'What each role can do', ASSIGNABLE_ROLES.length)}
        {ASSIGNABLE_ROLES.map(r => (
          <div key={r} style={{ padding: '11px 18px', borderBottom: `1px solid ${B.greenLight}`, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 170, fontSize: 13, fontWeight: 800, color: B.text }}>{ROLES[r].label}</div>
            <div style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: B.textMid }}>{ROLES[r].desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
