"use client";

import { useState } from "react";
import { useDemo, Participant } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, User, AlertCircle, Wifi } from "lucide-react";

export default function GuestCheckInPage() {
    const { findParticipants, checkIn, settings, venues, participants } = useDemo();
    const [step, setStep] = useState<'search' | 'email_search' | 'select' | 'confirm' | 'result'>('search');
    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [candidates, setCandidates] = useState<Participant[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [checkInResult, setCheckInResult] = useState<{ isReentry: boolean; isAlreadyIn: boolean } | null>(null);

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

    const handleCheckIn = async () => {
        if (!selectedParticipant) return;

        // すでにチェックイン済みか確認
        const venueId = venues[0]?.id || "v1"; // venuesから取得
        const result = await checkIn(selectedParticipant.id, venueId, 'self');

        if (result.success || result.isAlreadyIn || result.isReentry) {
            setCheckInResult({ isReentry: !!result.isReentry, isAlreadyIn: !!result.isAlreadyIn });
            setStep('result');
        } else {
            setErrorMsg(result.message);
        }
    };

    const handleReset = () => {
        setSearchName("");
        setSearchEmail("");
        setCandidates([]);
        setSelectedParticipant(null);
        setErrorMsg("");
        setStep('search');
        setCheckInResult(null);
    };

    return (
        <div className="space-y-6">
            {/* Step 1: Search */}
            {step === 'search' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">ようこそ！</h2>
                        <p className="text-gray-600">お名前を入力してチェックインしてください。</p>
                    </div>
                    <div className="space-y-2">
                        <Input
                            placeholder="例: 山田 太郎 / yamada / peatix_user"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-12 text-lg text-center border-2 border-black rounded-none shadow-sm"
                            autoFocus
                        />
                        {errorMsg && <p className="text-red-500 text-sm font-bold text-center animate-pulse"><AlertCircle className="w-4 h-4 inline mr-1" />{errorMsg}</p>}
                    </div>
                    <Button onClick={handleSearch} className="w-full h-12 bg-black text-white font-bold uppercase tracking-widest rounded-none hover:bg-red-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
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
                    <Button onClick={handleEmailSearch} className="w-full h-12 bg-blue-600 text-white font-bold uppercase tracking-widest rounded-none hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
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
                                <div className="text-xs text-gray-400 mt-1 font-mono">{p.ticketType === 'online' ? 'オンライン' : p.ticketType === 'archive' ? 'アーカイブ' : '来場チケット'}</div>
                                {p.hasAfterParty && (
                                    <span className="absolute top-4 right-4 text-xs font-bold px-2 py-1 bg-purple-100 text-purple-600 border border-purple-200">
                                        懇親会あり
                                    </span>
                                )}
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

                    <div className="bg-yellow-50 p-4 border-2 border-yellow-400 text-sm text-yellow-800 text-center font-bold">
                        チェックインを実行しますか？
                    </div>

                    <div className="space-y-3">
                        <Button onClick={handleCheckIn} className="w-full h-14 bg-red-600 text-white font-bold text-xl uppercase tracking-widest rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-black transition-all">
                            チェックイン
                        </Button>
                        <Button onClick={() => setStep('select')} variant="ghost" className="w-full">
                            戻る
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && selectedParticipant && (
                <div className="space-y-8 animate-in zoom-in duration-500 text-center py-8">
                    <div className={`w-24 h-24 mx-auto border-4 rounded-full flex items-center justify-center mb-6 animate-bounce ${checkInResult?.isReentry ? 'bg-blue-100 border-blue-500' :
                        checkInResult?.isAlreadyIn ? 'bg-yellow-100 border-yellow-500' :
                            'bg-green-100 border-green-500'
                        }`}>
                        <CheckCircle className={`w-12 h-12 ${checkInResult?.isReentry ? 'text-blue-600' :
                            checkInResult?.isAlreadyIn ? 'text-yellow-600' :
                                'text-green-600'
                            }`} />
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-black mb-2">
                            {checkInResult?.isReentry ? 'おかえりなさい！' :
                                checkInResult?.isAlreadyIn ? 'チェックイン済み' :
                                    'Welcome!'}
                        </h2>
                        <p className="text-gray-600 text-lg">
                            {checkInResult?.isReentry ? '再入場を記録しました。' :
                                checkInResult?.isAlreadyIn ? 'すでにチェックインされています。' :
                                    'チェックインが完了しました。'}
                        </p>
                    </div>

                    {(settings.wifiSSID || settings.wifiPassword || settings.wifiNote) && (
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
                        トップへ戻る
                    </Button>
                </div>
            )}
        </div>
    );
}
