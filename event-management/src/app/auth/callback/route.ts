import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'
    let sessionData = null
    let sessionError = null

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        sessionData = data
        sessionError = error

        if (error) {
            console.error('Auth callback error:', error)
            return NextResponse.json({ error: error.message, code }, { status: 400 })
        }
    }

    // Return an HTML page that handles the redirect via client-side
    // This helps ensure cookies are set properly before navigating
    return new NextResponse(`
        <html>
            <head>
                <meta http-equiv="refresh" content="0;url=${next}" />
                <title>Redirecting...</title>
            </head>
            <body>
                <script>
                    window.location.href = "${next}";
                </script>
                <p>Login successful. Redirecting to dashboard...</p>
            </body>
        </html>
    `, {
        headers: {
            'Content-Type': 'text/html',
        },
    })
}
