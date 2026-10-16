import { BANKS, bankById, accountPrefixWarning } from '../lib/banks'
import { B } from '../lib/theme'
import Icon from './Icon'
import BankMark from './BankMark'

// Compact bank selector: small circular logos (no card / background) + bank-aware account number.
// Selected logo gets the bank's brand ring, a slight scale-up and a check badge.
// Props: bank (id), account (string), onBank(id), onAccount(str)
export default function BankPicker({ bank, account, onBank, onAccount }) {
  const sel = bankById(bank)
  const warn = accountPrefixWarning(bank, account)
  return (
    <div className="bp" style={{ marginBottom: 14 }}>
      <style>{`
        .bp-row{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}
        .bp-opt{background:transparent;border:0;padding:5px;cursor:pointer;border-radius:50%;line-height:0}
        .bp-logo{position:relative;display:inline-block;border-radius:50%;transition:transform .25s ease,box-shadow .25s ease,opacity .25s ease;opacity:.75}
        .bp-opt:hover .bp-logo{opacity:1}
        .bp-opt[aria-checked=true] .bp-logo{opacity:1;transform:scale(1.12);box-shadow:0 0 0 2.5px var(--bc),0 0 0 5px var(--ba)}
        .bp-tick{position:absolute;right:-6px;top:-6px;width:18px;height:18px;border-radius:50%;background:var(--bc);color:#fff;border:2px solid var(--c-card,#fff);box-sizing:border-box;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.4);transition:opacity .2s ease,transform .2s ease}
        .bp-opt[aria-checked=true] .bp-tick{opacity:1;transform:scale(1)}
        .bp-opt:focus-visible{outline:3px solid var(--bc);outline-offset:2px}
        .bp-acc{flex:1 1 200px;min-width:0;box-sizing:border-box;min-height:46px;padding:11px 14px;border-radius:9px;font-size:16px;font-family:inherit;border:1.5px solid var(--c-border);background:var(--c-input);color:var(--c-text);outline:none;transition:border-color .25s ease}
        .bp-acc:focus{border-color:var(--bc,var(--c-green))}
        @media (prefers-reduced-motion:reduce){.bp-logo,.bp-tick,.bp-acc{transition:none}.bp-opt[aria-checked=true] .bp-logo{transform:none}}
      `}</style>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.textMid, marginBottom: 6 }}>
        {sel ? `Bank & Account Number — ${sel.name}` : 'Bank (choose one to enter the account number)'}
      </label>
      <div role="radiogroup" aria-label="Bank" className="bp-row" style={{ '--bc': sel?.color, '--ba': sel?.accent }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {BANKS.map(b => (
            <button key={b.id} type="button" role="radio" aria-checked={bank === b.id} aria-label={b.name} title={b.name}
              className="bp-opt" style={{ '--bc': b.color, '--ba': b.accent }} onClick={() => onBank(b.id)}>
              <span className="bp-logo">
                <BankMark bank={b} size={38} style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }} />
                <span className="bp-tick" aria-hidden="true"><Icon name="check" size={10} /></span>
              </span>
            </button>
          ))}
        </div>
        {sel && (
          <input id="bp-account" className="bp-acc" inputMode="numeric" value={account || ''} aria-label={`${sel.label} account number`}
            onChange={e => onAccount(e.target.value)} placeholder={sel.placeholder}
            aria-invalid={!!warn} aria-describedby="bp-account-msg" />
        )}
      </div>
      <div id="bp-account-msg" role="status" style={{ minHeight: warn ? 18 : 0, marginTop: 6, fontSize: 12, fontWeight: 600, color: B.warnText }}>
        {warn ? `⚠ ${warn} Nothing was changed — check the bank or the number.` : ''}
      </div>
    </div>
  )
}
