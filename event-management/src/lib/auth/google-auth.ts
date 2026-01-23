import { createClient } from '@/lib/supabase/client'

export async function signInWithGoogle() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            }
        }
    })
    return { data, error }
}

export async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
}

export async function getCurrentUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function getUserProfile(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

    return { data, error }
}

export async function getUserEventRole(eventId: string, userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('event_roles')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

    return { data, error }
}
