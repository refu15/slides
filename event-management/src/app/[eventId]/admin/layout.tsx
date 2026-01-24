"use client";

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useDemo } from "@/lib/demo-context";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, CheckCircle, LogOut, Settings as SettingsIcon, Bell, ArrowLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const params = useParams();
    const eventId = params.eventId as string;
    const { settings, isLoading } = useDemo();
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string>("");
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const hasCheckedAuth = useRef(false);

    useEffect(() => {
        if (hasCheckedAuth.current) return;

        async function checkAuth() {
            if (isLoading) return;

            if (!settings.isInitialized) {
                hasCheckedAuth.current = true;
                router.push(`/${eventId}/setup`);
                return;
            }

            // Google認証チェック
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // ロール確認
                const { data: role } = await supabase
                    .from('event_roles')
                    .select('role')
                    .eq('event_id', eventId)
                    .eq('user_id', user.id)
                    .single();

                if (role && ['owner', 'admin', 'staff'].includes(role.role)) {
                    setUserRole(role.role);
                    hasCheckedAuth.current = true;
                    setIsAuthorized(true);
                    setIsChecking(false);
                    return;
                }
            }

            // Google認証がない場合、旧パスワード認証をチェック
            if (document.cookie.includes(`auth_${eventId}=admin`)) {
                setUserRole('admin');
                hasCheckedAuth.current = true;
                setIsAuthorized(true);
                setIsChecking(false);
                return;
            }

            if (document.cookie.includes(`auth_${eventId}=employee`)) {
                setUserRole('staff');
                hasCheckedAuth.current = true;
                setIsAuthorized(true);
                setIsChecking(false);
                return;
            }

            // 認証なし
            hasCheckedAuth.current = true;
            router.push(`/${eventId}/login`);
        }

        checkAuth();
    }, [router, settings.isInitialized, isLoading, eventId]);

    const handleLogout = () => {
        document.cookie = `auth_${eventId}=; max-age=0; path=/`;
        window.location.href = `/${eventId}/login`;
    };

    const isActive = (path: string) => pathname === path;
    const adminPath = (path: string) => `/${eventId}/admin${path}`;
    const isAdmin = ['owner', 'admin'].includes(userRole);

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
        <div className="min-h-screen bg-white font-sans text-black">
            {/* Top Header Navigation - Clean & Minimalist */}
            <header className="border-b-2 border-black bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex justify-between items-center overflow-x-auto">
                    <div className="flex items-center gap-3 md:gap-4 shrink-0 mr-4">
                        <Link href="/" title="Back to Portal">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white flex items-center justify-center rounded-none hover:bg-gray-800 transition-colors">
                                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                                {isAdmin ? "ADMIN" : "STAFF"}<span className="text-red-600">PANEL</span>
                            </h1>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{settings.eventName || eventId}</div>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1 md:gap-2 shrink-0">
                        <Link href={adminPath('/dashboard')}>
                            <Button
                                variant="ghost"
                                className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/dashboard')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                            >
                                <LayoutDashboard className="w-5 h-5 mr-2" />
                                ダッシュボード
                            </Button>
                        </Link>

                        {isAdmin && (
                            <>
                                <Link href={adminPath('/participants')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/participants')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <Users className="w-5 h-5 mr-2" />
                                        参加者一覧
                                    </Button>
                                </Link>
                                <Link href={adminPath('/sessions')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/sessions')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        セッション
                                    </Button>
                                </Link>
                                <Link href={adminPath('/import')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/import')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        インポート
                                    </Button>
                                </Link>

                                <Link href={adminPath('/qr-print')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/qr-print')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        QR印刷
                                    </Button>
                                </Link>
                                <Link href={adminPath('/statistics')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/statistics')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        統計
                                    </Button>
                                </Link>
                                <Link href={adminPath('/notifications')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/notifications')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <Bell className="w-5 h-5 mr-2" />
                                        通知ログ
                                    </Button>
                                </Link>

                                <Link href={adminPath('/settings')}>
                                    <Button
                                        variant="ghost"
                                        className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive(adminPath('/settings')) ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <SettingsIcon className="w-5 h-5 mr-2" />
                                        設定
                                    </Button>
                                </Link>
                            </>
                        )}

                        <div className="w-px h-8 bg-gray-200 mx-2"></div>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="h-12 px-6 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-wider rounded-none"
                        >
                            <LogOut className="w-5 h-5 mr-2" />
                            ログアウト
                        </Button>
                    </nav>
                </div>
            </header >

            {/* Main Content Area */}
            < main className="max-w-7xl mx-auto p-6 md:p-12" >
                {children}
            </main >
        </div >
    );
}
