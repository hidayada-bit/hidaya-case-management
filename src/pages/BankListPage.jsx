import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { monthlyFor, DEFAULT_RATES, caseState } from '../lib/settings'
import Icon from '../components/Icon'
import { BANKS } from '../lib/banks'
import BankMark from '../components/BankMark'
import { B } from '../lib/theme'
import { logActivity } from '../lib/activity'
import { buildLetter, DEFAULT_LETTER_SETTINGS, amountWords, figure } from '../lib/letter'


const PROJECTS = ['OVC', 'HF']

const toolBtn = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6,
})

// How many beneficiary rows fit inside one template's content box before it needs a second page.
// Tune this per your actual template artwork if rows start overflowing the box or leave too much empty space.

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
function ExportDialog({ count, onCancel, onConfirm, busy, bankName, project, canRecord = false, action = 'print' }) {
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
          {opt('keep', 'Just to have it', action === 'copy' ? 'For your own records. Nothing is recorded. The copied text is marked "FOR RECORDS ONLY".' : 'For your own records. Saved as a locked PDF with a "FOR RECORDS ONLY" watermark — it cannot be edited or used as a bank letter. Nothing is recorded.')}
          {opt('bank', 'For bank use (deposit)', 'Official letter for the bank, with the letter text, total in words and figures. Needs a letter Ref No and the month it pays.')}
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
                {canRecord
                  ? <>Confirming will mark the active {project} beneficiaries on this {bankName} list (not yet paid) as <b>PAID</b> for <b>{valid ? monthText(month) : 'the chosen month'}</b> under Ref <b>{num ? ref : 'HDA/XXX/' + yy}</b>, and update each mother's Payment tab. {count} on this list.</>
                  : <>This creates the letter for <b>{valid ? monthText(month) : 'the chosen month'}</b> under Ref <b>{num ? ref : 'HDA/XXX/' + yy}</b>. Your role does not record payments, so finance or the administrator marks them as paid. {count} on this list.</>}
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
// Mothers with no eligible child (none registered / none aged 4–18) are treated like on-hold families:
// shown highlighted in the preview as a reminder to check the profile, but never printed / copied / exported / paid / totalled. (none registered / none aged 4–18): their amount is the mother rate only.
const NO_KIDS_REMARK = 'Mother only — no eligible children'
const REMARK_CSS = 'background:#fff1e6;color:#c2410c;font-weight:700;border:1px solid #f5b5a0;'
const HELD_TD = { padding: '6px 10px', border: '1px solid #f5b5a0', background: '#fff1e6', color: '#c2410c', fontWeight: 700, textDecoration: 'none' }

// Page capacities: the first page also carries the letter heading + body, the last page the closing + signatures.
const FIRST_CAP = 13, MID_CAP = 20, LAST_CAP = 14
function paginate(rows) {
  if (!rows.length) return [[]]
  const pages = []
  let i = 0
  while (i < rows.length) {
    const cap = pages.length === 0 ? FIRST_CAP : MID_CAP
    pages.push(rows.slice(i, i + cap)); i += cap
  }
  const lastCap = pages.length === 1 ? 8 : LAST_CAP
  const last = pages[pages.length - 1]
  if (last.length > lastCap) { pages[pages.length - 1] = last.slice(0, last.length - lastCap); pages.push(last.slice(last.length - lastCap)) }
  return pages
}

// Loads a public image as a compact JPEG data URL (for the PDF letterhead). null if it can't be loaded.
const imageDataUrl = src => new Promise(resolve => {
  const img = new Image()
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/jpeg', 0.85))
    } catch { resolve(null) }
  }
  img.onerror = () => resolve(null)
  img.src = src
})

function BankLetter({ families, bank, project, onClose, isMobile, childCounts = {}, rates = DEFAULT_RATES, user = null, isAdmin = false, canRecord = false, letterSettings = DEFAULT_LETTER_SETTINGS, toast = () => {} }) {
  const amountOf = f => monthlyFor(rates, childCounts[f.id] || 0)
  const matching = families
    .filter(f => f.bank === bank.id && f.project === project)
    .sort((a, b) => (a.mother_name || '').localeCompare(b.mother_name || ''))
  const isHeld = f => caseState(f) === 'on_hold'
  const noKids = f => !(childCounts[f.id] > 0)
  // payable = what actually goes into print / copy / CSV / Excel / PDF / payment records
  const filtered = matching
    .filter(f => !isHeld(f) && !noKids(f))
    .map((f, i) => ({ ...f, _rowNo: f.roll_number || i + 1, _amount: amountOf(f) })) // stable row number, independent of page
  // preview only: held families and mothers with no eligible children (shown highlighted, never exported)
  const heldRows = matching.filter(isHeld).map(f => ({ ...f, _held: true, _tag: 'ON HOLD', _rowNo: '—', _amount: amountOf(f) }))
  const noKidRows = matching.filter(f => !isHeld(f) && noKids(f)).map(f => ({ ...f, _held: true, _tag: 'NO CHILDREN', _remark: NO_KIDS_REMARK, _rowNo: '—', _amount: amountOf(f) }))
  const previewRows = [...filtered, ...heldRows, ...noKidRows].sort((a, b) => (a.mother_name || '').localeCompare(b.mother_name || ''))

  const pages = paginate(filtered)
  const viewPages = paginate(previewRows)
  const totalPages = pages.length

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const [copied, setCopied] = useState(false)
  const [dialog, setDialog] = useState(null) // 'print' | 'csv' | 'excel' | 'copy'
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState(null) // { ref, month } once a bank letter has been issued
  const totalAmount = filtered.reduce((t, f) => t + f._amount, 0)
  const letterFor = meta => buildLetter({ bankId: bank.id, settings: letterSettings, total: totalAmount, month: meta?.month, ref: meta?.ref, date: today })
  const letter = letterFor(issued)
  const RECORDS_MARK = 'FOR RECORDS ONLY — NOT FOR BANK USE'
  // EXPORT columns (print / copy / CSV / Excel): no Family ID, Remark left blank for the bank/office to fill.
  const hdrs = () => ['R.No', 'Parent/Guardian Name', 'Account No', 'Amount (Birr)', 'Remark']
  const cells = f => [f._rowNo, f.mother_name, f.account_number || '—', fmt(f._amount), '']
  // ON-SCREEN preview columns: keeps the Family ID for staff.
  const viewHdrs = () => ['R.No', 'Family ID', 'Beneficiary Name', 'Account No', 'Amount (ETB)', 'Remark']
  const viewCells = f => [f._rowNo, f.family_code || '—', f.mother_name, f.account_number || '—', fmt(f._amount), f._remark || '']

  // Copies a real table: pastes as a formatted table in Word / Outlook / Google Docs and as cells in Excel / Sheets.
  // Plain-text (tab-separated) is included as a fallback for apps that only accept text.
  const handleCopy = (meta) => {
    const head = hdrs()
    const body = filtered.map(f => cells(f))
    const totalRow = ['', 'Total', '', fmt(totalAmount), '']
    const top = meta ? [`Ref No: ${meta.ref}`, `Payment for: ${monthText(meta.month)}`, `Total: ${amountWords(totalAmount)} (${figure(totalAmount)})`, ''] : [RECORDS_MARK, '']
    const tsv = [...top, head.join('\t'), ...body.map(r => r.join('\t')), totalRow.join('\t')].join('\n')
    const td = (v, j, bold) => `<td style="border:1px solid #999;padding:4px 8px;${j === 3 ? 'text-align:right;' : ''}${bold ? 'font-weight:bold;' : ''}${j === 4 && v ? REMARK_CSS : ''}">${esc(v)}</td>`
    const html = (meta
      ? `<p><b>Ref No: ${esc(meta.ref)}</b><br>Payment for: ${esc(monthText(meta.month))}<br>Total: ${esc(amountWords(totalAmount))} (${esc(figure(totalAmount))})</p>`
      : `<p><b style="color:#b91c1c">${RECORDS_MARK}</b></p>`) +
      `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt">` +
      `<thead><tr>${head.map(h => `<th style="border:1px solid #999;padding:4px 8px;background:#1e7d22;color:#fff;text-align:left">${esc(h)}</th>`).join('')}</tr></thead>` +
      `<tbody>${body.map(r => `<tr>${r.map((v, j) => td(v, j, false)).join('')}</tr>`).join('')}` +
      `<tr>${totalRow.map((v, j) => td(v, j, true)).join('')}</tr></tbody></table>`
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    const textOnly = () => navigator.clipboard.writeText(tsv).then(done)
    if (window.ClipboardItem && navigator.clipboard?.write) {
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
      })]).then(done).catch(textOnly)
    } else textOnly()
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

  // "Just to have it": one locked, watermarked PDF (the same file whether Print, CSV or Excel was pressed).
  const handleRecordsPdf = async () => {
    const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const autoTable = atMod.default
    const pass = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', encryption: { ownerPassword: pass, userPermissions: ['print'] } })
    const W = 210, H = 297, L = W * 0.08, R = W - W * 0.08, TOP = H * (bank.top || 0.22), BOT = H * 0.10
    const bg = await imageDataUrl(bank.template)
    const paintBg = () => { if (bg) doc.addImage(bg, 'JPEG', 0, 0, W, H, 'tpl', 'FAST') }
    const Lt = letterFor(null)
    paintBg()
    doc.setFont('times', 'normal'); doc.setTextColor(17)
    let y = TOP
    doc.setFontSize(11); doc.text(Lt.date, R, y, { align: 'right' }); y += 8
    doc.setFont('times', 'bold')
    Lt.toLines.forEach((l, i) => doc.text(i === 0 ? `To: ${l}` : l, i === 0 ? L : L + 8, y + i * 5))
    y += Lt.toLines.length * 5 + 3
    doc.setFontSize(12); doc.text(Lt.subject, L, y); doc.line(L, y + 1, L + doc.getTextWidth(Lt.subject), y + 1); y += 8
    doc.setFont('times', 'normal'); doc.setFontSize(10.5)
    doc.text(Lt.salutation, L, y); y += 6
    const bodyLines = doc.splitTextToSize(Lt.body.replace(/for the month of .*\.$/, 'for the month of ____________.'), R - L)
    doc.text(bodyLines, L, y, { lineHeightFactor: 1.5 }); y += bodyLines.length * 5.6 + 3
    autoTable(doc, {
      startY: y, margin: { left: L, right: W - R, top: TOP, bottom: BOT },
      head: [hdrs()], body: filtered.map(f => [f._rowNo, f.mother_name, f.account_number || '—', fmt(f._amount), '']),
      theme: 'grid', styles: { font: 'times', fontSize: 9.5, cellPadding: 1.8, lineColor: [190, 190, 190], textColor: 17 },
      headStyles: { fillColor: [30, 125, 34], textColor: 255 }, columnStyles: { 3: { halign: 'right' } },
      willDrawPage: d => { if (d.pageNumber > 1) paintBg() },
    })
    y = doc.lastAutoTable.finalY + 7
    if (y > H - BOT - 40) { doc.addPage(); paintBg(); y = TOP }
    doc.setFont('times', 'bold'); doc.setFontSize(11)
    doc.text(`Total Beneficiaries: ${filtered.length}  ·  Total Amount: ETB ${fmt(totalAmount)}`, L, y); y += 8
    doc.setFont('times', 'normal'); doc.setFontSize(10.5)
    doc.text(Lt.closing, L, y); y += 8
    doc.text(Lt.regards, L, y); y += 14
    const colW = (R - L) / Math.max(Lt.signatories.length, 1)
    Lt.signatories.forEach((s, i) => { doc.setFont('times', 'bold'); doc.text(s.name, L + i * colW, y); doc.setFont('times', 'normal'); doc.text(s.title, L + i * colW, y + 5) })
    // watermark + page numbers on every page
    const n = doc.getNumberOfPages()
    for (let i = 1; i <= n; i++) {
      doc.setPage(i)
      doc.setFontSize(8); doc.setTextColor(110); doc.text(`Page ${i} of ${n}`, R, H - BOT + 6, { align: 'right' })
      doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.16 })); doc.setTextColor(185, 28, 28)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(30)
      doc.text('FOR RECORDS ONLY', W / 2, H / 2 - 8, { align: 'center', angle: 40 })
      doc.setFontSize(18); doc.text('NOT FOR BANK USE', W / 2 + 6, H / 2 + 14, { align: 'center', angle: 40 })
      doc.restoreGraphicsState()
    }
    doc.save(`${bank.short}_${project}_RECORDS_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const runExport = async (action, meta) => {
    if (!meta && action !== 'copy') { await handleRecordsPdf(); return }
    if (action === 'print') handlePrint(meta)
    else if (action === 'csv') handleExportCSV(meta)
    else if (action === 'excel') handleExportExcel(meta)
    else handleCopy(meta)
  }

  // Everyone who can open the bank list is asked: "just to have it" or "for bank use (deposit)".
  const ask = action => setDialog(action)

  const confirmExport = async meta => {
    try {
      setBusy(true)
      if (meta) {
        if (canRecord) { if (!issued || issued.ref !== meta.ref) await recordPayments(meta) }
        else {
          const { data: used } = await supabase.from('payments').select('id').eq('reference', meta.ref).limit(1)
          if (used?.length) throw new Error(`Ref No ${meta.ref} has already been used. Please use a new letter number.`)
        }
        setIssued(meta)
      }
      await runExport(dialog, meta)
      const how = { print: 'printed', csv: 'exported (CSV)', excel: 'exported (Excel)', copy: 'copied' }[dialog]
      logActivity(user, 'bank', `${user?.full_name || 'Someone'} ${how} the ${bank.name} ${project} list (${filtered.length} families)${meta ? ` for bank use — ${meta.ref}, ${monthText(meta.month)}${canRecord ? '' : ' (payments not recorded)'}` : ' for records'}`)
      setDialog(null)
    } catch (e) { toast(e.message, 'error') }
    finally { setBusy(false) }
  }

  const handlePrint = (meta) => {
    const Lt = letterFor(meta)
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
            top: ${(bank.top || 0.22) * 100}%; left: 8%; right: 8%; bottom: 10%;
            font-family: 'Times New Roman', serif;
            display: flex; flex-direction: column;
          }
          .head { display: flex; justify-content: space-between; font-size: 11pt; margin-bottom: 8pt; }
          .to { font-size: 11pt; font-weight: bold; line-height: 1.45; margin-bottom: 8pt; }
          .subject { font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 8pt; }
          .salut { font-size: 10.5pt; margin-bottom: 5pt; }
          .body { font-size: 10.5pt; line-height: 1.6; margin-bottom: 10pt; text-align: justify; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th { background: #1e7d22 !important; color: white !important; padding: 6pt 8pt; text-align: left; border: 1pt solid #999; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { padding: 5pt 8pt; border: 1pt solid #ccc; }
          tr:nth-child(even) td { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td.amt, th.amt { text-align: right; }
          .total { margin-top: 10pt; font-size: 11pt; font-weight: bold; }
          .closing { margin-top: 10pt; font-size: 10.5pt; }
          .sign { display: flex; gap: 30pt; margin-top: 26pt; font-size: 10.5pt; }
          .sign b { display: block; }
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
            ${isFirst ? `
            <div class="head"><div><b>${Lt.ref ? `Ref No: ${esc(Lt.ref)}` : ''}</b></div><div>${esc(Lt.date)}</div></div>
            <div class="to">To: ${Lt.toLines.map(esc).join('<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}</div>
            <div class="subject">Subject: ${esc(Lt.subject)}</div>
            <div class="salut">${esc(Lt.salutation)}</div>
            <div class="body">${esc(Lt.body)}</div>` : `
            <div class="subject">${esc(Lt.subject)} — ${project} Beneficiaries, ${esc(bank.name)} (continued)</div>`}
            <table>
              <thead>
                <tr>
                  <th style="width:45pt">R.No</th>
                  <th>Parent/Guardian Name</th>
                  <th style="width:105pt">Account No</th>
                  <th class="amt" style="width:80pt">Amount (Birr)</th>
                  <th style="width:120pt">Remark</th>
                </tr>
              </thead>
              <tbody>
                ${pageRows.length === 0
                  ? `<tr><td colspan="5" style="padding:16pt;text-align:center;color:#999;">No beneficiaries found.</td></tr>`
                  : pageRows.map(f => `
                  <tr>
                    <td>${esc(f._rowNo)}</td>
                    <td>${esc(f.mother_name)}</td>
                    <td>${esc(f.account_number || '—')}</td>
                    <td class="amt">${fmt(f._amount)}</td>
                    <td>&nbsp;</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${isLast ? `<div class="total">Total Beneficiaries: ${filtered.length} &nbsp;·&nbsp; Total Amount: ETB ${fmt(totalAmount)}</div>
            <div class="closing">${esc(Lt.closing)}<br><br>${esc(Lt.regards)}</div>
            <div class="sign">${Lt.signatories.map(s => `<div><b>${esc(s.name)}</b>${esc(s.title)}</div>`).join('')}</div>` : ''}
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
      ...(meta ? [['Ref No', meta.ref], ['Payment for', monthText(meta.month)], ['Total in words', `${amountWords(totalAmount)} (${figure(totalAmount)})`], []] : []),
      hdrs(),
      ...filtered.map(f => [f._rowNo, f.mother_name, f.account_number || '', f._amount, '']),
      ['', 'Total', '', totalAmount, ''],
    ]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${bank.short}_${project}_${meta ? meta.ref.replace(/\//g, '-') : 'beneficiaries'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = (meta) => {
    const cols = hdrs().length
    const html = `<table>
      ${meta ? `<tr><td colspan="${cols}"><b>Ref No: ${esc(meta.ref)}</b> — Payment for ${monthText(meta.month)}</td></tr><tr><td colspan="${cols}">Total in words: ${esc(amountWords(totalAmount))} (${esc(figure(totalAmount))})</td></tr>` : ''}
      <tr>${hdrs().map(h => `<th>${h}</th>`).join('')}</tr>
      ${filtered.map(f => `<tr>${cells(f).map((v, j) => `<td${j === 4 && v ? ` style="${REMARK_CSS}"` : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}
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

      {dialog && <ExportDialog action={dialog} canRecord={canRecord} count={filtered.filter(f => f.status === 'active').length} bankName={bank.name} project={project} busy={busy} onCancel={() => setDialog(null)} onConfirm={confirmExport} />}

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
          <div style={{ fontSize: 11, color: '#81c784' }}>{filtered.length} beneficiaries{heldRows.length ? ` · ${heldRows.length} on hold` : ''}{noKidRows.length ? ` · ${noKidRows.length} no eligible children` : ''}{heldRows.length + noKidRows.length ? ' (not exported)' : ''} · {today}{viewPages.length > 1 ? ` · ${viewPages.length} pages` : ''}</div>
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
            top: `${(bank.top || 0.22) * 100}%`, left: '8%', right: '8%', bottom: '10%',
            overflowY: 'auto',
            fontFamily: "'Times New Roman', serif", color: '#111',
            display: 'flex', flexDirection: 'column',
          }}>
            {isFirst ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <b>{letter.ref ? `Ref No: ${letter.ref}` : ''}</b><span>{letter.date}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 'bold', lineHeight: 1.45, marginBottom: 8 }}>{letter.toLines.map((l, i) => <div key={i} style={{ paddingLeft: i ? 22 : 0 }}>{i === 0 ? 'To: ' : ''}{l}</div>)}</div>
                <div style={{ fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 8 }}>Subject: {letter.subject}</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>{letter.salutation}</div>
                <div style={{ fontSize: 12, lineHeight: 1.55, marginBottom: 10, textAlign: 'justify' }}>{letter.body}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 8 }}>{letter.subject} — {project} Beneficiaries, {bank.name} (continued) — Page {pIdx + 1} of {viewPages.length}</div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
              <thead>
                <tr>
                  {viewHdrs().map(h => (
                    <th key={h} style={{ background: B.green, color: '#fff', padding: '7px 10px', textAlign: 'left', border: '1px solid #999', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0
                  ? <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                  : pageRows.map((f, i) => (
                    <tr key={f.id} title={f._held ? `${f._tag === 'ON HOLD' ? 'On hold' : 'No eligible children'} — not included in export` : undefined}>
                      {viewCells(f).map((v, j) => (
                        <td key={j} style={f._held || (j === 5 && v) ? HELD_TD : { padding: '6px 10px', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{f._held && j === 4 ? f._tag : v}</td>
                      ))}
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {isLast && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Total Beneficiaries: {filtered.length} · Total: ETB {fmt(totalAmount)}</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>{letter.closing}</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>{letter.regards}</div>
                <div style={{ display: 'flex', gap: 32, marginTop: 22, fontSize: 12 }}>
                  {letter.signatories.map((sg, i) => <div key={i}><b style={{ display: 'block' }}>{sg.name}</b>{sg.title}</div>)}
                </div>
              </>
            )}
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
                top: `${(bank.top || 0.22) * 100}%`, left: '8%', right: '8%', bottom: '10%',
                overflowY: 'auto',
                fontFamily: "'Times New Roman', serif", color: '#111',
                display: 'flex', flexDirection: 'column',
              }}>
                {isFirst ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(8px, 2.3vw, 12px)', marginBottom: '1.5vw' }}>
                      <b>{letter.ref ? `Ref No: ${letter.ref}` : ''}</b><span>{letter.date}</span>
                    </div>
                    <div style={{ fontSize: 'clamp(8px, 2.3vw, 12px)', fontWeight: 'bold', lineHeight: 1.4, marginBottom: '1.5vw' }}>{letter.toLines.map((l, i) => <div key={i} style={{ paddingLeft: i ? '4vw' : 0 }}>{i === 0 ? 'To: ' : ''}{l}</div>)}</div>
                    <div style={{ fontSize: 'clamp(9px, 2.5vw, 13px)', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '1.5vw' }}>Subject: {letter.subject}</div>
                    <div style={{ fontSize: 'clamp(8px, 2.2vw, 12px)', marginBottom: '1vw' }}>{letter.salutation}</div>
                    <div style={{ fontSize: 'clamp(7px, 2.1vw, 11px)', lineHeight: 1.45, marginBottom: '2vw', textAlign: 'justify' }}>{letter.body}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 'clamp(8px, 2.3vw, 12px)', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2vw' }}>{letter.subject} — {project}, {bank.name} (continued) — Page {pIdx + 1}/{viewPages.length}</div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(7px, 2vw, 12px)', marginBottom: '3vw' }}>
                  <thead>
                    <tr>
                      {['R.No', 'Family ID', 'Name', 'Account', 'ETB', 'Remark'].map(h => (
                        <th key={h} style={{ background: B.green, color: '#fff', padding: '1.2vw 1.5vw', textAlign: 'left', border: '1px solid #999' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0
                      ? <tr><td colSpan={6} style={{ padding: '3vw', textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                      : pageRows.map((f, i) => (
                        <tr key={f.id}>
                          {viewCells(f).map((v, j) => (
                            <td key={j} style={f._held || (j === 5 && v) ? { ...HELD_TD, padding: '1.2vw 1.5vw' } : { padding: '1.2vw 1.5vw', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{f._held && j === 4 ? f._tag : v}</td>
                          ))}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                {isLast && (
                  <>
                    <div style={{ fontSize: 'clamp(9px, 2.6vw, 13px)', fontWeight: 700 }}>Total Beneficiaries: {filtered.length} · Total: ETB {fmt(totalAmount)}</div>
                    <div style={{ fontSize: 'clamp(7px, 2.1vw, 11px)', marginTop: '1.5vw' }}>{letter.closing}</div>
                    <div style={{ display: 'flex', gap: '6vw', marginTop: '4vw', fontSize: 'clamp(7px, 2.1vw, 11px)' }}>
                      {letter.signatories.map((sg, i) => <div key={i}><b style={{ display: 'block' }}>{sg.name}</b>{sg.title}</div>)}
                    </div>
                  </>
                )}
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
export default function BankListPage({ families, isMobile, childCounts = {}, rates, user, isAdmin, canRecord = false, letterSettings, toast }) {
  const [viewing, setViewing] = useState(null)

  const getCount = (bankId, project) =>
    families.filter(f => f.bank === bankId && f.project === project && caseState(f) !== 'on_hold' && (childCounts[f.id] || 0) > 0).length

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
          childCounts={childCounts} rates={rates} user={user} isAdmin={isAdmin} canRecord={canRecord} letterSettings={letterSettings} toast={toast}
        />
      )}
    </div>
  )
}