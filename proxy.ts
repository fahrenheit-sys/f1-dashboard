import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

// Next.js 16 "proxy" convention (formerly middleware): gate every page on a
// valid session, redirecting to /login otherwise.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  const isLogin = pathname === '/login'

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (user && isLogin) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

// Protect everything except the GHL webhook, Next internals, and static assets.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)$).*)'],
}
