"use client";

import { useDemo, Participant, ParticipantStatus } from "@/lib/demo-context";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Check, Users, Wine, Ticket, Eye } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function StaffParticipantsPage() {
    const params = useParams();
    const eventId = params?.eventId as string;
    const { participants, categories, checkInLogs } = useDemo();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Helper to get latest status for a participant
    const getStatus = (id: string): ParticipantStatus => {
        const logs = checkInLogs.filter(log => log.participantId === id);
        if (logs.length === 0) return 'not_checked_in';
        const lastLog = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        return lastLog.type === 'check_in' ? 'checked_in' : 'checked_out';
    };

    // 現在会場内人数
    const getCurrentAttendance = () => {
        let count = 0;
        participants.forEach(p => {
            if (getStatus(p.id) === 'checked_in') {
                count++;
            }
        });
        return count;
    };

    const filtered = participants.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.furigana || '').toLowerCase().includes(search.toLowerCase()) ||
            p.email.toLowerCase().includes(search.toLowerCase()) ||
            p.organization.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const currentAttendance = getCurrentAttendance();

    const statusIcon = (status: ParticipantStatus) => {
        switch (status) {
            case 'checked_in':
                return <Check className="w-4 h-4 text-green-600" />;
            case 'checked_out':
                return <Wine className="w-4 h-4 text-gray-500" />;
            default:
                return <Ticket className="w-4 h-4 text-blue-600" />;
        }
    };

    const statusLabel = (status: ParticipantStatus) => {
        switch (status) {
            case 'checked_in':
                return <span className="text-green-600 font-bold">入場中</span>;
            case 'checked_out':
                return <span className="text-gray-500">退場済</span>;
            default:
                return <span className="text-blue-600">未チェックイン</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <Link
                    href={`/${eventId}/staff`}
                    className="inline-flex items-center text-gray-600 hover:text-black mb-6 font-bold"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    スタッフ画面に戻る
                </Link>

                <div className="bg-white border-2 border-black p-4 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-6">
                        参加者一覧
                    </h1>

                    {/* 統計情報 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-100 p-4 border-2 border-black">
                            <div className="text-2xl font-black">{participants.length}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase">総参加者数</div>
                        </div>
                        <div className="bg-green-100 p-4 border-2 border-green-600">
                            <div className="text-2xl font-black text-green-600">{currentAttendance}</div>
                            <div className="text-xs font-bold text-green-600 uppercase">現在入場中</div>
                        </div>
                        <div className="bg-blue-100 p-4 border-2 border-blue-600">
                            <div className="text-2xl font-black text-blue-600">
                                {participants.filter(p => getStatus(p.id) === 'not_checked_in').length}
                            </div>
                            <div className="text-xs font-bold text-blue-600 uppercase">未チェックイン</div>
                        </div>
                        <div className="bg-gray-200 p-4 border-2 border-gray-600">
                            <div className="text-2xl font-black text-gray-600">
                                {participants.filter(p => getStatus(p.id) === 'checked_out').length}
                            </div>
                            <div className="text-xs font-bold text-gray-600 uppercase">退場済</div>
                        </div>
                    </div>

                    {/* 検索とフィルタ */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="名前・メール・組織で検索..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 border-2 border-black rounded-none"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 border-2 border-black font-bold bg-white"
                        >
                            <option value="all">全カテゴリ</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 参加者テーブル（読み取り専用） */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-2 border-black">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="p-2 md:p-3 text-left font-bold text-xs uppercase">状態</th>
                                    <th className="p-2 md:p-3 text-left font-bold text-xs uppercase">名前</th>
                                    <th className="p-2 md:p-3 text-left font-bold text-xs uppercase hidden md:table-cell">組織</th>
                                    <th className="p-2 md:p-3 text-left font-bold text-xs uppercase hidden lg:table-cell">メール</th>
                                    <th className="p-2 md:p-3 text-left font-bold text-xs uppercase">カテゴリ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            参加者がいません
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((p) => {
                                        const status = getStatus(p.id);
                                        const category = categories.find(c => c.id === p.categoryId);
                                        return (
                                            <tr key={p.id} className="border-t-2 border-gray-200 hover:bg-gray-50">
                                                <td className="p-2 md:p-3">
                                                    <div className="flex items-center gap-2">
                                                        {statusIcon(status)}
                                                        <span className="hidden sm:inline">{statusLabel(status)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 md:p-3">
                                                    <div className="font-bold">{p.name}</div>
                                                    {p.furigana && <div className="text-xs text-gray-500">{p.furigana}</div>}
                                                </td>
                                                <td className="p-2 md:p-3 hidden md:table-cell text-gray-600">{p.organization || '-'}</td>
                                                <td className="p-2 md:p-3 hidden lg:table-cell text-gray-600">{p.email}</td>
                                                <td className="p-2 md:p-3">
                                                    <span
                                                        className="px-2 py-1 text-xs font-bold"
                                                        style={{
                                                            backgroundColor: category?.color || '#ccc',
                                                            color: '#fff'
                                                        }}
                                                    >
                                                        {category?.name || '未分類'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 text-sm text-gray-500">
                        表示中: {filtered.length}件 / 全{participants.length}件
                    </div>
                </div>
            </div>
        </div>
    );
}
