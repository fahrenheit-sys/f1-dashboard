'use server'

import { signInWithPassword, isBanned } from '@/lib/gotrue'
import { setSessionCookie, clearSessionCookie } from '@/lib/auth'

export type LoginResult = { ok: true } | { ok: false; error: string }

export async function login(email: string, password: string): Promise<LoginResult> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !password) return { ok: false, error: 'Email and password are required' }

  const result = await signInWithPassword(cleanEmail, password)
  if (!result.ok) return { ok: false, error: result.error }

  // GoTrue rejects banned users at sign-in, but double-check the live status.
  if (isBanned(result.user)) return { ok: false, error: 'This account has been suspended' }

  // The cookie role is non-authoritative (access is resolved live per request);
  // store something stable for display/back-compat.
  await setSessionCookie({ sub: result.user.id, email: result.user.email, role: result.user.role ?? 'member' })
  return { ok: true }
}

export async function logout(): Promise<void> {
  await clearSessionCookie()
}
