"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <main className="flex-1">
                {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-3 flex justify-around shadow-[0px_-4px_10px_rgba(0,0,0,0.1)] z-50">
                <Link
                    href={`/${eventId}/staff/scan`}
                    className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                >
                    <div className="bg-gray-100 p-2 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </div>
                    スキャン
                </Link>

                <Link
                    href={`/event/${eventId}/portal`}
                    className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <div className="bg-blue-50 p-2 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </div>
                    ポータル
                </Link>
            </nav>
        </div>
    );
}
