"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowRight, Loader2, X, AlertTriangle, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/google-auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Type matching API response
type EventSummary = {
    id: string;
    name: string;
    createdAt: string;
    participantCount: number;
    settings: any;
};

interface DashboardClientProps {
    user: SupabaseUser;
}

export default function DashboardClient({ user }: DashboardClientProps) {
    const router = useRouter();
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newEventName, setNewEventName] = useState("");

    const fetchEvents = () => {
        setIsLoading(true);
        fetch('/api/events')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setEvents(data);
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newEventName })
            });
            const newEvent = await res.json();
            if (newEvent.id) {
                setNewEventName("");
                fetchEvents();
            }
        } catch (e) {
            console.error("Create failed", e);
        } finally {
            setIsCreating(false);
        }
    };

    // Delete Modal State
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const openDeleteModal = (id: string, name: string) => {
        setDeleteTarget({ id, name });
        setDeletePassword("");
        setDeleteError("");
    };

    const closeDeleteModal = () => {
        setDeleteTarget(null);
        setIsDeleting(false);
    };

    const confirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deleteTarget) return;

        setIsDeleting(true);
        setDeleteError("");

        try {
            const res = await fetch(`/api/events/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete");
            }

            // Success
            closeDeleteModal();
            fetchEvents();
        } catch (e: any) {
            setDeleteError(e.message === "Incorrect password" ? "パスワードが間違っています" : "削除に失敗しました");
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header with User Info */}
                <div className="flex justify-between items-start">
                    <div className="text-center flex-1 space-y-4">
                        <h1 className="text-4xl font-black uppercase tracking-tighter">イベントポータル</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">イベントを選択・作成してください</p>
                    </div>

                    <div className="flex items-center gap-3 bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {user.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-black" />
                        ) : (
                            <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                        )}
                        <div className="text-left">
                            <div className="font-bold text-sm">{user.user_metadata?.full_name || user.email}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="ml-2 p-2 hover:bg-gray-100 rounded transition-colors"
                            title="ログアウト"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Create Form */}
                <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <input
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            placeholder="新規イベント名..."
                            className="flex-1 border-2 border-black px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <Button type="submit" disabled={isCreating} className="bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none font-bold uppercase tracking-wide">
                            {isCreating ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            イベント作成
                        </Button>
                    </form>
                </div>

                {/* Event List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoading ? (
                        <div className="col-span-2 text-center py-12 text-gray-400 font-bold">イベントを読み込み中...</div>
                    ) : events.length === 0 ? (
                        <div className="col-span-2 text-center py-12 text-gray-400 font-bold bg-white border-2 border-dashed border-gray-300">
                            イベントが見つかりません。上記から作成してください。
                        </div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="group relative bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight">{event.name}</h2>
                                        <div className="text-xs font-mono text-gray-500 mt-1">ID: {event.id}</div>
                                    </div>
                                    <button
                                        onClick={() => openDeleteModal(event.id, event.name)}
                                        className="text-gray-300 hover:text-red-600 transition-colors p-2"
                                        title="イベントを削除"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 mb-6 text-sm font-bold text-gray-600">
                                    <div className="flex justify-between">
                                        <span>参加者数</span>
                                        <span>{event.participantCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>初期設定</span>
                                        <span>{event.settings?.isInitialized ? '完了' : '未完了'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Link href={`/${event.id}/admin/dashboard`} className="col-span-2">
                                        <Button className="w-full bg-black text-white hover:bg-white hover:text-black border-2 border-black rounded-none font-bold uppercase text-xs h-10">
                                            管理画面へ <ArrowRight className="ml-2 w-3 h-3" />
                                        </Button>
                                    </Link>
                                    <Link href={`/${event.id}/guest`}>
                                        <Button variant="outline" className="w-full border-2 border-black rounded-none font-bold uppercase text-xs h-10 hover:bg-gray-100">
                                            ゲスト画面
                                        </Button>
                                    </Link>
                                    <Link href={`/${event.id}/staff`}>
                                        <Button variant="outline" className="w-full border-2 border-black rounded-none font-bold uppercase text-xs h-10 hover:bg-gray-100">
                                            スタッフ画面
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white border-2 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md w-full relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={closeDeleteModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center space-y-4 mb-6">
                            <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-600">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">イベント削除</h2>
                            <p className="text-gray-600 font-bold text-sm">
                                本当に「{deleteTarget.name}」を削除しますか？<br />
                                この操作は取り消せません。
                            </p>
                        </div>

                        <form onSubmit={confirmDelete} className="space-y-4">
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-black uppercase tracking-widest">管理者パスワード確認</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="パスワードを入力"
                                    className="w-full border-2 border-black px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-red-600 text-lg"
                                    autoFocus
                                />
                            </div>

                            {deleteError && (
                                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 border border-red-200 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {deleteError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    className="bg-white text-black border-2 border-black hover:bg-gray-100 font-bold h-12"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isDeleting || !deletePassword}
                                    className="bg-red-600 text-white border-2 border-black hover:bg-red-700 font-bold h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" /> : "完全に削除"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
