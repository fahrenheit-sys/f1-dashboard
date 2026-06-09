import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

const HUB_LOGIN = 'https://clubf1.tech/login'

// Next.js 16 "proxy" convention (formerly middleware): gate every page on a
// valid session. In production the suite shares one login screen on the hub;
// locally/preview the dashboard falls back to its own /login.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const onSuite = req.nextUrl.hostname.endsWith('clubf1.tech')
  const user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)

  if (user) {
    // Signed-in users never need a login page.
    if (pathname === '/login') return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  // Not signed in:
  if (onSuite) {
    const login = new URL(HUB_LOGIN)
    login.searchParams.set('next', pathname === '/login' ? `${req.nextUrl.origin}/` : req.nextUrl.href)
    return NextResponse.redirect(login)
  }
  // local / preview → the dashboard's own login
  if (pathname !== '/login') return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.next()
}

// Protect everything except the GHL webhook, Next internals, and static assets.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)$).*)'],
}
