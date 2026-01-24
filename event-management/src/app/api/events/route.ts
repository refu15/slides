import { NextResponse } from 'next/server';
import { getDB, createEvent } from '@/lib/server/db';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json([], { status: 401 });
    }

    // 自分がロールを持っているイベントを取得
    const { data: roles } = await supabase
        .from('event_roles')
        .select('event_id, role, events (id, name, created_at)')
        .eq('user_id', user.id);

    if (!roles) return NextResponse.json([]);

    // イベントIDリストを取得
    const eventIds = roles.map((r: any) => r.events.id);

    // event_dataから参加者数と設定を取得
    const { data: eventDataList } = await supabase
        .from('event_data')
        .select('event_id, participants, settings')
        .in('event_id', eventIds);

    // event_idをキーにしたマップを作成
    const eventDataMap = new Map<string, { participantCount: number; settings: any }>();
    if (eventDataList) {
        for (const ed of eventDataList) {
            const participants = ed.participants || [];
            eventDataMap.set(ed.event_id, {
                participantCount: Array.isArray(participants) ? participants.length : 0,
                settings: ed.settings || {}
            });
        }
    }

    const summary = roles.map((r: any) => {
        const eventData = eventDataMap.get(r.events.id) || { participantCount: 0, settings: {} };
        return {
            id: r.events.id,
            name: r.events.name,
            createdAt: r.events.created_at,
            participantCount: eventData.participantCount,
            settings: eventData.settings,
            role: r.role
        };
    });

    return NextResponse.json(summary);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Event name is required" }, { status: 400 });
        }

        // イベント作成
        const newEvent = createEvent(name);

        // 認証ユーザーにownerロールを付与
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Supabaseにイベントを登録
            await supabase.from('events').insert({
                id: newEvent.id,
                name: newEvent.name,
                created_at: newEvent.createdAt
            });

            // event_dataを初期化
            await supabase.from('event_data').insert({
                event_id: newEvent.id
            });

            // ownerロールを付与
            await supabase.from('event_roles').insert({
                event_id: newEvent.id,
                user_id: user.id,
                role: 'owner'
            });
        }

        return NextResponse.json(newEvent);
    } catch (e) {
        console.error('Event creation error:', e);
        return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }
}
