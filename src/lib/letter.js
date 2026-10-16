import { supabase } from './supabase'

// ─── Bank letter wording + the per-bank details the admin can edit in Settings ───────────────
// The three letters share one format. Only the bank name, branch, address, HDA's own account at that
// bank, the amount (in words and figures) and the month change.

export const DEFAULT_BANK_LETTER = {
  CBE:   { name: 'Commercial Bank of Ethiopia', branch: 'Arada Giorgis', address: 'Addis Ababa', account: '1000145416624' },
  OB:    { name: 'Oromia Bank',                 branch: 'Wadessa',       address: 'Addis Ababa', account: '1100319100001' },
  AWASH: { name: 'Awash Bank',                  branch: 'Megenagna',     address: 'Addis Ababa', account: '013081770413100' },
}
export const DEFAULT_SIGNATORIES = [
  { name: 'Destu Yousuf',   title: 'Executive Director' },
  { name: 'Amina Hussien',  title: 'Finance Head' },
]

const clean = v => String(v ?? '').trim()

export function mergeLetterSettings(saved) {
  const out = {}
  for (const id of Object.keys(DEFAULT_BANK_LETTER)) out[id] = { ...DEFAULT_BANK_LETTER[id], ...(saved?.banks?.[id] || {}) }
  const sig = Array.isArray(saved?.signatories) && saved.signatories.length ? saved.signatories : DEFAULT_SIGNATORIES
  return { banks: out, signatories: sig.map(s => ({ name: clean(s.name), title: clean(s.title) })) }
}
export const DEFAULT_LETTER_SETTINGS = mergeLetterSettings(null)

export async function loadLetterSettings() {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'bank_letter').maybeSingle()
  if (error || !data?.value) return { settings: DEFAULT_LETTER_SETTINGS, error }
  return { settings: mergeLetterSettings(data.value), error: null }
}
export async function saveLetterSettings(settings, userId) {
  const { error } = await supabase.from('app_settings').upsert(
    { key: 'bank_letter', value: settings, updated_by: userId || null, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )
  return error
}

// ─── Amount in words ("Three hundred forty-two thousand five hundred") ────────────────────
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const below1000 = n => {
  const parts = []
  if (n >= 100) { parts.push(ONES[Math.floor(n / 100)] + ' hundred'); n %= 100 }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')) }
  else if (n > 0) parts.push(ONES[n])
  return parts.join(' ')
}
export function numberToWords(num) {
  let n = Math.floor(Math.abs(Number(num) || 0))
  if (n === 0) return 'Zero'
  const scales = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]
  const parts = []
  for (const [v, name] of scales) {
    if (n >= v) { parts.push(below1000(Math.floor(n / v)) + ' ' + name); n %= v }
  }
  if (n > 0) parts.push(below1000(n))
  const s = parts.join(' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const amountWords = total => {
  const cents = Math.round((Number(total) % 1) * 100)
  return `${numberToWords(total)} birr${cents ? ` and ${numberToWords(cents).toLowerCase()} cents` : ''}`
}
export const figure = total => Number(total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Birr'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthOnly = key => { const m = Number((key || '').split('-')[1]); return MONTH_NAMES[m - 1] || '' }

// Everything a template (preview / print / PDF) needs, in one place so the three can never disagree.
export function buildLetter({ bankId, settings, total, month, ref, date }) {
  const set = settings?.banks?.[bankId] || DEFAULT_BANK_LETTER[bankId] || { name: '', branch: '', address: '', account: '' }
  const mText = month ? monthOnly(month) : ''
  const toLines = [set.name, set.branch ? `${set.branch} Branch` : '', set.address].filter(Boolean)
  return {
    ref: ref || '',
    date,
    toLines,
    subject: 'Request for Urgent Transfer',
    salutation: 'Dear Sir / Madam,',
    body:
      `Our organization provides monthly support to orphan families. Accordingly, we kindly request your urgent assistance in transferring a total of ` +
      `${amountWords(total)} (${figure(total)}) from our account number ${set.account || '________________'}, held at your branch, ` +
      `to the individuals listed below for the month of ${mText || '____________'}.`,
    closing: 'Thank you in advance for your kind cooperation.',
    regards: 'Yours sincerely,',
    signatories: settings?.signatories || DEFAULT_SIGNATORIES,
  }
}
