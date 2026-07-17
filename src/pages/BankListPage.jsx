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

// ─── LETTER PREVIEW + EXPORT ─────────────────────────────────────────────────
function BankLetter({ families, bank, project, onClose, isMobile }) {
  const filtered = families.filter(f => f.bank === bank.id && f.project === project)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const [copied, setCopied] = useState(false)
  const [copiedRow, setCopiedRow] = useState(null)

  const rowLine = (f, i) => `${f.roll_number || i + 1}\t${f.mother_name}\t${f.account_number || '—'}`

  const handleCopy = () => {
    const lines = [
      'R.No\tBeneficiary Name\tAccount No',
      ...filtered.map((f, i) => rowLine(f, i)),
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyRow = (f, i) => {
    navigator.clipboard.writeText(rowLine(f, i)).then(() => {
      setCopiedRow(f.id)
      setTimeout(() => setCopiedRow(null), 1500)
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
          }
          .date { text-align: right; font-size: 12pt; margin-bottom: 18pt; }
          .subject { font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 14pt; }
          .body { font-size: 11pt; line-height: 1.8; margin-bottom: 18pt; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th { background: #1e7d22 !important; color: white !important; padding: 7pt 9pt; text-align: left; border: 1pt solid #999; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { padding: 6pt 9pt; border: 1pt solid #ccc; }
          tr:nth-child(even) td { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .total { margin-top: 12pt; font-size: 12pt; font-weight: bold; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="content">
            <div class="date">${today}</div>
            <div class="subject">RE: Payment List — ${project} Beneficiaries</div>
            <div class="body">
              Please find below the list of ${project} project beneficiaries under Hidaya Development Association
              who are registered with ${bank.name}. Kindly process the following payments accordingly.
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
                ${filtered.map((f, i) => `
                  <tr>
                    <td>${f.roll_number || i + 1}</td>
                    <td>${f.family_code || '—'}</td>
                    <td>${f.mother_name}</td>
                    <td>${f.account_number || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">Total Beneficiaries: ${filtered.length}</div>
          </div>
        </div>
      </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print(); win.close() }, 600)
  }

  const handleExportCSV = () => {
    const rows = [
      ['R.No', 'Family ID', 'Beneficiary Name', 'Account No'],
      ...filtered.map((f, i) => [f.roll_number || i + 1, f.family_code || '', f.mother_name, f.account_number || '']),
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
      ${filtered.map((f, i) => `<tr><td>${f.roll_number || i+1}</td><td>${f.family_code||''}</td><td>${f.mother_name}</td><td>${f.account_number||''}</td></tr>`).join('')}
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
          <div style={{ fontSize: 11, color: '#81c784' }}>{filtered.length} beneficiaries · {today}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!isMobile && <button onClick={handlePrint} style={toolBtn('#1e7d22')}>🖨 Print</button>}
          <button onClick={handleExportCSV}   style={toolBtn('#0891b2')}>📄 CSV</button>
          {!isMobile && <button onClick={handleExportExcel} style={toolBtn('#059669')}>📊 Excel</button>}
          <button onClick={handleCopy} style={toolBtn(copied ? '#6b21a8' : '#7c3aed')}>{copied ? '✓ Copied all!' : '📋 Copy all'}</button>
          <button onClick={onClose} style={toolBtn('#dc2626')}>✕</button>
        </div>
      </div>

      {/* ── DESKTOP: full template preview ── */}
      {!isMobile && (
        <div style={{
          width: '100%', maxWidth: 860,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          aspectRatio: '1 / 1.414',
          background: '#fff',
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
          }}>
            <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 18 }}>{today}</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 14 }}>
              RE: Payment List — {project} Beneficiaries
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 18 }}>
              Please find below the list of {project} project beneficiaries under Hidaya Development Association
              who are registered with {bank.name}. Kindly process the following payments accordingly.
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
                {filtered.length === 0
                  ? <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                  : filtered.map((f, i) => (
                    <tr key={f.id}>
                      {[f.roll_number||i+1, f.family_code||'—', f.mother_name, f.account_number||'—'].map((v, j) => (
                        <td key={j} style={{ padding: '6px 10px', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{v}</td>
                      ))}
                    </tr>
                  ))
                }
              </tbody>
            </table>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Total Beneficiaries: {filtered.length}</div>
          </div>
        </div>
      )}

      {/* ── MOBILE: actual template image, scaled + readable ── */}
      {isMobile && (
        <div style={{ width: '100%', maxWidth: 860 }}>

          {/* The real letterhead template, same as desktop, with responsive (vw-based) text so it stays readable on a phone */}
          <div style={{
            width: '100%', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            position: 'relative',
            aspectRatio: '1 / 1.414',
            background: '#fff', marginBottom: 14,
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
            }}>
              <div style={{ textAlign: 'right', fontSize: 'clamp(9px, 2.6vw, 13px)', marginBottom: '3vw' }}>{today}</div>
              <div style={{ fontSize: 'clamp(9px, 2.7vw, 13px)', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3vw' }}>
                RE: Payment List — {project} Beneficiaries
              </div>
              <div style={{ fontSize: 'clamp(8px, 2.3vw, 12px)', lineHeight: 1.6, marginBottom: '3vw' }}>
                Please find below the list of {project} project beneficiaries under Hidaya Development Association
                who are registered with {bank.name}. Kindly process the following payments accordingly.
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
                  {filtered.length === 0
                    ? <tr><td colSpan={4} style={{ padding: '3vw', textAlign: 'center', color: '#999', border: '1px solid #ccc' }}>No beneficiaries found.</td></tr>
                    : filtered.map((f, i) => (
                      <tr key={f.id}>
                        {[f.roll_number||i+1, f.family_code||'—', f.mother_name, f.account_number||'—'].map((v, j) => (
                          <td key={j} style={{ padding: '1.2vw 1.5vw', border: '1px solid #ccc', background: i%2===1?'#f9f9f9':'#fff' }}>{v}</td>
                        ))}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              <div style={{ fontSize: 'clamp(9px, 2.6vw, 13px)', fontWeight: 700 }}>Total Beneficiaries: {filtered.length}</div>
            </div>
          </div>

          {/* Tap-to-copy list — the template text above is too small to tap precisely, so this gives an easy way to copy each row */}
          <div style={{
            background: '#fff', borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)', border: `1px solid ${B.border}`,
          }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${B.border}`, background: B.greenLight }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: B.textMid }}>Tap a row below to copy it</div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {filtered.length === 0
                ? (
                  <div style={{ padding: 20, textAlign: 'center', color: B.textLight }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>No beneficiaries found</div>
                  </div>
                )
                : filtered.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => handleCopyRow(f, i)}
                    style={{
                      background: copiedRow === f.id ? B.greenLight : '#fafff9',
                      borderRadius: 10, border: `1.5px solid ${copiedRow === f.id ? B.green : B.border}`,
                      padding: '12px 14px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: B.greenLight, color: B.green,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13,
                    }}>
                      {f.roll_number || i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: B.text }}>{f.mother_name}</div>
                      <div style={{ fontSize: 12, color: B.textMid, fontFamily: 'monospace', marginTop: 2 }}>
                        {f.account_number || '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, color: copiedRow === f.id ? B.green : B.textLight, flexShrink: 0 }}>
                      {copiedRow === f.id ? '✓' : '📋'}
                    </div>
                  </div>
                ))
              }
            </div>

            {filtered.length > 0 && (
              <div style={{
                background: B.sidebar, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a5d6a7' }}>Total Beneficiaries</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: B.gold }}>{filtered.length}</span>
              </div>
            )}
          </div>
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