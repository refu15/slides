"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createStaff(formData: FormData) {
    const supabase = await createClient();

    // 1. Verify Requestor is Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        throw new Error("Permission denied");
    }

    // 2. Create User (Uses Supabase Admin API - wrapped in standard client for this simplified example, 
    // NOTE: In a real app, creating users without email confirmation or password often requires Service Role Key
    // which is NOT safe to expose in client code, but OK in Server Actions environment variables if set up correctly.
    // HOWEVER, the standard `signUp` requires email confirmation by default. 
    // For this MVP, we will assume we can use `signUp` and the user confirms email, or we use a separate Admin Client if needed.
    // Given constraints, we'll try standard `signUp`.

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("display_name") as string;

    if (!email || !password || !displayName) {
        throw new Error("Missing fields");
    }

    // NOTE: This creates a user in `auth.users`. 
    // To bypass email confirmation for MVP speed, disable it in Supabase Dashboard -> Auth -> Email.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: displayName,
                // We can't set role here directly securely usually, so we do it via triggers or follow up update
                // But we need to make sure the profile is created with 'employee' role.
            }
        }
    });

    if (signUpError) {
        console.error("SignUp Error", signUpError);
        throw new Error("Failed to create account: " + signUpError.message);
    }

    if (signUpData.user) {
        // Manually ensure profile is updated if Trigger didn't do it or if we need to force it
        // The schema defaults to 'employee', so as long as the profile row is created, it's fine.
        // Assuming we have a trigger that creates profile on user signup (common pattern), 
        // OR we insert it manually here if no trigger exists.

        // Check if profile exists
        const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", signUpData.user.id).single();

        if (!existingProfile) {
            await supabase.from("profiles").insert({
                id: signUpData.user.id,
                email: email,
                display_name: displayName,
                role: 'employee',
                is_password_changed: false
            });
        } else {
            // Update just in case
            await supabase.from("profiles").update({
                role: 'employee',
                display_name: displayName
            }).eq("id", signUpData.user.id);
        }
    }

    revalidatePath("/admin/staff");
    return { success: true };
}
