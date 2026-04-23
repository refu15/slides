import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const userEmail = request.headers.get('cf-access-authenticated-user-email')

  if (!userEmail) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (!allowedEmails.includes(userEmail.toLowerCase())) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const response = NextResponse.next()
  response.headers.set('x-admin-user', userEmail)
  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
