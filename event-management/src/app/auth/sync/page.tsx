"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthSyncPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Initializing session...");

    useEffect(() => {
        const syncSession = async () => {
            // Get tokens from hash
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const next = hashParams.get("next") || "/dashboard";

            if (!accessToken || !refreshToken) {
                setStatus("No tokens found. Redirecting to login...");
                setTimeout(() => router.push("/"), 2000);
                return;
            }

            try {
                setStatus("Syncing session...");
                const supabase = createClient();

                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) throw error;

                setStatus("Session synced! Redirecting...");

                // Check for invite redirect first
                const inviteRedirect = localStorage.getItem('invite_redirect');
                if (inviteRedirect) {
                    localStorage.removeItem('invite_redirect');
                    window.location.href = inviteRedirect;
                    return;
                }

                // Force a hard reload to ensure cookies are sent to server
                window.location.href = next;

            } catch (e: any) {
                console.error("Sync error:", e);
                setStatus(`Error: ${e.message}`);
                // Fallback to login
                setTimeout(() => router.push("/"), 3000);
            }
        };

        syncSession();
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
                <h1 className="text-xl font-bold mb-2">Finalizing Authentication</h1>
                <p className="text-gray-500 mb-4">{status}</p>
            </div>
        </div>
    );
}
