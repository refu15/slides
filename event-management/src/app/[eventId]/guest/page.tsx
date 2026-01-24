"use client";

import { useState, useEffect } from "react";
import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, LogOut, Clock, Users, Calendar, Wifi } from "lucide-react";


type GuestStatus = "not_checked_in" | "checked_in" | "temporary_exit";

export default function GuestPage() {
    const { participants, checkInLogs, checkIn, checkOut, settings, findParticipants } = useDemo();
    const [step, setStep] = useState<"identify" | "select" | "action" | "identify_email">("identify");
    const [searchName, setSearchName] = useState("");
    const [searchCompany, setSearchCompany] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [candidates, setCandidates] = useState<typeof participants>([]);
    const [foundParticipant, setFoundParticipant] = useState<typeof participants[0] | null>(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const getStatus = (id: string): GuestStatus => {
        const logs = checkInLogs
            .filter(l => l.userId === id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (logs.length === 0) return "not_checked_in";

        const lastAction = logs[0].action;
        if (lastAction === "checkin") return "checked_in";
        if (lastAction === "checkout") return "not_checked_in";
        if (lastAction === "temporary_exit") return "temporary_exit";
        return "not_checked_in";
    };

    const handleSearch = () => {
        setError("");
        setSuccessMessage("");
        setCandidates([]);

        const results = findParticipants(searchName, searchCompany);

        if (results.length === 0) {
            setError("条件に一致する参加者が見つかりませんでした。Peatix等のユーザー名やメールアドレスでもお試しください。それでも見つからない場合は、受付スタッフにお声がけください。");
        } else if (results.length === 1) {
            setFoundParticipant(results[0]);
            setStep("action");
        } else {
            setCandidates(results);
            setStep("select");
        }
    };

    const handleEmailSearch = () => {
        setError("");
        setSuccessMessage("");
        setCandidates([]);

        const results = findParticipants("", "", searchEmail);

        if (results.length === 0) {
            setError("条件に一致する参加者が見つかりませんでした。受付スタッフにお声がけください。");
        } else if (results.length === 1) {
            setFoundParticipant(results[0]);
            setStep("action");
        } else {
            // メールでも重複があり得る場合の考慮
            setCandidates(results);
            setStep("select");
        }
    };

    const selectCandidate = (participant: typeof participants[0]) => {
        setFoundParticipant(participant);
        setStep("action");
    };

    const handleCheckIn = async () => {
        if (!foundParticipant) return;

        const result = await checkIn(foundParticipant.id, "v1", "self");
        if (result.success) {
            setSuccessMessage("チェックインが完了しました！");


        } else {
            setError(result.message);
        }
    };

    const handleCheckOut = async () => {
        if (!foundParticipant) return;

        const result = await checkOut(foundParticipant.id, "v1", "self", "", "checkout");
        if (result.success) {
            setSuccessMessage("チェックアウトが完了しました。またのご来場をお待ちしております！");
        } else {
            setError(result.message);
        }
    };

    const handleTemporaryExit = async () => {
        if (!foundParticipant) return;

        const result = await checkOut(foundParticipant.id, "v1", "self", "", "temporary_exit");
        if (result.success) {
            setSuccessMessage("途中退出を記録しました。お戻りの際は再度チェックインをお願いします。");
        } else {
            setError(result.message);
        }
    };

    const resetFlow = () => {
        setStep("identify");
        setSearchName("");
        setSearchCompany("");
        setSearchEmail("");
        setCandidates([]);
        setFoundParticipant(null);
        setError("");
        setSuccessMessage("");
    };

    const currentStatus = foundParticipant ? getStatus(foundParticipant.id) : "not_checked_in";

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="border-b-4 border-black p-6">
                <div className="max-w-lg mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                        {settings.eventName || "イベント"}
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-2">
                        セルフチェックイン
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">

                    {step === "identify" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="text-center">
                                <Users className="w-16 h-16 mx-auto text-red-600 mb-4" />
                                <h2 className="text-2xl font-black uppercase mb-2">ご本人確認</h2>
                                <p className="text-gray-500">お名前 または 会社名をご入力ください</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                        お名前 <span className="text-red-600">*</span>
                                    </label>
                                    <p className="text-xs text-gray-400 mb-1">※Peatix経由の方はユーザー名の場合があります</p>
                                    <Input
                                        placeholder="例：山田 太郎 / peatix_user"
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        className="h-14 text-lg border-2 border-gray-200 focus:border-black rounded-none"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                        会社名・組織名
                                    </label>
                                    <Input
                                        placeholder="例：株式会社○○"
                                        value={searchCompany}
                                        onChange={(e) => setSearchCompany(e.target.value)}
                                        className="h-14 text-lg border-2 border-gray-200 focus:border-black rounded-none"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border-2 border-red-600 text-red-600 font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleSearch}
                                disabled={!searchName.trim() && !searchCompany.trim()}
                                className="w-full h-16 text-xl bg-black hover:bg-gray-800 text-white font-black uppercase tracking-widest rounded-none transition-colors"
                            >
                                検索する
                            </Button>

                            <div className="text-center mt-6">
                                <p className="text-gray-500 text-sm mb-2">名前が見つからない場合</p>
                                <Button
                                    variant="link"
                                    className="text-gray-500 underline"
                                    onClick={() => {
                                        setError("");
                                        setStep("identify_email");
                                    }}
                                >
                                    メールアドレスで検索する
                                </Button>
                                <p className="text-xs text-gray-400 mt-4">
                                    ※どうしても見つからない場合は、受付スタッフにお声がけください
                                </p>
                            </div>
                        </div>
                    )}

                    {step === "identify_email" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="text-center">
                                <Users className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                                <h2 className="text-2xl font-black uppercase mb-2">メールアドレス検索</h2>
                                <p className="text-gray-500">登録時のメールアドレスをご入力ください</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-widest text-gray-500">
                                        メールアドレス <span className="text-blue-600">*</span>
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="例：user@example.com"
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                        className="h-14 text-lg border-2 border-gray-200 focus:border-black rounded-none"
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && searchEmail && handleEmailSearch()}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border-2 border-red-600 text-red-600 font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleEmailSearch}
                                disabled={!searchEmail.trim()}
                                className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-800 text-white font-black uppercase tracking-widest rounded-none transition-colors"
                            >
                                メールで検索
                            </Button>

                            <div className="text-center mt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setError("");
                                        setStep("identify");
                                    }}
                                >
                                    名前検索に戻る
                                </Button>
                                <p className="text-xs text-gray-400 mt-4">
                                    ※見つからない場合は、受付スタッフにお声がけください
                                </p>
                            </div>
                        </div>
                    )}

                    {step === "select" && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="text-center">
                                <Users className="w-16 h-16 mx-auto text-black mb-4" />
                                <h2 className="text-2xl font-black uppercase mb-2">該当者が複数見つかりました</h2>
                                <p className="text-gray-500">ご自身のお名前を選択してください</p>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                {candidates.map(candidate => (
                                    <button
                                        key={candidate.id}
                                        onClick={() => selectCandidate(candidate)}
                                        className="w-full bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-black p-4 text-left transition-all"
                                    >
                                        <div className="font-bold text-lg">{candidate.name}</div>
                                        {candidate.organization && (
                                            <div className="text-sm text-gray-500 mt-1">{candidate.organization}</div>
                                        )}
                                        <div className="text-xs text-gray-400 mt-2 flex gap-2">
                                            <span>カテゴリー: {candidate.status}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                className="w-full h-14 border-2 border-gray-200 text-gray-500 font-bold text-lg rounded-none uppercase tracking-widest"
                                onClick={() => setStep("identify")}
                            >
                                戻る
                            </Button>
                        </div>
                    )}

                    {step === "action" && foundParticipant && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Guest Info Card */}
                            <div className="border-4 border-black p-6 text-center">
                                <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-1">
                                    ようこそ
                                </div>
                                <div className="text-3xl font-black mb-2">
                                    {foundParticipant.name}
                                </div>
                                <div className="text-gray-500 font-medium">
                                    {foundParticipant.organization}
                                </div>
                                {foundParticipant.category === "VIP" && (
                                    <div className="mt-3 inline-block px-4 py-1 bg-red-600 text-white font-bold uppercase text-sm">
                                        VIP
                                    </div>
                                )}
                            </div>

                            {/* Status Display */}
                            <div className="text-center">
                                <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">
                                    現在のステータス
                                </div>
                                <div className={`text-xl font-black uppercase ${currentStatus === "checked_in" ? "text-green-600" :
                                    currentStatus === "temporary_exit" ? "text-yellow-600" : "text-gray-400"
                                    }`}>
                                    {currentStatus === "checked_in" && "✓ チェックイン済み"}
                                    {currentStatus === "not_checked_in" && "未チェックイン"}
                                    {currentStatus === "temporary_exit" && "途中退出中"}
                                </div>
                            </div>

                            {/* Success Message */}
                            {successMessage && (
                                <div className="p-4 bg-green-50 border-2 border-green-600 text-green-700 font-bold text-center">
                                    {successMessage}
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 bg-red-50 border-2 border-red-600 text-red-600 font-bold text-center">
                                    {error}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-4">
                                {currentStatus === "not_checked_in" && (
                                    <Button
                                        onClick={handleCheckIn}
                                        className="w-full h-20 text-2xl bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest rounded-none transition-colors"
                                    >
                                        <CheckCircle className="w-8 h-8 mr-3" />
                                        チェックイン
                                    </Button>
                                )}

                                {currentStatus === "checked_in" && (
                                    <>
                                        <Button
                                            onClick={handleTemporaryExit}
                                            variant="outline"
                                            className="w-full h-16 text-lg border-2 border-black text-black font-bold uppercase tracking-widest rounded-none hover:bg-gray-100"
                                        >
                                            <Clock className="w-6 h-6 mr-2" />
                                            途中退出
                                        </Button>
                                        <Button
                                            onClick={handleCheckOut}
                                            className="w-full h-16 text-lg bg-black hover:bg-red-600 text-white font-bold uppercase tracking-widest rounded-none transition-colors"
                                        >
                                            <LogOut className="w-6 h-6 mr-2" />
                                            チェックアウト（完全退出）
                                        </Button>
                                    </>
                                )}

                                {currentStatus === "temporary_exit" && (
                                    <Button
                                        onClick={handleCheckIn}
                                        className="w-full h-20 text-2xl bg-green-600 hover:bg-black text-white font-black uppercase tracking-widest rounded-none transition-colors"
                                    >
                                        <CheckCircle className="w-8 h-8 mr-3" />
                                        再入場チェックイン
                                    </Button>
                                )}
                            </div>

                            {/* WiFi Information */}
                            {(settings.wifiSSID || settings.wifiPassword || settings.wifiNote) && (
                                <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-2 text-gray-500 font-bold uppercase tracking-widest text-sm">
                                        <Wifi className="w-4 h-4" /> 会場WiFi
                                    </div>
                                    <div className="space-y-1">
                                        {settings.wifiSSID && (
                                            <div className="flex justify-center gap-2">
                                                <span className="font-bold text-gray-400">SSID:</span>
                                                <span className="font-mono font-bold">{settings.wifiSSID}</span>
                                            </div>
                                        )}
                                        {settings.wifiPassword && (
                                            <div className="flex justify-center gap-2">
                                                <span className="font-bold text-gray-400">PASS:</span>
                                                <span className="font-mono font-bold">{settings.wifiPassword}</span>
                                            </div>
                                        )}
                                        {settings.wifiNote && (
                                            <div className="mt-2 text-sm text-gray-500 whitespace-pre-wrap">
                                                {settings.wifiNote}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Back Button */}
                            <button
                                onClick={resetFlow}
                                className="w-full text-center text-gray-400 font-bold uppercase tracking-widest hover:text-black transition-colors"
                            >
                                ← 別の方でチェックイン
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 p-4">
                <div className="text-center text-gray-400 text-sm mb-3">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {settings.eventDate || new Date().toLocaleDateString("ja-JP")}
                </div>

            </footer>
        </div>
    );
}
