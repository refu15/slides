import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'
    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        sessionData = data
        sessionError = error

        if (error) {
            console.error('Auth callback error:', error)
            // Error handling page (optional) or let the user try again
        }
    }

    // Return an HTML page that requires manual interaction to complete manual redirect
    // This ensures user gesture to prevent browser cleaning up "tracking" cookies
    return new NextResponse(`
        <html>
            <head>
                <title>Login Successful</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f9fafb; }
                    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                    h1 { color: #111827; margin-bottom: 1rem; font-size: 1.5rem; }
                    p { color: #6b7280; margin-bottom: 2rem; }
                    a.btn { display: inline-block; background: #000; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; font-weight: bold; }
                    a.btn:hover { background: #374151; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Login Successful</h1>
                    <p>Click the button below to continue to the dashboard.</p>
                    <a href="${next}" class="btn">Continue to Dashboard</a>
                    
                    <div style="margin-top: 2rem; padding: 1rem; background: #eee; font-size: 0.8rem; word-break: break-all;">
                        <strong>Debug: Current Cookies</strong>
                        <div id="cookie-debug">Loading...</div>
                    </div>
                </div>
                <script>
                    document.getElementById('cookie-debug').textContent = document.cookie || '(No cookies found)';
                </script>
            </body>
        </html>
    `, {
        headers: {
            'Content-Type': 'text/html',
        },
    })
}
