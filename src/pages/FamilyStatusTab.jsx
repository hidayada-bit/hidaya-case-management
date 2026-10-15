import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { B } from '../lib/theme'
import { caseState, TRANSFER_CATEGORIES } from '../lib/settings'
import Icon from '../components/Icon'
import { logActivity } from '../lib/activity'

const REASONS = {
  hold: ['Missing school certificate', 'Missing documents', 'Cannot be reached', 'Under review', 'Other'],
  transfer: TRANSFER_CATEGORIES,
  release: ['Documents submitted', 'Issue resolved', 'Other'],
  restore: ['Reinstated', 'Transferred by mistake', 'Other'],
}
const ACTIONS = {
  hold:     { label: 'Put on hold',  past: 'Put on hold',   to: 'on_hold',     icon: 'pending', color: B.goldDark, bg: B.goldLight,
              info: 'The family stays in the family list, but its bank account is removed from the bank list and it shows as UNPAID on the payment list until released.' },
  release:  { label: 'Release hold', past: 'Hold released', to: 'normal',      icon: 'check',   color: B.okText,   bg: B.greenLight,
              info: 'The family goes back on the bank list and payments continue.' },
  transfer: { label: 'Transfer out', past: 'Transferred out', to: 'transferred', icon: 'forward', color: B.red,      bg: B.errBg,
              info: 'The family is removed from the families list, bank list and payment list. It moves to the Transferred page, where only admins can see it and its history.' },
  restore:  { label: 'Restore to active families', past: 'Restored', to: 'normal', icon: 'refresh', color: B.okText, bg: B.greenLight,
              info: 'The family returns to the families list, bank list and payment list.' },
}
const STATE_LABEL = { normal: 'Normal', on_hold: 'On hold', transferred: 'Transferred' }
const fdate = d => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

const field = { width: '100%', padding: '10px 12px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 15, color: B.text, background: B.input, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44, outline: 'none' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }
const btn = (bg, color, border) => ({ background: bg, color, border: border || 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: 'inherit' })

// Modal that always asks WHY before an action is saved.
function ReasonDialog({ title, info, categories, initial, busy, onCancel, onSave, confirmLabel = 'Save' }) {
  const [cat, setCat] = useState(initial?.cat || categories?.[0] || '')
  const [note, setNote] = useState(initial?.note || '')
  const needNote = !categories || cat === 'Other' || true
  const ok = note.trim().length >= 3
  return (
    <div onClick={busy ? undefined : onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.card, borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `2px solid ${B.greenLight}`, fontSize: 16, fontWeight: 800, color: B.text }}>{title}</div>
        <div style={{ padding: '16px 20px 20px' }}>
          {info && <div style={{ fontSize: 12.5, color: B.textMid, background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 10, padding: '9px 12px', marginBottom: 14, lineHeight: 1.5 }}>{info}</div>}
          {categories && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Why? (choose one)</label>
              <select value={cat} onChange={e => setCat(e.target.value)} style={field}>{categories.map(c => <option key={c}>{c}</option>)}</select>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>{needNote ? 'Reason / details (required)' : 'Details'}</label>
            <textarea rows={3} autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="Explain the reason so it is clear in the history…" style={{ ...field, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button disabled={busy} onClick={onCancel} style={btn(B.card, B.text, `1.5px solid ${B.border}`)}>Cancel</button>
            <button disabled={busy || !ok} onClick={() => onSave({ cat, note: note.trim() })} style={{ ...btn(`linear-gradient(135deg, ${B.green}, ${B.greenMid})`, '#fff'), opacity: busy || !ok ? 0.55 : 1 }}>{busy ? 'Saving…' : confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const joinReason = (cat, note) => (cat && cat !== 'Other' ? `${cat} — ${note}` : note)

// Admin-only: change the family's case state and see the full history (with who did what).
export default function FamilyStatusTab({ family, user, toast, onChanged, isMobile, canHold = false, canTransfer = false, canEditEntries = false }) {
  const cs = caseState(family)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null) // { kind:'action', action } | { kind:'edit', entry }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('family_status_log').select('*').eq('family_id', family.id).order('created_at', { ascending: false })
    if (error) toast('Could not load history: ' + error.message + ' (run migration 005_family_case_state.sql)', 'error')
    setLog(data || [])
    setLoading(false)
  }, [family.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  const signer = user?.full_name || user?.email || 'Admin'

  const runAction = async (action, { cat, note }) => {
    const a = ACTIONS[action]
    const reason = joinReason(cat, note)
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const category = (action === 'hold' || action === 'transfer') ? cat : null
      const { error } = await supabase.from('families').update({ case_state: a.to, case_reason: reason, case_category: category, case_changed_at: now, case_changed_by_name: signer }).eq('id', family.id)
      if (error) throw error
      const { error: e2 } = await supabase.from('family_status_log').insert({ family_id: family.id, action, from_state: cs, to_state: a.to, reason, reason_category: category, by_user: user?.id || null, by_name: signer })
      if (e2) throw e2
      const verb = { hold: 'put', release: 'released the hold on', transfer: 'transferred out', restore: 'restored' }[action]
      logActivity(user, 'case', `${signer} ${verb} ${family.mother_name}${action === 'hold' ? ' on hold' : ''} — ${reason}`, family.id)
      toast(`${a.past}: ${family.mother_name}`)
      setDialog(null)
      await onChanged(action)
      load()
    } catch (e) { toast(e.message + (/case_state|status_log/.test(e.message) ? ' — run migration 005_family_case_state.sql' : ''), 'error') }
    finally { setBusy(false) }
  }

  const saveEdit = async (entry, { cat, note }) => {
    setBusy(true)
    try {
      const reason = joinReason(cat, note)
      const { error } = await supabase.from('family_status_log').update({ reason, edited_at: new Date().toISOString(), edited_by_name: signer }).eq('id', entry.id)
      if (error) throw error
      // keep the family's current reason in sync when the newest entry is edited
      if (log[0]?.id === entry.id) await supabase.from('families').update({ case_reason: reason }).eq('id', family.id)
      toast('History entry updated')
      setDialog(null)
      await onChanged('edit')
      load()
    } catch (e) { toast(e.message, 'error') }
    finally { setBusy(false) }
  }

  const available = (cs === 'normal' ? ['hold', 'transfer'] : cs === 'on_hold' ? ['release', 'transfer'] : ['restore'])
    .filter(k => (k === 'hold' || k === 'release') ? canHold : canTransfer)
  const stateColor = cs === 'normal' ? B.okText : cs === 'on_hold' ? B.warnText : B.errText
  const stateBg = cs === 'normal' ? B.greenLight : cs === 'on_hold' ? B.goldLight : B.errBg

  return (
    <div>
      <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: isMobile ? 14 : 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: B.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Case state</span>
          <span style={{ background: stateBg, color: stateColor, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{STATE_LABEL[cs]}</span>
          <span style={{ fontSize: 11, color: B.textLight, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="lock" size={12} />Hold / transfer details are hidden from data collectors</span>
        </div>
        {cs !== 'normal' && family.case_reason && (
          <div style={{ fontSize: 13, color: B.text, marginBottom: 12 }}>
            <b>Reason:</b> {family.case_reason}
            {family.case_changed_by_name && <span style={{ color: B.textLight }}> · {family.case_changed_by_name}{family.case_changed_at ? `, ${fdate(family.case_changed_at)}` : ''}</span>}
          </div>
        )}
        {available.length === 0 && <div style={{ fontSize: 12.5, color: B.textLight }}>{cs === 'transferred' ? 'Only an administrator can restore a transferred family.' : 'You can view this history; changes are made by an administrator or director.'}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {available.map(k => (
            <button key={k} onClick={() => setDialog({ kind: 'action', action: k })} style={btn(ACTIONS[k].bg, ACTIONS[k].color, `1.5px solid ${B.border}`)}>
              <Icon name={ACTIONS[k].icon} size={15} />{ACTIONS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, color: B.text, marginBottom: 10 }}>History</div>
      {loading
        ? <div style={{ padding: 28, textAlign: 'center', color: B.textLight }}><Icon name="spinner" size={18} spin /></div>
        : log.length === 0
          ? <div style={{ background: B.greenLight, borderRadius: 12, padding: 26, textAlign: 'center', color: B.textLight, fontSize: 13 }}>No hold or transfer history for this family.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {log.map(e => {
                const a = ACTIONS[e.action] || ACTIONS.hold
                return (
                  <div key={e.id} style={{ background: B.card, border: `1px solid ${B.border}`, borderLeft: `4px solid ${a.color}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: a.bg, color: a.color, padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name={a.icon} size={12} />{a.past}</span>
                      <span style={{ fontSize: 11.5, color: B.textLight }}>{STATE_LABEL[e.from_state] || '—'} → {STATE_LABEL[e.to_state] || '—'}</span>
                      {canEditEntries && <button onClick={() => setDialog({ kind: 'edit', entry: e })} style={{ ...btn(B.greenLight, B.green, `1px solid ${B.border}`), marginLeft: 'auto', padding: '5px 12px', minHeight: 32, fontSize: 12 }}><Icon name="edit" size={13} />Edit</button>}
                    </div>
                    <div style={{ fontSize: 13.5, color: B.text, margin: '8px 0 6px', lineHeight: 1.5 }}>{e.reason}</div>
                    <div style={{ fontSize: 11.5, color: B.textLight }}>
                      <Icon name="edit" size={11} /> Signed by <b style={{ color: B.textMid }}>{e.by_name || 'Unknown'}</b> · {fdate(e.created_at)}
                      {e.edited_at && <> · edited by <b style={{ color: B.textMid }}>{e.edited_by_name || 'Unknown'}</b>, {fdate(e.edited_at)}</>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

      {dialog?.kind === 'action' && (
        <ReasonDialog
          title={`${ACTIONS[dialog.action].label} — ${family.mother_name}`}
          info={ACTIONS[dialog.action].info}
          categories={REASONS[dialog.action]}
          busy={busy} confirmLabel={ACTIONS[dialog.action].label}
          onCancel={() => setDialog(null)}
          onSave={r => runAction(dialog.action, r)}
        />
      )}
      {dialog?.kind === 'edit' && (
        <ReasonDialog
          title="Edit reason" categories={null}
          initial={{ note: dialog.entry.reason }}
          busy={busy} confirmLabel="Save changes"
          onCancel={() => setDialog(null)}
          onSave={r => saveEdit(dialog.entry, r)}
        />
      )}
    </div>
  )
}

// Quick hold / release button for the family hero card (admin + director).
export function HoldQuickButton({ family, user, toast, onChanged, isMobile }) {
  const cs = caseState(family)
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  if (cs === 'transferred') return null
  const action = cs === 'on_hold' ? 'release' : 'hold'
  const a = ACTIONS[action]
  const signer = user?.full_name || user?.email || 'Admin'

  const run = async ({ cat, note }) => {
    const reason = joinReason(cat, note)
    const category = action === 'hold' ? cat : null
    setBusy(true)
    try {
      const { error } = await supabase.from('families').update({ case_state: a.to, case_reason: reason, case_category: category, case_changed_at: new Date().toISOString(), case_changed_by_name: signer }).eq('id', family.id)
      if (error) throw error
      const { error: e2 } = await supabase.from('family_status_log').insert({ family_id: family.id, action, from_state: cs, to_state: a.to, reason, reason_category: category, by_user: user?.id || null, by_name: signer })
      if (e2) throw e2
      logActivity(user, 'case', `${signer} ${action === 'hold' ? 'put' : 'released the hold on'} ${family.mother_name}${action === 'hold' ? ' on hold' : ''} — ${reason}`, family.id)
      toast(`${a.past}: ${family.mother_name}`)
      setDialog(null)
      await onChanged(action)
    } catch (e) { toast(e.message + (/case_state|status_log/.test(e.message) ? ' — run migrations 005 and 006' : ''), 'error') }
    finally { setBusy(false) }
  }

  const holding = action === 'hold'
  return (
    <>
      <button onClick={() => setDialog(true)} aria-label={a.label}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
          width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px 10px' : '9px 18px', borderRadius: isMobile ? 12 : 24, fontSize: isMobile ? 12.5 : 13, minHeight: isMobile ? 44 : undefined, fontWeight: 800, letterSpacing: '0.01em',
          color: '#fff', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)',
          background: holding ? 'linear-gradient(135deg, rgba(245,168,0,0.95), rgba(230,120,0,0.95))' : 'linear-gradient(135deg, rgba(46,158,51,0.95), rgba(30,125,34,0.95))',
          boxShadow: isMobile ? 'none' : holding ? '0 6px 18px rgba(245,140,0,0.45)' : '0 6px 18px rgba(30,125,34,0.5)',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)', transition: 'transform .18s ease, box-shadow .18s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {holding
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" /><rect x="14" y="4" width="5" height="16" rx="1.5" /></svg>
            : <Icon name="check" size={13} />}
        </span>
        {holding ? 'Put on hold' : 'Release hold'}
      </button>
      {dialog && (
        <ReasonDialog
          title={`${a.label} — ${family.mother_name}`} info={a.info} categories={REASONS[action]}
          busy={busy} confirmLabel={a.label} onCancel={() => setDialog(null)} onSave={run}
        />
      )}
    </>
  )
}
