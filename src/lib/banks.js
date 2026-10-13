// Single source of truth for banks used in registration, bank lists and payments.
// To add a bank: add an entry here and drop its logo / letterhead template in /public.
// If a logo or template file is missing, the UI falls back gracefully (text badge / plain paper).
export const BANKS = [
  { id: 'CBE',   name: 'Commercial Bank of Ethiopia', short: 'CBE',    label: 'CBE',    logo: '/cbe_logo.png',    template: '/cbe_template.png' },
  { id: 'OB',    name: 'Oromia Bank',                 short: 'OB',     label: 'Oromia', logo: '/oromia_logo.png', template: '/oromia_template.png' },
  { id: 'AWASH', name: 'Awash Bank',                  short: 'AWASH',  label: 'Awash',  logo: '/awash_logo.png',  template: '/awash_template.png' },
]

export const bankLabel = id => BANKS.find(b => b.id === id)?.label || id || '—'
