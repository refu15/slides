import { NextResponse, type NextRequest } from 'next/server'

// Demo mode middleware - no Supabase authentication required
export async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const pathname = request.nextUrl.pathname;

    // Allow root portal and API
    if (pathname === '/' || pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return response;
    }

    // Extract Event ID from path: /eventId/...
    const pathParts = pathname.split('/');
    if (pathParts.length < 2) return response; // Should match root check but safety first

    const eventId = pathParts[1]; // "ev_123"

    // Check if it's a known protected sub-path
    // Pattern: /[eventId]/admin/..., /[eventId]/staff/...
    const isProtectedAdmin = pathname.startsWith(`/${eventId}/admin`);
    const isProtectedStaff = pathname.startsWith(`/${eventId}/staff`);

    // Check for scoped cookie: "auth_ev_123"
    const authCookie = request.cookies.get(`auth_${eventId}`)?.value;

    // Redirect logic
    if (isProtectedAdmin && authCookie !== 'admin') {
        return NextResponse.redirect(new URL(`/${eventId}/login`, request.url));
    }

    if (isProtectedStaff && !authCookie) {
        return NextResponse.redirect(new URL(`/${eventId}/login`, request.url));
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
         * - api routes (for future API use)
         * - public event routes (for attendee access)
         */
        '/((?!_next/static|_next/image|favicon.ico|api|event|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
