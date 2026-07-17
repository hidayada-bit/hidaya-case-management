import { useState, useRef } from 'react'

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

// ─── LETTER PREVIEW + EXPORT ─────────────────────────────────────────────────
function BankLetter({ families, bank, project, onClose, isMobile }) {
  const printRef = useRef()
  const filtered = families.filter(f => f.bank === bank.id && f.project === project)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${bank.name} - ${project} Letter</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', serif; }
        .page {
          width: 210mm; min-height: 297mm;
          position: relative;
          page-break-after: always;
        }
        .template-bg {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: fill; z-index: 0;
        }
        .content {
          position: relative; z-index: 1;
          padding: 120px 60px 100px 60px;
        }
        .date { text-align: right; font-size: 13px; margin-bottom: 24px; }
        .subject { font-size: 13px; font-weight: bold; margin-bottom: 20px; text-decoration: underline; }
        .body-text { font-size: 12px; line-height: 1.7; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1e7d22; color: white; padding: 8px 10px; text-align: left; border: 1px solid #999; }
        td { padding: 7px 10px; border: 1px solid #ccc; }
        tr:nth-child(even) td { background: #f5f5f5; }
        .totals { margin-top: 16px; font-size: 13px; font-weight: bold; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { page-break-after: always; }
        }
      </style>
      </head><body>
      <div class="page">
        <img class="template-bg" src="${window.location.origin}${bank.template}" />
        <div class="content">
          <div class="date">${today}</div>
          <div class="subject">RE: Payment List — ${project} Beneficiaries</div>
          <div class="body-text">
            Please find below the list of ${project} project beneficiaries under Hidaya Development Association
            who are registered with ${bank.name}. Kindly process the following payments accordingly.
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:60px">R.No</th>
                <th style="width:110px">Family ID</th>
                <th>Beneficiary Name</th>
                <th>Account No</th>
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
          <div class="totals">Total Beneficiaries: ${filtered.length}</div>
        </div>
      </div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => { win.print(); win.close() }, 500)
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
    const html = `
      <table>
        <tr><th>R.No</th><th>Family ID</th><th>Beneficiary Name</th><th>Account No</th></tr>
        ${filtered.map((f, i) => `
          <tr>
            <td>${f.roll_number || i + 1}</td>
            <td>${f.family_code || ''}</td>
            <td>${f.mother_name}</td>
            <td>${f.account_number || ''}</td>
          </tr>
        `).join('')}
        <tr><td colspan="4"><b>Total: ${filtered.length}</b></td></tr>
      </table>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${bank.short}_${project}_beneficiaries.xls`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 20, overflowY: 'auto' }}>
      {/* Toolbar */}
      <div style={{ width: '100%', maxWidth: 860, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: B.sidebar, borderRadius: 12, padding: '12px 18px', marginBottom: 16, border: `1px solid rgba(245,168,0,0.3)`, flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: B.gold }}>{bank.name} — {project}</div>
          <div style={{ fontSize: 11, color: '#81c784' }}>{filtered.length} beneficiaries · {today}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handlePrint}       style={toolBtn('#1e7d22')}>🖨 Print / PDF</button>
          <button onClick={handleExportCSV}   style={toolBtn('#0891b2')}>📄 CSV</button>
          <button onClick={handleExportExcel} style={toolBtn('#059669')}>📊 Excel</button>
          <button onClick={onClose}           style={toolBtn('#dc2626')}>✕ Close</button>
        </div>
      </div>

      {/* Letter Preview — desktop only */}
      {!isMobile && (
        <div ref={printRef} style={{ width: '100%', maxWidth: 860, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)', position: 'relative', minHeight: 500 }}>
          {/* Template background */}
          <img src={bank.template} alt="template" style={{ width: '100%', display: 'block', minHeight: 300 }} />

          {/* Content overlay */}
          <div style={{ position: 'absolute', top: '42%', left: '7%', right: '7%', fontFamily: "'Times New Roman', serif" }}>
            <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 20 }}>{today}</div>

            <div style={{ fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 16 }}>
              RE: Payment List — {project} Beneficiaries
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>
              Please find below the list of {project} project beneficiaries under Hidaya Development Association
              who are registered with {bank.name}. Kindly process the following payments accordingly.
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
              <thead>
                <tr>
                  {['R.No', 'Family ID', 'Beneficiary Name', 'Account No'].map(h => (
                    <th key={h} style={{ background: B.green, color: '#fff', padding: '7px 10px', textAlign: 'left', border: '1px solid #999', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: B.textLight, border: '1px solid #ccc' }}>No beneficiaries found for this filter.</td></tr>
                  : filtered.map((f, i) => (
                    <tr key={f.id}>
                      <td style={{ padding: '6px 10px', border: '1px solid #ccc', background: i % 2 === 1 ? '#f9f9f9' : '#fff' }}>{f.roll_number || i + 1}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #ccc', background: i % 2 === 1 ? '#f9f9f9' : '#fff' }}>{f.family_code || '—'}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #ccc', background: i % 2 === 1 ? '#f9f9f9' : '#fff' }}>{f.mother_name}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #ccc', background: i % 2 === 1 ? '#f9f9f9' : '#fff' }}>{f.account_number || '—'}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>

            <div style={{ fontSize: 13, fontWeight: 700 }}>Total Beneficiaries: {filtered.length}</div>
          </div>
        </div>
      )}

      {/* Mobile: no preview, just a note */}
      {isMobile && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', width: '100%', maxWidth: 860 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🖨</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: B.text, marginBottom: 6 }}>Ready to export</div>
          <div style={{ fontSize: 12, color: B.textLight }}>{filtered.length} beneficiaries for {bank.name} — {project}</div>
          <div style={{ fontSize: 11, color: B.textLight, marginTop: 8 }}>Use Print/PDF or CSV above to get the full letter.</div>
        </div>
      )}
    </div>
  )
}

const toolBtn = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
})

// ─── MAIN BANK LIST PAGE ──────────────────────────────────────────────────────
export default function BankListPage({ families, isMobile }) {
  const [viewing, setViewing] = useState(null)

  const getCount = (bankId, project) =>
    families.filter(f => f.bank === bankId && f.project === project).length

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '22px 26px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header banner */}
      <div style={{ background: `linear-gradient(135deg, ${B.sidebar}, ${B.greenMid})`, borderRadius: 14, padding: '16px 20px', marginBottom: 24, position: 'relative', overflow: 'hidden', border: `1px solid rgba(245,168,0,0.3)` }}>
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
          <div key={bank.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${B.border}`, overflow: 'hidden', boxShadow: `0 2px 12px rgba(30,125,34,0.07)` }}>
            {/* Bank header */}
            <div style={{ padding: '14px 20px', background: `linear-gradient(to right, ${B.greenLight}, #fff)`, borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: `linear-gradient(to bottom, ${B.gold}, ${B.green})` }} />
              <div style={{ fontSize: 15, fontWeight: 800, color: B.text }}>{bank.name}</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: B.textLight, fontWeight: 600 }}>
                {PROJECTS.reduce((sum, p) => sum + getCount(bank.id, p), 0)} total beneficiaries
              </div>
            </div>

            {/* Project rows */}
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
                      <span style={{ background: count > 0 ? B.greenLight : '#f3f4f6', color: count > 0 ? B.green : '#9ca3af', fontWeight: 800, fontSize: 18, padding: '4px 14px', borderRadius: 20 }}>{count}</span>
                      <div style={{ background: `linear-gradient(135deg, ${B.green}, #2e9e33)`, color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>
                        Generate →
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Letter modal */}
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