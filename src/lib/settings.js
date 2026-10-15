import { supabase } from './supabase'

// Monthly amount for one family = mother rate + (children x child rate). Rates are set by the admin.
export const DEFAULT_RATES = { mother: 3500, child: 1500 }

// Payment rule: only children aged MIN_PAYING_AGE..MAX_PAYING_AGE are paid, and at most MAX_PAYING_CHILDREN per family.
export const MIN_PAYING_AGE = 4
export const MAX_PAYING_AGE = 18
export const MAX_PAYING_CHILDREN = 4
export const cappedChildren = n => Math.min(Math.max(Number(n) || 0, 0), MAX_PAYING_CHILDREN)

export const monthlyFor = (rates, childCount) =>
  (Number(rates.mother) || 0) + cappedChildren(childCount) * (Number(rates.child) || 0)

export async function loadRates() {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'payment_rates').maybeSingle()
  if (error || !data?.value) return { rates: DEFAULT_RATES, error }
  return { rates: { mother: Number(data.value.mother) || 0, child: Number(data.value.child) || 0 }, error: null }
}

export async function saveRates(rates, userId) {
  const { error } = await supabase.from('app_settings').upsert(
    { key: 'payment_rates', value: { mother: Number(rates.mother) || 0, child: Number(rates.child) || 0 }, updated_by: userId || null, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )
  return error
}

// ── Child age rule for payments ─────────────────────────────────────────────
// Children aged 4 to 18 are paid for. Under 4 (not yet 4) and 19+ stay on the profile (children tab)
// but are not counted in the payment. No birth date = counted. Max 4 children per family (see monthlyFor).
export const ageOf = dob => {
  if (!dob) return null
  const b = new Date(dob), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}
export const isPayingChild = c => { const a = ageOf(c.date_of_birth); return a == null || (a >= MIN_PAYING_AGE && a <= MAX_PAYING_AGE) }
// 'under' | 'over' | null — why a child is not in the payment (null = eligible by age)
export const ageExclusion = c => { const a = ageOf(c.date_of_birth); return a == null ? null : a < MIN_PAYING_AGE ? 'under' : a > MAX_PAYING_AGE ? 'over' : null }

// Family case state: 'normal' | 'on_hold' | 'transferred' (missing column => normal)
export const caseState = f => f?.case_state || 'normal'

// ── Transfer categories (shown as groups on the Transferred page) ───────────
export const TRANSFER_CATEGORIES = ['Terminated', 'Suspended', 'Transferred to another organization', 'Moved away', 'Other']
export const categoryOf = f => {
  if (f?.case_category) return f.case_category
  const head = (f?.case_reason || '').split(' — ')[0]
  return TRANSFER_CATEGORIES.includes(head) ? head : 'Other'
}

// ── Time with HDA ───────────────────────────────────────────────────────────
// ── Enrollment date ─────────────────────────────────────────────────────────
// The "With HDA" counter uses the Date of Enrollment written in the family's Case Notes
// (e.g. "Date of enrollment: 12/03/2023", "Enrolled: 12 Mar 2023", "Enrollment date 2023-03-12", "Enrolled Mar 2023").
// Numeric dates are read day first (dd/mm/yyyy). Gregorian calendar.
// If the notes have no enrollment date, the counter falls back to the joined date / registration date.
const MONTH_IDX = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y, m, d) => {
  y = +y; m = +m; d = +d
  if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCMonth() !== m - 1) return null // e.g. 31 Feb
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?'
const DATE_PATTERNS = [
  [/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, m => iso(m[1], m[2], m[3])],
  [/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/, m => iso(m[3], m[2], m[1])],
  [new RegExp('(\\d{1,2})(?:st|nd|rd|th)?[\\s,-]+' + MON + '[\\s,-]+(\\d{4})', 'i'), m => iso(m[3], MONTH_IDX[m[2].toLowerCase()], m[1])],
  [new RegExp(MON + '[\\s,-]+(\\d{1,2})(?:st|nd|rd|th)?[\\s,-]+(\\d{4})', 'i'), m => iso(m[3], MONTH_IDX[m[1].toLowerCase()], m[2])],
  [new RegExp(MON + '[\\s,-]+(\\d{4})', 'i'), m => iso(m[2], MONTH_IDX[m[1].toLowerCase()], 1)],
]
export const enrollmentFromNotes = notes => {
  if (!notes) return null
  const text = String(notes)
  const re = /enrol/gi
  let hit
  while ((hit = re.exec(text))) {
    const seg = text.slice(hit.index, hit.index + 80)
    for (const [rx, fn] of DATE_PATTERNS) {
      const m = seg.match(rx)
      const d = m && fn(m)
      if (d) return d
    }
  }
  return null
}

export const joinedDate = f => enrollmentFromNotes(f?.notes) || f?.joined_on || f?.created_at?.slice(0, 10) || null
export const tenureText = d => {
  if (!d) return '—'
  const a = new Date(d), n = new Date()
  let months = (n.getFullYear() - a.getFullYear()) * 12 + (n.getMonth() - a.getMonth())
  if (n.getDate() < a.getDate()) months--
  if (months < 1) { const days = Math.max(0, Math.floor((n - a) / 86400000)); return `${days} day${days === 1 ? '' : 's'}` }
  const y = Math.floor(months / 12), m = months % 12
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ')
}
