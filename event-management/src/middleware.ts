import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isPublicRoute =
        pathname === '/' ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/login' ||
        pathname === '/signup'

    const isGuestRoute = /^\/[^\/]+\/guest/.test(pathname)

    if (pathname === '/' && user) {
        const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
        // Copy cookies from response (which might have session updates) to redirectResponse
        const cookies = response.cookies.getAll()
        cookies.forEach(cookie => redirectResponse.cookies.set(cookie.name, cookie.value, cookie))
        return redirectResponse
    }

    if (isPublicRoute || isGuestRoute) {
        return response;
    }

    if (pathname === '/dashboard' || pathname.startsWith('/dashboard')) {
        if (!user) {
            const redirectResponse = NextResponse.redirect(new URL('/', request.url))
            // Copy cookies to ensure proper state (e.g. if logging out)
            const cookies = response.cookies.getAll()
            cookies.forEach(cookie => redirectResponse.cookies.set(cookie.name, cookie.value, cookie))
            return redirectResponse
        }
        return response;
    }

    const adminMatch = pathname.match(/^\/([^\/]+)\/admin/)
    if (adminMatch) {
        if (!user) {
            const redirectResponse = NextResponse.redirect(new URL('/', request.url))
            const cookies = response.cookies.getAll()
            cookies.forEach(cookie => redirectResponse.cookies.set(cookie.name, cookie.value, cookie))
            return redirectResponse
        }
        return response;
    }

    const staffMatch = pathname.match(/^\/([^\/]+)\/staff/)
    if (staffMatch) {
        if (!user) {
            const redirectResponse = NextResponse.redirect(new URL('/', request.url))
            const cookies = response.cookies.getAll()
            cookies.forEach(cookie => redirectResponse.cookies.set(cookie.name, cookie.value, cookie))
            return redirectResponse
        }
        return response;
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
