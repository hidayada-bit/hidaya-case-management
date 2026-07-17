import { useState } from 'react'

const B = {
  green:      '#1e7d22',
  greenDark:  '#145717',
  greenLight: '#e8f5e9',
  greenMid:   '#2e9e33',
  gold:       '#f5a800',
  goldLight:  '#fff8e1',
  sidebar:    '#0d3b0f',
  border:     '#c8e6c9',
  text:       '#1a2e1a',
  textMid:    '#4a6b4a',
  textLight:  '#7a9b7a',
}

const BANKS = [
  { id: 'CBE', name: 'Commercial Bank of Ethiopia', short: 'CBE', template: '/cbe_template.png' },
  { id: 'OB',  name: 'Oromia Bank',                 short: 'OB',  template: '/oromia_template.png' },
]
const PROJECTS = ['OVC', 'HF']

const toolBtn = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  whiteSpace: 'nowrap',
})

// How many beneficiary rows fit inside one template's content box before it needs a second page.
// Tune this per your actual template artwork if rows start overflowing the box or leave too much empty space.
const ROWS_PER_PAGE = 18

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ─── LETTER PREVIEW + EXPORT ─────────────────────────────────────────────────
function BankLetter({ families, bank, project, onClose, isMobile }) {
  const filtered = families
    .filter(f => f.bank === bank.id && f.project === project)
    .sort((a, b) => (a.mother_name || '').localeCompare(b.mother_name || ''))
    .map((f, i) => ({ ...f, _rowNo: f.roll_number || i + 1 })) // stable row number, independent of page

  const pages = filtered.length ? chunk(filtered, ROWS_PER_PAGE) : [[]]
  const totalPages = pages.length

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const [copied, setCopied] = useState(false)

  const rowLine = (f) => `${f._rowNo}\t${f.mother_name}\t${f.account_number || '—'}`

  const handleCopy = () => {
    const lines = [
      'R.No\tBeneficiary Name\tAccount No',
      ...filtered.map(f => rowLine(f)),
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => {
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
            <div class="date">${today}</div>
            <div class="subject">RE: Payment List — ${project} Beneficiaries${totalPages > 1 ? ` (Page ${pIdx + 1} of ${totalPages})` : ''}</div>
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
                </tr>
              </thead>
              <tbody>
                ${pageRows.length === 0
                  ? `<tr><td colspan="4" style="padding:16pt;text-align:center;color:#999;">No beneficiaries found.</td></tr>`
                  : pageRows.map(f => `
                  <tr>
                    <td>${f._rowNo}</td>
                    <td>${f.family_code || '—'}</td>
                    <td>${f.mother_name}</td>
                    <td>${f.account_number || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${isLast ? `<div class="total">Total Beneficiaries: ${filtered.length}</div>` : ''}
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

  const handleExportCSV = () => {
    const rows = [
      ['R.No', 'Family ID', 'Beneficiary Name', 'Account No'],
      ...filtered.map(f => [f._rowNo, f.family_code || '', f.mother_name, f.account_number || '']),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${bank.short}_${project}_beneficiaries.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    const html = `<table>
      <tr><th>R.No</th><th>Family ID</th><th>Beneficiary Name</th><th>Account No</th></tr>
      ${filtered.map(f => `<tr><td>${f._rowNo}</td><td>${f.family_code||''}</td><td>${f.mother_name}</td><td>${f.account_number||''}</td></tr>`).join('')}
      <tr><td colspan="4"><b>Total: ${filtered.length}</b></td></tr>
    </table>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${bank.short}_${project}_beneficiaries.xls`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: isMobile ? 10 : 20, overflowY: 'auto',
    }}>

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
          <div style={{ fontSize: 11, color: '#81c784' }}>{filtered.length} beneficiaries · {today}{totalPages > 1 ? ` · ${totalPages} pages` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!isMobile && <button onClick={handlePrint} style={toolBtn('#1e7d22')}>🖨 Print</button>}
          <button onClick={handleExportCSV}   style={toolBtn('#0891b2')}>📄 CSV</button>
          {!isMobile && <button onClick={handleExportExcel} style={toolBtn('#059669')}>📊 Excel</button>}
          <button onClick={handleCopy} style={toolBtn(copied ? '#6b21a8' : '#7c3aed')}>{copied ? '✓ Copied all!' : '📋 Copy all'}</button>
          <button onClick={onClose} style={toolBtn('#dc2626')}>✕</button>
        </div>
      </div>

      {/* ── DESKTOP: full template preview, one box per page ── */}
      {!isMobile && pages.map((pageRows, pIdx) => {
        const isFirst = pIdx === 0
        const isLast = pIdx === pages.length - 1
        return (
        <div key={pIdx} style={{
          width: '100%', maxWidth: 860,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          aspectRatio: '1 / 1.414',
          background: '#fff', marginBottom: isLast ? 0 : 16,
        }}>
          <img
            src={bank.template} alt="template"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
          />
          <div style={{
            position: 'absolute',
            top: '22%', left: '8%', right: '8%', bottom: '10%',
            overflowY: 'auto',
            fontFamily: "'Times New Roman', serif",
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 18 }}>{today}</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 14 }}>
              RE: Payment List — {project} Beneficiaries{pages.length > 1 ? ` (Page ${pIdx + 1} of ${pages.length})` : ''}
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
                  {['R.No', 'Family ID', 'Beneficiary Name', 'Account No'].map(h => (
                    <th key={h} style={{ background: B.green, color: '#fff', padding: '7px 10px', textAlign: 'left', border: '1px solid #999', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0
                  ? <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                  : pageRows.map((f, i) => (
                    <tr key={f.id}>
                      {[f._rowNo, f.family_code||'—', f.mother_name, f.account_number||'—'].map((v, j) => (
                        <td key={j} style={{ padding: '6px 10px', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{v}</td>
                      ))}
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {isLast && <div style={{ fontSize: 13, fontWeight: 700 }}>Total Beneficiaries: {filtered.length}</div>}
            {pages.length > 1 && (
              <div style={{ marginTop: 'auto', paddingTop: 8, textAlign: 'right', fontSize: 10, color: '#888', fontStyle: 'italic' }}>
                {isLast ? `End of list — Page ${pIdx + 1} of ${pages.length}` : `Continued on next page — Page ${pIdx + 1} of ${pages.length}`}
              </div>
            )}
          </div>
        </div>
        )
      })}

      {/* ── MOBILE: actual template image, scaled + readable, one block per page ── */}
      {isMobile && (
        <div style={{ width: '100%', maxWidth: 860 }}>
          {pages.map((pageRows, pIdx) => {
            const isFirst = pIdx === 0
            const isLast = pIdx === pages.length - 1
            return (
            <div key={pIdx} style={{
              width: '100%', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              position: 'relative',
              aspectRatio: '1 / 1.414',
              background: '#fff', marginBottom: isLast ? 0 : 14,
            }}>
              <img
                src={bank.template} alt="template"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
              />
              <div style={{
                position: 'absolute',
                top: '22%', left: '8%', right: '8%', bottom: '10%',
                overflowY: 'auto',
                fontFamily: "'Times New Roman', serif",
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ textAlign: 'right', fontSize: 'clamp(9px, 2.6vw, 13px)', marginBottom: '3vw' }}>{today}</div>
                <div style={{ fontSize: 'clamp(9px, 2.7vw, 13px)', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3vw' }}>
                  RE: Payment List — {project} Beneficiaries{pages.length > 1 ? ` (Page ${pIdx + 1}/${pages.length})` : ''}
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
                      {['R.No', 'Family ID', 'Name', 'Account'].map(h => (
                        <th key={h} style={{ background: B.green, color: '#fff', padding: '1.2vw 1.5vw', textAlign: 'left', border: '1px solid #999' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0
                      ? <tr><td colSpan={4} style={{ padding: '3vw', textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                      : pageRows.map((f, i) => (
                        <tr key={f.id}>
                          {[f._rowNo, f.family_code||'—', f.mother_name, f.account_number||'—'].map((v, j) => (
                            <td key={j} style={{ padding: '1.2vw 1.5vw', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{v}</td>
                          ))}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                {isLast && <div style={{ fontSize: 'clamp(9px, 2.6vw, 13px)', fontWeight: 700 }}>Total Beneficiaries: {filtered.length}</div>}
                {pages.length > 1 && (
                  <div style={{ marginTop: 'auto', paddingTop: 6, textAlign: 'right', fontSize: 'clamp(7px, 2vw, 10px)', color: '#888', fontStyle: 'italic' }}>
                    {isLast ? `End of list — Page ${pIdx + 1}/${pages.length}` : `Continued — Page ${pIdx + 1}/${pages.length}`}
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
export default function BankListPage({ families, isMobile }) {
  const [viewing, setViewing] = useState(null)

  const getCount = (bankId, project) =>
    families.filter(f => f.bank === bankId && f.project === project).length

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '22px 26px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header banner */}
      <div style={{
        background: `linear-gradient(135deg, ${B.sidebar}, ${B.greenMid})`,
        borderRadius: 14, padding: '16px 20px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(245,168,0,0.3)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${B.gold}, ${B.green})` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 30 }}>🏦</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: B.gold }}>Bank List</div>
            <div style={{ fontSize: 12, color: '#a5d6a7' }}>Generate official bank payment letters by project and bank</div>
          </div>
        </div>
      </div>

      {/* Bank cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {BANKS.map(bank => (
          <div key={bank.id} style={{
            background: '#fff', borderRadius: 16,
            border: `1px solid ${B.border}`, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(30,125,34,0.07)',
          }}>
            <div style={{
              padding: '14px 20px',
              background: `linear-gradient(to right, ${B.greenLight}, #fff)`,
              borderBottom: `1px solid ${B.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
              <div style={{ fontSize: 15, fontWeight: 800, color: B.text }}>{bank.name}</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: B.textLight, fontWeight: 600 }}>
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
                      transition: 'all 0.15s', background: '#fafff9',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = B.green; e.currentTarget.style.background = B.greenLight }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.background = '#fafff9' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: B.text, marginBottom: 4 }}>{project} Project</div>
                      <div style={{ fontSize: 12, color: B.textLight }}>{count} beneficiaries</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: count > 0 ? B.greenLight : '#f3f4f6',
                        color: count > 0 ? B.green : '#9ca3af',
                        fontWeight: 800, fontSize: 18, padding: '4px 14px', borderRadius: 20,
                      }}>{count}</span>
                      <div style={{
                        background: `linear-gradient(135deg, ${B.green}, #2e9e33)`,
                        color: '#fff', borderRadius: 8, padding: '6px 14px',
                        fontSize: 12, fontWeight: 700,
                      }}>Generate →</div>
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
        />
      )}
    </div>
  )
}