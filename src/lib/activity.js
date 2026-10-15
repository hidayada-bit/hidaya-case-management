import { supabase } from './supabase'

// Best-effort activity log (feeds the notification bell). Never blocks or breaks the action itself.
export async function logActivity(user, category, message, familyId = null) {
  try {
    if (!user?.id) return
    await supabase.from('activity_log').insert({
      actor_id: user.id, actor_name: user.full_name || user.email || 'Someone',
      category, message, family_id: familyId,
    })
  } catch { /* table may not exist yet */ }
}
