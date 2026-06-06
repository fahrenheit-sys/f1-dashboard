import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionUser } from './session'
import { adminGetUser, isBanned } from './gotrue'

export type { SessionUser } from './session'

// Read + verify the signed session cookie (cheap, no network).
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}

// Resolve the session against live Supabase state so a suspended/deleted user
// (or a changed role) is reflected immediately, not after the cookie expires.
// Returns null if there's no session, or the account is gone or suspended.
export async function getLiveSessionUser(): Promise<SessionUser | null> {
  const session = await getSessionUser()
  if (!session) return null
  const live = await adminGetUser(session.sub)
  if (!live || isBanned(live)) return null
  return { sub: live.id, email: live.email, role: live.role }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// Throws unless the caller is a live, active admin. Guards admin-only actions
// against stale cookies (demoted/suspended after the cookie was issued).
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getLiveSessionUser()
  if (!user) throw new Error('Not authenticated')
  if (user.role !== 'admin') throw new Error('Admin access required')
  return user
}
