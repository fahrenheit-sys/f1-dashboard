import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client. Uses the service-role key so reads/writes work
// regardless of RLS — must never be imported into a client component.
// Falls back to the anon key locally if the service role isn't configured.
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
  if (!url || !key) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and a key are required')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
