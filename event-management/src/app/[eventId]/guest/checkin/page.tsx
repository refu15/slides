"use client";

import { useState } from "react";
import { useDemo, Participant, ParticipantStatus } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, User, AlertCircle, Wifi, LogOut, Coffee, LogIn, ArrowLeft } from "lucide-react";

export default function GuestCheckInPage() {
    const { findParticipants, checkIn, checkOut, checkInLogs, settings, venues } = useDemo();

    // Steps: menu -> search -> select -> confirm -> result
    const [step, setStep] = useState<'menu' | 'search' | 'email_search' | 'select' | 'confirm' | 'result'>('menu');
    const [mode, setMode] = useState<'checkin' | 'checkout' | 'temporary_exit' | null>(null);

    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [candidates, setCandidates] = useState<Participant[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const [resultData, setResultData] = useState<{
        success: boolean;
        message: string;
        isReentry?: boolean;
        isAlreadyIn?: boolean;
    } | null>(null);

    // Initial Mode Selection
    const handleModeSelect = (m: 'checkin' | 'checkout' | 'temporary_exit') => {
        setMode(m);
        setStep('search');
        setErrorMsg("");
    };

    const handleSearch = () => {
        if (!searchName.trim()) return;

        // 名前で検索
        const results = findParticipants(searchName, "");

        if (results.length === 0) {
            setErrorMsg("参加者が見つかりませんでした。恐れ入りますが、受付スタッフにお声がけください。メールアドレス検索もお試しいただけます。");
            return;
        }

        setErrorMsg("");
        setCandidates(results);
        // 結果が多すぎる場合のフラグ
        if (results.length >= 10) {
            setErrorMsg("候補が多いため、もう少し詳しく入力いただくか、メールアドレス検索をお試しください。");
        }
        setStep('select');
    };

    const handleEmailSearch = () => {
        if (!searchEmail.trim()) return;

        // メールで検索
        const results = findParticipants("", "", searchEmail);

        if (results.length === 0) {
            setErrorMsg("参加者が見つかりませんでした。別のメールアドレスをお試しください。");
            return;
        }

        setErrorMsg("");
        setCandidates(results);
        setStep('select');
    };

    const handleSelect = (p: Participant) => {
        setSelectedParticipant(p);
        setStep('confirm');
    };

    const handleExecute = async () => {
        if (!selectedParticipant || !mode) return;

        const venueId = venues[0]?.id || "v1";
        let res;

        if (mode === 'checkin') {
            res = await checkIn(selectedParticipant.id, venueId, 'self');
        } else {
            res = await checkOut(selectedParticipant.id, venueId, 'self', '', mode);
        }

        if (res.success || (mode === 'checkin' && (res.isAlreadyIn || res.isReentry))) {
            setResultData({
                success: true,
                message: res.message,
                isReentry: res.isReentry,
                isAlreadyIn: res.isAlreadyIn
            });
            setStep('result');
        } else {
            setErrorMsg(res.message);
        }
    };

    const handleReset = () => {
        setSearchName("");
        setSearchEmail("");
        setCandidates([]);
        setSelectedParticipant(null);
        setErrorMsg("");
        setStep('menu');
        setMode(null);
        setResultData(null);
    };

    const getModeLabel = () => {
        switch (mode) {
            case 'checkin': return 'チェックイン（入場）';
            case 'checkout': return '完全退場';
            case 'temporary_exit': return '一時退出';
            default: return '';
        }
    };

    const getModeColor = () => {
        switch (mode) {
            case 'checkin': return 'bg-red-600 border-red-600 text-white';
            case 'checkout': return 'bg-gray-800 border-gray-800 text-white';
            case 'temporary_exit': return 'bg-blue-600 border-blue-600 text-white';
            default: return 'bg-black text-white';
        }
    };

    return (
        <div className="space-y-6">
            {/* Step 0: Menu */}
            {step === 'menu' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">MENU</h2>
                        <p className="text-gray-500 font-bold">ご希望の操作を選択してください</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <Button
                            onClick={() => handleModeSelect('checkin')}
                            className="w-full h-24 bg-red-600 text-white font-bold text-xl uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-black transition-all flex flex-col gap-1"
                        >
                            <div className="flex items-center gap-2"><LogIn className="w-8 h-8" /> チェックイン (入場)</div>
                            <span className="text-xs font-normal opacity-80">初めての方 / 再入場の方</span>
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={() => handleModeSelect('temporary_exit')}
                                className="w-full h-20 bg-blue-600 text-white font-bold text-lg rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-black transition-all flex flex-col gap-1"
                            >
                                <div className="flex items-center gap-2"><Coffee className="w-6 h-6" /> 一時退出</div>
                                <span className="text-xs font-normal opacity-80">再入場予定の方</span>
                            </Button>

                            <Button
                                onClick={() => handleModeSelect('checkout')}
                                className="w-full h-20 bg-gray-600 text-white font-bold text-lg rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-black transition-all flex flex-col gap-1"
                            >
                                <div className="flex items-center gap-2"><LogOut className="w-6 h-6" /> 完全退場</div>
                                <span className="text-xs font-normal opacity-80">お帰りの方</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header for steps after menu */}
            {step !== 'menu' && step !== 'result' && mode && (
                <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className="text-gray-500 hover:text-black -ml-2">
                        <ArrowLeft className="w-4 h-4 mr-1" /> メニューへ戻る
                    </Button>
                    <div className={`px-3 py-1 text-xs font-bold rounded-full ${mode === 'checkin' ? 'bg-red-100 text-red-600' :
                            mode === 'temporary_exit' ? 'bg-blue-100 text-blue-600' :
                                'bg-gray-100 text-gray-600'
                        }`}>
                        {getModeLabel()}
                    </div>
                </div>
            )}

            {/* Step 1: Search */}
            {step === 'search' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">
                            {mode === 'checkin' ? 'ようこそ！' : mode === 'temporary_exit' ? '一時退出' : '完全退場'}
                        </h2>
                        <p className="text-gray-600">お名前を入力してください。</p>
                    </div>
                    <div className="space-y-2">
                        <Input
                            placeholder="例: 山田 太郎 / yamada"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-12 text-lg text-center border-2 border-black rounded-none shadow-sm"
                            autoFocus
                        />
                        {errorMsg && <p className="text-red-500 text-sm font-bold text-center animate-pulse"><AlertCircle className="w-4 h-4 inline mr-1" />{errorMsg}</p>}
                    </div>
                    <Button onClick={handleSearch} className={`w-full h-12 font-bold uppercase tracking-widest rounded-none transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:opacity-80 ${getModeColor()}`}>
                        <Search className="w-5 h-5 mr-2" /> 検索
                    </Button>

                    <div className="text-center pt-2">
                        <span className="text-gray-500 text-sm">見つからない場合: </span>
                        <Button variant="link" onClick={() => { setErrorMsg(""); setStep('email_search'); }} className="text-gray-500 underline">
                            メールアドレスで検索
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 1.5: Email Search */}
            {step === 'email_search' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">メール検索</h2>
                        <p className="text-gray-600">登録メールアドレスを入力してください。</p>
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="例: user@example.com"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEmailSearch()}
                            className="h-12 text-lg text-center border-2 border-black rounded-none shadow-sm"
                            autoFocus
                        />
                        {errorMsg && <p className="text-red-500 text-sm font-bold text-center animate-pulse"><AlertCircle className="w-4 h-4 inline mr-1" />{errorMsg}</p>}
                    </div>
                    <Button onClick={handleEmailSearch} className={`w-full h-12 font-bold uppercase tracking-widest rounded-none transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:opacity-80 ${getModeColor()}`}>
                        <Search className="w-5 h-5 mr-2" /> メールで検索
                    </Button>
                    <Button onClick={() => { setErrorMsg(""); setStep('search'); }} variant="ghost" className="w-full">
                        名前検索に戻る
                    </Button>
                </div>
            )}

            {/* Step 2: Select Candidate */}
            {step === 'select' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold">該当者を選択</h2>
                        <p className="text-gray-600">あなたのアカウントを選択してください。</p>
                    </div>

                    {errorMsg && (
                        <div className="bg-yellow-50 border-2 border-yellow-400 p-3 text-sm text-yellow-800 text-center font-medium">
                            <AlertCircle className="w-4 h-4 inline mr-1" />{errorMsg}
                        </div>
                    )}
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {candidates.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleSelect(p)}
                                className="w-full text-left p-4 border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-all group relative"
                            >
                                <div className="font-bold text-lg group-hover:text-red-600">{p.name}</div>
                                <div className="text-sm text-gray-500">{p.organization || "所属なし"}</div>
                                <div className="text-xs text-xs text-gray-400 mt-1 font-mono">{p.ticketType === 'online' ? 'オンライン' : p.ticketType === 'archive' ? 'アーカイブ' : '来場チケット'}</div>
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-100 border-2 border-gray-300 p-3 text-sm text-gray-600 text-center">
                        お名前が見つからない場合は、<span className="font-bold text-black">受付スタッフ</span>にお声がけください。
                    </div>

                    <Button onClick={() => setStep('search')} variant="outline" className="w-full mt-4 border-2 border-black rounded-none">
                        戻る
                    </Button>
                </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && selectedParticipant && (
                <div className="space-y-6 animate-in zoom-in duration-300">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 border-2 border-black">
                            <User className="w-10 h-10 text-gray-500" />
                        </div>
                        <h2 className="text-2xl font-black mb-1">{selectedParticipant.name} 様</h2>
                        <p className="text-gray-500 font-bold">{selectedParticipant.organization}</p>
                    </div>

                    <div className={`p-4 border-2 text-sm text-center font-bold ${mode === 'checkin' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                            mode === 'temporary_exit' ? 'bg-blue-50 border-blue-400 text-blue-800' :
                                'bg-gray-100 border-gray-400 text-gray-800'
                        }`}>
                        {mode === 'checkin' ? 'チェックインを実行しますか？' :
                            mode === 'temporary_exit' ? '一時退出を記録しますか？' :
                                '完全退場を記録しますか？'}
                    </div>

                    <div className="space-y-3">
                        <Button onClick={handleExecute} className={`w-full h-14 text-white font-bold text-xl uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:opacity-90 transition-all ${getModeColor()}`}>
                            {getModeLabel()}
                        </Button>
                        <Button onClick={() => setStep('select')} variant="ghost" className="w-full">
                            戻る
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && selectedParticipant && resultData && (
                <div className="space-y-8 animate-in zoom-in duration-500 text-center py-8">
                    {/* Icon */}
                    <div className={`w-24 h-24 mx-auto border-4 rounded-full flex items-center justify-center mb-6 animate-bounce ${mode === 'temporary_exit' ? 'bg-blue-100 border-blue-500' :
                            mode === 'checkout' ? 'bg-gray-100 border-gray-500' :
                                resultData.isReentry ? 'bg-blue-100 border-blue-500' :
                                    resultData.isAlreadyIn ? 'bg-yellow-100 border-yellow-500' :
                                        'bg-green-100 border-green-500'
                        }`}>
                        {mode === 'temporary_exit' ? <Coffee className="w-12 h-12 text-blue-600" /> :
                            mode === 'checkout' ? <LogOut className="w-12 h-12 text-gray-600" /> :
                                <CheckCircle className={`w-12 h-12 ${resultData.isReentry ? 'text-blue-600' :
                                        resultData.isAlreadyIn ? 'text-yellow-600' :
                                            'text-green-600'
                                    }`} />}
                    </div>

                    {/* Message */}
                    <div>
                        <h2 className="text-3xl font-black text-black mb-2">
                            {mode === 'temporary_exit' ? 'いってらっしゃいませ' :
                                mode === 'checkout' ? 'ありがとうございました' :
                                    resultData.isReentry ? 'おかえりなさい！' :
                                        resultData.isAlreadyIn ? 'チェックイン済み' :
                                            'Welcome!'}
                        </h2>
                        <p className="text-gray-600 text-lg">
                            {mode === 'temporary_exit' ? '一時退出を記録しました。' :
                                mode === 'checkout' ? '退場を記録しました。' :
                                    resultData.isReentry ? '再入場を記録しました。' :
                                        resultData.isAlreadyIn ? 'すでにチェックインされています。' :
                                            'チェックインが完了しました。'}
                        </p>
                    </div>

                    {/* Wifi Info (Only show on checkin) */}
                    {mode === 'checkin' &&
                        (settings.wifiSSID || settings.wifiPassword || settings.wifiNote) && (
                            <div className="bg-neutral-100 p-4 border-2 border-black text-left space-y-2">
                                <div className="flex items-center justify-center gap-2 mb-2 text-gray-500 font-bold uppercase tracking-widest text-sm">
                                    <Wifi className="w-4 h-4" /> 会場WiFi
                                </div>
                                {settings.wifiSSID && (
                                    <p className="font-bold flex justify-between"><span>SSID:</span> <span>{settings.wifiSSID}</span></p>
                                )}
                                {settings.wifiPassword && (
                                    <p className="font-bold flex justify-between"><span>Password:</span> <span>{settings.wifiPassword}</span></p>
                                )}
                                {settings.wifiNote && (
                                    <div className="mt-2 text-sm text-gray-500 whitespace-pre-wrap border-t border-gray-200 pt-2">
                                        {settings.wifiNote}
                                    </div>
                                )}
                            </div>
                        )}

                    <Button onClick={handleReset} variant="outline" className="w-full border-2 border-black rounded-none hover:bg-black hover:text-white transition-colors">
                        メニューへ戻る
                    </Button>
                </div>
            )}
        </div>
    );
}
