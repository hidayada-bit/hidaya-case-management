import { supabase } from './supabase'

// Monthly amount for one family = mother rate + (children x child rate). Rates are set by the admin.
export const DEFAULT_RATES = { mother: 3500, child: 1500 }

export const monthlyFor = (rates, childCount) =>
  (Number(rates.mother) || 0) + (Number(childCount) || 0) * (Number(rates.child) || 0)

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
// Children aged 18 or under are paid for; from their 19th birthday they stay on the
// profile (children tab) but are no longer counted in the payment. No birth date = counted.
export const ageOf = dob => {
  if (!dob) return null
  const b = new Date(dob), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}
export const MAX_PAYING_AGE = 18
export const isPayingChild = c => { const a = ageOf(c.date_of_birth); return a == null || a <= MAX_PAYING_AGE }

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
export const joinedDate = f => f?.joined_on || f?.created_at?.slice(0, 10) || null
export const tenureText = d => {
  if (!d) return '—'
  const a = new Date(d), n = new Date()
  let months = (n.getFullYear() - a.getFullYear()) * 12 + (n.getMonth() - a.getMonth())
  if (n.getDate() < a.getDate()) months--
  if (months < 1) { const days = Math.max(0, Math.floor((n - a) / 86400000)); return `${days} day${days === 1 ? '' : 's'}` }
  const y = Math.floor(months / 12), m = months % 12
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ')
}
