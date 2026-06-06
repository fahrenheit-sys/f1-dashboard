import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Clears the session cookie and returns to the login screen. Used both by the
// Sign-out button and when a suspended/deleted account is detected server-side.
export async function GET(req: Request) {
  await clearSessionCookie()
  return NextResponse.redirect(new URL('/login', req.url))
}
