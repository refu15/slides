import { NextResponse } from 'next/server';
import { getEvent, saveEvent, deleteEvent } from '@/lib/server/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = getEvent(id);
    if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(event);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await request.json();
        const { id } = await params;

        // Ensure ID matches
        if (body.id && body.id !== id) {
            return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
        }

        const existing = getEvent(id);
        if (!existing) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Merge or Replace? 
        // For sync simplicity, we'll replace the data structures provided in body
        // But we preserve the ID and Name unless explicitly changed
        const updatedEvent = {
            ...existing,
            ...body,
            id: id // Security: preserve ID
        };

        saveEvent(updatedEvent);
        return NextResponse.json({ success: true, event: updatedEvent });

    } catch (e) {
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = getEvent(id);
    if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const { password } = body;

        // If event is initialized, check password. If not initialized, maybe allow delete without?
        // Safe bet: always require password if it exists, or "admin" default.
        const currentPassword = event.settings?.adminPassword || "admin";

        if (password !== currentPassword) {
            return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
        }

        deleteEvent(id);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}
