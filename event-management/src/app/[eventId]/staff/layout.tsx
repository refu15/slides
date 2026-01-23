"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const params = useParams();
    const eventId = params.eventId as string;
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Google認証されていない場合
                // 旧パスワード認証をチェック
                if (!document.cookie.includes(`auth_${eventId}=employee`)) {
                    router.push(`/${eventId}/login`);
                    return;
                }
                setIsAuthorized(true);
                setIsChecking(false);
                return;
            }

            // スタッフロール確認(owner, admin, staffすべてOK)
            const { data: role } = await supabase
                .from('event_roles')
                .select('role')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .single();

            if (!role) {
                // ロールがない場合、旧パスワード認証をチェック
                if (!document.cookie.includes(`auth_${eventId}=employee`)) {
                    router.push(`/${eventId}/login`);
                    return;
                }
            }

            setIsAuthorized(true);
            setIsChecking(false);
        }

        checkAuth();
    }, [eventId, router]);

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600 font-bold">認証を確認中...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return <>{children}</>;
}
