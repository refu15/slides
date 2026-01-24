"use client";

import { useParams } from "next/navigation";
import { useDemo, ParticipantStatus } from "@/lib/demo-context";
import Link from "next/link";
import { Users, CheckCircle, Clock, Activity, Search, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function StaffPage() {
    const params = useParams();
    const eventId = params?.eventId as string;
    const { settings, participants, checkInLogs, categories } = useDemo();
    const [search, setSearch] = useState("");
    const [showParticipants, setShowParticipants] = useState(false);

    // Statistics
    const total = participants.length;
    const checkedInIds = new Set(
        checkInLogs
            .filter(l => l.action === 'checkin')
            .map(l => l.userId)
    );
    const checkedOutIds = new Set(
        checkInLogs
            .filter(l => l.action === 'checkout')
            .map(l => l.userId)
    );

    // 現在会場内にいる人数（チェックイン後、チェックアウトしていない人）
    const currentlyInVenue = [...checkedInIds].filter(id => {
        const logs = checkInLogs.filter(log => log.userId === id);
        const lastLog = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        return lastLog?.action === 'checkin';
    }).length;

    const checkInRate = total > 0 ? Math.round((checkedInIds.size / total) * 100) : 0;

    // Recent Activity (Last 10)
    const recentLogs = [...checkInLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    // Helper to get latest status for a participant
    const getStatus = (id: string): ParticipantStatus => {
        const logs = checkInLogs.filter(log => log.userId === id);
        if (logs.length === 0) return 'not_checked_in';
        const lastLog = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        return lastLog.action === 'checkin' ? 'checked_in' : 'checked_out';
    };

    // Filtered participants for quick search
    const filteredParticipants = participants.filter(p => {
        if (!search) return false;
        return p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.furigana || '').toLowerCase().includes(search.toLowerCase()) ||
            p.email.toLowerCase().includes(search.toLowerCase());
    }).slice(0, 10);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                                {settings.eventName || "イベント"}
                            </h1>
                            <p className="text-gray-500 font-bold text-sm">
                                {settings.eventDate || "日付未設定"} | {settings.venueName || "会場未設定"}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={`/${eventId}/staff/participants`}
                                className="bg-black text-white px-4 py-2 font-bold text-sm hover:bg-gray-800 transition-colors"
                            >
                                参加者一覧
                            </Link>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total */}
                    <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">総参加者</div>
                        <div className="text-3xl md:text-4xl font-black">{total}</div>
                    </div>

                    {/* Currently in Venue */}
                    <div className="bg-green-600 border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white">
                        <div className="font-bold uppercase tracking-widest text-xs mb-1 opacity-80">入場中</div>
                        <div className="text-3xl md:text-4xl font-black">{currentlyInVenue}</div>
                    </div>

                    {/* Check-in Rate */}
                    <div className="bg-blue-600 border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white">
                        <div className="font-bold uppercase tracking-widest text-xs mb-1 opacity-80">チェックイン率</div>
                        <div className="text-3xl md:text-4xl font-black">{checkInRate}%</div>
                    </div>

                    {/* Not Checked In */}
                    <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">未チェックイン</div>
                        <div className="text-3xl md:text-4xl font-black">{total - checkedInIds.size}</div>
                    </div>
                </div>

                {/* Quick Search */}
                <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5" /> クイック検索
                    </h2>
                    <div className="relative">
                        <Input
                            placeholder="名前・ふりがな・メールで検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border-2 border-black rounded-none text-lg p-4"
                        />
                    </div>

                    {/* Search Results */}
                    {search && (
                        <div className="mt-4 border-t-2 border-gray-200 pt-4">
                            {filteredParticipants.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">該当者が見つかりません</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredParticipants.map(p => {
                                        const status = getStatus(p.id);
                                        const category = categories.find(c => c.id === p.category);
                                        return (
                                            <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200">
                                                <div className="flex items-center gap-3">
                                                    {status === 'checked_in' ? (
                                                        <UserCheck className="w-5 h-5 text-green-600" />
                                                    ) : status === 'checked_out' ? (
                                                        <UserX className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <Users className="w-5 h-5 text-blue-600" />
                                                    )}
                                                    <div>
                                                        <div className="font-bold">{p.name}</div>
                                                        <div className="text-xs text-gray-500">{p.organization || '所属なし'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {category && (
                                                        <span
                                                            className="px-2 py-1 text-xs font-bold text-white"
                                                            style={{ backgroundColor: category.color }}
                                                        >
                                                            {category.name}
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-1 text-xs font-bold ${status === 'checked_in' ? 'bg-green-100 text-green-700' :
                                                            status === 'checked_out' ? 'bg-gray-100 text-gray-600' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {status === 'checked_in' ? '入場中' :
                                                            status === 'checked_out' ? '退場済' : '未入場'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-6 border-b-2 border-black bg-gray-50">
                        <h3 className="text-xl font-black uppercase flex items-center gap-2">
                            <Clock className="w-5 h-5" /> 最近のアクティビティ
                        </h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {recentLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 font-bold uppercase text-sm">
                                アクティビティ記録なし
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {recentLogs.map((log, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {log.action === 'checkin' ? (
                                                <UserCheck className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <UserX className="w-5 h-5 text-red-600" />
                                            )}
                                            <div>
                                                <div className="font-bold text-sm">{log.name}</div>
                                                <div className="text-xs text-gray-400">{log.venue || '会場'}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold px-2 py-1 uppercase ${log.action === 'checkin' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {log.action === 'checkin' ? '入場' : '退場'}
                                            </span>
                                            <div className="text-xs text-gray-400 font-mono mt-1">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> チェックイン進捗
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2 font-bold text-sm">
                                <span>全体進捗</span>
                                <span>{checkedInIds.size} / {total} ({checkInRate}%)</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 border border-black">
                                <div
                                    className="h-full bg-green-600 transition-all duration-500"
                                    style={{ width: `${checkInRate}%` }}
                                />
                            </div>
                        </div>

                        {/* Category breakdown */}
                        {categories.map(cat => {
                            const catParticipants = participants.filter(p => p.category === cat.id);
                            const catCheckedIn = catParticipants.filter(p => checkedInIds.has(p.id)).length;
                            const catRate = catParticipants.length > 0 ? Math.round((catCheckedIn / catParticipants.length) * 100) : 0;
                            return (
                                <div key={cat.id}>
                                    <div className="flex justify-between mb-1 text-sm">
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 inline-block"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.name}
                                        </span>
                                        <span>{catCheckedIn} / {catParticipants.length}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 border border-gray-300">
                                        <div
                                            className="h-full transition-all duration-500"
                                            style={{ width: `${catRate}%`, backgroundColor: cat.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
