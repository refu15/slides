import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch event data from Supabase
    const { data, error } = await supabase
        .from('event_data')
        .select('*')
        .eq('event_id', id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Transform snake_case to camelCase for frontend compatibility
    const eventData = {
        id: id,
        settings: data.settings || {},
        venues: data.venues || [],
        categories: data.categories || [],
        participants: data.participants || [],
        checkInLogs: data.check_in_logs || [],
        sessions: data.sessions || [],
        notificationLogs: data.notification_logs || [],
    };

    return NextResponse.json(eventData);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await request.json();
        const { id } = await params;

        // Ensure ID matches
        if (body.id && body.id !== id) {
            return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
        }

        const supabase = await createClient();

        // Transform camelCase to snake_case for Supabase
        const updateData: Record<string, unknown> = {
            event_id: id,
        };

        if (body.settings !== undefined) updateData.settings = body.settings;
        if (body.venues !== undefined) updateData.venues = body.venues;
        if (body.categories !== undefined) updateData.categories = body.categories;
        if (body.participants !== undefined) updateData.participants = body.participants;
        if (body.checkInLogs !== undefined) updateData.check_in_logs = body.checkInLogs;
        if (body.sessions !== undefined) updateData.sessions = body.sessions;
        if (body.notificationLogs !== undefined) updateData.notification_logs = body.notificationLogs;
        updateData.updated_at = new Date().toISOString();

        // Upsert to Supabase
        const { error } = await supabase
            .from('event_data')
            .upsert(updateData, { onConflict: 'event_id' });

        if (error) {
            console.error('Sync error:', error);
            return NextResponse.json({ error: "Sync failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error('POST error:', e);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Supabase RLS will handle permission checks (must be owner)
    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Delete error', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
