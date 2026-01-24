"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";

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
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header / Nav */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo / Title */}
                        <div className="flex-shrink-0 flex items-center">
                            <span className="font-black text-xl uppercase tracking-tighter">
                                Staff Portal
                            </span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-8 items-center">

                            <Link
                                href={`/${eventId}/admin/dashboard`}
                                className="bg-black text-white hover:bg-gray-800 px-4 py-2 font-bold uppercase tracking-widest text-sm transition-colors"
                            >
                                ダッシュボード
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={toggleMenu}
                                className="text-black hover:text-gray-600 focus:outline-none"
                            >
                                {isMenuOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t-2 border-black absolute w-full left-0 shadow-lg">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">

                            <Link
                                href={`/${eventId}/admin/dashboard`}
                                onClick={() => setIsMenuOpen(false)}
                                className="block px-3 py-4 text-base font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 uppercase tracking-widest"
                            >
                                ダッシュボード
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
