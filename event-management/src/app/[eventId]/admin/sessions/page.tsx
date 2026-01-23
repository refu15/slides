"use client";

import { useState } from "react";
import { useDemo, Session } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Clock, MapPin, User, MessageSquare } from "lucide-react";

export default function SessionsPage() {
    const { sessions, venues, addSession, updateSession, deleteSession } = useDemo();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        speaker: "",
        startTime: "10:00",
        endTime: "11:00",
        venueId: venues[0]?.id || "v1",
        allowFeedback: true
    });

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            speaker: "",
            startTime: "10:00",
            endTime: "11:00",
            venueId: venues[0]?.id || "v1",
            allowFeedback: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            updateSession(editingId, formData);
        } else {
            addSession({
                id: `session_${Date.now()}`,
                ...formData
            });
        }
        resetForm();
    };

    const handleEdit = (session: Session) => {
        setFormData({
            title: session.title,
            description: session.description,
            speaker: session.speaker || "",
            startTime: session.startTime,
            endTime: session.endTime,
            venueId: session.venueId,
            allowFeedback: session.allowFeedback
        });
        setEditingId(session.id);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("このセッションを削除しますか？")) {
            deleteSession(id);
        }
    };

    const sortedSessions = [...sessions].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );

    const getVenueName = (venueId: string) => {
        return venues.find(v => v.id === venueId)?.name || venueId;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
                        セッション管理
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">トークテーマ・企画の登録と編集</p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="h-14 px-8 bg-red-600 hover:bg-black text-white font-bold uppercase tracking-widest rounded-none"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    新規登録
                </Button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl p-8 border-4 border-black">
                        <h2 className="text-2xl font-black uppercase mb-6">
                            {editingId ? "セッション編集" : "新規セッション"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                    タイトル <span className="text-red-600">*</span>
                                </label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="例：基調講演「AIの未来」"
                                    required
                                    className="h-12 border-2 border-gray-200 focus:border-black rounded-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                    説明
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="セッションの概要を入力..."
                                    rows={3}
                                    className="w-full p-3 border-2 border-gray-200 focus:border-black focus:outline-none rounded-none resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                    登壇者
                                </label>
                                <Input
                                    value={formData.speaker}
                                    onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                                    placeholder="例：山田 太郎"
                                    className="h-12 border-2 border-gray-200 focus:border-black rounded-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                        開始時間
                                    </label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="h-12 border-2 border-gray-200 focus:border-black rounded-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                        終了時間
                                    </label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="h-12 border-2 border-gray-200 focus:border-black rounded-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                    会場
                                </label>
                                <select
                                    value={formData.venueId}
                                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                                    className="w-full h-12 px-3 border-2 border-gray-200 focus:border-black focus:outline-none rounded-none bg-white"
                                >
                                    {venues.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                    {venues.length === 0 && (
                                        <option value="v1">メイン会場</option>
                                    )}
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="allowFeedback"
                                    checked={formData.allowFeedback}
                                    onChange={(e) => setFormData({ ...formData, allowFeedback: e.target.checked })}
                                    className="w-5 h-5 accent-red-600"
                                />
                                <label htmlFor="allowFeedback" className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                    フィードバックを許可
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    onClick={resetForm}
                                    variant="outline"
                                    className="flex-1 h-14 border-2 border-gray-200 text-gray-500 font-bold uppercase tracking-widest rounded-none hover:border-black hover:text-black"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-14 bg-black hover:bg-red-600 text-white font-bold uppercase tracking-widest rounded-none"
                                >
                                    {editingId ? "更新" : "登録"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sessions List */}
            {sortedSessions.length === 0 ? (
                <div className="border-4 border-dashed border-gray-200 p-16 text-center">
                    <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-400 uppercase">セッションがありません</h3>
                    <p className="text-gray-400 mt-2">「新規登録」からセッションを追加してください</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedSessions.map((session) => (
                        <div
                            key={session.id}
                            className="border-2 border-black p-6 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-sm font-mono font-bold text-red-600">
                                            {session.startTime} - {session.endTime}
                                        </span>
                                        {session.allowFeedback && (
                                            <span className="flex items-center gap-1 text-xs font-bold uppercase text-green-600">
                                                <MessageSquare className="w-3 h-3" />
                                                フィードバック可
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black uppercase mb-2">
                                        {session.title}
                                    </h3>
                                    {session.description && (
                                        <p className="text-gray-600 mb-3">{session.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        {session.speaker && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-4 h-4" />
                                                {session.speaker}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {getVenueName(session.venueId)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleEdit(session)}
                                        variant="outline"
                                        className="h-10 px-4 border-2 border-gray-200 rounded-none hover:border-black"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(session.id)}
                                        variant="outline"
                                        className="h-10 px-4 border-2 border-red-200 text-red-600 rounded-none hover:border-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                総セッション数: {sessions.length}件
            </div>
        </div>
    );
}
