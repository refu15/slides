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
            // Error handling page (optional) or let the user try again
        }
        if (data?.session) {
            // Test setting a manual cookie to verify cookie mechanism
            const cookieStore = await import('next/headers').then(m => m.cookies())
            cookieStore.set('test-cookie', 'manual-set-success', { path: '/', secure: true, sameSite: 'lax' })
        }
    }

    // Return an HTML page that requires manual interaction to complete manual redirect
    // This ensures user gesture to prevent browser cleaning up "tracking" cookies
    // Return an HTML page that handles the redirect via client-side with Session Hydration
    // This bypasses server-side cookie size limits by setting the session in the browser
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const accessToken = sessionData?.session?.access_token;
    const refreshToken = sessionData?.session?.refresh_token;

    return new NextResponse(`
        <html>
            <head>
                <title>Login Successful</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f9fafb; }
                    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                    h1 { color: #111827; margin-bottom: 1rem; font-size: 1.5rem; }
                    button.btn { display: inline-block; background: #000; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; }
                    button.btn:hover { background: #374151; }
                    button.btn:disabled { background: #9ca3af; cursor: not-allowed; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Login Successful</h1>
                    <button id="continue-btn" class="btn" onclick="continueToSync()">Continue to Dashboard</button>
                    <div id="status" style="margin-top: 1rem; color: #666; font-size: 0.8rem; min-height: 1.2em;"></div>
                </div>

                <script>
                    const accessToken = "${accessToken || ''}";
                    const refreshToken = "${refreshToken || ''}";
                    const nextUrl = "${next}";

                    function continueToSync() {
                        const btn = document.getElementById('continue-btn');
                        btn.disabled = true;
                        btn.textContent = "Redirecting...";
                        
                        // Pass tokens via hash to avoid server logging in history
                        // /auth/sync#access_token=...&refresh_token=...&next=...
                        const target = "/auth/sync#access_token=" + encodeURIComponent(accessToken) + 
                                     "&refresh_token=" + encodeURIComponent(refreshToken) + 
                                     "&next=" + encodeURIComponent(nextUrl);
                        
                        window.location.href = target;
                    }
                </script>
            </body>
        </html>
    `, {
        headers: {
            'Content-Type': 'text/html',
        },
    })
}
