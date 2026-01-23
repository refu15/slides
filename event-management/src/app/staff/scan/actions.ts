"use server";

import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function processCheckIn(formData: FormData) {
    const attendeeId = formData.get("attendee_id") as string;
    if (!attendeeId) return { error: "Attendee ID required" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // 1. Get Attendee Info
    const { data: attendee, error: attendeeError } = await supabase
        .from("attendees")
        .select("*, events(name)")
        .eq("id", attendeeId)
        .single();

    if (attendeeError || !attendee) {
        return { error: "Attendee not found" };
    }

    // 2. Check if already checked in
    const { data: existing } = await supabase
        .from("checkins")
        .select("id")
        .eq("attendee_id", attendeeId)
        .single();

    if (existing) {
        return { error: "Already checked in" };
    }

    // 3. Record Check-in
    const { error: checkinError } = await supabase.from("checkins").insert({
        attendee_id: attendeeId,
        event_id: attendee.event_id,
        processed_by: user.id
    });

    if (checkinError) return { error: "Check-in failed" };

    // 4. VIP Notification Check
    if (attendee.category === "vip") {
        const message = `[VIP Check-in] ${attendee.name} (${attendee.company || "No Company"}) has arrived at ${attendee.events?.name}.`;
        // Fire and forget notification
        sendNotification(message).catch(console.error);
    }

    revalidatePath("/staff/scan");
    return { success: true, attendee };
}
