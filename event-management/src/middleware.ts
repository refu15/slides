import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const pathname = request.nextUrl.pathname;

    // 静的ファイル、API、_nextは除外
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return response;
    }

    // Supabaseセッションを取得
    const { data: { session } } = await supabase.auth.getSession()

    // 公開ルート（認証不要）
    const publicRoutes = ['/', '/login', '/auth/callback', '/auth/error', '/signup', '/invite']
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith('/invite/')
    )

    // ゲストルートも公開（/[eventId]/guest）
    const isGuestRoute = /^\/[^\/]+\/guest/.test(pathname)

    if (isPublicRoute || isGuestRoute) {
        // 未認証でも許可
        return response;
    }

    // /dashboard へのアクセスは認証必須
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard')) {
        if (!session) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return response;
    }

    // /[eventId]/admin/* へのアクセス
    const adminMatch = pathname.match(/^\/([^\/]+)\/admin/)
    if (adminMatch) {
        if (!session) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        // TODO: event_roles テーブルでadminロールをチェック（将来実装）
        return response;
    }

    // /[eventId]/staff/* へのアクセス
    const staffMatch = pathname.match(/^\/([^\/]+)\/staff/)
    if (staffMatch) {
        if (!session) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        // TODO: event_roles テーブルでstaff/adminロールをチェック（将来実装）
        return response;
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
