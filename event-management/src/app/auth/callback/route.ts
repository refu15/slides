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

    // Return debug info instead of redirecting
    return NextResponse.json({
        message: "Auth Callback Reached",
        next,
        codeProvided: !!code,
        sessionData: sessionData ? {
            user: sessionData.user ? { id: sessionData.user.id, email: sessionData.user.email } : null,
            session: sessionData.session ? "Session exists" : "No session"
        } : null,
        sessionError,
        timestamp: new Date().toISOString()
    })
}
