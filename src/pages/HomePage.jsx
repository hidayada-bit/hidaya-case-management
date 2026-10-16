import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { B } from '../lib/theme'
import Icon from '../components/Icon'
import { caseState, joinedDate } from '../lib/settings'

const ago = d => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d)) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const ACT_ICON = { submission: 'clipboard', family: 'users', document: 'attach', payment: 'wallet', bank: 'bank', case: 'pending', settings: 'settings', agreement: 'agreement', general: 'info' }

const Card = ({ title, icon, action, onAction, children, style }) => (
  <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 12px rgba(30,125,34,0.06)', minWidth: 0, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon name={icon} size={16} color={B.green} />
      <div style={{ fontSize: 13, fontWeight: 800, color: B.text, flex: 1 }}>{title}</div>
      {action && <button onClick={onAction} style={{ background: 'none', border: 'none', color: B.green, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{action} →</button>}
    </div>
    {children}
  </div>
)

const Tile = ({ icon, label, value, sub, color, bg, onClick }) => (
  <div onClick={onClick} style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : 'default', minWidth: 0 }}>
    <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={20} /></div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: B.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: B.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
)

export default function HomePage({ user, families, allFamilies = [], children, childCounts = {}, rates, monthlyFor, canPayments, canApprovals, canCase, canAdd, transferredCount, isMobile, onNavigate, onView, onAdd }) {
  const [pay, setPay] = useState(null)       // this month's payments
  const [acts, setActs] = useState([])
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!canPayments) return
    supabase.from('payments').select('family_id,status,amount').eq('period', `${monthKey}-01`).then(({ data }) => setPay(data || []))
  }, [canPayments, monthKey])
  useEffect(() => {
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(8).then(({ data }) => setActs(data || []))
  }, [])

  const isHeld = f => caseState(f) === 'on_hold'
  const active = families.filter(f => f.status === 'active')
  const held = families.filter(isHeld)
  const pendingApprovals = allFamilies.filter(f => (f.submission_status || 'approved') === 'pending').length
  const returned = allFamilies.filter(f => f.submission_status === 'returned').length

  const payStats = useMemo(() => {
    if (!pay) return null
    const byId = Object.fromEntries(pay.map(p => [p.family_id, p]))
    const elig = active.filter(f => { const j = joinedDate(f); return !j || j.slice(0, 7) <= monthKey })
    let paid = 0, paidAmt = 0, expected = 0, failed = 0
    elig.forEach(f => {
      const p = byId[f.id]; const due = monthlyFor(rates, childCounts[f.id] || 0)
      expected += due
      if (p?.status === 'paid' && !isHeld(f)) { paid++; paidAmt += Number(p.amount ?? due) }
      else if (p?.status === 'failed') failed++
    })
    return { total: elig.length, paid, unpaid: elig.length - paid, paidAmt, expected, failed, pct: elig.length ? Math.round(paid / elig.length * 100) : 0 }
  }, [pay, active, rates, childCounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const missingBank = active.filter(f => !f.bank || !f.account_number).length
  const byProject = ['OVC', 'HF'].map(p => ({ k: p, n: families.filter(f => f.project === p).length }))
  const branches = useMemo(() => {
    const m = {}; families.filter(f => f.project === 'HF').forEach(f => { const b = f.branch || '—'; m[b] = (m[b] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [families])
  const maxBranch = Math.max(1, ...branches.map(b => b[1]))
  const recent = [...families].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  const hour = now.getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = (user?.full_name || '').split(' ')[0]

  const attention = [
    canApprovals && pendingApprovals > 0 && { icon: 'approve', text: `${pendingApprovals} registration${pendingApprovals > 1 ? 's' : ''} waiting for approval`, go: 'approvals' },
    canApprovals && returned > 0 && { icon: 'reject', text: `${returned} submission${returned > 1 ? 's' : ''} returned to collectors`, go: 'approvals' },
    canPayments && payStats && payStats.unpaid > 0 && { icon: 'clock', text: `${payStats.unpaid} beneficiar${payStats.unpaid > 1 ? 'ies' : 'y'} unpaid for ${monthName}`, go: 'payments' },
    canPayments && payStats && payStats.failed > 0 && { icon: 'alert', text: `${payStats.failed} failed payment${payStats.failed > 1 ? 's' : ''} to follow up`, go: 'payments' },
    canCase && held.length > 0 && { icon: 'pending', text: `${held.length} famil${held.length > 1 ? 'ies' : 'y'} on hold`, go: 'families' },
    missingBank > 0 && { icon: 'bank', text: `${missingBank} active beneficiar${missingBank > 1 ? 'ies have' : 'y has'} no bank account on file`, go: 'families' },
  ].filter(Boolean)

  const grid = (cols) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: 14, marginBottom: 14 })

  return (
    <div style={{ padding: isMobile ? '14px 12px 28px' : '22px 26px', maxWidth: 1140, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: isMobile ? 19 : 22, fontWeight: 800, color: B.text }}>{greet}{first ? `, ${first}` : ''}</div>
          <div style={{ fontSize: 12.5, color: B.textMid }}>{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        {canAdd && <button onClick={onAdd} style={{ background: B.green, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="userPlus" size={15} />Add family</button>}
        <button onClick={() => onNavigate('families')} style={{ background: B.card, color: B.green, border: `1px solid ${B.border}`, borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="users" size={15} />All families</button>
      </div>

      <div style={{ ...grid('repeat(4, 1fr)'), gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <Tile icon="users" label="Families" value={families.length} sub={`${active.length} active`} color={B.green} bg={B.greenLight} onClick={() => onNavigate('families')} />
        <Tile icon="child" label="Children" value={children.length} sub={`${Object.values(childCounts).reduce((a, b) => a + b, 0)} supported`} color={B.infoText} bg="#e3f2fd" />
        <Tile icon="pending" label={canCase ? 'On hold' : 'Pending'} value={canCase ? held.length : families.filter(f => f.status === 'pending').length} sub={canCase && transferredCount != null ? `${transferredCount} transferred out` : undefined} color={B.orange} bg="#fff3e0" />
        {canApprovals
          ? <Tile icon="approve" label="Awaiting approval" value={pendingApprovals} sub={pendingApprovals ? 'needs review' : 'all clear'} color={B.goldDark} bg={B.goldLight} onClick={() => onNavigate('approvals')} />
          : <Tile icon="bank" label="No bank account" value={missingBank} color={B.goldDark} bg={B.goldLight} />}
      </div>

      <div style={grid(canPayments ? '1.3fr 1fr' : '1fr')}>
        {canPayments && (
          <Card title={`Payments — ${monthName}`} icon="wallet" action="Open follow-up" onAction={() => onNavigate('payments')}>
            {!payStats ? <div style={{ color: B.textLight, fontSize: 13 }}>Loading…</div> : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: B.green }}>{payStats.pct}%</div>
                  <div style={{ fontSize: 12.5, color: B.textMid }}>{payStats.paid} of {payStats.total} paid</div>
                </div>
                <div style={{ height: 9, background: B.greenLight, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${payStats.pct}%`, height: '100%', background: B.green }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 12 }}>
                  <div><div style={{ color: B.textLight, fontWeight: 700 }}>PAID</div><b style={{ color: B.text }}>ETB {money(payStats.paidAmt)}</b></div>
                  <div><div style={{ color: B.textLight, fontWeight: 700 }}>OUTSTANDING</div><b style={{ color: B.goldDark }}>ETB {money(Math.max(payStats.expected - payStats.paidAmt, 0))}</b></div>
                  <div><div style={{ color: B.textLight, fontWeight: 700 }}>UNPAID</div><b style={{ color: B.text }}>{payStats.unpaid}</b></div>
                </div>
              </>
            )}
          </Card>
        )}
        <Card title="Needs attention" icon="alert">
          {attention.length === 0
            ? <div style={{ color: B.textMid, fontSize: 13 }}>Nothing urgent right now. 🎉</div>
            : attention.map((a, i) => (
              <button key={i} onClick={() => onNavigate(a.go)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: i ? `1px solid ${B.border}` : 'none', padding: '9px 0', cursor: 'pointer', fontFamily: 'inherit', color: B.text, fontSize: 13 }}>
                <span style={{ color: B.goldDark, display: 'flex' }}><Icon name={a.icon} size={16} /></span><span style={{ flex: 1 }}>{a.text}</span><Icon name="chevron" size={14} color={B.textLight} />
              </button>
            ))}
        </Card>
      </div>

      <div style={grid('1.3fr 1fr')}>
        <Card title="Recent activity" icon="clock">
          {acts.length === 0 ? <div style={{ color: B.textLight, fontSize: 13 }}>No activity yet.</div> : acts.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${B.border}` : 'none', alignItems: 'flex-start' }}>
              <span style={{ color: B.green, display: 'flex', marginTop: 2 }}><Icon name={ACT_ICON[a.category] || 'info'} size={15} /></span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: B.text }}><b>{a.actor_name}</b> {a.message}</div>
              <div style={{ fontSize: 11, color: B.textLight, whiteSpace: 'nowrap' }}>{ago(a.created_at)}</div>
            </div>
          ))}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="By project" icon="folder" action="Projects" onAction={() => onNavigate('projects')}>
            <div style={{ display: 'flex', gap: 10, marginBottom: branches.length ? 12 : 0 }}>
              {byProject.map(p => <div key={p.k} style={{ flex: 1, background: B.greenLight, borderRadius: 10, padding: '8px 12px' }}><div style={{ fontSize: 11, fontWeight: 700, color: B.textMid }}>{p.k}</div><div style={{ fontSize: 20, fontWeight: 800, color: B.green }}>{p.n}</div></div>)}
            </div>
            {branches.map(([b, n]) => (
              <div key={b} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: B.textMid, marginBottom: 2 }}><span>HF · {b}</span><b>{n}</b></div>
                <div style={{ height: 5, background: B.greenLight, borderRadius: 3 }}><div style={{ width: `${n / maxBranch * 100}%`, height: '100%', background: B.green, borderRadius: 3 }} /></div>
              </div>
            ))}
          </Card>
          <Card title="Recently registered" icon="userPlus">
            {recent.map((f, i) => (
              <button key={f.id} onClick={() => onView(f)} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8, background: 'none', border: 'none', borderTop: i ? `1px solid ${B.border}` : 'none', padding: '7px 0', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: B.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.mother_name}</span>
                <span style={{ fontSize: 11, color: B.textLight }}>{f.family_code}</span>
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
