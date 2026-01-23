import { NextResponse } from 'next/server';
import { getDB, createEvent } from '@/lib/server/db';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const db = getDB();
    // Return summary list (exclude potentially heavy details if needed, but for now return all)
    const summary = db.events.map(e => ({
        id: e.id,
        name: e.name,
        createdAt: e.createdAt,
        participantCount: e.participants?.length || 0,
        settings: e.settings
    }));
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
