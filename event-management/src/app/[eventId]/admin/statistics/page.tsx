"use client";

import { useState, useEffect } from "react";
import { useDemo, ParticipantStatus } from "@/lib/demo-context";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, Wine, Clock, TrendingUp, Activity, Ticket } from "lucide-react";

// ステータス設定
const STATUS_CONFIG: Record<ParticipantStatus, { label: string; color: string }> = {
    general: { label: "一般", color: "bg-gray-500" },
    student: { label: "学生", color: "bg-blue-500" },
    vip: { label: "VIP", color: "bg-red-500" },
    platinum: { label: "プラチナ", color: "bg-purple-500" },
    gold: { label: "ゴールド", color: "bg-yellow-500" },
    silver: { label: "シルバー", color: "bg-gray-400" },
    media: { label: "メディア", color: "bg-green-500" },
    sponsor: { label: "スポンサー", color: "bg-orange-500" },
    online: { label: "オンライン", color: "bg-cyan-500" },
};

export default function StatisticsPage() {
    const { participants, checkInLogs, sessions } = useDemo();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 現在会場内人数を計算
    const getCurrentAttendance = () => {
        const statusMap = new Map<string, boolean>();
        checkInLogs
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .forEach(log => {
                statusMap.set(log.userId, log.action === 'checkin');
            });
        return Array.from(statusMap.values()).filter(v => v).length;
    };

    // チェックイン済みの参加者を取得
    const getCheckedInParticipants = () => {
        const statusMap = new Map<string, boolean>();
        checkInLogs
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .forEach(log => {
                statusMap.set(log.userId, log.action === 'checkin');
            });
        return participants.filter(p => statusMap.get(p.id) === true);
    };

    // ステータス別の集計
    const getStatusBreakdown = () => {
        const breakdown: Record<string, number> = {};
        participants.forEach(p => {
            const status = p.status || 'general';
            breakdown[status] = (breakdown[status] || 0) + 1;
        });
        return breakdown;
    };

    // 時間帯別チェックイン数
    const getHourlyCheckins = () => {
        const hourly: Record<number, number> = {};
        checkInLogs
            .filter(l => l.action === 'checkin')
            .forEach(log => {
                const hour = new Date(log.timestamp).getHours();
                hourly[hour] = (hourly[hour] || 0) + 1;
            });
        return hourly;
    };

    const totalParticipants = participants.length;
    const currentAttendance = getCurrentAttendance();
    const checkedInParticipants = getCheckedInParticipants();
    const afterPartyCount = participants.filter(p => p.hasAfterParty).length;
    const vipCount = participants.filter(p => ['vip', 'platinum', 'gold'].includes(p.status || '')).length;
    const statusBreakdown = getStatusBreakdown();
    const hourlyCheckins = getHourlyCheckins();
    const checkInRate = totalParticipants > 0 ? Math.round((checkedInParticipants.length / totalParticipants) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tight">リアルタイム統計</h1>
                    <p className="text-gray-500 mt-2">イベントの状況をリアルタイムで把握</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono font-bold">
                        {currentTime.toLocaleTimeString('ja-JP')}
                    </div>
                    <div className="text-sm text-gray-500">
                        {currentTime.toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-black text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                            <span className="text-sm uppercase tracking-widest text-gray-400">登録者数</span>
                        </div>
                        <div className="text-5xl font-black">{totalParticipants}</div>
                    </CardContent>
                </Card>

                <Card className="bg-green-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-8 h-8 text-green-200" />
                            <span className="text-sm uppercase tracking-widest text-green-200">現在会場内</span>
                        </div>
                        <div className="text-5xl font-black">{currentAttendance}</div>
                    </CardContent>
                </Card>

                <Card className="bg-red-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="w-8 h-8 text-red-200" />
                            <span className="text-sm uppercase tracking-widest text-red-200">チェックイン率</span>
                        </div>
                        <div className="text-5xl font-black">{checkInRate}%</div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Wine className="w-8 h-8 text-purple-200" />
                            <span className="text-sm uppercase tracking-widest text-purple-200">懇親会参加</span>
                        </div>
                        <div className="text-5xl font-black">{afterPartyCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Breakdown */}
            <Card className="border-2 border-black">
                <CardContent className="p-6">
                    <h2 className="text-xl font-bold uppercase tracking-widest mb-6">ステータス別内訳</h2>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                            const count = statusBreakdown[key] || 0;
                            const percentage = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
                            return (
                                <div key={key} className="text-center">
                                    <div className={`w-full h-2 ${config.color} mb-2`} style={{ opacity: count > 0 ? 1 : 0.2 }} />
                                    <div className="text-2xl font-bold">{count}</div>
                                    <div className="text-xs text-gray-500 uppercase">{config.label}</div>
                                    <div className="text-xs text-gray-400">{percentage}%</div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Hourly Check-ins */}
            <Card className="border-2 border-black">
                <CardContent className="p-6">
                    <h2 className="text-xl font-bold uppercase tracking-widest mb-6">時間帯別チェックイン</h2>
                    <div className="flex items-end gap-1 h-40">
                        {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => {
                            const count = hourlyCheckins[hour] || 0;
                            const maxCount = Math.max(...Object.values(hourlyCheckins), 1);
                            const height = (count / maxCount) * 100;
                            const isCurrent = currentTime.getHours() === hour;

                            return (
                                <div key={hour} className="flex-1 flex flex-col items-center">
                                    <div className="w-full flex-1 flex items-end">
                                        <div
                                            className={`w-full transition-all ${isCurrent ? 'bg-red-600' : 'bg-gray-300'}`}
                                            style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                                        />
                                    </div>
                                    <div className={`text-xs mt-2 ${isCurrent ? 'font-bold text-red-600' : 'text-gray-500'}`}>
                                        {hour}時
                                    </div>
                                    {count > 0 && (
                                        <div className="text-xs font-bold">{count}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-2 border-black">
                <CardContent className="p-6">
                    <h2 className="text-xl font-bold uppercase tracking-widest mb-6">最近のアクティビティ</h2>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {checkInLogs.slice(-10).reverse().map((log, i) => {
                            const participant = participants.find(p => p.id === log.userId);
                            return (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        {log.action === 'checkin' ? (
                                            <UserCheck className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <UserX className="w-5 h-5 text-red-600" />
                                        )}
                                        <div>
                                            <div className="font-bold">{participant?.name || log.userId}</div>
                                            <div className="text-xs text-gray-500">{participant?.organization}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold uppercase ${log.action === 'checkin' ? 'text-green-600' : 'text-red-600'}`}>
                                            {log.action === 'checkin' ? 'IN' : 'OUT'}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {checkInLogs.length === 0 && (
                            <p className="text-center text-gray-400 py-4">アクティビティがありません</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
