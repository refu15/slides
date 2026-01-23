"use client";

import { useDemo } from "@/lib/demo-context";
import { Users, CheckCircle, Crown, Activity, Clock, Calendar } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { participants, checkInLogs } = useDemo();

    // Statistics
    const total = participants.length;
    const checkedInCount = new Set(checkInLogs.filter(l => l.action === 'checkin').map(l => l.userId)).size;
    const vipCount = participants.filter(p => p.category === 'VIP').length;
    const generalCount = participants.filter(p => p.category !== 'VIP').length;
    const checkInRate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

    // Recent Activity (Last 5)
    const recentLogs = [...checkInLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">ダッシュボード</h1>
                <p className="text-gray-500 font-bold uppercase tracking-widest">リアルタイム・イベント概要</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total */}
                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">総参加者数</div>
                    <div className="text-6xl font-black mb-2">{total}</div>
                    <div className="text-sm font-bold text-gray-500">登録済みユーザー</div>
                </div>

                {/* Check-in (Active Red) */}
                <div className="bg-red-600 border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="font-bold uppercase tracking-widest text-xs mb-2 opacity-80">チェックイン済み</div>
                    <div className="text-6xl font-black mb-2">{checkedInCount}</div>
                    <div className="text-sm font-bold opacity-80">{checkInRate}% 完了</div>
                </div>

                {/* VIP */}
                <div className="bg-white border-2 border-red-600 p-8 shadow-[8px_8px_0px_0px_rgba(255,0,0,0.2)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="text-red-600 font-bold uppercase tracking-widest text-xs mb-2">VIPゲスト</div>
                    <div className="text-6xl font-black mb-2 text-black">{vipCount}</div>
                    <div className="text-sm font-bold text-gray-500">VIPステータス</div>
                </div>

                {/* General */}
                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">一般参加者</div>
                    <div className="text-6xl font-black mb-2">{generalCount}</div>
                    <div className="text-sm font-bold text-gray-500">一般出席者数</div>
                </div>
            </div>

            {/* Recent Activity & Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats / Progress */}
                <div className="lg:col-span-2 bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
                        <Activity className="w-6 h-6" /> チェックイン進捗状況
                    </h3>

                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-sm">
                                <span>全体の進捗</span>
                                <span>{checkInRate}%</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 border border-black">
                                <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${checkInRate}%` }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <div className="text-gray-400 font-bold uppercase text-xs mb-1">VIP出席率</div>
                                <div className="text-3xl font-black">{Math.round((checkInLogs.filter(l => l.action === 'checkin' && participants.find(p => p.id === l.userId)?.category === 'VIP').length / (vipCount || 1)) * 100)}%</div>
                            </div>
                            <div>
                                <div className="text-gray-400 font-bold uppercase text-xs mb-1">一般出席率</div>
                                <div className="text-3xl font-black">{Math.round((checkInLogs.filter(l => l.action === 'checkin' && participants.find(p => p.id === l.userId)?.category !== 'VIP').length / (generalCount || 1)) * 100)}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Logs - List Style */}
                <div className="bg-white border-2 border-black p-0 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
                    <div className="p-6 border-b-2 border-black bg-gray-50">
                        <h3 className="text-xl font-black uppercase flex items-center gap-2">
                            <Clock className="w-5 h-5" /> 最近のアクティビティ
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {recentLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 font-bold uppercase text-sm">アクティビティ記録なし</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {recentLogs.map((log, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-sm">{log.name}</div>
                                            <div className="text-xs text-gray-400 font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 uppercase ${log.action === 'checkin' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {log.action}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
