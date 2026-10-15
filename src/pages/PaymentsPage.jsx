import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { BANKS, bankLabel } from '../lib/banks'
import BankMark from '../components/BankMark'
import { DEFAULT_RATES, monthlyFor, caseState } from '../lib/settings'
import { B } from '../lib/theme'
import { logActivity } from '../lib/activity'
import CsoReport from './CsoReport'

const HF_BRANCHES = ['Addis Ababa', 'Bishoftu', 'Dangla', 'Bure', 'Dire Dawa', 'Nekemte', 'Chagni']

const STATUS = {
  paid:    { label: 'Paid',    bg: B.greenLight, color: B.okText, dot: '#1e7d22', icon: 'done' },
  pending: { label: 'Unpaid',  bg: B.goldLight, color: B.warnText, dot: '#f5a800', icon: 'clock' },
  failed:  { label: 'Failed',  bg: B.errBg, color: B.errText, dot: B.red, icon: 'fail' },
  on_hold: { label: 'On hold', bg: B.infoBg, color: B.infoText, dot: '#6366f1', icon: 'pending' },
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 15,
  color: B.text, background: B.input, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44, outline: 'none',
}
const filterStyle = { padding: '9px 10px', border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, color: B.text, fontFamily: 'inherit', background: B.card, minHeight: 40 }
const btn = (variant = 'primary', disabled) => ({
  ...(variant === 'primary' ? { background: `linear-gradient(135deg, ${B.green}, ${B.greenMid})`, color: '#fff', border: 'none' }
    : variant === 'danger' ? { background: B.errBg, color: B.red, border: '1.5px solid #fecaca' }
    : variant === 'gold' ? { background: `linear-gradient(135deg, ${B.gold}, #ffb300)`, color: '#fff', border: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }
    : { background: B.card, color: B.text, border: `1.5px solid ${B.border}` }),
  borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 38, fontFamily: 'inherit', whiteSpace: 'nowrap',
})

const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const shiftMonth = (m, n) => { const [y, mo] = m.split('-').map(Number); return monthKey(new Date(y, mo - 1 + n, 1)) }
const monthLabel = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
const todayStr = () => new Date().toISOString().slice(0, 10)
const money = n => (n == null || n === '' || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

function Badge({ s }) {
  const st = STATUS[s] || STATUS.pending
  return (
    <span style={{ background: st.bg, color: st.color, padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />{st.label}
    </span>
  )
}

function Sheet({ title, onClose, children, isMobile }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,59,15,0.5)', zIndex: 9000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.card, width: '100%', maxWidth: 440, borderRadius: isMobile ? '20px 20px 0 0' : 18, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ padding: '14px 20px', borderBottom: `2px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: B.text }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '18px 20px calc(20px + env(safe-area-inset-bottom))' }}>{children}</div>
      </div>
    </div>
  )
}

const Lbl = ({ children }) => <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>{children}</label>

export default function PaymentsPage({ families, user, canManage, toast, isMobile, childCounts = {}, rates = DEFAULT_RATES, staffNames = {}, allChildren = [] }) {
  const [showReport, setShowReport] = useState(false)
  const isHeld = f => caseState(f) === 'on_hold'
  const signedBy = p => (p?.recorded_by && staffNames[p.recorded_by]) || null
  const calc = f => monthlyFor(rates, childCounts[f.id] || 0)
  const [month, setMonth] = useState(monthKey(new Date()))
  const [payments, setPayments] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState('All')
  const [branch, setBranch] = useState('All')
  const [bank, setBank] = useState('All')
  const [statusF, setStatusF] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [modal, setModal] = useState(null) // { kind: 'paid'|'issue'|'reset', targets: [family] }
  const [form, setForm] = useState({ amount: '', paid_on: todayStr(), reference: '', notes: '', status: 'failed' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('payments').select('*').eq('period', `${month}-01`)
    if (error) toast('Failed to load payments: ' + error.message, 'error')
    const map = {}
    ;(data || []).forEach(p => { map[p.family_id] = p })
    setPayments(map)
    setSelected(new Set())
    setLoading(false)
  }, [month]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const eligible = useMemo(() => families.filter(f => f.status === 'active'), [families])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return eligible
      .filter(f => project === 'All' || f.project === project)
      .filter(f => project !== 'HF' || branch === 'All' || f.branch === branch)
      .filter(f => bank === 'All' || (bank === 'None' ? !f.bank : f.bank === bank))
      .filter(f => !q || f.mother_name.toLowerCase().includes(q) || (f.family_code || '').toLowerCase().includes(q) || (f.account_number || '').includes(q))
      .map(f => {
        const p = payments[f.id]
        // A family on hold is shown UNPAID until released (unless that month was already paid)
        const status = isHeld(f) && p?.status !== 'paid' ? 'pending' : (p?.status || 'pending')
        return { f, p, status, amount: status === 'paid' ? (p.amount ?? calc(f)) : calc(f) }
      })
      .filter(r => statusF === 'All' || r.status === statusF)
      .sort((a, b) => (a.f.mother_name || '').localeCompare(b.f.mother_name || ''))
  }, [eligible, payments, project, branch, bank, statusF, search, rates, childCounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const s = { total: rows.length, paid: 0, pending: 0, failed: 0, on_hold: 0, paidAmt: 0, expectedAmt: 0 }
    rows.forEach(r => { s[r.status]++; s.expectedAmt += Number(r.amount) || 0; if (r.status === 'paid') s.paidAmt += Number(r.amount) || 0 })
    return s
  }, [rows])

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.f.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.f.id)))
  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const openModal = (kind, targets) => {
    if (kind === 'paid') {
      const heldOnes = targets.filter(isHeld)
      if (heldOnes.length) {
        toast(heldOnes.length === 1 && targets.length === 1 ? `${heldOnes[0].mother_name} is on hold — release the hold first (family profile → Status).` : `${heldOnes.length} family(ies) on hold were skipped — deposits are postponed for them.`, 'info')
        targets = targets.filter(f => !isHeld(f))
      }
    }
    if (!targets.length) return
    const single = targets.length === 1 ? targets[0] : null
    const p = single ? payments[single.id] : null
    setForm({
      amount: single ? String(p?.status === 'paid' ? (p.amount ?? calc(single)) : calc(single)) : '',
      paid_on: p?.paid_on || todayStr(),
      reference: p?.reference || '',
      notes: p?.notes || '',
      status: p?.status === 'on_hold' ? 'on_hold' : 'failed',
    })
    setModal({ kind, targets })
  }

  const save = async () => {
    if (!modal) return
    const { kind, targets } = modal
    if (kind === 'paid' && !form.paid_on) { toast('Please choose the payment date', 'error'); return }
    if (kind === 'issue' && !form.notes.trim()) { toast('Please add a short reason', 'error'); return }
    setSaving(true)
    try {
      const period = `${month}-01`
      const payload = targets.map(f => {
        const existing = payments[f.id]
        const fallbackAmt = calc(f)
        const amt = form.amount !== '' ? Number(form.amount) : fallbackAmt
        const base = { family_id: f.id, period, recorded_by: user?.id || null }
        if (kind === 'paid') return { ...base, status: 'paid', amount: amt, paid_on: form.paid_on, reference: form.reference.trim() || null, notes: existing?.notes || null }
        if (kind === 'issue') return { ...base, status: form.status, amount: fallbackAmt, paid_on: null, reference: null, notes: form.notes.trim() }
        return { ...base, status: 'pending', amount: fallbackAmt, paid_on: null, reference: null, notes: null }
      })
      const { error } = await supabase.from('payments').upsert(payload, { onConflict: 'family_id,period' })
      if (error) throw error
      const who = user?.full_name || 'Someone'
      const names = targets.length === 1 ? targets[0].mother_name : `${targets.length} families`
      logActivity(user, 'payment', `${who} ${kind === 'paid' ? 'marked paid' : kind === 'issue' ? 'reported a payment issue for' : 'reset to unpaid'} ${names} — ${monthLabel(month)}`, targets.length === 1 ? targets[0].id : null)
      toast(kind === 'paid' ? `${targets.length} payment${targets.length > 1 ? 's' : ''} marked as paid` : kind === 'issue' ? 'Payment issue recorded' : 'Payment reset to unpaid')
      setModal(null)
      await load()
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const exportCSV = () => {
    const header = ['No', 'Family Code', 'Beneficiary', 'Phone', 'Project', 'Branch', 'Bank', 'Account No', 'Amount', 'Status', 'Paid On', 'Reference', 'Notes']
    const lines = rows.map((r, i) => [i + 1, r.f.family_code, r.f.mother_name, r.f.phone_number || '', r.f.project || '', r.f.branch || '', r.f.bank || '', r.f.account_number || '', r.amount ?? '', STATUS[r.status].label, r.p?.paid_on || '', r.p?.reference || '', r.p?.notes || ''])
    const csv = [header, ...lines].map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `payments_${month}${project !== 'All' ? '_' + project : ''}.csv`
    a.click()
  }

  const pct = stats.total ? Math.round((stats.paid / stats.total) * 100) : 0
  const selTargets = rows.filter(r => selected.has(r.f.id)).map(r => r.f)
  const missingAcct = rows.filter(r => !r.f.account_number).length

  const StatTile = ({ icon, label, value, sub, color, bg }) => (
    <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: isMobile ? '12px 13px' : '14px 16px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, boxShadow: '0 2px 12px rgba(30,125,34,0.06)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: B.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: isMobile ? 18 : 21, fontWeight: 800, color: B.text, lineHeight: 1.15 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 1140, margin: '0 auto' }}>
      {showReport && <CsoReport families={families} children={allChildren} rates={rates} toast={toast} isMobile={isMobile} onClose={() => setShowReport(false)} />}
      {/* Banner */}
      <div className="page-banner" style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.sidebarMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', border: '1px solid rgba(245,168,0,0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <Icon name="wallet" size={28} color={B.gold} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: B.gold }}>Payment Follow-up</div>
          <div className="pb-sub" style={{ fontSize: 12, color: '#a5d6a7' }}>Track who has been paid each month and chase the rest</div>
        </div>
        <button onClick={() => setShowReport(true)} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="file" size={15} /> CSO Report</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 11, padding: 4 }}>
          <button aria-label="Previous month" onClick={() => setMonth(m => shiftMonth(m, -1))} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevronLeft" size={18} /></button>
          <div style={{ minWidth: 128, textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><Icon name="calendar" size={15} color={B.gold} />{monthLabel(month)}</div>
          <button aria-label="Next month" onClick={() => setMonth(m => shiftMonth(m, 1))} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron" size={18} /></button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 14 }}>
        <StatTile icon="users" label="Beneficiaries" value={stats.total} sub={`${stats.paid} paid`} color={B.green} bg={B.greenLight} />
        <StatTile icon="done" label="Paid" value={stats.paid} sub={`ETB ${money(stats.paidAmt)}`} color="#1b5e20" bg="#e8f5e9" />
        <StatTile icon="clock" label="Unpaid" value={stats.pending} sub={`ETB ${money(Math.max(stats.expectedAmt - stats.paidAmt, 0))} outstanding`} color={B.goldDark} bg={B.goldLight} />
        <StatTile icon="alert" label="Issues" value={stats.failed + stats.on_hold} sub={`${stats.failed} failed · ${stats.on_hold} on hold`} color="#dc2626" bg="#fef2f2" />
      </div>
      <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 7 }}>
          <span>{monthLabel(month)} completion</span><span style={{ color: B.green }}>{pct}%</span>
        </div>
        <div style={{ height: 9, background: B.greenLight, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, ${B.green}, ${B.greenMid})`, transition: 'width .5s' }} />
        </div>
        {missingAcct > 0 && <div style={{ fontSize: 11.5, color: B.amber, marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="warn" size={13} />{missingAcct} beneficiar{missingAcct > 1 ? 'ies have' : 'y has'} no bank account on file</div>}
      </div>

      {/* Filters */}
      <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 1 230px' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: B.textLight, display: 'flex' }}><Icon name="search" size={16} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, account…" style={{ ...filterStyle, paddingLeft: 34, width: '100%', fontSize: 16 }} />
        </div>
        <select value={project} onChange={e => { setProject(e.target.value); setBranch('All') }} style={filterStyle} aria-label="Project">
          <option value="All">All projects</option><option value="OVC">OVC</option><option value="HF">HF</option>
        </select>
        {project === 'HF' && (
          <select value={branch} onChange={e => setBranch(e.target.value)} style={filterStyle} aria-label="Branch">
            <option value="All">All branches</option>{HF_BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
        )}
        <select value={bank} onChange={e => setBank(e.target.value)} style={filterStyle} aria-label="Bank">
          <option value="All">All banks</option>{BANKS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}<option value="None">No bank set</option>
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={filterStyle} aria-label="Status">
          <option value="All">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canManage && <button style={btn('primary', !selected.size)} disabled={!selected.size} onClick={() => openModal('paid', selTargets)}><Icon name="check" size={15} />Mark paid ({selected.size})</button>}
          {canManage && <button style={btn('danger', !selected.size)} disabled={!selected.size} onClick={() => openModal('issue', selTargets)}><Icon name="alert" size={15} />Report issue</button>}
          <button style={btn('secondary')} onClick={exportCSV}><Icon name="download" size={15} />CSV</button>
        </div>
      </div>

      {/* List */}
      <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(30,125,34,0.08)' }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: `${canManage ? '36px ' : ''}minmax(180px,1.6fr) 1fr 1.2fr 0.8fr 0.9fr ${canManage ? '200px' : '90px'}`, gap: 12, padding: '10px 16px', background: B.greenLight, borderBottom: `1px solid ${B.border}`, fontSize: 11, fontWeight: 700, color: B.textMid, textTransform: 'uppercase', letterSpacing: '0.05em', alignItems: 'center' }}>
            {canManage && <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" style={{ width: 16, height: 16, accentColor: B.green }} />}
            <span>Beneficiary</span><span>Bank / Account</span><span>Status</span><span>Amount (ETB)</span><span>Paid on</span><span>{canManage ? 'Actions' : 'Contact'}</span>
          </div>
        )}
        {loading && <div style={{ padding: 36, textAlign: 'center', color: B.textLight, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}><Icon name="spinner" size={18} spin />Loading payments…</div>}
        {!loading && rows.length === 0 && (
          <div style={{ padding: '44px 20px', textAlign: 'center', color: B.textLight }}>
            <Icon name="search" size={34} style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, color: B.text }}>No beneficiaries match</div>
            <div style={{ fontSize: 13 }}>Only active families are listed. Adjust the filters above.</div>
          </div>
        )}
        {!loading && rows.map(({ f, p, status, amount }) => {
          const sel = selected.has(f.id)
          const actions = canManage && (
            <div style={{ display: 'flex', gap: 6, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              {status !== 'paid'
                ? <button style={btn('primary')} onClick={() => openModal('paid', [f])}><Icon name="check" size={14} />Paid</button>
                : <button style={btn('secondary')} onClick={() => openModal('reset', [f])} title="Reset to unpaid"><Icon name="refresh" size={14} />Undo</button>}
              {status !== 'paid' && <button style={{ ...btn('danger'), padding: '8px 10px' }} onClick={() => openModal('issue', [f])} title="Report issue" aria-label="Report issue"><Icon name="alert" size={14} /></button>}
            </div>
          )
          const call = f.phone_number && (
            <a href={`tel:${f.phone_number.replace(/[\s-]/g, '')}`} style={{ ...btn('secondary'), textDecoration: 'none', color: B.green, padding: '8px 11px' }} aria-label={`Call ${f.mother_name}`}><Icon name="phone" size={14} />{!isMobile && 'Call'}</a>
          )
          if (isMobile) return (
            <div key={f.id} style={{ padding: '13px 14px', borderBottom: `1px solid ${B.greenLight}`, background: sel ? B.greenLight : B.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canManage && <input type="checkbox" checked={sel} onChange={() => toggle(f.id)} aria-label={`Select ${f.mother_name}`} style={{ width: 18, height: 18, accentColor: B.green }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: B.text }}>{f.mother_name}</div>
                  <div style={{ fontSize: 11, color: B.textLight }}>{f.family_code} · {f.bank || 'No bank'}{f.account_number ? ` · ${f.account_number}` : ''}{isHeld(f) && <span style={{ marginLeft: 6, background: B.goldLight, color: B.warnText, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>On hold</span>}</div>
                </div>
                <Badge s={status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: B.text }}>ETB {money(amount)}</span>
                {p?.paid_on && <span style={{ fontSize: 11, color: B.textLight }}>on {p.paid_on}{signedBy(p) ? ` · by ${signedBy(p)}` : ''}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>{status !== 'paid' && call}{actions}</div>
              </div>
              {p?.notes && status !== 'paid' && <div style={{ fontSize: 11.5, color: B.errText, marginTop: 6 }}>{p.notes}</div>}
            </div>
          )
          return (
            <div key={f.id} style={{ display: 'grid', gridTemplateColumns: `${canManage ? '36px ' : ''}minmax(180px,1.6fr) 1fr 1.2fr 0.8fr 0.9fr ${canManage ? '200px' : '90px'}`, gap: 12, padding: '11px 16px', borderBottom: `1px solid ${B.greenLight}`, alignItems: 'center', background: sel ? B.greenLight : B.card }}>
              {canManage && <input type="checkbox" checked={sel} onChange={() => toggle(f.id)} aria-label={`Select ${f.mother_name}`} style={{ width: 16, height: 16, accentColor: B.green }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: B.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.mother_name}</div>
                <div style={{ fontSize: 11, color: B.textLight }}>{f.family_code}{f.project === 'HF' && f.branch ? ` · ${f.branch}` : ''}{isHeld(f) && <span title={f.case_reason || ''} style={{ marginLeft: 6, background: B.goldLight, color: B.warnText, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>On hold</span>}</div>
              </div>
              <div style={{ fontSize: 12.5, color: B.textMid, minWidth: 0 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{f.bank && <BankMark bank={f.bank} size={18} />}{bankLabel(f.bank)}</div>
                <div style={{ fontSize: 11, color: f.account_number ? B.textLight : B.amber }}>{f.account_number || 'No account'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <Badge s={status} />
                {(p?.reference || (p?.notes && status !== 'paid')) && (
                  <div title={p.reference || p.notes} style={{ fontSize: 11, color: status === 'paid' ? B.textLight : B.errText, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {status === 'paid' ? `Ref: ${p.reference}` : p.notes}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: B.text }}>{money(amount)}</div>
              <div style={{ fontSize: 12.5, color: B.textMid }}>{p?.paid_on || '—'}{signedBy(p) && <div style={{ fontSize: 10.5, color: B.textLight }}>by {signedBy(p)}</div>}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{canManage ? <>{actions}{status !== 'paid' && call}</> : call}</div>
            </div>
          )
        })}
      </div>

      {!canManage && <div style={{ fontSize: 12, color: B.textLight, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="lock" size={13} />You have view-only access to payments. Finance and administrators can record them.</div>}

      {/* Modal */}
      {modal && (
        <Sheet isMobile={isMobile} onClose={() => !saving && setModal(null)}
          title={modal.kind === 'paid' ? 'Mark as paid' : modal.kind === 'issue' ? 'Report payment issue' : 'Reset to unpaid'}>
          <div style={{ background: B.greenLight, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: B.textMid }}>
            <b style={{ color: B.text }}>{modal.targets.length === 1 ? modal.targets[0].mother_name : `${modal.targets.length} beneficiaries`}</b> · {monthLabel(month)}
          </div>
          {modal.kind === 'paid' && (<>
            <div style={{ marginBottom: 14 }}><Lbl>Payment date</Lbl><input type="date" value={form.paid_on} max={todayStr()} onChange={e => setForm(f => ({ ...f, paid_on: e.target.value }))} style={inputStyle} /></div>
            <div style={{ marginBottom: 14 }}><Lbl>Bank reference / batch no. (optional)</Lbl><input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. FT26283XXXXX" style={inputStyle} /></div>
            <div style={{ marginBottom: 18 }}>
              <Lbl>Amount (ETB){modal.targets.length > 1 ? ' — leave blank to use each monthly support' : ''}</Lbl>
              <input type="number" inputMode="decimal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={modal.targets.length > 1 ? 'Each beneficiary’s monthly support' : '0.00'} style={inputStyle} />
            </div>
          </>)}
          {modal.kind === 'issue' && (<>
            <div style={{ marginBottom: 14 }}>
              <Lbl>Issue type</Lbl>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option value="failed">Failed (bank rejected / wrong account)</option>
                <option value="on_hold">On hold (waiting for documents / verification)</option>
              </select>
            </div>
            <div style={{ marginBottom: 18 }}><Lbl>Reason</Lbl><textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Account number rejected by bank — call beneficiary to confirm" style={{ ...inputStyle, resize: 'vertical' }} /></div>
          </>)}
          {modal.kind === 'reset' && <p style={{ fontSize: 13.5, color: B.textMid, marginTop: 0, marginBottom: 18 }}>This clears the paid details for this month and puts the beneficiary back to <b>Unpaid</b>.</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
            <button style={btn('secondary', saving)} disabled={saving} onClick={() => setModal(null)}>Cancel</button>
            <button style={btn(modal.kind === 'issue' ? 'danger' : 'primary', saving)} disabled={saving} onClick={save}>
              {saving ? <><Icon name="spinner" size={15} spin />Saving…</> : <><Icon name="save" size={15} />Save</>}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
