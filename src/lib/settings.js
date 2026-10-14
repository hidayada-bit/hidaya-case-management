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
