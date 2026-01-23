"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDemo } from "@/lib/demo-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.eventId as string;
    const { verifyPassword, settings, isLoading } = useDemo();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [checkingAuth, setCheckingAuth] = useState(false);
    const hasCheckedAuth = useRef(false);

    // Google認証チェック
    useEffect(() => {
        if (hasCheckedAuth.current) return;

        async function checkGoogleAuth() {
            // パスワード認証に移行するため、チェック画面を表示しない
            // バックグラウンドで静かにチェックする
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // ユーザーのロールを確認
                const { data: role } = await supabase
                    .from('event_roles')
                    .select('role')
                    .eq('event_id', eventId)
                    .eq('user_id', user.id)
                    .single();

                if (role) {
                    // ロールがあれば適切なページにリダイレクト
                    hasCheckedAuth.current = true;
                    if (role.role === 'owner' || role.role === 'admin') {
                        router.push(`/${eventId}/admin/dashboard`);
                        return;
                    } else if (role.role === 'staff') {
                        router.push(`/${eventId}/staff/scan`);
                        return;
                    }
                }
            }

            hasCheckedAuth.current = true;
            // setCheckingAuth(false); // 初期値がfalseなので不要
        }

        checkGoogleAuth();
    }, [eventId, router]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!settings.isInitialized && !isLoading) {
            router.push(`/${eventId}/setup`);
            return;
        }

        if (verifyPassword(password, 'admin')) {
            // Set Event-Scoped Cookie
            document.cookie = `auth_${eventId}=admin; path=/; max-age=${60 * 60 * 24}`;
            router.push(`/${eventId}/admin/dashboard`);
        } else if (verifyPassword(password, 'staff')) {
            document.cookie = `auth_${eventId}=employee; path=/; max-age=${60 * 60 * 24}`;
            router.push(`/${eventId}/staff/scan`);
        } else {
            setError("パスコードが間違っています");
        }
    };

    const handleGoogleLogin = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/${eventId}/login`,
            },
        });
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600 font-bold">認証を確認中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4 relative">
            <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-black transition-colors flex items-center gap-2 font-bold uppercase text-sm">
                <ArrowLeft className="w-4 h-4" /> ポータルに戻る
            </Link>

            <div className="bg-white rounded-none border-2 border-black w-full max-w-md p-6 md:p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                <div className="bg-black text-white p-4 rounded-full w-16 h-16 md:w-20 md:h-20 mx-auto flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 md:w-10 md:h-10" />
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-black mb-2 uppercase tracking-tighter">ログイン</h1>
                <p className="text-gray-500 font-bold uppercase tracking-widest mb-6 md:mb-8 text-xs md:text-sm">
                    {settings.eventName || "Event Management System"}
                </p>

                <div className="mb-8">
                    <Button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white text-black border-2 border-gray-200 hover:bg-gray-50 hover:border-black h-12 font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Googleでログイン
                    </Button>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-400 font-bold">OR</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
                    <div className="text-left">
                        <label className="block text-xs md:text-sm font-black text-black uppercase tracking-widest mb-2">パスコード</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••"
                            className="text-center text-2xl md:text-4xl h-16 md:h-20 tracking-[0.3em] md:tracking-[0.5em] border-2 border-black rounded-none focus:border-red-600 focus:ring-1 focus:ring-red-600 bg-transparent placeholder:text-gray-200 font-black transition-all"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-600 text-white p-4 text-sm font-bold uppercase tracking-widest animate-pulse border-2 border-black">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" disabled={isLoading} className="w-full h-14 md:h-16 text-lg md:text-xl bg-black hover:bg-white hover:text-black hover:border-black border-2 border-black text-white font-black rounded-none shadow-none hover:shadow-[5px_5px_0px_0px_rgba(255,0,0,1)] transition-all uppercase tracking-widest">
                        {isLoading ? "読み込み中..." : "システム・ロック解除"}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t-2 border-gray-100 text-xs text-gray-400 font-mono uppercase">
                    Secure Access Endpoint v2.0
                </div>
            </div>
        </div>
    );
}
