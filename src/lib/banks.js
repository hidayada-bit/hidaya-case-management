// Single source of truth for banks used in registration, bank lists and payments.
// To add a bank: add an entry here and drop its logo / letterhead template in /public.
// If a logo or template file is missing, the UI falls back gracefully (text badge / plain paper).
//   color/accent : brand colours used ONLY for the selection treatment in the bank picker
//   top          : where the letter text may start on the letterhead (fraction of the page height; below the header rule)
//   prefix       : required starting digits of the account number
//   placeholder  : account-number hint shown when the bank is selected
// Prefixes are business rules; full lengths are NOT enforced until confirmed.
export const BANKS = [
  { id: 'CBE',   name: 'Commercial Bank of Ethiopia', short: 'CBE',   label: 'CBE',    color: '#95298E', accent: '#FFD700', logo: '/cbe_logo.png',    template: '/cbe_template.png',    top: 0.255, prefix: '1000', placeholder: '1000XXXXXXXX' },
  { id: 'OB',    name: 'Oromia Bank',                 short: 'OB',    label: 'Oromia', color: '#3C763D', accent: '#94C83D', logo: '/oromia_logo.png', template: '/oromia_template.png', top: 0.22, prefix: '1',    placeholder: '1XXXXXXXXX' },
  { id: 'AWASH', name: 'Awash Bank',                  short: 'AWASH', label: 'Awash',  color: '#000066', accent: '#F7923A', logo: '/awash_logo.png',  template: '/awash_template.png',  top: 0.22, prefix: '0',    placeholder: '0XXXXXXXXX' },
]

export const bankLabel = id => BANKS.find(b => b.id === id)?.label || id || '—'

export const bankById = id => BANKS.find(b => b.id === id) || null

// Returns a warning string when a non-empty account number doesn't start with the bank's prefix, else ''.
export const accountPrefixWarning = (bankId, account) => {
  const b = bankById(bankId)
  const a = String(account || '').trim()
  if (!b || !a) return ''
  return a.startsWith(b.prefix) ? '' : `${b.label} account numbers should start with ${b.prefix}.`
}
