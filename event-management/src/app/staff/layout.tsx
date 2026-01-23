"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, LogOut, Zap, UserPlus, LayoutDashboard, Users } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { settings } = useDemo();
    const pathname = usePathname();

    useEffect(() => {
        if (!settings.isInitialized) {
            router.push('/setup');
            return;
        }
        // Staff check? Assuming 'demo_user_role' cookie handling is consistent or relying on page-level checks.
        // If strict staff check needed:
        // if (!document.cookie.includes('demo_user_role=')) router.push('/login');
    }, [router, settings.isInitialized]);

    const handleLogout = () => {
        document.cookie = "demo_user_role=; max-age=0; path=/";
        window.location.href = "/login";
    };

    const isActive = (path: string) => pathname === path;

    return (
        <div className="min-h-screen bg-white font-sans text-black">
            {/* Top Header Navigation - Clean & Minimalist */}
            <header className="border-b-2 border-black bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex justify-between items-center overflow-x-auto">
                    <div className="flex items-center gap-3 md:gap-4 shrink-0 mr-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-black text-white flex items-center justify-center rounded-none">
                            <Zap className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">STAFF<span className="text-red-600">PANEL</span></h1>
                    </div>

                    <nav className="flex items-center gap-1 md:gap-2 shrink-0">
                        <Link href="/staff/dashboard">
                            <Button
                                variant="ghost"
                                className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive('/staff/dashboard') ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                            >
                                <LayoutDashboard className="w-5 h-5 mr-2" />
                                ダッシュボード
                            </Button>
                        </Link>
                        <Link href="/staff/participants">
                            <Button
                                variant="ghost"
                                className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive('/staff/participants') ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                            >
                                <Users className="w-5 h-5 mr-2" />
                                参加者一覧
                            </Button>
                        </Link>

                        <Link href="/staff/register">
                            <Button
                                variant="ghost"
                                className={`h-12 px-6 rounded-none font-bold uppercase tracking-wider transition-colors ${isActive('/staff/register') ? 'bg-black text-white hover:bg-black' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                            >
                                <UserPlus className="w-5 h-5 mr-2" />
                                当日登録
                            </Button>
                        </Link>

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
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto p-6 md:p-12">
                {children}
            </main>
        </div>
    );
}
