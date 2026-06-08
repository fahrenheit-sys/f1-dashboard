import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionUser } from './session'
import { adminGetUser, isBanned } from './gotrue'
import { accessFor, TOOL } from './access'

export type { SessionUser } from './session'

// A session resolved against live Supabase state, including per-tool grants.
export type LiveUser = {
  sub: string
  email: string
  role: string | null
  apps: Record<string, string>
}

// Read + verify the signed session cookie (cheap, no network).
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}

// Resolve the session against live Supabase state so a suspended/deleted user
// (or a changed grant) is reflected immediately, not after the cookie expires.
// Returns null if there's no session, or the account is gone or suspended.
export async function getLiveSessionUser(): Promise<LiveUser | null> {
  const session = await getSessionUser()
  if (!session) return null
  const live = await adminGetUser(session.sub)
  if (!live || isBanned(live)) return null
  return { sub: live.id, email: live.email, role: live.role, apps: live.apps }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user)
  const store = await cookies()
  // SESSION_COOKIE_DOMAIN (e.g. ".clubf1.tech") shares the session across all
  // suite subdomains for SSO. Left unset locally → host-only cookie.
  const domain = process.env.SESSION_COOKIE_DOMAIN
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    ...(domain ? { domain } : {}),
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  const domain = process.env.SESSION_COOKIE_DOMAIN
  store.delete({ name: SESSION_COOKIE, path: '/', ...(domain ? { domain } : {}) })
}

// Throws unless the caller is a live, active admin of THIS tool. Guards
// admin-only actions against stale cookies (demoted/suspended/deleted).
export async function requireAdmin(): Promise<LiveUser> {
  const user = await getLiveSessionUser()
  if (!user) throw new Error('Not authenticated')
  if (accessFor(user, TOOL) !== 'admin') throw new Error('Admin access required')
  return user
}
