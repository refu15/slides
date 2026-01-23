import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { eventId, role, expiresIn, maxUses } = await request.json()
        const supabase = await createClient()

        // ユーザー認証確認
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 管理者権限確認
        const { data: userRole, error: roleError } = await supabase
            .from('event_roles')
            .select('role')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single()

        if (roleError || !userRole || !['owner', 'admin'].includes(userRole.role)) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
        }

        // トークン生成
        const token = crypto.randomUUID()
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

        const { data, error } = await supabase
            .from('invite_tokens')
            .insert({
                event_id: eventId,
                token,
                role: role || 'staff',
                created_by: user.id,
                expires_at: expiresAt,
                max_uses: maxUses || 1
            })
            .select()
            .single()

        if (error) {
            console.error('Invite creation error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
        return NextResponse.json({ inviteUrl, token: data })
    } catch (error) {
        console.error('Invite API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get('eventId')

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
        }

        const supabase = await createClient()

        // ユーザー認証確認
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 招待トークン一覧取得
        const { data, error } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ invites: data })
    } catch (error) {
        console.error('Invite list error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
