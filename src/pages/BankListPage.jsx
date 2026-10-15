import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { monthlyFor, DEFAULT_RATES, caseState } from '../lib/settings'
import Icon from '../components/Icon'
import { BANKS } from '../lib/banks'
import BankMark from '../components/BankMark'
import { B } from '../lib/theme'
import { logActivity } from '../lib/activity'


const PROJECTS = ['OVC', 'HF']

const toolBtn = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6,
})

// How many beneficiary rows fit inside one template's content box before it needs a second page.
// Tune this per your actual template artwork if rows start overflowing the box or leave too much empty space.
const ROWS_PER_PAGE = 18

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmt = n => Number(n || 0).toLocaleString('en-US')
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const curMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const monthText = key => { const [y, m] = key.split('-').map(Number); return `${MONTH_NAMES[m - 1]} ${y}` }

// ─── EXPORT DIALOG: "just to have it" vs "for bank use (deposit)" ────────────
function ExportDialog({ count, onCancel, onConfirm, busy, bankName, project }) {
  const yy = String(new Date().getFullYear()).slice(-2)
  const [purpose, setPurpose] = useState('keep') // 'keep' | 'bank'
  const [num, setNum] = useState('')
  const [month, setMonth] = useState(curMonthKey())
  const ref = `HDA/${String(num).padStart(3, '0')}/${yy}`
  const fieldStyle = { width: '100%', padding: '10px 12px', border: `1.5px solid ${B.border}`, borderRadius: 9, fontSize: 15, color: B.text, background: B.input, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44, outline: 'none' }
  const opt = (id, title, sub) => (
    <div onClick={() => setPurpose(id)} style={{ cursor: 'pointer', borderRadius: 12, padding: '12px 14px', marginBottom: 10, border: `2px solid ${purpose === id ? B.green : B.border}`, background: purpose === id ? B.greenLight : B.card, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${purpose === id ? B.green : B.textLight}`, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {purpose === id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: B.green }} />}
      </div>
      <div><div style={{ fontWeight: 800, fontSize: 14, color: B.text }}>{title}</div><div style={{ fontSize: 12, color: B.textMid, marginTop: 2 }}>{sub}</div></div>
    </div>
  )
  const valid = purpose === 'keep' || (/^\d{1,4}$/.test(String(num)) && /^\d{4}-\d{2}$/.test(month))
  return (
    <div onClick={busy ? undefined : onCancel} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.card, borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `2px solid ${B.greenLight}`, fontSize: 16, fontWeight: 800, color: B.text }}>What is this export for?</div>
        <div style={{ padding: '16px 20px 20px' }}>
          {opt('keep', 'Just to have it', 'Plain list for your own records. Nothing is recorded.')}
          {opt('bank', 'For bank use (deposit)', 'Official letter for the bank. Needs a letter Ref No and the month it pays.')}
          {purpose === 'bank' && (
            <div style={{ background: B.greenLight, border: `1px solid ${B.border}`, borderRadius: 12, padding: 14, marginTop: 4 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>Letter Ref No</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontWeight: 800, color: B.text }}>HDA /</span>
                <input inputMode="numeric" autoFocus value={num} onChange={e => setNum(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="XXX" style={{ ...fieldStyle, textAlign: 'center', maxWidth: 110 }} />
                <span style={{ fontWeight: 800, color: B.text }}>/ {yy}</span>
              </div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>Month this letter pays</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={fieldStyle} />
              <div style={{ fontSize: 12, color: B.goldDark, background: B.goldLight, borderRadius: 8, padding: '8px 10px', marginTop: 12, lineHeight: 1.5 }}>
                Confirming will mark the active {project} beneficiaries on this {bankName} list (not yet paid) as <b>PAID</b> for <b>{valid ? monthText(month) : 'the chosen month'}</b> under Ref <b>{num ? ref : 'HDA/XXX/' + yy}</b>, and update each mother's Payment tab. {count} on this list.
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button disabled={busy} onClick={onCancel} style={{ ...toolBtn(B.card), color: B.text, border: `1.5px solid ${B.border}`, padding: '10px 16px', fontSize: 13 }}>Cancel</button>
            <button disabled={busy || !valid} onClick={() => onConfirm(purpose === 'bank' ? { ref, month: month } : null)} style={{ ...toolBtn(`linear-gradient(135deg, ${B.green}, ${B.greenMid})`), padding: '10px 18px', fontSize: 13, opacity: busy || !valid ? 0.55 : 1 }}>
              {busy ? 'Recording…' : purpose === 'bank' ? 'Confirm & export' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LETTER PREVIEW + EXPORT ─────────────────────────────────────────────────
const HELD_TD = { padding: '6px 10px', border: '1px solid #f5b5a0', background: '#fff1e6', color: '#c2410c', fontWeight: 700, textDecoration: 'none' }

function BankLetter({ families, bank, project, onClose, isMobile, childCounts = {}, rates = DEFAULT_RATES, user = null, isAdmin = false, toast = () => {} }) {
  const amountOf = f => monthlyFor(rates, childCounts[f.id] || 0)
  const matching = families
    .filter(f => f.bank === bank.id && f.project === project)
    .sort((a, b) => (a.mother_name || '').localeCompare(b.mother_name || ''))
  const isHeld = f => caseState(f) === 'on_hold'
  // payable = what actually goes into print / copy / CSV / Excel / payment records
  const filtered = matching
    .filter(f => !isHeld(f))
    .map((f, i) => ({ ...f, _rowNo: f.roll_number || i + 1, _amount: amountOf(f) })) // stable row number, independent of page
  // preview only: includes held families (shown highlighted, never exported)
  const heldRows = matching.filter(isHeld).map(f => ({ ...f, _held: true, _rowNo: '—', _amount: amountOf(f) }))
  const previewRows = [...filtered, ...heldRows].sort((a, b) => (a.mother_name || '').localeCompare(b.mother_name || ''))

  const pages = filtered.length ? chunk(filtered, ROWS_PER_PAGE) : [[]]
  const viewPages = previewRows.length ? chunk(previewRows, ROWS_PER_PAGE) : [[]]
  const totalPages = pages.length

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const [copied, setCopied] = useState(false)
  const [dialog, setDialog] = useState(null) // 'print' | 'csv' | 'excel' | 'copy'
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState(null) // { ref, month } once a bank letter has been issued
  const totalAmount = filtered.reduce((t, f) => t + f._amount, 0)
  const hdrs = () => ['R.No', 'Family ID', 'Beneficiary Name', 'Account No', 'Amount (ETB)']
  const cells = f => [f._rowNo, f.family_code || '—', f.mother_name, f.account_number || '—', fmt(f._amount)]

  const handleCopy = (meta) => {
    const lines = [
      ...(meta ? [`Ref No: ${meta.ref}`, `Payment for: ${monthText(meta.month)}`, ''] : []),
      hdrs().join('\t'),
      ...filtered.map(f => cells(f).join('\t')),
      '', `Total\t\t\t\t${fmt(totalAmount)}`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Marks the active beneficiaries on this list as PAID for the month, under the letter Ref No.
  const recordPayments = async ({ ref, month }) => {
    const { data: used, error: e1 } = await supabase.from('payments').select('id').eq('reference', ref).limit(1)
    if (e1) throw e1
    if (used?.length) throw new Error(`Ref No ${ref} has already been used. Please use a new letter number.`)
    const period = `${month}-01`
    const targets = filtered.filter(f => f.status === 'active')
    const ids = targets.map(f => f.id)
    const { data: existing, error: e2 } = ids.length ? await supabase.from('payments').select('family_id,status').eq('period', period).in('family_id', ids) : { data: [], error: null }
    if (e2) throw e2
    const already = new Set((existing || []).filter(p => p.status === 'paid').map(p => p.family_id))
    const rows = targets.filter(f => !already.has(f.id)).map(f => ({
      family_id: f.id, period, status: 'paid', amount: f._amount, paid_on: new Date().toISOString().slice(0, 10),
      reference: ref, notes: `Bank letter ${ref}`, recorded_by: user?.id || null,
    }))
    if (rows.length) {
      const { error } = await supabase.from('payments').upsert(rows, { onConflict: 'family_id,period' })
      if (error) throw error
    }
    logActivity(user, 'payment', `${user?.full_name || 'Someone'} recorded ${rows.length} payment(s) as paid for ${monthText(month)} (${ref}, ${bank.name} ${project})`)
    toast(`${rows.length} beneficiar${rows.length === 1 ? 'y' : 'ies'} recorded as paid for ${monthText(month)}${already.size ? ` (${already.size} already paid, skipped)` : ''}`)
  }

  const runExport = (action, meta) => {
    if (action === 'print') handlePrint(meta)
    else if (action === 'csv') handleExportCSV(meta)
    else if (action === 'excel') handleExportExcel(meta)
    else handleCopy(meta)
  }

  // Everyone can export "just to have it". Only an admin gets the bank/deposit option.
  const ask = action => {
    if (isAdmin) { setDialog(action); return }
    runExport(action, null)
    const how = { print: 'printed', csv: 'exported (CSV)', excel: 'exported (Excel)', copy: 'copied' }[action]
    logActivity(user, 'bank', `${user?.full_name || 'Someone'} ${how} the ${bank.name} ${project} list (${filtered.length} families) for records`)
  }

  const confirmExport = async meta => {
    try {
      if (meta) {
        setBusy(true)
        if (!issued || issued.ref !== meta.ref) await recordPayments(meta)
        setIssued(meta)
      }
      runExport(dialog, meta)
      const how = { print: 'printed', csv: 'exported (CSV)', excel: 'exported (Excel)', copy: 'copied' }[dialog]
      logActivity(user, 'bank', `${user?.full_name || 'Someone'} ${how} the ${bank.name} ${project} list (${filtered.length} families)${meta ? ` for bank use — ${meta.ref}, ${monthText(meta.month)}` : ' for records'}`)
      setDialog(null)
    } catch (e) { toast(e.message, 'error') }
    finally { setBusy(false) }
  }

  const handlePrint = (meta) => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
      <head>
        <title>${bank.name} — ${project} Letter</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { width: 210mm; }
          @page { size: A4; margin: 0; }
          .page {
            width: 210mm; min-height: 297mm;
            position: relative;
            background-image: url('${window.location.origin}${bank.template}');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            page-break-after: always;
          }
          .content {
            position: absolute;
            top: 22%; left: 8%; right: 8%; bottom: 10%;
            font-family: 'Times New Roman', serif;
            display: flex; flex-direction: column;
          }
          .date { text-align: right; font-size: 12pt; margin-bottom: 18pt; }
          .subject { font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 14pt; }
          .body { font-size: 11pt; line-height: 1.8; margin-bottom: 18pt; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th { background: #1e7d22 !important; color: white !important; padding: 7pt 9pt; text-align: left; border: 1pt solid #999; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { padding: 6pt 9pt; border: 1pt solid #ccc; }
          tr:nth-child(even) td { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ref { font-size: 12pt; font-weight: bold; margin-bottom: 4pt; }
          td.amt, th.amt { text-align: right; }
          .total { margin-top: 12pt; font-size: 12pt; font-weight: bold; }
          .pagelabel { margin-top: auto; padding-top: 10pt; text-align: right; font-size: 9pt; color: #555; font-style: italic; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${pages.map((pageRows, pIdx) => {
          const isFirst = pIdx === 0
          const isLast = pIdx === pages.length - 1
          return `
        <div class="page">
          <div class="content">
            ${meta ? `<div class="ref">Ref No: ${esc(meta.ref)}</div>` : ''}
            <div class="date">${today}</div>
            <div class="subject">RE: Payment List — ${project} Beneficiaries${meta ? ` for ${monthText(meta.month)}` : ''}${totalPages > 1 ? ` (Page ${pIdx + 1} of ${totalPages})` : ''}</div>
            <div class="body">
              ${isFirst
                ? `Please find below the list of ${project} project beneficiaries under Hidaya Development Association who are registered with ${bank.name}. Kindly process the following payments accordingly.`
                : `Continued from previous page — ${project} project beneficiaries registered with ${bank.name}.`
              }
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:55pt">R.No</th>
                  <th style="width:80pt">Family ID</th>
                  <th>Beneficiary Name</th>
                  <th style="width:110pt">Account No</th>
                  <th class="amt" style="width:90pt">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody>
                ${pageRows.length === 0
                  ? `<tr><td colspan="5" style="padding:16pt;text-align:center;color:#999;">No beneficiaries found.</td></tr>`
                  : pageRows.map(f => `
                  <tr>
                    <td>${f._rowNo}</td>
                    <td>${f.family_code || '—'}</td>
                    <td>${f.mother_name}</td>
                    <td>${f.account_number || '—'}</td>
                    <td class="amt">${fmt(f._amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${isLast ? `<div class="total">Total Beneficiaries: ${filtered.length} &nbsp;·&nbsp; Total Amount: ETB ${fmt(totalAmount)}</div>` : ''}
            ${totalPages > 1 ? `<div class="pagelabel">${isLast ? `End of list — Page ${pIdx + 1} of ${totalPages}` : `Continued on next page — Page ${pIdx + 1} of ${totalPages}`}</div>` : ''}
          </div>
        </div>`
        }).join('')}
      </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print(); win.close() }, 600)
  }

  const handleExportCSV = (meta) => {
    const rows = [
      ...(meta ? [['Ref No', meta.ref], ['Payment for', monthText(meta.month)], []] : []),
      hdrs(),
      ...filtered.map(f => [f._rowNo, f.family_code || '', f.mother_name, f.account_number || '', f._amount]),
      [], ['', '', '', 'Total', totalAmount],
    ]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${bank.short}_${project}_${meta ? meta.ref.replace(/\//g, '-') : 'beneficiaries'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = (meta) => {
    const cols = hdrs().length
    const html = `<table>
      ${meta ? `<tr><td colspan="${cols}"><b>Ref No: ${esc(meta.ref)}</b> — Payment for ${monthText(meta.month)}</td></tr>` : ''}
      <tr>${hdrs().map(h => `<th>${h}</th>`).join('')}</tr>
      ${filtered.map(f => `<tr>${cells(f).map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
      <tr><td colspan="${cols}"><b>Total: ${filtered.length} — ETB ${fmt(totalAmount)}</b></td></tr>
    </table>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${bank.short}_${project}_${meta ? meta.ref.replace(/\//g, '-') : 'beneficiaries'}.xls`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: isMobile ? 10 : 20, overflowY: 'auto',
    }}>

      {dialog && <ExportDialog count={filtered.filter(f => f.status === 'active').length} bankName={bank.name} project={project} busy={busy} onCancel={() => setDialog(null)} onConfirm={confirmExport} />}

      {/* ── TOOLBAR ── */}
      <div style={{
        width: '100%', maxWidth: 860, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: B.sidebar, borderRadius: 12, padding: '10px 14px',
        marginBottom: 12, border: '1px solid rgba(245,168,0,0.3)',
        flexWrap: 'wrap', gap: 8, position: isMobile ? 'sticky' : 'static', top: 0,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: B.gold }}>{bank.name} — {project}</div>
          <div style={{ fontSize: 11, color: '#81c784' }}>{filtered.length} beneficiaries{heldRows.length ? ` · ${heldRows.length} on hold (not exported)` : ''} · {today}{viewPages.length > 1 ? ` · ${viewPages.length} pages` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!isMobile && <button onClick={() => ask('print')} style={toolBtn('#1e7d22')}><Icon name="print" size={14} />Print</button>}
          <button onClick={() => ask('csv')} style={toolBtn('#0891b2')}><Icon name="file" size={14} />CSV</button>
          {!isMobile && <button onClick={() => ask('excel')} style={toolBtn('#059669')}><Icon name="spreadsheet" size={14} />Excel</button>}
          <button onClick={() => ask('copy')} style={toolBtn(copied ? '#6b21a8' : '#7c3aed')}>{copied ? <><Icon name="check" size={14} />Copied all!</> : <><Icon name="copy" size={14} />Copy all</>}</button>
          <button onClick={onClose} style={toolBtn('#dc2626')}><Icon name="x" size={14} /></button>
        </div>
      </div>

      {/* ── DESKTOP: full template preview, one box per page ── */}
      {!isMobile && viewPages.map((pageRows, pIdx) => {
        const isFirst = pIdx === 0
        const isLast = pIdx === viewPages.length - 1
        return (
        <div key={pIdx} style={{
          width: '100%', maxWidth: 860,
          flexShrink: 0, // never let the flex column squash a page: keep true A4 proportions and scroll instead
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          aspectRatio: '1 / 1.414',
          background: '#fff', marginBottom: isLast ? 0 : 16,
        }}>
          <img
            src={bank.template} alt="template" onError={e => { e.currentTarget.style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', filter: 'none' }}
          />
          <div style={{
            position: 'absolute',
            top: '22%', left: '8%', right: '8%', bottom: '10%',
            overflowY: 'auto',
            fontFamily: "'Times New Roman', serif", color: '#111',
            display: 'flex', flexDirection: 'column',
          }}>
            {issued && <div style={{ fontSize: 13, fontWeight: 'bold' }}>Ref No: {issued.ref}</div>}
            <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 18 }}>{today}</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 14 }}>
              RE: Payment List — {project} Beneficiaries{issued ? ` for ${monthText(issued.month)}` : ''}{viewPages.length > 1 ? ` (Page ${pIdx + 1} of ${viewPages.length})` : ''}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 18 }}>
              {isFirst
                ? <>Please find below the list of {project} project beneficiaries under Hidaya Development Association who are registered with {bank.name}. Kindly process the following payments accordingly.</>
                : <>Continued from previous page — {project} project beneficiaries registered with {bank.name}.</>
              }
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
              <thead>
                <tr>
                  {hdrs().map(h => (
                    <th key={h} style={{ background: B.green, color: '#fff', padding: '7px 10px', textAlign: 'left', border: '1px solid #999', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                  : pageRows.map((f, i) => (
                    <tr key={f.id} title={f._held ? 'On hold — not included in export' : undefined}>
                      {cells(f).map((v, j) => (
                        <td key={j} style={f._held ? HELD_TD : { padding: '6px 10px', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{f._held && j === 4 ? 'ON HOLD' : v}</td>
                      ))}
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {isLast && <div style={{ fontSize: 13, fontWeight: 700 }}>Total Beneficiaries: {filtered.length} · Total: ETB {fmt(totalAmount)}</div>}
            {viewPages.length > 1 && (
              <div style={{ marginTop: 'auto', paddingTop: 8, textAlign: 'right', fontSize: 10, color: '#888', fontStyle: 'italic' }}>
                {isLast ? `End of list — Page ${pIdx + 1} of ${viewPages.length}` : `Continued on next page — Page ${pIdx + 1} of ${viewPages.length}`}
              </div>
            )}
          </div>
        </div>
        )
      })}

      {/* ── MOBILE: actual template image, scaled + readable, one block per page ── */}
      {isMobile && (
        <div style={{ width: '100%', maxWidth: 860, flexShrink: 0 }}>
          {viewPages.map((pageRows, pIdx) => {
            const isFirst = pIdx === 0
            const isLast = pIdx === viewPages.length - 1
            return (
            <div key={pIdx} style={{
              width: '100%', borderRadius: 12, overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              position: 'relative',
              aspectRatio: '1 / 1.414',
              background: '#fff', marginBottom: isLast ? 0 : 14,
            }}>
              <img
                src={bank.template} alt="template" onError={e => { e.currentTarget.style.display = 'none' }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', filter: 'none' }}
              />
              <div style={{
                position: 'absolute',
                top: '22%', left: '8%', right: '8%', bottom: '10%',
                overflowY: 'auto',
                fontFamily: "'Times New Roman', serif", color: '#111',
                display: 'flex', flexDirection: 'column',
              }}>
                {issued && <div style={{ fontSize: 'clamp(9px, 2.6vw, 13px)', fontWeight: 'bold' }}>Ref No: {issued.ref}</div>}
            <div style={{ textAlign: 'right', fontSize: 'clamp(9px, 2.6vw, 13px)', marginBottom: '3vw' }}>{today}</div>
                <div style={{ fontSize: 'clamp(9px, 2.7vw, 13px)', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3vw' }}>
                  RE: Payment List — {project} Beneficiaries{issued ? ` for ${monthText(issued.month)}` : ''}{viewPages.length > 1 ? ` (Page ${pIdx + 1}/${viewPages.length})` : ''}
                </div>
                <div style={{ fontSize: 'clamp(8px, 2.3vw, 12px)', lineHeight: 1.6, marginBottom: '3vw' }}>
                  {isFirst
                    ? <>Please find below the list of {project} project beneficiaries under Hidaya Development Association who are registered with {bank.name}. Kindly process the following payments accordingly.</>
                    : <>Continued from previous page — {project} project beneficiaries registered with {bank.name}.</>
                  }
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(7px, 2vw, 12px)', marginBottom: '3vw' }}>
                  <thead>
                    <tr>
                      {['R.No', 'Family ID', 'Name', 'Account', 'ETB'].map(h => (
                        <th key={h} style={{ background: B.green, color: '#fff', padding: '1.2vw 1.5vw', textAlign: 'left', border: '1px solid #999' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0
                      ? <tr><td colSpan={5} style={{ padding: '3vw', textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                      : pageRows.map((f, i) => (
                        <tr key={f.id}>
                          {cells(f).map((v, j) => (
                            <td key={j} style={f._held ? { ...HELD_TD, padding: '1.2vw 1.5vw' } : { padding: '1.2vw 1.5vw', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{f._held && j === 4 ? 'ON HOLD' : v}</td>
                          ))}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                {isLast && <div style={{ fontSize: 'clamp(9px, 2.6vw, 13px)', fontWeight: 700 }}>Total Beneficiaries: {filtered.length} · Total: ETB {fmt(totalAmount)}</div>}
                {viewPages.length > 1 && (
                  <div style={{ marginTop: 'auto', paddingTop: 6, textAlign: 'right', fontSize: 'clamp(7px, 2vw, 10px)', color: '#888', fontStyle: 'italic' }}>
                    {isLast ? `End of list — Page ${pIdx + 1}/${viewPages.length}` : `Continued — Page ${pIdx + 1}/${viewPages.length}`}
                  </div>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MAIN BANK LIST PAGE ──────────────────────────────────────────────────────
export default function BankListPage({ families, isMobile, childCounts, rates, user, isAdmin, toast }) {
  const [viewing, setViewing] = useState(null)

  const getCount = (bankId, project) =>
    families.filter(f => f.bank === bankId && f.project === project && caseState(f) !== 'on_hold').length

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '22px 26px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header banner */}
      <div className="page-banner" style={{
        background: `linear-gradient(135deg, ${B.sidebar}, ${B.greenMid})`,
        borderRadius: 14, padding: '16px 20px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(245,168,0,0.3)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon name="bank" size={30} color={B.gold} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: B.gold }}>Bank List</div>
            <div className="pb-sub" style={{ fontSize: 12, color: '#a5d6a7' }}>Generate official bank payment letters by project and bank</div>
          </div>
        </div>
      </div>

      {/* Bank cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {BANKS.map(bank => (
          <div key={bank.id} style={{
            background: B.card, borderRadius: 16,
            border: `1px solid ${B.border}`, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(30,125,34,0.07)',
          }}>
            <div style={{
              padding: '14px 20px',
              background: `linear-gradient(135deg, ${bank.color}, color-mix(in srgb, ${bank.color} 78%, #000))`,
              borderBottom: `3px solid ${bank.accent}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <BankMark bank={bank} size={36} style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.9)' }} />
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{bank.name}</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                {PROJECTS.reduce((sum, p) => sum + getCount(bank.id, p), 0)} total
              </div>
            </div>

            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
              {PROJECTS.map(project => {
                const count = getCount(bank.id, project)
                return (
                  <div
                    key={project}
                    onClick={() => setViewing({ bank, project })}
                    style={{
                      flex: 1, borderRadius: 12, border: `1.5px solid ${B.border}`,
                      padding: '16px 20px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.15s', background: 'var(--c-input)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = bank.color; e.currentTarget.style.background = `color-mix(in srgb, ${bank.color} 10%, var(--c-card))`; e.currentTarget.style.boxShadow = `inset 4px 0 0 ${bank.accent}` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.background = 'var(--c-input)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: B.text, marginBottom: 4 }}>{project} Project</div>
                      <div style={{ fontSize: 12, color: B.textLight }}>{count} beneficiaries</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: count > 0 ? `color-mix(in srgb, ${bank.color} 14%, var(--c-card))` : '#f3f4f6',
                        color: count > 0 ? `color-mix(in srgb, ${bank.color} 65%, var(--c-text))` : '#9ca3af',
                        fontWeight: 800, fontSize: 18, padding: '4px 14px', borderRadius: 20,
                      }}>{count}</span>
                      <div style={{
                        background: bank.color,
                        color: '#fff', borderRadius: 8, padding: '6px 14px',
                        fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                      }}>Generate <Icon name="forward" size={13} /></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <BankLetter
          families={families}
          bank={viewing.bank}
          project={viewing.project}
          onClose={() => setViewing(null)}
          isMobile={isMobile}
          childCounts={childCounts} rates={rates} user={user} isAdmin={isAdmin} toast={toast}
        />
      )}
    </div>
  )
}