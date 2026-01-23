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
                <title>Finalizing Login...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f9fafb; }
                    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                    h1 { color: #111827; margin-bottom: 1rem; font-size: 1.5rem; }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #000; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="spinner"></div>
                    <h1>Finalizing Login...</h1>
                    <p>Securing your session, please wait.</p>
                    <div id="status" style="color: #666; font-size: 0.8rem;">Initializing...</div>
                </div>

                <script>
                    const supabaseUrl = "${supabaseUrl}";
                    const supabaseKey = "${supabaseKey}";
                    const accessToken = "${accessToken || ''}";
                    const refreshToken = "${refreshToken || ''}";
                    const nextUrl = "${next}";

                    async function restoreSession() {
                        const statusEl = document.getElementById('status');
                        
                        if (!accessToken || !refreshToken) {
                            statusEl.textContent = "Session missing. Redirecting...";
                            setTimeout(() => window.location.href = nextUrl, 1000);
                            return;
                        }

                        try {
                            const { createClient } = supabase;
                            const client = createClient(supabaseUrl, supabaseKey);
                            
                            statusEl.textContent = "Setting session...";
                            const { error } = await client.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken
                            });

                            if (error) throw error;

                            statusEl.textContent = "Success! Redirecting...";
                            window.location.href = nextUrl;
                        } catch (e) {
                            console.error(e);
                            statusEl.textContent = "Error setting session. Redirecting anyway...";
                            // Fallback
                            setTimeout(() => window.location.href = nextUrl, 2000);
                        }
                    }

                    restoreSession();
                </script>
            </body>
        </html>
    `, {
        headers: {
            'Content-Type': 'text/html',
        },
    })
}
