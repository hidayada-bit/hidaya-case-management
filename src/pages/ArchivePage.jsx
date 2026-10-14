import { useState } from 'react'
import { B } from '../lib/theme'
import { TRANSFER_CATEGORIES, categoryOf } from '../lib/settings'
import Icon from '../components/Icon'

const fdate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const CAT_COLOR = {
  'Terminated': B.red, 'Suspended': B.orange, 'Transferred to another organization': B.infoText, 'Moved away': B.green, 'Other': B.textLight,
}

// Families that were transferred out, grouped by the reason category (Terminated, Suspended, …).
// Visible to every role except data collector; only admins can restore a family.
export default function ArchivePage({ families, onView, isMobile }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const s = q.trim().toLowerCase()
  const searched = families.filter(f => !s || (f.mother_name || '').toLowerCase().includes(s) || (f.family_code || '').toLowerCase().includes(s))
  const counts = {}
  families.forEach(f => { const c = categoryOf(f); counts[c] = (counts[c] || 0) + 1 })
  const groups = TRANSFER_CATEGORIES.map(c => ({ c, list: searched.filter(f => categoryOf(f) === c) })).filter(g => g.list.length && (cat === 'All' || cat === g.c))

  const chip = (label, n, active, onClick, color) => (
    <button key={label} onClick={onClick} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${active ? (color || B.green) : B.border}`, background: active ? (color || B.green) : B.card, color: active ? '#fff' : B.textMid, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label}<span style={{ background: active ? 'rgba(255,255,255,0.25)' : B.greenLight, color: active ? '#fff' : B.textMid, borderRadius: 10, padding: '0 7px', fontSize: 11 }}>{n}</span>
    </button>
  )

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(245,168,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="archive" size={28} color={B.gold} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>Transferred Families</div>
          <div style={{ fontSize: 12, color: '#a5d6a7' }}>Removed from the family, bank and payment lists. Not visible to data collectors.</div>
        </div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{families.length}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {chip('All', families.length, cat === 'All', () => setCat('All'))}
        {TRANSFER_CATEGORIES.filter(c => counts[c]).map(c => chip(c, counts[c], cat === c, () => setCat(c), CAT_COLOR[c]))}
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: B.textLight, display: 'flex' }}><Icon name="search" size={16} /></span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or code…" style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1.5px solid ${B.border}`, borderRadius: 10, fontSize: 16, color: B.text, background: B.card, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44, outline: 'none' }} />
      </div>

      {groups.length === 0 ? (
        <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '44px 20px', textAlign: 'center', color: B.textLight }}>
          <Icon name="archive" size={36} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: B.text }}>No transferred families</div>
          <div style={{ fontSize: 13 }}>An administrator transfers a family from the “Status” tab on its profile.</div>
        </div>
      ) : groups.map(g => (
        <div key={g.c} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 8px', fontSize: 13, fontWeight: 800, color: B.text }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLOR[g.c] }} />{g.c}
            <span style={{ color: B.textLight, fontWeight: 600 }}>({g.list.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.list.map(f => (
              <div key={f.id} onClick={() => onView(f)} style={{ background: B.card, border: `1px solid ${B.border}`, borderLeft: `4px solid ${CAT_COLOR[g.c]}`, borderRadius: 12, padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: B.text }}>{f.mother_name}</div>
                  <div style={{ fontSize: 11.5, color: B.textLight }}>{f.family_code} · {f.project}{f.project === 'HF' && f.branch ? ` · ${f.branch}` : ''}</div>
                  {f.case_reason && <div style={{ fontSize: 12.5, color: B.textMid, marginTop: 5 }}><b>Reason:</b> {f.case_reason}</div>}
                </div>
                <div style={{ fontSize: 11.5, color: B.textLight, textAlign: isMobile ? 'left' : 'right' }}>
                  <div>{fdate(f.case_changed_at)}</div>
                  {f.case_changed_by_name && <div>by <b style={{ color: B.textMid }}>{f.case_changed_by_name}</b></div>}
                </div>
                <span style={{ background: B.greenLight, color: B.green, border: `1px solid ${B.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>History <Icon name="forward" size={12} /></span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
