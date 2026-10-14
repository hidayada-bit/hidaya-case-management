import { useState } from 'react'
import { B } from '../lib/theme'
import Icon from '../components/Icon'

const fdate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Admin-only list of families that were transferred out. Open one to see its full history / restore it.
export default function ArchivePage({ families, onView, isMobile }) {
  const [q, setQ] = useState('')
  const list = families.filter(f => {
    const s = q.trim().toLowerCase()
    return !s || (f.mother_name || '').toLowerCase().includes(s) || (f.family_code || '').toLowerCase().includes(s)
  })
  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(245,168,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="archive" size={28} color={B.gold} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>Transferred Families</div>
          <div style={{ fontSize: 12, color: '#a5d6a7' }}>Removed from the family, bank and payment lists. Visible to administrators only.</div>
        </div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{families.length}</div>
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: B.textLight, display: 'flex' }}><Icon name="search" size={16} /></span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or code…" style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1.5px solid ${B.border}`, borderRadius: 10, fontSize: 16, color: B.text, background: B.card, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44, outline: 'none' }} />
      </div>

      {list.length === 0 ? (
        <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '44px 20px', textAlign: 'center', color: B.textLight }}>
          <Icon name="archive" size={36} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: B.text }}>No transferred families</div>
          <div style={{ fontSize: 13 }}>Use the “Status” tab on a family profile to transfer one out.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(f => (
            <div key={f.id} onClick={() => onView(f)} style={{ background: B.card, border: `1px solid ${B.border}`, borderLeft: `4px solid ${B.red}`, borderRadius: 12, padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
      )}
    </div>
  )
}
