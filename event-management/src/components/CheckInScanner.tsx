"use client";

import { useState, useEffect } from "react";
import { useDemo, Participant, ParticipantStatus } from "@/lib/demo-context";
import { Input } from "@/components/ui/input";
import { notifyVipArrival, isVipStatus } from "@/lib/notifications";
import { Search, User, Check, LogOut, Wine } from "lucide-react";

// ステータスバッジ設定 (Updated for Light Theme)
const STATUS_CONFIG: Record<ParticipantStatus, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
    general: { label: "一般", bgColor: "bg-gray-100", textColor: "text-gray-800", borderColor: "border-gray-300" },
    student: { label: "学生", bgColor: "bg-blue-100", textColor: "text-blue-800", borderColor: "border-blue-300" },
    vip: { label: "VIP", bgColor: "bg-red-100", textColor: "text-red-800", borderColor: "border-red-500" },
    platinum: { label: "プラチナ", bgColor: "bg-purple-100", textColor: "text-purple-800", borderColor: "border-purple-300" },
    gold: { label: "ゴールド", bgColor: "bg-yellow-100", textColor: "text-yellow-800", borderColor: "border-yellow-500" },
    silver: { label: "シルバー", bgColor: "bg-gray-200", textColor: "text-gray-700", borderColor: "border-gray-400" },
    media: { label: "メディア", bgColor: "bg-green-100", textColor: "text-green-800", borderColor: "border-green-300" },
    sponsor: { label: "スポンサー", bgColor: "bg-orange-100", textColor: "text-orange-800", borderColor: "border-orange-300" },
    online: { label: "オンライン", bgColor: "bg-cyan-100", textColor: "text-cyan-800", borderColor: "border-cyan-300" },
};

export default function CheckInScanner() {
    const { venues, participants, checkInLogs, checkIn, checkOut, getVenueStats, updateParticipant, addNotificationLog, settings } = useDemo();

    // UI State
    const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');
    const [selectedVenue, setSelectedVenue] = useState(venues[0]?.id || "");
    const [inputID, setInputID] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [lastAction, setLastAction] = useState<{ type: 'success' | 'error' | 'vip' | 'warning', msg: string, p?: Participant } | null>(null);
    const [operatorName, setOperatorName] = useState("");
    const [isEditingOperator, setIsEditingOperator] = useState(false);

    // Load operator name
    useEffect(() => {
        const storedName = localStorage.getItem('demo_operator_name');
        if (storedName) setOperatorName(storedName);
    }, []);

    const handleOperatorChange = (name: string) => {
        setOperatorName(name);
        localStorage.setItem('demo_operator_name', name);
    };

    // Stats for floating display
    const stats = selectedVenue ? getVenueStats(selectedVenue) : { current: 0, capacity: 0 };
    const usage = stats.capacity > 0 ? (stats.current / stats.capacity) * 100 : 0;

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

    // 参加者のチェックイン状態を取得
    const getCheckInStatus = (id: string) => {
        const logs = checkInLogs.filter(l => l.userId === id).sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return logs.length > 0 && logs[0].action === 'checkin';
    };

    // 検索結果
    const searchResults = searchQuery.length > 0
        ? participants.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10)
        : [];

    const handleAction = async (id: string) => {
        const method = 'manual';
        let actionRes;

        try {
            if (mode === 'checkin') {
                const res = await checkIn(id, selectedVenue, method, operatorName || "Staff");
                actionRes = res;

                if (res.success && res.participant) {
                    const p = res.participant;
                    const status = p.status || 'general';

                    // 既にチェックイン済みまたは再入場の場合は警告を表示
                    if (res.isAlreadyIn) {
                        setLastAction({ type: 'warning', msg: `⚠️ 既にチェックイン済みです`, p });
                    } else if (res.isReentry) {
                        setLastAction({ type: 'warning', msg: `🔄 再入場`, p });

                        // 再入場通知
                        if (settings.notifyReentry && (isVipStatus(status) || p.isVip)) {
                            const notifyResult = await notifyVipArrival(
                                p.name,
                                status,
                                p.organization,
                                p.lastNotifiedAt,
                                true // isReentry
                            );

                            addNotificationLog({
                                type: 'reentry',
                                targetName: p.name,
                                targetOrg: p.organization,
                                message: notifyResult.notified
                                    ? `再入場通知を送信しました`
                                    : `再入場通知スキップ: ${notifyResult.errors ? notifyResult.errors.map(e => e.message).join(', ') : 'Unknown reason'}`,
                                status: notifyResult.notified ? 'success' : 'failed',
                                error: notifyResult.errors ? notifyResult.errors.map(e => e.message).join(', ') : undefined
                            });

                            if (notifyResult.notified) {
                                updateParticipant(id, { lastNotifiedAt: new Date().toISOString() });
                            }
                        }
                    } else if (isVipStatus(status) || p.isVip) {
                        setLastAction({ type: 'vip', msg: `VIP ARRIVAL`, p });

                        // VIP通知送信
                        const notifyResult = await notifyVipArrival(
                            p.name,
                            status,
                            p.organization,
                            p.lastNotifiedAt
                        );

                        addNotificationLog({
                            type: 'vip_arrival',
                            targetName: p.name,
                            targetOrg: p.organization,
                            message: notifyResult.notified
                                ? `VIP到着通知を送信しました`
                                : `VIP通知スキップ: ${notifyResult.errors ? notifyResult.errors.map(e => e.message).join(', ') : 'Unknown reason'}`,
                            status: notifyResult.notified ? 'success' : 'failed',
                            error: notifyResult.errors ? notifyResult.errors.map(e => e.message).join(', ') : undefined
                        });

                        if (notifyResult.notified) {
                            updateParticipant(id, { lastNotifiedAt: new Date().toISOString() });
                        }
                    } else {
                        setLastAction({ type: 'success', msg: `CHECK-IN COMPLETE`, p });
                    }
                } else {
                    setLastAction({ type: 'error', msg: res.message });
                }
            } else {
                // チェックアウト
                const res = await checkOut(id, selectedVenue, method, operatorName || "Staff");
                actionRes = res;

                if (res.success && res.participant) {
                    setLastAction({ type: 'success', msg: `CHECK-OUT COMPLETE`, p: res.participant });
                } else {
                    setLastAction({ type: 'error', msg: res.message });
                }
            }

            if (actionRes?.success) {
                setInputID("");
                setSearchQuery("");
                setShowSearch(false);
            }
        } catch (error) {
            console.error("Scanner Error:", error);
            setLastAction({ type: 'error', msg: "SYSTEM ERROR" });
        }

        setTimeout(() => setLastAction(null), 3000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAction(inputID);
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Operator & Status Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Operator Name Input */}
                    <div className="flex items-center bg-white border-2 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all w-full md:w-auto">
                        <User className="w-4 h-4 mr-2 text-black" />
                        {isEditingOperator ? (
                            <input
                                autoFocus
                                className="bg-transparent text-sm font-bold focus:outline-none w-32"
                                value={operatorName}
                                onChange={(e) => handleOperatorChange(e.target.value)}
                                onBlur={() => setIsEditingOperator(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingOperator(false)}
                                placeholder="TYPE NAME"
                            />
                        ) : (
                            <span
                                className="text-sm font-bold cursor-pointer uppercase tracking-wider"
                                onClick={() => setIsEditingOperator(true)}
                            >
                                {operatorName || "OPERATOR SETTING"}
                            </span>
                        )}
                    </div>

                    <select
                        className="bg-white border-2 border-black text-sm font-bold px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all focus:outline-none cursor-pointer"
                        value={selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                    >
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        {venues.length === 0 && <option value="v1">Main Venue</option>}
                    </select>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Left Column: Scanner Area */}
                <div className="w-full lg:flex-1 space-y-8 relative">

                    {/* Notification Overlay */}
                    {lastAction && (
                        <div className="absolute top-24 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
                            <div className={`
                                border-4 bg-white p-6 w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-auto
                                ${lastAction.type === 'error' ? 'border-red-600' :
                                    lastAction.type === 'vip' ? 'border-yellow-500' :
                                        lastAction.type === 'warning' ? 'border-orange-500' :
                                            'border-green-600'}
                            `}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 border-2 border-black text-black ${lastAction.type === 'error' ? 'bg-red-100' :
                                        lastAction.type === 'vip' ? 'bg-yellow-100' :
                                            lastAction.type === 'warning' ? 'bg-orange-100' :
                                                'bg-green-100'
                                        }`}>
                                        {lastAction.type === 'vip' ? <Wine className="w-8 h-8" /> :
                                            lastAction.type === 'warning' ? <Check className="w-8 h-8" /> :
                                                lastAction.type === 'error' ? <LogOut className="w-8 h-8" /> :
                                                    <Check className="w-8 h-8" />}
                                    </div>
                                    <div>
                                        <h3 className={`font-black text-2xl uppercase tracking-tighter ${lastAction.type === 'error' ? 'text-red-600' :
                                            lastAction.type === 'vip' ? 'text-yellow-600' :
                                                lastAction.type === 'warning' ? 'text-orange-600' :
                                                    'text-green-600'
                                            }`}>{lastAction.msg}</h3>

                                        {lastAction.p && (
                                            <div className="mt-2 text-black">
                                                <p className="font-bold text-xl">{lastAction.p.name}</p>
                                                <p className="text-sm font-bold text-gray-500 uppercase">{lastAction.p.organization}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode Toggle */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setMode('checkin')}
                            className={`py-4 border-2 border-black font-black uppercase tracking-widest text-lg transition-all ${mode === 'checkin'
                                ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] translate-x-1 translate-y-1'
                                : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'
                                }`}
                        >
                            CHECK-IN
                        </button>
                        <button
                            onClick={() => setMode('checkout')}
                            className={`py-4 border-2 border-black font-black uppercase tracking-widest text-lg transition-all ${mode === 'checkout'
                                ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] translate-x-1 translate-y-1'
                                : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'
                                }`}
                        >
                            CHECK-OUT
                        </button>
                    </div>

                    {/* Main Input Box */}
                    <div className={`bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all ${mode === 'checkin' ? 'border-l-8 border-l-black' : 'border-r-8 border-r-black'}`}>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <div className="absolute top-0 left-0 text-xs font-bold uppercase tracking-widest text-gray-400">Scanner ID Input</div>
                                <Input
                                    value={inputID}
                                    onChange={(e) => setInputID(e.target.value)}
                                    className="w-full h-24 text-center text-5xl font-black border-2 border-gray-200 focus:border-black focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mt-4 font-mono uppercase bg-gray-50/50"
                                    placeholder="ID / QR"
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-black text-white font-black h-16 text-xl hover:bg-gray-900 hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                            >
                                EXECUTE {mode}
                            </button>
                        </form>
                    </div>

                    {/* Manual Search Toggle */}
                    <div>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="w-full py-4 border-2 border-dashed border-gray-300 text-gray-400 hover:text-black hover:border-black hover:bg-gray-50 transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <Search className="w-5 h-5" />
                            <span>Manual Search</span>
                        </button>

                        {showSearch && (
                            <div className="mt-4 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-2">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by Name or Organization..."
                                    className="bg-white border-2 border-black h-12 text-lg font-bold mb-4"
                                />

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {searchResults.map(p => {
                                        const statusInfo = STATUS_CONFIG[p.status || 'general'];
                                        const isCheckedIn = getCheckInStatus(p.id);

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => handleAction(p.id)}
                                                className={`p-3 border-2 cursor-pointer transition-all flex items-center justify-between group ${isCheckedIn
                                                    ? 'bg-green-50 border-green-500 hover:bg-green-100'
                                                    : 'bg-white border-gray-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 flex items-center justify-center border-2 border-black font-bold text-xs ${isCheckedIn ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm">{p.name}</div>
                                                        <div className="text-xs text-gray-500 font-bold uppercase">{p.organization}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {p.hasAfterParty && <Wine className="w-4 h-4 text-purple-600" />}
                                                    <span className={`px-2 py-0.5 border ${statusInfo.borderColor} ${statusInfo.bgColor} ${statusInfo.textColor} text-[10px] font-bold uppercase`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {searchQuery && searchResults.length === 0 && (
                                        <p className="text-gray-400 text-center py-4 font-bold">No participants found</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Stats Panel */}
                <div className="w-full lg:w-80 space-y-6">
                    {/* Live Stats Card */}
                    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            Live Status
                        </h3>

                        <div className="text-center py-6">
                            <div className="text-6xl font-black text-black tracking-tighter mb-2">
                                {getCurrentAttendance()}
                            </div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Current Attendance
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t-2 border-gray-100">
                            <div className="flex justify-between text-xs font-bold uppercase mb-1">
                                <span>Occupancy</span>
                                <span>{Math.round(usage)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 border border-black">
                                <div className="h-full bg-black transition-all duration-1000" style={{ width: `${usage}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
                            Recent Activity
                        </h3>
                        <div className="space-y-4">
                            {[...checkInLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map((log, i) => (
                                <div key={i} className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0">
                                    <div className={`mt-1 w-2 h-2 rounded-none border border-black ${log.action === 'checkin' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <p className="text-xs font-bold text-black">{log.name}</p>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase">
                                            {log.action === 'checkin' ? 'IN' : 'OUT'} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
