"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo-context";
import { Bell, CheckCircle, XCircle, Search, Filter } from "lucide-react";

export default function NotificationsPage() {
    const { notificationLogs } = useDemo();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<'all' | 'vip_arrival' | 'reentry' | 'other'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');

    // Filter Logs
    const filteredLogs = notificationLogs.filter(log => {
        const matchesSearch =
            log.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.targetOrg.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = filterType === 'all' || log.type === filterType;
        const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    // Sort by timestamp desc
    const sortedLogs = [...filteredLogs].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('ja-JP');
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">通知ログ</h1>
                <p className="text-gray-500 font-bold uppercase tracking-widest">DISCORD / LINE 通知履歴</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">送信総数</div>
                    <div className="text-6xl font-black mb-2 flex items-baseline gap-2">
                        {notificationLogs.length}
                        <Bell className="w-8 h-8 text-black opacity-20" />
                    </div>
                    <div className="text-sm font-bold text-gray-500">Total Notifications</div>
                </div>

                <div className="bg-white border-2 border-green-600 p-8 shadow-[8px_8px_0px_0px_rgba(22,163,74,0.2)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="text-green-600 font-bold uppercase tracking-widest text-xs mb-2">送信成功</div>
                    <div className="text-6xl font-black mb-2 text-green-600">
                        {notificationLogs.filter(l => l.status === 'success').length}
                    </div>
                    <div className="text-sm font-bold text-green-600/50">Successful</div>
                </div>

                <div className="bg-white border-2 border-red-600 p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <div className="text-red-600 font-bold uppercase tracking-widest text-xs mb-2">送信失敗</div>
                    <div className="text-6xl font-black mb-2 text-red-600">
                        {notificationLogs.filter(l => l.status === 'failed').length}
                    </div>
                    <div className="text-sm font-bold text-red-600/50">Failed</div>
                </div>
            </div>

            {/* Filter & List */}
            <div className="bg-white border-2 border-black p-0 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-6 border-b-2 border-black bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            placeholder="名前、組織、メッセージで検索..."
                            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black font-bold text-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                            className="bg-white border-2 border-black text-sm font-bold rounded-none px-4 py-2 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                        >
                            <option value="all">全てのタイプ</option>
                            <option value="vip_arrival">VIP到着</option>
                            <option value="reentry">再入場</option>
                            <option value="other">その他</option>
                        </select>
                        <select
                            className="bg-white border-2 border-black text-sm font-bold rounded-none px-4 py-2 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="all">全てのステータス</option>
                            <option value="success">成功</option>
                            <option value="failed">失敗</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black text-white uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">日時</th>
                                <th className="px-6 py-4">タイプ</th>
                                <th className="px-6 py-4">対象者</th>
                                <th className="px-6 py-4">メッセージ</th>
                                <th className="px-6 py-4">ステータス</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest">
                                        データが見つかりません
                                    </td>
                                </tr>
                            ) : (
                                sortedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-red-50 transition-colors font-medium">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 border-2 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${log.type === 'vip_arrival' ? 'bg-purple-100 border-black text-purple-700' :
                                                    log.type === 'reentry' ? 'bg-blue-100 border-black text-blue-700' :
                                                        'bg-gray-100 border-black text-gray-700'
                                                }`}>
                                                {log.type === 'vip_arrival' ? 'VIP ARRIVAL' :
                                                    log.type === 'reentry' ? 'RE-ENTRY' : 'OTHER'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{log.targetName}</div>
                                            <div className="text-xs text-gray-500 font-bold uppercase">{log.targetOrg}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm truncate" title={log.message}>
                                            <div className="text-sm">{log.message}</div>
                                            {log.error && <div className="text-red-500 text-xs mt-1 font-bold">{log.error}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.status === 'success' ? (
                                                <span className="flex items-center gap-1.5 text-green-600 font-bold uppercase text-xs">
                                                    <CheckCircle className="w-4 h-4" /> Success
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-red-600 font-bold uppercase text-xs">
                                                    <XCircle className="w-4 h-4" /> Failed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
