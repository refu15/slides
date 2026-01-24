"use client";

import { useDemo, Participant, ParticipantStatus } from "@/lib/demo-context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Download, Trash2, Check, Users, Wine, Ticket, Settings as SettingsIcon, X, Save, Trash, PlusCircle, Eye } from "lucide-react";

export default function ParticipantsPage() {
    const { participants, checkInLogs, addParticipant, deleteParticipant, updateParticipant, settings, categories, addCategory, updateCategory, deleteCategory, bulkDeleteParticipants } = useDemo();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("すべて");
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Add New State
    const [isAdding, setIsAdding] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [visibleColumns, setVisibleColumns] = useState({
        email: false,
        phone: false,
        notes: false,
        internalNote: false,
    });
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [newP, setNewP] = useState({
        name: "",
        organization: "",
        email: "",
        phone: "",
        status: "general" as ParticipantStatus,
        hasAfterParty: false
    });

    const getStatus = (id: string) => {
        const logs = checkInLogs.filter(l => l.userId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return logs.length > 0 && logs[0].action === 'checkin';
    };

    // 現在会場内人数
    const getCurrentAttendance = () => {
        const statusMap = new Map<string, boolean>();
        checkInLogs
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .forEach(log => {
                statusMap.set(log.userId, log.action === 'checkin');
            });
        return Array.from(statusMap.values()).filter(v => v).length;
    };

    const handleExport = () => {
        // チェックイン/アウト時刻を取得するヘルパー
        const getCheckInTime = (userId: string) => {
            const log = checkInLogs
                .filter(l => l.userId === userId && l.action === 'checkin')
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
            return log ? new Date(log.timestamp).toLocaleString('ja-JP') : '';
        };

        const getCheckOutTime = (userId: string) => {
            const log = checkInLogs
                .filter(l => l.userId === userId && l.action === 'checkout')
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            return log ? new Date(log.timestamp).toLocaleString('ja-JP') : '';
        };

        const headers = [
            "ID", "名前", "所属", "ステータス", "流入元", "チケット", "懇親会",
            "Email", "電話番号", "チェックイン", "チェックイン時刻", "チェックアウト時刻",
            "複数チケット", "確認済み"
        ];
        const rows = participants.map(p => {
            const cat = categories.find(c => c.id === p.status) || categories.find(c => c.name === p.status);
            return [
                p.id, p.name, p.organization,
                cat ? cat.name : (p.status || p.category),
                p.source || '',
                p.ticketType || '',
                p.hasAfterParty ? '○' : '',
                p.email, p.phone,
                getStatus(p.id) ? "済" : "",
                getCheckInTime(p.id),
                getCheckOutTime(p.id),
                p.hasMultipleTickets ? '○' : '',
                p.multiTicketConfirmed ? '○' : ''
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "participants_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveNew = () => {
        if (!newP.name) return;
        const id = "P" + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        addParticipant({
            id,
            name: newP.name,
            organization: newP.organization,
            email: newP.email,
            phone: newP.phone,
            furigana: "",
            category: 'deprecated',
            isVip: false, // will be calc from status if needed
            registeredAt: new Date().toISOString(),
            status: newP.status,

            ticketType: 'attendance',
            hasAfterParty: newP.hasAfterParty,
            hasMultipleTickets: false,
            confirmationStatus: 'unconfirmed',
            paymentStatus: 'paid',
            source: 'other',  // 手動追加
        } as Participant);
        setIsAdding(false);
        setNewP({ name: "", organization: "", email: "", phone: "", status: "general", hasAfterParty: false });
    };

    const handleDelete = (id: string) => {
        if (confirm("本当にこの参加者を削除してもよろしいですか？")) {
            deleteParticipant(id);
        }
    };

    // Bulk selection handlers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredParticipants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredParticipants.map(p => p.id)));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (bulkDeleteParticipants) {
            bulkDeleteParticipants(Array.from(selectedIds));
        } else {
            // Fallback if bulkDeleteParticipants not available
            selectedIds.forEach(id => deleteParticipant(id));
        }
        setSelectedIds(new Set());
        setIsBulkDeleteModalOpen(false);
    };

    const filteredParticipants = participants.filter(p => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.organization.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesCategory = true;

        // Find category object for this participant
        const pCat = categories.find(c => c.id === p.status) || categories.find(c => c.name === p.status);
        const isVip = pCat?.isVip || false;

        if (filterCategory === 'すべて') matchesCategory = true;
        else if (filterCategory === 'チェックイン済') matchesCategory = getStatus(p.id) === true;
        else if (filterCategory === '未チェックイン') matchesCategory = getStatus(p.id) === false;
        else if (filterCategory === '懇親会') matchesCategory = p.hasAfterParty === true;
        else if (filterCategory === 'VIP') matchesCategory = isVip;
        else if (filterCategory === '未決済') matchesCategory = p.paymentStatus === 'unpaid';
        else if (filterCategory === '複数チケット') matchesCategory = p.hasMultipleTickets === true;
        else matchesCategory = pCat?.name === filterCategory || p.status === filterCategory;

        return matchesSearch && matchesCategory;
    });

    const filterOptions = Array.from(new Set([
        'すべて',
        'VIP',
        ...(settings.enableAfterParty ? ['懇親会'] : []),
        'チェックイン済', '未チェックイン', '未決済', '複数チケット',
        ...categories.map(c => c.name)
    ]));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Bar */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold">
                    <Users className="w-4 h-4" />
                    全参加者: {participants.length}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold">
                    <Check className="w-4 h-4" />
                    会場内: {getCurrentAttendance()}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold">
                    VIP: {participants.filter(p => {
                        const cat = categories.find(c => c.id === p.status) || categories.find(c => c.name === p.status);
                        return cat?.isVip;
                    }).length}
                </div>
                {settings.enableAfterParty && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold">
                        <Wine className="w-4 h-4" />
                        懇親会: {participants.filter(p => p.hasAfterParty).length}
                    </div>
                )}
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-black pb-6 mb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">
                        参加者一覧
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">全参加者の管理・ステータス</p>
                </div>
                <div className="flex gap-4">
                    <Button onClick={() => setIsCategoryModalOpen(true)} variant="outline" className="h-12 px-4 border-2 border-black text-black font-bold uppercase tracking-widest rounded-none hover:bg-gray-100">
                        <SettingsIcon className="w-5 h-5 mr-2" /> カテゴリ設定
                    </Button>
                    <Button onClick={handleExport} variant="outline" className="h-12 px-6 border-2 border-black text-black font-bold uppercase tracking-widest rounded-none hover:bg-gray-100">
                        <Download className="w-5 h-5 mr-2" /> CSV出力
                    </Button>
                    <div className="relative">
                        <Button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} variant="outline" className="h-12 px-4 border-2 border-black text-black font-bold uppercase tracking-widest rounded-none hover:bg-gray-100">
                            <Eye className="w-5 h-5 mr-2" /> 表示項目
                        </Button>
                        {isColumnMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsColumnMenuOpen(false)}></div>
                                <div className="absolute top-14 right-0 bg-white border-2 border-black p-4 w-60 z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <h4 className="font-bold mb-3 uppercase text-sm border-b pb-2">表示列の切替</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                                            <input type="checkbox" checked={visibleColumns.email} onChange={() => setVisibleColumns(prev => ({ ...prev, email: !prev.email }))} className="w-4 h-4 accent-black" />
                                            <span className="text-sm font-bold">Email</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                                            <input type="checkbox" checked={visibleColumns.phone} onChange={() => setVisibleColumns(prev => ({ ...prev, phone: !prev.phone }))} className="w-4 h-4 accent-black" />
                                            <span className="text-sm font-bold">電話番号</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                                            <input type="checkbox" checked={visibleColumns.notes} onChange={() => setVisibleColumns(prev => ({ ...prev, notes: !prev.notes }))} className="w-4 h-4 accent-black" />
                                            <span className="text-sm font-bold">備考 (Notes)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                                            <input type="checkbox" checked={visibleColumns.internalNote} onChange={() => setVisibleColumns(prev => ({ ...prev, internalNote: !prev.internalNote }))} className="w-4 h-4 accent-black" />
                                            <span className="text-sm font-bold">内部メモ</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <Button onClick={() => setIsAdding(!isAdding)} className="h-12 px-8 bg-red-600 hover:bg-black text-white font-bold uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                        <Plus className="w-5 h-5 mr-2" /> {isAdding ? "閉じる" : "新規登録"}
                    </Button>
                </div>
            </div>

            {/* Category Management Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold uppercase">カテゴリ管理</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)}><X className="w-6 h-6" /></button>
                        </div>

                        <div className="space-y-4">
                            {categories.map((cat, idx) => (
                                <div key={cat.id} className="flex gap-2 items-center border-b pb-2">
                                    <Input
                                        value={cat.name}
                                        onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                                        className="font-bold w-40"
                                        placeholder="カテゴリ名"
                                    />
                                    <Input
                                        value={cat.color}
                                        onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                                        className="w-60 text-xs font-mono"
                                        placeholder="Color Class (e.g. bg-red-100)"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={cat.isVip}
                                            onChange={(e) => updateCategory(cat.id, { isVip: e.target.checked })}
                                            className="w-4 h-4 accent-red-600"
                                        />
                                        <span className="text-sm font-bold">VIP</span>
                                    </label>
                                    <Button
                                        onClick={() => deleteCategory(cat.id)}
                                        disabled={categories.length <= 1}
                                        className="ml-auto"
                                        variant="ghost"
                                        size="sm"
                                    >
                                        <Trash className="w-4 h-4 text-gray-400 hover:text-red-600" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t">
                            <Button
                                onClick={() => addCategory({
                                    id: `cat_${Date.now()}`,
                                    name: "新規カテゴリ",
                                    color: "bg-gray-100 text-gray-600",
                                    isVip: false
                                })}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-black border-2 border-dashed border-gray-300"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" /> カテゴリを追加
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Form */}
            {isAdding && (
                <div className="bg-neutral-100 p-6 border-2 border-black animate-in slide-in-from-top">
                    <h3 className="font-bold uppercase mb-4 text-lg">新規参加者</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <Input placeholder="名前 *" value={newP.name} onChange={e => setNewP({ ...newP, name: e.target.value })} className="bg-white rounded-none border-gray-300" />
                        <Input placeholder="組織・会社名" value={newP.organization} onChange={e => setNewP({ ...newP, organization: e.target.value })} className="bg-white rounded-none border-gray-300" />
                        <Input placeholder="メールアドレス" value={newP.email} onChange={e => setNewP({ ...newP, email: e.target.value })} className="bg-white rounded-none border-gray-300" />
                        <select
                            className="flex h-10 w-full border border-gray-300 bg-white px-3 py-2 text-sm rounded-none"
                            value={newP.status}
                            onChange={e => setNewP({ ...newP, status: e.target.value as ParticipantStatus })}
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {settings.enableAfterParty ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="afterParty"
                                    checked={newP.hasAfterParty}
                                    onChange={e => setNewP({ ...newP, hasAfterParty: e.target.checked })}
                                    className="w-5 h-5 accent-red-600"
                                />
                                <label htmlFor="afterParty" className="text-sm font-bold">懇親会</label>
                            </div>
                        ) : (
                            <div></div> // Spacer
                        )}
                        <Button onClick={handleSaveNew} className="bg-black text-white hover:bg-red-600 rounded-none font-bold uppercase">保存</Button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {filterOptions.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`h-10 px-6 font-bold uppercase tracking-wider text-sm transition-all border-2 border-black ${filterCategory === cat ? 'bg-red-600 text-white border-red-600' : 'bg-white text-black hover:bg-gray-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="名前・会社名・IDで検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-4 pr-12 h-12 text-lg bg-white border-2 border-gray-200 focus:border-black rounded-none transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    {filteredParticipants.length} 名が見つかりました
                </div>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-red-600">
                            {selectedIds.size}名選択中
                        </span>
                        <Button
                            onClick={() => setIsBulkDeleteModalOpen(true)}
                            className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-sm rounded-none"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            一括削除
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="border-2 border-black overflow-hidden bg-white shadow-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-black text-white">
                            <th className="p-4 text-center">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 accent-red-600 cursor-pointer"
                                />
                            </th>
                            <th className="p-4 text-sm font-bold uppercase tracking-widest">ID</th>
                            <th className="p-4 text-sm font-bold uppercase tracking-widest">名前 / 所属</th>
                            <th className="p-4 text-sm font-bold uppercase tracking-widest">ステータス</th>
                            {visibleColumns.email && <th className="p-4 text-sm font-bold uppercase tracking-widest">Email</th>}
                            {visibleColumns.phone && <th className="p-4 text-sm font-bold uppercase tracking-widest">電話番号</th>}
                            {visibleColumns.notes && <th className="p-4 text-sm font-bold uppercase tracking-widest">備考</th>}
                            {visibleColumns.internalNote && <th className="p-4 text-sm font-bold uppercase tracking-widest">内部メモ</th>}
                            {settings.enableAfterParty && (
                                <th className="p-4 text-sm font-bold uppercase tracking-widest text-center">懇親会</th>
                            )}
                            <th className="p-4 text-sm font-bold uppercase tracking-widest text-center">チェックイン</th>
                            <th className="p-4 text-sm font-bold uppercase tracking-widest text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredParticipants.length === 0 ? (
                            <tr>
                                <td colSpan={6 + (settings.enableAfterParty ? 1 : 0) + Object.values(visibleColumns).filter(Boolean).length} className="p-12 text-center text-gray-400 text-xl font-bold uppercase">参加者が見つかりません</td>
                            </tr>
                        ) : (
                            filteredParticipants.map((p) => {
                                const cat = categories.find(c => c.id === p.status) || categories.find(c => c.name === p.status);
                                const colorClass = cat ? cat.color : 'bg-gray-100 text-gray-600';
                                const label = cat ? cat.name : (p.status || p.category);

                                return (
                                    <tr key={p.id} className={`group hover:bg-neutral-50 transition-colors ${selectedIds.has(p.id) ? 'bg-red-50' : ''}`}>
                                        <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(p.id)}
                                                onChange={() => toggleSelect(p.id)}
                                                className="w-5 h-5 accent-red-600 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-400 group-hover:text-black hover:underline cursor-pointer" onClick={() => setEditingParticipant(p)}>{p.id}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-lg text-black cursor-pointer hover:underline" onClick={() => setEditingParticipant(p)}>{p.name}</div>
                                            <div className="text-sm text-gray-500">{p.organization}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider ${colorClass}`}>
                                                {label}
                                            </span>
                                            {p.hasMultipleTickets && (
                                                <span className="inline-flex items-center ml-2 px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-700">
                                                    <Ticket className="w-3 h-3 inline mr-1" />複数
                                                    <label className="ml-2 inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={p.multiTicketConfirmed || false}
                                                            onChange={(e) => updateParticipant(p.id, { multiTicketConfirmed: e.target.checked })}
                                                            className="w-3 h-3 accent-green-600"
                                                        />
                                                        <span className={`ml-1 ${p.multiTicketConfirmed ? 'text-green-600' : 'text-yellow-700'}`}>
                                                            {p.multiTicketConfirmed ? '✓確認済' : '要確認'}
                                                        </span>
                                                    </label>
                                                </span>
                                            )}
                                            {p.paymentStatus === 'unpaid' && (
                                                <span className="inline-block ml-2 px-2 py-1 text-xs font-bold bg-red-100 text-red-600">
                                                    未決済
                                                </span>
                                            )}
                                        </td>
                                        {visibleColumns.email && <td className="p-4 text-sm">{p.email}</td>}
                                        {visibleColumns.phone && <td className="p-4 text-sm">{p.phone}</td>}
                                        {visibleColumns.notes && <td className="p-4 text-sm max-w-xs truncate" title={p.notes || ""}>{p.notes}</td>}
                                        {visibleColumns.internalNote && <td className="p-4 text-sm max-w-xs truncate" title={p.multiTicketNote || ""}>{p.multiTicketNote}</td>}
                                        {settings.enableAfterParty && (
                                            <td className="p-4 text-center">
                                                {p.hasAfterParty ? (
                                                    <span className="inline-flex items-center gap-1 text-purple-600 font-bold">
                                                        <Wine className="w-4 h-4" /> ○
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="p-4 text-center">
                                            {getStatus(p.id) ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                                                    <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
                                                    済
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center flex gap-2 justify-center">
                                            <Button onClick={() => setEditingParticipant(p)} size="sm" variant="outline" className="h-8 text-xs font-bold border-black text-black hover:bg-gray-100 rounded-none">
                                                編集
                                            </Button>
                                            <Button onClick={() => handleDelete(p.id)} size="sm" variant="ghost" className="h-8 hover:text-red-600 text-gray-400 hover:bg-red-50 rounded-none">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-right text-gray-400 text-sm font-mono uppercase">
                総件数: {participants.length} // 表示中: {filteredParticipants.length}
            </div>

            {/* Edit Participant Modal */}
            {editingParticipant && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter">参加者詳細編集</h3>
                                <p className="text-gray-500 font-bold text-sm mt-1">ID: {editingParticipant.id}</p>
                            </div>
                            <button onClick={() => setEditingParticipant(null)} className="hover:bg-gray-100 p-2"><X className="w-8 h-8" /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">氏名</label>
                                    <Input
                                        value={editingParticipant.name}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, name: e.target.value })}
                                        className="h-12 text-lg font-bold border-2 border-black rounded-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">フリガナ</label>
                                    <Input
                                        value={editingParticipant.furigana || ""}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, furigana: e.target.value })}
                                        className="border-2 border-gray-300 rounded-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">所属 / 組織</label>
                                    <Input
                                        value={editingParticipant.organization}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, organization: e.target.value })}
                                        className="border-2 border-gray-300 rounded-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">Email</label>
                                    <Input
                                        value={editingParticipant.email}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, email: e.target.value })}
                                        className="border-2 border-gray-300 rounded-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">電話番号</label>
                                    <Input
                                        value={editingParticipant.phone}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, phone: e.target.value })}
                                        className="border-2 border-gray-300 rounded-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">ステータス (カテゴリ)</label>
                                    <select
                                        className="w-full h-12 border-2 border-black rounded-none px-3 font-bold bg-white"
                                        value={editingParticipant.status}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, status: e.target.value as ParticipantStatus })}
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold uppercase mb-1">チケット種別</label>
                                        <select
                                            className="w-full h-10 border-2 border-gray-300 rounded-none px-3 bg-white"
                                            value={editingParticipant.ticketType}
                                            onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, ticketType: e.target.value as any })}
                                        >
                                            <option value="attendance">来場</option>
                                            <option value="online">オンライン</option>
                                            <option value="archive">アーカイブ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold uppercase mb-1">決済ステータス</label>
                                        <select
                                            className="w-full h-10 border-2 border-gray-300 rounded-none px-3 bg-white"
                                            value={editingParticipant.paymentStatus}
                                            onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, paymentStatus: e.target.value as any })}
                                        >
                                            <option value="paid">支払済</option>
                                            <option value="unpaid">未払</option>
                                            <option value="pending">保留</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="border-2 border-gray-200 p-4 space-y-2 bg-neutral-50">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingParticipant.hasAfterParty}
                                            onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, hasAfterParty: e.target.checked })}
                                            className="w-5 h-5 accent-purple-600"
                                        />
                                        <span className="font-bold">懇親会参加</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingParticipant.hasMultipleTickets}
                                            onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, hasMultipleTickets: e.target.checked })}
                                            className="w-5 h-5 accent-yellow-600"
                                        />
                                        <span className="font-bold">複数チケット保有</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingParticipant.multiTicketConfirmed || false}
                                            onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, multiTicketConfirmed: e.target.checked })}
                                            className="w-5 h-5 accent-green-600"
                                        />
                                        <span className="font-bold">譲渡確認済み</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">備考 (インポート/汎用)</label>
                                    <textarea
                                        className="w-full border-2 border-gray-300 rounded-none p-3 h-24"
                                        placeholder="インポートデータからの備考など"
                                        value={editingParticipant.notes || ""}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, notes: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-1">内部メモ</label>
                                    <textarea
                                        className="w-full border-2 border-gray-300 rounded-none p-3 h-24"
                                        placeholder="特記事項（運営共有用）"
                                        value={editingParticipant.multiTicketNote || ""}
                                        onChange={e => editingParticipant && setEditingParticipant({ ...editingParticipant, multiTicketNote: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-4 border-t-4 border-black pt-6">
                            <Button
                                onClick={() => setEditingParticipant(null)}
                                variant="outline"
                                className="h-12 px-8 border-2 border-black text-black font-bold uppercase rounded-none hover:bg-gray-100"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={() => {
                                    if (editingParticipant) {
                                        updateParticipant(editingParticipant.id, editingParticipant);
                                        setEditingParticipant(null);
                                    }
                                }}
                                className="h-12 px-8 bg-black hover:bg-red-600 text-white font-bold uppercase rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                            >
                                <Save className="w-5 h-5 mr-2" /> 変更を保存
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-8 max-w-md w-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-center mb-6">
                            <Trash2 className="w-16 h-16 mx-auto text-red-600 mb-4" />
                            <h3 className="text-2xl font-black uppercase">一括削除の確認</h3>
                        </div>

                        <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 text-center">
                            <p className="text-lg font-bold text-red-600">
                                {selectedIds.size}名の参加者を削除しますか？
                            </p>
                            <p className="text-sm text-red-500 mt-2">
                                この操作は取り消せません。
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => setIsBulkDeleteModalOpen(false)}
                                variant="outline"
                                className="flex-1 h-12 border-2 border-black font-bold uppercase rounded-none"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleBulkDelete}
                                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                            >
                                削除する
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
