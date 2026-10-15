import { BANKS, bankById, accountPrefixWarning } from '../lib/banks'
import { B } from '../lib/theme'
import Icon from './Icon'
import BankMark from './BankMark'

// Circular-logo bank selector on HDA dark green + bank-aware account number field.
// Props: bank (id), account (string), onBank(id), onAccount(str), isMobile
export default function BankPicker({ bank, account, onBank, onAccount }) {
  const sel = bankById(bank)
  const warn = accountPrefixWarning(bank, account)
  return (
    <div className="bp">
      <style>{`
        .bp{background:linear-gradient(160deg,#0d3b0f,#145717);border-radius:14px;padding:16px;margin-bottom:14px;color:#e8f5e9}
        .bp-row{display:flex;gap:8px;justify-content:space-around;flex-wrap:wrap}
        .bp-opt{background:transparent;border:0;cursor:pointer;font-family:inherit;color:inherit;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;flex:1 1 90px;max-width:140px;transition:background .25s ease}
        .bp-opt[aria-checked=true]{background:color-mix(in srgb,var(--bc) 55%,transparent)}
        .bp-logo{position:relative;border-radius:50%;transition:transform .25s ease,box-shadow .25s ease;box-shadow:0 0 0 0 transparent}
        .bp-logo img{border-radius:50%;object-fit:contain}
        .bp-opt[aria-checked=true] .bp-logo{transform:scale(1.1);box-shadow:0 0 0 3px var(--bc),0 0 0 6px var(--ba)}
        .bp-tick{position:absolute;right:-4px;top:-4px;width:22px;height:22px;border-radius:50%;background:var(--ba);color:#111;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.4);transition:opacity .2s ease,transform .2s ease}
        .bp-opt[aria-checked=true] .bp-tick{opacity:1;transform:scale(1)}
        .bp-name{font-size:12px;font-weight:800}
        .bp-opt:focus-visible{outline:3px solid #fff;outline-offset:2px}
        .bp-acc{width:100%;box-sizing:border-box;min-height:46px;padding:11px 14px;border-radius:9px;font-size:16px;font-family:inherit;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.95);color:#1a2e1a;outline:none;transition:border-color .25s ease}
        .bp-acc:focus{border-color:var(--ba,#7bd17f)}
        @media (prefers-reduced-motion:reduce){.bp-opt,.bp-logo,.bp-tick,.bp-acc{transition:none}.bp-opt[aria-checked=true] .bp-logo{transform:none}}
      `}</style>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, opacity: 0.85 }}>
        <Icon name="bank" size={13} /> Bank Information
      </div>
      <div role="radiogroup" aria-label="Bank" className="bp-row">
        {BANKS.map(b => {
          const on = bank === b.id
          return (
            <button key={b.id} type="button" role="radio" aria-checked={on} className="bp-opt"
              style={{ '--bc': b.color, '--ba': b.accent }}
              onClick={() => onBank(b.id)}>
              <span className="bp-logo">
                <BankMark bank={b} size={56} style={{ boxShadow: 'none' }} />
                <span className="bp-tick" aria-hidden="true"><Icon name="check" size={13} /></span>
              </span>
              <span className="bp-name">{b.label}</span>
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: 14, '--ba': sel?.accent }}>
        <label htmlFor="bp-account" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Account Number</label>
        <input id="bp-account" className="bp-acc" inputMode="numeric" value={account || ''}
          onChange={e => onAccount(e.target.value)}
          placeholder={sel ? sel.placeholder : 'Select a bank first'}
          aria-invalid={!!warn} aria-describedby="bp-account-msg" />
        <div id="bp-account-msg" role="status" style={{ minHeight: 18, marginTop: 6, fontSize: 12, fontWeight: 600, color: '#ffd9a0' }}>
          {warn ? `⚠ ${warn} Check the bank or the number — nothing was changed.` : ''}
        </div>
      </div>
    </div>
  )
}
