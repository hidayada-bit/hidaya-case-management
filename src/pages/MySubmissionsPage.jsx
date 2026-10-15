import { B } from '../lib/theme'
import Icon from '../components/Icon'

const fdate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const branchOf = f => (f.project === 'HF' ? `HF · ${f.branch || 'no branch'}` : (f.project || '—'))

const STATUS = {
  pending:  { label: 'Waiting for approval', bg: () => B.goldLight, color: () => B.warnText, border: () => B.goldBorder, icon: 'pending' },
  returned: { label: 'Returned — please fix', bg: () => B.errBg,    color: () => B.errText,  border: () => B.errBorder,  icon: 'warn' },
  approved: { label: 'Approved',              bg: () => B.greenLight, color: () => B.okText, border: () => B.border,     icon: 'done' },
}

// The data collector's only window into the system: the families they registered and where each one stands.
// Pending / returned submissions can be opened and edited; approved ones are locked (name, date and status only).
export default function MySubmissionsPage({ submissions, openFamilies, loading, onOpen, onRegister, isMobile }) {
  const count = st => submissions.filter(s => s.submission_status === st).length
  const sorted = [...submissions].sort((a, b) => {
    const rank = { returned: 0, pending: 1, approved: 2 }
    return (rank[a.submission_status] - rank[b.submission_status]) || (new Date(b.submitted_at) - new Date(a.submitted_at))
  })

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 860, margin: '0 auto' }}>
      <div className="page-banner" style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden', border: '1px solid rgba(245,168,0,0.3)', flexWrap: 'wrap' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="clipboard" size={28} color={B.gold} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>My Submissions</div>
          <div className="pb-sub" style={{ fontSize: 12, color: '#a5d6a7' }}>Families you registered. You can edit one until the administrator approves it.</div>
        </div>
        <button onClick={onRegister} style={{ background: B.gold, color: '#1a1a1a', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', minHeight: 40 }}>
          <Icon name="plus" size={16} />Register family
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {['returned', 'pending', 'approved'].map(st => (
          <div key={st} style={{ background: STATUS[st].bg(), border: `1px solid ${STATUS[st].border()}`, borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: STATUS[st].color() }}>{count(st)}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: STATUS[st].color() }}>{st === 'returned' ? 'Returned' : st === 'pending' ? 'Waiting' : 'Approved'}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 30, color: B.textMid }}>Loading…</div>}

      {!loading && sorted.length === 0 && (
        <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '44px 20px', textAlign: 'center', color: B.textMid }}>
          <div style={{ color: B.textLight, marginBottom: 8 }}><Icon name="userPlus" size={38} /></div>
          <div style={{ fontWeight: 800, color: B.text }}>No submissions yet</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>Tap “Register family” to add your first one.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(sub => {
          const st = STATUS[sub.submission_status] || STATUS.pending
          const editable = sub.submission_status !== 'approved'
          const fam = editable ? openFamilies.find(f => f.id === sub.id) : null
          return (
            <div key={sub.id} onClick={editable && fam ? () => onOpen(fam) : undefined}
              style={{ background: editable ? B.card : B.neutralBg, border: `1.5px ${editable ? 'solid' : 'dashed'} ${sub.submission_status === 'returned' ? B.errBorder : B.border}`, borderRadius: 14, padding: '14px 16px', cursor: editable && fam ? 'pointer' : 'default', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: B.text }}>{sub.mother_name}</div>
                <div style={{ fontSize: 12, color: B.textMid, marginTop: 2 }}>
                  {branchOf(sub)} · {sub.submission_status === 'approved' ? `approved ${fdate(sub.reviewed_at)}` : `sent ${fdate(sub.submitted_at)}`}
                </div>
                {sub.submission_status === 'returned' && sub.return_reason && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: B.errText, background: B.errBg, border: `1px solid ${B.errBorder}`, borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
                    <b>{sub.reviewed_by_name ? `${sub.reviewed_by_name} asks:` : 'To fix:'}</b> {sub.return_reason}
                  </div>
                )}
              </div>
              <span style={{ background: st.bg(), color: st.color(), border: `1px solid ${st.border()}`, borderRadius: 20, padding: '4px 12px', fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name={st.icon} size={12} />{st.label}
              </span>
              {editable && fam && <span style={{ color: B.green, fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{sub.submission_status === 'returned' ? 'Edit & resubmit' : 'Open / edit'}<Icon name="chevron" size={14} /></span>}
              {!editable && <span title="Approved — locked" style={{ color: B.textLight }}><Icon name="lock" size={16} /></span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
