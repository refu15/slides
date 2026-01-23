"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const start_time = formData.get("start_time") as string;
    const end_time = formData.get("end_time") as string;
    const venue_name = formData.get("venue_name") as string;
    const capacity = formData.get("capacity") as string;
    const description = formData.get("description") as string;

    if (!name || !start_time || !end_time) {
        throw new Error("Missing required fields");
    }

    const { error } = await supabase.from("events").insert({
        name,
        start_time,
        end_time,
        venue_name,
        capacity: capacity ? parseInt(capacity) : null,
        description,
        created_by: user.id
    });

    if (error) {
        console.error("Create Event Error:", error);
        throw new Error("Failed to create event");
    }

    revalidatePath("/admin/events");
    redirect("/admin/events");
}
