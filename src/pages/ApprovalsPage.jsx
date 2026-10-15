import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { B } from '../lib/theme'
import { submissionState } from '../lib/settings'
import { logActivity } from '../lib/activity'
import Icon from '../components/Icon'

const fdate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const digits = v => String(v || '').replace(/\D/g, '')
const branchOf = f => (f.project === 'HF' ? `HF · ${f.branch || 'no branch'}` : (f.project || '—'))

const btn = (bg, extra = {}) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit', minHeight: 36, ...extra,
})
const ghost = { background: B.card, color: B.text, border: `1.5px solid ${B.border}` }

// ─── Possible duplicates: same National ID / phone / account number as another family ───
function buildIndex(families) {
  const idx = { id: {}, phone: {}, acct: {} }
  const put = (map, key, f) => { if (key) (map[key] ||= []).push(f) }
  families.forEach(f => {
    const i = digits(f.mother_id_number); if (i.length >= 6) put(idx.id, i, f)
    ;[f.phone_number, f.alternate_phone].forEach(p => { const d = digits(p); if (d.length >= 7) put(idx.phone, d.slice(-9), f) })
    const a = digits(f.account_number); if (a.length >= 6) put(idx.acct, `${f.bank || ''}:${a}`, f)
  })
  return idx
}
function duplicatesOf(f, idx) {
  const out = []
  const add = (why, list) => (list || []).forEach(o => { if (o.id !== f.id && !out.some(x => x.other.id === o.id && x.why === why)) out.push({ why, other: o }) })
  const i = digits(f.mother_id_number); if (i.length >= 6) add('National ID', idx.id[i])
  ;[f.phone_number, f.alternate_phone].forEach(p => { const d = digits(p); if (d.length >= 7) add('phone number', idx.phone[d.slice(-9)]) })
  const a = digits(f.account_number); if (a.length >= 6) add('bank account', idx.acct[`${f.bank || ''}:${a}`])
  return out
}

function Dialog({ title, children, onClose, busy }) {
  return (
    <div onClick={busy ? undefined : onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.card, borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `2px solid ${B.greenLight}`, fontSize: 16, fontWeight: 800, color: B.text }}>{title}</div>
        <div style={{ padding: '16px 20px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

// Data collector submissions waiting for review, grouped by collector (with their branches).
// Visible to admin, director and project coordinator. Only the admin (canApprove) can approve or return.
export default function ApprovalsPage({ families, children, staffNames = {}, canApprove = false, user, toast, onOpen, onChanged, isMobile }) {
  const [tab, setTab] = useState('pending')
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('All')
  const [busy, setBusy] = useState(null)
  const [returning, setReturning] = useState(null)   // family being returned
  const [reason, setReason] = useState('')
  const [confirmAll, setConfirmAll] = useState(null) // { uid, name, count }

  const subs = families.filter(f => submissionState(f) !== 'approved')
  const pending = subs.filter(f => submissionState(f) === 'pending')
  const returned = subs.filter(f => submissionState(f) === 'returned')
  const idx = buildIndex(families)
  const kidsOf = id => children.filter(c => c.family_id === id).length
  const nameOf = uid => staffNames[uid] || 'Unknown collector'

  const s = q.trim().toLowerCase()
  const branches = [...new Set(subs.map(branchOf))].sort()
  const list = (tab === 'pending' ? pending : returned)
    .filter(f => branch === 'All' || branchOf(f) === branch)
    .filter(f => !s || (f.mother_name || '').toLowerCase().includes(s) || nameOf(f.submitted_by).toLowerCase().includes(s))

  const groups = {}
  list.forEach(f => { (groups[f.submitted_by || 'none'] ||= []).push(f) })
  const collectors = Object.entries(groups)
    .map(([uid, rows]) => ({ uid, name: uid === 'none' ? 'Unknown collector' : nameOf(uid), rows: rows.sort((a, b) => new Date(a.submitted_at || a.created_at) - new Date(b.submitted_at || b.created_at)) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const approve = async f => {
    setBusy(f.id)
    const { data, error } = await supabase.rpc('approve_submission', { fid: f.id })
    if (error) toast(error.message, 'error')
    else {
      logActivity(user, 'submission', `${user?.full_name || 'Admin'} approved ${f.mother_name} (${data}) — sent by ${nameOf(f.submitted_by)}`, f.id)
      toast(`${f.mother_name} approved — ${data}`)
      await onChanged()
    }
    setBusy(null)
  }

  const doReturn = async () => {
    if (!reason.trim()) { toast('Please write the reason', 'error'); return }
    setBusy(returning.id)
    const { error } = await supabase.rpc('return_submission', { fid: returning.id, reason })
    if (error) toast(error.message, 'error')
    else {
      logActivity(user, 'submission', `${user?.full_name || 'Admin'} returned ${returning.mother_name} to ${nameOf(returning.submitted_by)} for correction: ${reason.trim()}`, returning.id)
      toast(`${returning.mother_name} returned for correction`, 'info')
      setReturning(null); setReason('')
      await onChanged()
    }
    setBusy(null)
  }

  const doApproveAll = async () => {
    setBusy('all')
    const { data, error } = await supabase.rpc('approve_collector', { uid: confirmAll.uid })
    if (error) toast(error.message, 'error')
    else {
      logActivity(user, 'submission', `${user?.full_name || 'Admin'} approved all ${data} pending submission(s) from ${confirmAll.name}`)
      toast(`${data} submission${data === 1 ? '' : 's'} from ${confirmAll.name} approved`)
      setConfirmAll(null)
      await onChanged()
    }
    setBusy(null)
  }

  const chip = (label, n, active, onClick) => (
    <button key={label} onClick={onClick} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${active ? B.green : B.border}`, background: active ? B.green : B.card, color: active ? '#fff' : B.textMid, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {label}<span style={{ background: active ? 'rgba(255,255,255,0.25)' : B.greenLight, color: active ? '#fff' : B.textMid, borderRadius: 10, padding: '0 7px', fontSize: 11 }}>{n}</span>
    </button>
  )
  const field = { padding: '9px 12px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 14, color: B.text, background: B.input, fontFamily: 'inherit', minHeight: 40, outline: 'none' }

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-banner" style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden', border: '1px solid rgba(245,168,0,0.3)', flexWrap: 'wrap' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="approve" size={28} color={B.gold} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>Approvals</div>
          <div className="pb-sub" style={{ fontSize: 12, color: '#a5d6a7' }}>Families registered by data collectors. They join the system only after the administrator approves them.</div>
        </div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{pending.length}</div>
      </div>

      {!canApprove && (
        <div style={{ background: B.infoBg, color: B.infoText, borderRadius: 10, padding: '9px 14px', fontSize: 12.5, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon name="info" size={14} /> You can review these submissions. Only the administrator can approve or return them.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {chip('Pending', pending.length, tab === 'pending', () => setTab('pending'))}
        {chip('Returned', returned.length, tab === 'returned', () => setTab('returned'))}
        <div style={{ flex: 1 }} />
        <select value={branch} onChange={e => setBranch(e.target.value)} style={field} aria-label="Branch">
          <option value="All">All projects / branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or collector…" style={{ ...field, minWidth: isMobile ? '100%' : 220 }} />
      </div>

      {collectors.length === 0 && (
        <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '44px 20px', textAlign: 'center', color: B.textMid }}>
          <div style={{ color: B.textLight, marginBottom: 8 }}><Icon name="done" size={38} /></div>
          <div style={{ fontWeight: 800, color: B.text }}>{tab === 'pending' ? 'Nothing waiting for approval' : 'No returned submissions'}</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>{tab === 'pending' ? 'New registrations from data collectors will appear here.' : 'Submissions you return for correction stay here until the collector fixes them.'}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {collectors.map(c => {
          const bc = {}; c.rows.forEach(f => { const k = branchOf(f); bc[k] = (bc[k] || 0) + 1 })
          return (
            <div key={c.uid} style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: B.greenLight, borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: B.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{c.name.slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, color: B.text, fontSize: 14 }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {Object.entries(bc).map(([k, n]) => <span key={k} style={{ background: B.card, border: `1px solid ${B.border}`, color: B.textMid, borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 700 }}>{k} · {n}</span>)}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.textMid }}>{c.rows.length} famil{c.rows.length === 1 ? 'y' : 'ies'}</div>
                {canApprove && tab === 'pending' && c.uid !== 'none' && (
                  <button style={btn(B.green)} onClick={() => setConfirmAll({ uid: c.uid, name: c.name, count: pending.filter(x => x.submitted_by === c.uid).length })}><Icon name="check" size={14} />Approve all</button>
                )}
              </div>

              {c.rows.map((f, i) => {
                const dups = duplicatesOf(f, idx)
                const kids = kidsOf(f.id)
                return (
                  <div key={f.id} style={{ padding: '12px 16px', borderTop: i ? `1px solid ${B.border}` : 'none', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: B.text }}>{f.mother_name}</div>
                      <div style={{ fontSize: 12, color: B.textMid, marginTop: 2 }}>
                        {branchOf(f)} · {kids} {kids === 1 ? 'child' : 'children'} · sent {fdate(f.submitted_at || f.created_at)}
                      </div>
                      {kids === 0 && <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: B.warnText, background: B.goldLight, border: `1px solid ${B.goldBorder}`, borderRadius: 8, padding: '3px 9px', display: 'inline-block' }}>No children added yet — will be paid the mother amount only</div>}
                      {dups.slice(0, 2).map((d, k) => (
                        <div key={k} style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: '#c2410c', background: '#fff1e6', border: '1px solid #f5b5a0', borderRadius: 8, padding: '3px 9px', display: 'block', width: 'fit-content', maxWidth: '100%' }}>
                          <Icon name="warn" size={12} /> Same {d.why} as {d.other.mother_name} ({d.other.family_code})
                        </div>
                      ))}
                      {tab === 'returned' && f.return_reason && (
                        <div style={{ marginTop: 6, fontSize: 12, color: B.errText, background: B.errBg, border: `1px solid ${B.errBorder}`, borderRadius: 8, padding: '6px 10px' }}>
                          <b>Returned{f.reviewed_by_name ? ` by ${f.reviewed_by_name}` : ''}:</b> {f.return_reason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                      <button style={btn(B.card, ghost)} onClick={() => onOpen(f)}><Icon name="eye" size={14} />View</button>
                      {canApprove && tab === 'pending' && <>
                        <button style={btn(B.green, { opacity: busy === f.id ? 0.6 : 1 })} disabled={busy === f.id} onClick={() => approve(f)}><Icon name="check" size={14} />{busy === f.id ? 'Approving…' : 'Approve'}</button>
                        <button style={btn(B.card, { color: B.errText, border: `1.5px solid ${B.errBorder}` })} disabled={busy === f.id} onClick={() => { setReturning(f); setReason('') }}><Icon name="back" size={14} />Return</button>
                      </>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {returning && (
        <Dialog title="Return for correction" busy={busy === returning.id} onClose={() => setReturning(null)}>
          <div style={{ fontSize: 13, color: B.textMid, marginBottom: 10 }}>
            <b style={{ color: B.text }}>{returning.mother_name}</b> goes back to {nameOf(returning.submitted_by)}, who can edit it and send it again. Tell them what to fix.
          </div>
          <textarea autoFocus rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Phone number is missing; birth certificate of the 2nd child is unreadable"
            style={{ ...field, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button style={btn(B.card, ghost)} disabled={busy === returning.id} onClick={() => setReturning(null)}>Cancel</button>
            <button style={btn(B.red, { opacity: !reason.trim() || busy === returning.id ? 0.55 : 1 })} disabled={!reason.trim() || busy === returning.id} onClick={doReturn}>{busy === returning.id ? 'Returning…' : 'Return'}</button>
          </div>
        </Dialog>
      )}

      {confirmAll && (
        <Dialog title="Approve all?" busy={busy === 'all'} onClose={() => setConfirmAll(null)}>
          <div style={{ fontSize: 13.5, color: B.text, lineHeight: 1.6 }}>
            This approves all <b>{confirmAll.count}</b> pending famil{confirmAll.count === 1 ? 'y' : 'ies'} sent by <b>{confirmAll.name}</b> (including any hidden by the filters above). Each gets its real Family ID and joins the system. The collector can no longer edit them.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button style={btn(B.card, ghost)} disabled={busy === 'all'} onClick={() => setConfirmAll(null)}>Cancel</button>
            <button style={btn(B.green, { opacity: busy === 'all' ? 0.6 : 1 })} disabled={busy === 'all'} onClick={doApproveAll}>{busy === 'all' ? 'Approving…' : 'Approve all'}</button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
