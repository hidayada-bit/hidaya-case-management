import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { bankLabel, bankById } from '../lib/banks'
import BankMark from '../components/BankMark'
import { DEFAULT_RATES, monthlyFor, MIN_PAYING_AGE, MAX_PAYING_AGE, MAX_PAYING_CHILDREN } from '../lib/settings'
import { B } from '../lib/theme'
import { logActivity } from '../lib/activity'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const STATUS = {
  paid:    { label: 'Paid',    bg: B.greenLight, color: B.okText, dot: '#1e7d22' },
  pending: { label: 'Unpaid',  bg: B.goldLight, color: B.warnText, dot: '#f5a800' },
  failed:  { label: 'Failed',  bg: B.errBg, color: B.errText, dot: B.red },
  on_hold: { label: 'On hold', bg: B.infoBg, color: B.infoText, dot: '#6366f1' },
}
const money = n => (n == null || n === '' || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
// Copy "name / bank / account" for pasting into a bank transfer or chat
const copyText = async text => {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fall through */ }
  try {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); document.body.removeChild(t); return ok
  } catch { return false }
}
const todayStr = () => new Date().toISOString().slice(0, 10)
const periodOf = (year, m) => `${year}-${String(m + 1).padStart(2, '0')}-01`

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 15,
  color: B.text, background: B.input, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44, outline: 'none',
}
const Lbl = ({ children }) => <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>{children}</label>

// Payment history for one mother, January → December of the chosen year.
export default function FamilyPaymentsTab({ family, user, canManage, toast, isMobile, childCount = 0, excludedCount = 0, rates = DEFAULT_RATES, staffNames = {}, caseState = 'normal' }) {
  const monthly = monthlyFor(rates, childCount)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState({}) // month index -> payment row
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edit, setEdit] = useState(null) // month index being edited
  const [form, setForm] = useState({ status: 'paid', amount: '', paid_on: todayStr(), reference: '', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('payments').select('*')
      .eq('family_id', family.id).gte('period', `${year}-01-01`).lte('period', `${year}-12-01`)
    if (error) toast('Failed to load payments: ' + error.message, 'error')
    const map = {}
    ;(data || []).forEach(p => { map[Number(p.period.slice(5, 7)) - 1] = p })
    setRows(map)
    setLoading(false)
  }, [family.id, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const months = useMemo(() => MONTHS.map((name, i) => {
    const p = rows[i]
    const status = p?.status || 'pending'
    return { i, name, p, status, amount: status === 'paid' ? (p.amount ?? monthly) : monthly }
  }), [rows, monthly])

  const totals = useMemo(() => {
    const t = { paid: 0, unpaid: 0, issues: 0, paidAmt: 0, expectedAmt: 0, outstanding: 0 }
    months.forEach(m => {
      t.expectedAmt += Number(m.amount) || 0
      if (m.status === 'paid') { t.paid++; t.paidAmt += Number(m.amount) || 0 }
      else if (m.status === 'pending') t.unpaid++
      else t.issues++
    })
    t.outstanding = Math.max(t.expectedAmt - t.paidAmt, 0)
    return t
  }, [months])

  const openEdit = m => {
    setForm({
      status: m.status === 'pending' ? 'paid' : m.status,
      amount: m.amount != null ? String(m.amount) : '',
      paid_on: m.p?.paid_on || todayStr(),
      reference: m.p?.reference || '',
      notes: m.p?.notes || '',
    })
    setEdit(m.i)
  }

  const save = async (resetToUnpaid = false) => {
    const m = months[edit]
    if (!resetToUnpaid) {
      if (form.status === 'paid' && !form.paid_on) { toast('Please choose the payment date', 'error'); return }
      if ((form.status === 'failed' || form.status === 'on_hold') && !form.notes.trim()) { toast('Please add a short reason', 'error'); return }
    }
    setSaving(true)
    try {
      const amt = form.amount !== '' ? Number(form.amount) : monthly
      const base = { family_id: family.id, period: periodOf(year, edit), recorded_by: user?.id || null }
      const payload = resetToUnpaid
        ? { ...base, status: 'pending', amount: monthly, paid_on: null, reference: null, notes: null }
        : form.status === 'paid'
          ? { ...base, status: 'paid', amount: amt, paid_on: form.paid_on, reference: form.reference.trim() || null, notes: form.notes.trim() || null }
          : { ...base, status: form.status, amount: amt, paid_on: null, reference: null, notes: form.notes.trim() }
      const { error } = await supabase.from('payments').upsert(payload, { onConflict: 'family_id,period' })
      if (error) throw error
      logActivity(user, 'payment', `${user?.full_name || 'Someone'} ${resetToUnpaid ? 'reset to unpaid' : form.status === 'paid' ? 'recorded a payment for' : 'marked as ' + form.status.replace('_', ' ') + ' the payment of'} ${family.mother_name} — ${MONTHS[edit]} ${year}`, family.id)
      toast(`${MONTHS[edit]} ${year} updated`)
      setEdit(null)
      await load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const currentYear = now.getFullYear()
  const canGoNext = year < currentYear + 1

  return (
    <div>
      {/* Year switcher + bank */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 11, padding: 4 }}>
          <button aria-label="Previous year" onClick={() => setYear(y => y - 1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: 8, color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevronLeft" size={18} /></button>
          <div style={{ minWidth: 150, textAlign: 'center', fontWeight: 800, fontSize: 14, color: B.text }}>January – December {year}</div>
          <button aria-label="Next year" disabled={!canGoNext} onClick={() => setYear(y => y + 1)} style={{ background: 'transparent', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.35, width: 34, height: 34, borderRadius: 8, color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron" size={18} /></button>
        </div>
        <div style={{ fontSize: 13, color: B.textMid, display: 'inline-flex', alignItems: 'center', gap: 8, background: B.card, border: `1px solid ${B.border}`, borderRadius: 24, padding: '4px 6px 4px 6px' }}>
          {bankById(family.bank) ? <BankMark bank={family.bank} size={26} /> : <Icon name="bank" size={16} />}
          <b style={{ color: B.text, letterSpacing: '0.02em' }}>{family.account_number || <span style={{ color: B.amber, fontWeight: 600 }}>No account on file</span>}</b>
          {family.account_number && (
            <button type="button" aria-label="Copy name, bank and account number" title="Copy name, bank and account number"
              onClick={async () => {
                const ok = await copyText(`${family.mother_name}\n${bankById(family.bank)?.name || bankLabel(family.bank)}\n${family.account_number}`)
                toast(ok ? 'Copied: name, bank and account number' : 'Could not copy', ok ? undefined : 'error')
              }}
              style={{ background: B.greenLight, border: `1px solid ${B.border}`, color: B.greenDark, borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="copy" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Formula */}
      <div style={{ background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 12, padding: '11px 14px', marginBottom: 12, fontSize: 13, color: B.text }}>
        <b>Monthly amount:</b> {money(rates.mother)} (mother) + {childCount} {childCount === 1 ? 'child' : 'children'} × {money(rates.child)} = <b>ETB {money(monthly)}</b>
        <span style={{ color: B.textMid }}> · × 12 months = ETB {money(monthly * 12)}</span>
      </div>

      {excludedCount > 0 && (
        <div style={{ background: B.neutralBg, color: B.neutralText, border: `1px dashed ${B.textLight}`, borderRadius: 12, padding: '9px 14px', marginBottom: 12, fontSize: 12.5 }}>
          <Icon name="info" size={13} /> {excludedCount} {excludedCount === 1 ? 'child is' : 'children are'} not counted in this payment (under {MIN_PAYING_AGE}, over {MAX_PAYING_AGE}, or beyond the maximum of {MAX_PAYING_CHILDREN} children) — still listed in the Children tab.
        </div>
      )}
      {caseState === 'on_hold' && (
        <div style={{ background: B.goldLight, color: B.warnText, border: `1px solid ${B.goldBorder}`, borderRadius: 12, padding: '9px 14px', marginBottom: 12, fontSize: 12.5 }}>
          <Icon name="pending" size={13} /> This family is on hold — deposits are postponed and unpaid months stay unpaid until the hold is released.
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 14 }}>
        {[
          { l: `Expected ${year} (ETB)`, v: money(totals.expectedAmt), c: B.text },
          { l: 'Paid (ETB)', v: money(totals.paidAmt), sub: `${totals.paid} / 12 months`, c: B.okText },
          { l: 'Outstanding (ETB)', v: money(totals.outstanding), sub: `${totals.unpaid} unpaid`, c: B.goldDark },
          { l: 'Issues', v: totals.issues, sub: 'failed / on hold', c: B.red },
        ].map(t => (
          <div key={t.l} style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.c }}>{t.v}</div>
            {t.sub && <div style={{ fontSize: 11, color: B.textLight }}>{t.sub}</div>}
          </div>
        ))}
      </div>

      {/* Months */}
      {loading
        ? <div style={{ padding: 36, textAlign: 'center', color: B.textLight, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}><Icon name="spinner" size={18} spin />Loading payments…</div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 8 : 12 }}>
            {months.map(m => {
              const st = STATUS[m.status]
              return (
                <div key={m.i} style={{ background: B.card, border: `1px solid ${B.border}`, borderTop: `3px solid ${st.dot}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: B.text }}>{m.name}</span>
                    <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: B.text }}>ETB {money(m.amount)}</div>
                  <div style={{ fontSize: 11, color: B.textLight, minHeight: 28, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.status === 'paid'
                      ? <>Paid {m.p?.paid_on || ''}{m.p?.reference ? <><br />Ref: {m.p.reference}</> : null}</>
                      : m.p?.notes ? <span style={{ color: B.errText }}>{m.p.notes}</span> : '—'}
                  </div>
                  {m.p?.recorded_by && staffNames[m.p.recorded_by] && (
                    <div style={{ fontSize: 10.5, color: B.textLight }}><Icon name="edit" size={10} /> Signed by {staffNames[m.p.recorded_by]}</div>
                  )}
                  {canManage && (
                    <button onClick={() => openEdit(m)} style={{ background: B.greenLight, border: `1px solid ${B.border}`, color: B.green, borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 34, fontFamily: 'inherit' }}>
                      {m.status === 'pending' ? 'Record payment' : 'Update'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

      {/* Edit modal */}
      {edit != null && (
        <div onClick={() => !saving && setEdit(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,59,15,0.5)', zIndex: 9000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: B.card, width: '100%', maxWidth: 440, borderRadius: isMobile ? '20px 20px 0 0' : 18, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ padding: '14px 20px', borderBottom: `2px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: B.text }}>{MONTHS[edit]} {year} — {family.mother_name}</span>
              <button onClick={() => setEdit(null)} aria-label="Close" style={{ background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: '18px 20px calc(20px + env(safe-area-inset-bottom))' }}>
              <div style={{ marginBottom: 14 }}>
                <Lbl>Status</Lbl>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed (bank rejected / wrong account)</option>
                  <option value="on_hold">On hold</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}><Lbl>Amount (ETB)</Lbl><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} /></div>
              {form.status === 'paid' && (
                <>
                  <div style={{ marginBottom: 14 }}><Lbl>Date paid</Lbl><input type="date" value={form.paid_on} onChange={e => setForm(f => ({ ...f, paid_on: e.target.value }))} style={inputStyle} /></div>
                  <div style={{ marginBottom: 14 }}><Lbl>Bank reference (optional)</Lbl><input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. FT26283XXXXX" style={inputStyle} /></div>
                </>
              )}
              <div style={{ marginBottom: 18 }}>
                <Lbl>{form.status === 'paid' ? 'Notes (optional)' : 'Reason'}</Lbl>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {months[edit].p && <button disabled={saving} onClick={() => save(true)} style={{ background: B.card, color: B.text, border: `1.5px solid ${B.border}`, borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, fontFamily: 'inherit', marginRight: 'auto' }}>Reset to unpaid</button>}
                <button disabled={saving} onClick={() => setEdit(null)} style={{ background: B.card, color: B.text, border: `1.5px solid ${B.border}`, borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, fontFamily: 'inherit' }}>Cancel</button>
                <button disabled={saving} onClick={() => save(false)} style={{ background: `linear-gradient(135deg, ${B.green}, ${B.greenMid})`, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
