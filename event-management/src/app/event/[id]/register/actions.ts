"use server";

import { createClient } from "@/lib/supabase/client"; // Use client for anon access if RLS allows, but safer to use server client with anon key
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from "next/navigation";

export async function registerAttendee(eventId: string, formData: FormData) {
    const cookieStore = await cookies();

    // Use a client with ANON key (public access). 
    // RLS must allow 'INSERT' to 'attendees' for public (or authenticated anon).
    // For this MVP, we will assume RLS allows insert for anon, OR we use a service role logic if we want to be strict.
    // We'll stick to standard anon client.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                }
            }
        }
    );

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const company = formData.get("company") as string;

    if (!name) throw new Error("Name is required");

    // Validate Event Exists (Optional but good)

    // Insert Attendee
    const { data: attendee, error } = await supabase.from("attendees").insert({
        event_id: eventId,
        name,
        email,
        company,
        category: 'general' // Default to general
    }).select().single();

    if (error) {
        console.error("Registration Error:", error);
        throw new Error("Failed to register");
    }

    // Set Cookie for Portal Access
    cookieStore.set("attendee_id", attendee.id, { path: "/" });

    redirect(`/event/${eventId}/portal`);
}
