"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addAttendee(eventId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const category = formData.get("category") as string; // 'general' or 'vip'

    if (!name) throw new Error("Name is required");

    const { error } = await supabase.from("attendees").insert({
        event_id: eventId,
        name,
        email,
        category,
        company: formData.get("company") as string,
        notes: formData.get("notes") as string,
    });

    if (error) throw new Error("Failed to add attendee");

    revalidatePath(`/admin/events/${eventId}`);
}
