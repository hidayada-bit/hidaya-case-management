import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── STORAGE BUCKETS ─────────────────────────────────────────────────────────
// These must be created in Supabase dashboard → Storage
export const BUCKETS = {
  MOTHER_PHOTOS: 'mother-photos',
  CHILD_PHOTOS: 'child-photos',
  DOCUMENTS: 'documents',
}
