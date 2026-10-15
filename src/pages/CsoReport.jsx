import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import { B } from '../lib/theme'
import { DEFAULT_RATES, isPayingChild, joinedDate } from '../lib/settings'

// ─────────────────────────────────────────────────────────────────────────────
// CSO "project performance information" report (the template HDA reports on):
//   Table 1  Physical and financial plan vs achievement
//   Table 2  Beneficiary plan vs actual addressed (M / F / T)
// Rules used (change here if the authority asks differently):
//   plan   = every beneficiary family x every month of the period (optionally only from its enrollment month)
//   actual = payments marked "paid"
//   mothers are counted Female; children = those 18 and under (same rule as payments); gender from the child record
// ─────────────────────────────────────────────────────────────────────────────
const HF_BRANCHES = ['Addis Ababa', 'Bishoftu', 'Dangla', 'Bure', 'Dire Dawa', 'Nekemte', 'Chagni']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const monthsBetween = (a, b) => {
  const out = []; let [y, m] = a.split('-').map(Number); const [ey, em] = b.split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++ } }
  return out
}
const lastDay = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate() }
const nf = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const pctOf = (a, p) => (p > 0 ? `${((a / p) * 100).toFixed(1)}%` : '—')
const periodTitle = (a, b) => {
  const [ay, am] = a.split('-').map(Number), [by, bm] = b.split('-').map(Number)
  return `${MONTHS[am - 1]} 1, ${ay} – ${MONTHS[bm - 1]} ${lastDay(b)}, ${by}`
}

export function compute({ fams, kids, pay, months, rates, onlyEnrolled }) {
  const kidsBy = {}
  kids.forEach(c => { if (isPayingChild(c)) (kidsBy[c.family_id] ||= []).push(c) })
  const r = { mPlan: 0, mAct: 0, cPlan: 0, cAct: 0, mFin: 0, mFinAct: 0, cFin: 0, cFinAct: 0, bp: { M: 0, F: 0, U: 0 }, ba: { M: 0, F: 0, U: 0 } }
  fams.forEach(f => {
    const ks = kidsBy[f.id] || []
    const joinM = (joinedDate(f) || '').slice(0, 7)
    let inPlan = false, addressed = false
    months.forEach(mo => {
      if (onlyEnrolled && joinM && joinM > mo) return
      inPlan = true
      r.mPlan++; r.cPlan += ks.length
      r.mFin += rates.mother; r.cFin += ks.length * rates.child
      const p = pay[`${f.id}|${mo}`]
      if (p && p.status === 'paid') {
        addressed = true
        r.mAct++; r.cAct += ks.length
        const amt = p.amount != null ? Number(p.amount) : rates.mother + ks.length * rates.child
        const mPart = Math.min(amt, rates.mother)
        r.mFinAct += mPart; r.cFinAct += amt - mPart
      }
    })
    const add = (bucket) => { bucket.F++; ks.forEach(c => { bucket[c.gender === 'male' ? 'M' : c.gender === 'female' ? 'F' : 'U']++ }) }
    if (inPlan) add(r.bp)
    if (addressed) add(r.ba)
  })
  return r
}

// ── HTML (preview + copy/paste) ──────────────────────────────────────────────
const TD = 'border:1px solid #444;padding:4px 6px;font-size:11pt;'
const th = (t, extra = '') => `<td style="${TD}font-weight:bold;text-align:center;background:#e8f5e9;${extra}" ${extra.includes('@') ? '' : ''}>${t}</td>`
function sectionHtml(sec, r, withPlan) {
  const bt = { M: r.bp.M, F: r.bp.F + 0, U: r.bp.U }
  const T = b => b.M + b.F + b.U
  const rows = [
    ['1', 'Monthly cash support to mothers (widows)', 'Beneficiary-months', r.mPlan, r.mAct, r.mFin, r.mFinAct],
    ['2', 'Monthly cash support to children (18 years and under)', 'Child-months', r.cPlan, r.cAct, r.cFin, r.cFinAct],
  ]
  const tot = [r.mPlan + r.cPlan, r.mAct + r.cAct, r.mFin + r.cFin, r.mFinAct + r.cFinAct]
  const c = (v, al = 'right') => `<td style="${TD}text-align:${al};">${v}</td>`
  let h = `<h3 style="font-family:Calibri,Arial;margin:14px 0 4px">${sec.title}</h3>`
  h += `<p style="font-family:Calibri,Arial;font-weight:bold;margin:4px 0">${withPlan ? 'Physical and financial plan vs achievement' : 'Physical and financial achievement'}</p>`
  const H = (x, extra = '') => `<td ${extra} style="${TD}font-weight:bold;text-align:center;background:#e8f5e9">${x}</td>`
  if (withPlan) {
    h += `<table style="border-collapse:collapse;font-family:Calibri,Arial;width:100%"><tr>${H('S/N', 'rowspan="2"')}${H('Description of Activities', 'rowspan="2"')}${H('Measurement', 'rowspan="2"')}${H('Physical', 'colspan="3"')}${H('Financial (ETB)', 'colspan="3"')}</tr><tr>${['Plan', 'Actual', '%', 'Plan', 'Actual', '%'].map(x => H(x)).join('')}</tr>`
    rows.forEach(([sn, d, m, pp, pa, fp, fa]) => { h += `<tr>${c(sn, 'center')}${c(d, 'left')}${c(m, 'left')}${c(nf(pp))}${c(nf(pa))}${c(pctOf(pa, pp))}${c(nf(fp))}${c(nf(fa))}${c(pctOf(fa, fp))}</tr>` })
    h += `<tr>${c('', 'center')}${c('<b>Total</b>', 'left')}${c('')}${c('<b>' + nf(tot[0]) + '</b>')}${c('<b>' + nf(tot[1]) + '</b>')}${c('<b>' + pctOf(tot[1], tot[0]) + '</b>')}${c('<b>' + nf(tot[2]) + '</b>')}${c('<b>' + nf(tot[3]) + '</b>')}${c('<b>' + pctOf(tot[3], tot[2]) + '</b>')}</tr></table>`
  } else {
    h += `<table style="border-collapse:collapse;font-family:Calibri,Arial;width:100%"><tr>${H('S/N')}${H('Description of Activities')}${H('Measurement')}${H('Physical (Actual)')}${H('Financial (Actual, ETB)')}</tr>`
    rows.forEach(([sn, d, m, , pa, , fa]) => { h += `<tr>${c(sn, 'center')}${c(d, 'left')}${c(m, 'left')}${c(nf(pa))}${c(nf(fa))}</tr>` })
    h += `<tr>${c('', 'center')}${c('<b>Total</b>', 'left')}${c('')}${c('<b>' + nf(tot[1]) + '</b>')}${c('<b>' + nf(tot[3]) + '</b>')}</tr></table>`
  }
  h += `<p style="font-family:Calibri,Arial;font-weight:bold;margin:12px 0 4px">Beneficiaries addressed</p>`
  const name = 'Hidaya Development Association (HDA) — ' + sec.title
  if (withPlan) {
    h += `<table style="border-collapse:collapse;font-family:Calibri,Arial;width:100%"><tr>${H('Name CSO', 'rowspan="3"')}${H('Beneficiary', 'colspan="6"')}</tr><tr>${H('Plan', 'colspan="3"')}${H('Actual addressed', 'colspan="3"')}</tr><tr>${['M', 'F', 'T', 'M', 'F', 'T'].map(x => H(x)).join('')}</tr><tr>${c(name, 'left')}${c(r.bp.M)}${c(r.bp.F)}${c(T(r.bp))}${c(r.ba.M)}${c(r.ba.F)}${c(T(r.ba))}</tr></table>`
  } else {
    h += `<table style="border-collapse:collapse;font-family:Calibri,Arial;width:100%"><tr>${H('Name CSO', 'rowspan="2"')}${H('Beneficiary — Actual addressed', 'colspan="3"')}</tr><tr>${['M', 'F', 'T'].map(x => H(x)).join('')}</tr><tr>${c(name, 'left')}${c(r.ba.M)}${c(r.ba.F)}${c(T(r.ba))}</tr></table>`
  }
  if (r.ba.U || (withPlan && r.bp.U)) h += `<p style="font-family:Calibri,Arial;font-size:9pt;color:#555">Note: ${r.ba.U} addressed children have no gender recorded; they are counted in T only.</p>`
  return h
}
export const docHtml = (titleLine, sections, withPlan = false) => `<div style="font-family:Calibri,Arial"><h2 style="font-family:Calibri,Arial">${titleLine}</h2>${sections.map(s => sectionHtml(s.sec, s.r, withPlan)).join('')}<ul style="font-family:Calibri,Arial"><li><i>Please, support your summary report with updated pictures of the project activities</i></li></ul></div>`

// ── DOCX ─────────────────────────────────────────────────────────────────────
export async function buildDocxBlob(titleLine, sections, withPlan = false) {
  const D = await import('docx')
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation, ShadingType, VerticalAlign } = D
  const border = { style: 'single', size: 4, color: '444444' }
  const borders = { top: border, bottom: border, left: border, right: border }
  const cell = (t, o = {}) => new TableCell({
    borders, columnSpan: o.span, rowSpan: o.rowSpan, verticalAlign: VerticalAlign.CENTER,
    shading: o.head ? { type: ShadingType.CLEAR, fill: 'E8F5E9', color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ alignment: o.align || (o.head ? AlignmentType.CENTER : AlignmentType.LEFT), children: [new TextRun({ text: String(t), bold: !!(o.head || o.bold), size: 21 })] })],
  })
  const R = AlignmentType.RIGHT, C = AlignmentType.CENTER
  const T = b => b.M + b.F + b.U
  const children = [new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: titleLine, bold: true, size: 28 })] })]
  sections.forEach(({ sec, r }) => {
    const rows = [
      ['1', 'Monthly cash support to mothers (widows)', 'Beneficiary-months', r.mPlan, r.mAct, r.mFin, r.mFinAct],
      ['2', 'Monthly cash support to children (18 years and under)', 'Child-months', r.cPlan, r.cAct, r.cFin, r.cFinAct],
    ]
    const tot = [r.mPlan + r.cPlan, r.mAct + r.cAct, r.mFin + r.cFin, r.mFinAct + r.cFinAct]
    children.push(new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: sec.title, bold: true, size: 26 })] }))
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: withPlan ? 'Physical and financial plan vs achievement' : 'Physical and financial achievement', bold: true, size: 22 })] }))
    const name = 'Hidaya Development Association (HDA) — ' + sec.title
    if (withPlan) {
      children.push(new Table({
        width: { size: 13000, type: WidthType.DXA }, columnWidths: [600, 3800, 1900, 1000, 1000, 900, 1400, 1400, 900],
        rows: [
          new TableRow({ tableHeader: true, children: [cell('S/N', { head: 1, rowSpan: 2 }), cell('Description of Activities', { head: 1, rowSpan: 2 }), cell('Measurement', { head: 1, rowSpan: 2 }), cell('Physical', { head: 1, span: 3 }), cell('Financial (ETB)', { head: 1, span: 3 })] }),
          new TableRow({ tableHeader: true, children: ['Plan', 'Actual', '%', 'Plan', 'Actual', '%'].map(x => cell(x, { head: 1 })) }),
          ...rows.map(([sn, d, m, pp, pa, fp, fa]) => new TableRow({ children: [cell(sn, { align: C }), cell(d), cell(m), cell(nf(pp), { align: R }), cell(nf(pa), { align: R }), cell(pctOf(pa, pp), { align: R }), cell(nf(fp), { align: R }), cell(nf(fa), { align: R }), cell(pctOf(fa, fp), { align: R })] })),
          new TableRow({ children: [cell(''), cell('Total', { bold: 1 }), cell(''), cell(nf(tot[0]), { bold: 1, align: R }), cell(nf(tot[1]), { bold: 1, align: R }), cell(pctOf(tot[1], tot[0]), { bold: 1, align: R }), cell(nf(tot[2]), { bold: 1, align: R }), cell(nf(tot[3]), { bold: 1, align: R }), cell(pctOf(tot[3], tot[2]), { bold: 1, align: R })] }),
        ],
      }))
    } else {
      children.push(new Table({
        width: { size: 13000, type: WidthType.DXA }, columnWidths: [700, 5200, 2600, 2000, 2500],
        rows: [
          new TableRow({ tableHeader: true, children: [cell('S/N', { head: 1 }), cell('Description of Activities', { head: 1 }), cell('Measurement', { head: 1 }), cell('Physical (Actual)', { head: 1 }), cell('Financial (Actual, ETB)', { head: 1 })] }),
          ...rows.map(([sn, d, m, , pa, , fa]) => new TableRow({ children: [cell(sn, { align: C }), cell(d), cell(m), cell(nf(pa), { align: R }), cell(nf(fa), { align: R })] })),
          new TableRow({ children: [cell(''), cell('Total', { bold: 1 }), cell(''), cell(nf(tot[1]), { bold: 1, align: R }), cell(nf(tot[3]), { bold: 1, align: R })] }),
        ],
      }))
    }
    children.push(new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: 'Beneficiaries addressed', bold: true, size: 22 })] }))
    if (withPlan) {
      children.push(new Table({
        width: { size: 13000, type: WidthType.DXA }, columnWidths: [4600, 1400, 1400, 1400, 1400, 1400, 1400],
        rows: [
          new TableRow({ tableHeader: true, children: [cell('Name CSO', { head: 1, rowSpan: 3 }), cell('Beneficiary', { head: 1, span: 6 })] }),
          new TableRow({ tableHeader: true, children: [cell('Plan', { head: 1, span: 3 }), cell('Actual addressed', { head: 1, span: 3 })] }),
          new TableRow({ tableHeader: true, children: ['M', 'F', 'T', 'M', 'F', 'T'].map(x => cell(x, { head: 1 })) }),
          new TableRow({ children: [cell(name), ...[r.bp.M, r.bp.F, T(r.bp), r.ba.M, r.ba.F, T(r.ba)].map(v => cell(v, { align: R }))] }),
        ],
      }))
    } else {
      children.push(new Table({
        width: { size: 13000, type: WidthType.DXA }, columnWidths: [7000, 2000, 2000, 2000],
        rows: [
          new TableRow({ tableHeader: true, children: [cell('Name CSO', { head: 1, rowSpan: 2 }), cell('Beneficiary — Actual addressed', { head: 1, span: 3 })] }),
          new TableRow({ tableHeader: true, children: ['M', 'F', 'T'].map(x => cell(x, { head: 1 })) }),
          new TableRow({ children: [cell(name), ...[r.ba.M, r.ba.F, T(r.ba)].map(v => cell(v, { align: R }))] }),
        ],
      }))
    }
    if (r.ba.U || (withPlan && r.bp.U)) children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `Note: ${r.ba.U} addressed children have no gender recorded; they are counted in T only.`, size: 18, italics: true })] }))
  })
  children.push(new Paragraph({ spacing: { before: 240 }, bullet: { level: 0 }, children: [new TextRun({ text: 'Please, support your summary report with updated pictures of the project activities', italics: true, bold: true, size: 21 })] }))
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children }],
  })
  return Packer.toBlob(doc)
}
async function downloadDocx(titleLine, sections, withPlan, fileName) {
  const blob = await buildDocxBlob(titleLine, sections, withPlan)
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

// ── Modal ────────────────────────────────────────────────────────────────────
const sel = { padding: '9px 10px', border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 14, color: B.text, fontFamily: 'inherit', background: B.input, minHeight: 40, width: '100%', boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 5 }

export default function CsoReport({ families, children, rates = DEFAULT_RATES, toast, isMobile, onClose }) {
  const [start, setStart] = useState('2026-01')
  const [end, setEnd] = useState('2026-06')
  const [scope, setScope] = useState('all')
  const [onlyEnrolled, setOnlyEnrolled] = useState(false)
  const [withPlan, setWithPlan] = useState(false) // default: actuals only (no Plan columns)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { titleLine, sections }

  const scopes = useMemo(() => [
    { id: 'all', label: 'All HDA (with each project / city shown separately)' },
    { id: 'OVC', label: 'OVC project' },
    { id: 'HF', label: 'HF project (all cities)' },
    ...HF_BRANCHES.map(b => ({ id: 'HF:' + b, label: 'HF — ' + b })),
  ], [])

  const generate = async () => {
    if (start > end) { toast('Start month must be before the end month', 'error'); return }
    setBusy(true)
    try {
      const months = monthsBetween(start, end)
      const pay = {}
      const from = 0; let page = 0; const SIZE = 1000
      for (;;) {
        const { data, error } = await supabase.from('payments').select('family_id,period,status,amount')
          .gte('period', `${start}-01`).lte('period', `${end}-01`).range(from + page * SIZE, from + page * SIZE + SIZE - 1)
        if (error) throw error
        ;(data || []).forEach(p => { pay[`${p.family_id}|${p.period.slice(0, 7)}`] = p })
        if (!data || data.length < SIZE) break
        page++
      }
      const inScope = (f, id) => id === 'all' ? true : id === 'OVC' ? f.project === 'OVC' : id === 'HF' ? f.project === 'HF' : (f.project === 'HF' && f.branch === id.slice(3))
      const mk = (title, fams) => ({ sec: { title }, r: compute({ fams, kids: children, pay, months, rates, onlyEnrolled: withPlan && onlyEnrolled }) })
      const sections = []
      if (scope === 'all') {
        sections.push(mk('HDA — All beneficiaries', families))
        sections.push(mk('OVC project', families.filter(f => f.project === 'OVC')))
        HF_BRANCHES.forEach(b => sections.push(mk('HF — ' + b, families.filter(f => f.project === 'HF' && f.branch === b))))
      } else {
        sections.push(mk(scopes.find(s => s.id === scope).label, families.filter(f => inScope(f, scope))))
      }
      const titleLine = `CSOs project performance information template to date (${periodTitle(start, end)})`
      setResult({ titleLine, sections })
    } catch (e) { toast('Could not build the report: ' + e.message, 'error') }
    finally { setBusy(false) }
  }

  const copy = () => {
    const el = document.getElementById('cso-report-preview'); if (!el) return
    const rg = document.createRange(); rg.selectNodeContents(el)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(rg)
    let ok = false; try { ok = document.execCommand('copy') } catch { /* ignore */ }
    s.removeAllRanges()
    toast(ok ? 'Copied — paste it into Word or email' : 'Copy failed — use Download Word', ok ? undefined : 'error')
  }
  const download = async () => {
    try { await downloadDocx(result.titleLine, result.sections, withPlan, `CSO-report-${start}_to_${end}.docx`) }
    catch (e) { toast('Could not create the Word file: ' + e.message, 'error') }
  }

  const btn = (primary) => ({ background: primary ? `linear-gradient(135deg, ${B.green}, ${B.greenMid})` : B.card, color: primary ? '#fff' : B.text, border: primary ? 'none' : `1.5px solid ${B.border}`, borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,59,15,0.55)', zIndex: 9000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.card, width: '100%', maxWidth: 980, borderRadius: isMobile ? '20px 20px 0 0' : 18, maxHeight: '94vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `2px solid ${B.greenLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: B.card, zIndex: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: B.text }}>CSO Performance Report</span>
          <button onClick={onClose} aria-label="Close" style={{ background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: B.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '16px 20px calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 2fr', gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>From month</label><input type="month" value={start} onChange={e => setStart(e.target.value)} style={sel} /></div>
            <div><label style={lbl}>To month</label><input type="month" value={end} onChange={e => setEnd(e.target.value)} style={sel} /></div>
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}><label style={lbl}>Scope</label>
              <select value={scope} onChange={e => setScope(e.target.value)} style={sel}>{scopes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: B.textMid, marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={withPlan} onChange={e => setWithPlan(e.target.checked)} />
            Also show the Plan columns and % (off = actual only)
          </label>
          {withPlan && <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: B.textMid, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyEnrolled} onChange={e => setOnlyEnrolled(e.target.checked)} />
            Plan only counts months from each family's enrollment date
          </label>}
          <button onClick={generate} disabled={busy} style={{ ...btn(true), opacity: busy ? 0.6 : 1 }}>{busy ? 'Building…' : 'Generate report'}</button>

          {result && (
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={copy} style={btn(false)}><Icon name="copy" size={15} /> Copy to paste</button>
                <button onClick={download} style={btn(true)}><Icon name="download" size={15} /> Download Word (.docx)</button>
              </div>
              <div style={{ background: '#fff', color: '#111', border: `1px solid ${B.border}`, borderRadius: 10, padding: 14, overflowX: 'auto' }}>
                <div id="cso-report-preview" dangerouslySetInnerHTML={{ __html: docHtml(result.titleLine, result.sections, withPlan) }} />
              </div>
              <div style={{ fontSize: 11.5, color: B.textLight, marginTop: 8, lineHeight: 1.6 }}>
                Actual = months marked Paid on the Payments page. Mothers are counted as female; children are those 18 and under. Families that were transferred out are not included; families on hold count in the plan but not as paid.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
