"use client";

import { useState } from "react";
import { useDemo, Participant, ParticipantStatus, PaymentStatus } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, CreditCard, Check, AlertTriangle, Wine } from "lucide-react";

// ステータス設定
const STATUS_OPTIONS: { value: ParticipantStatus; label: string }[] = [
    { value: "general", label: "一般" },
    { value: "student", label: "学生" },
    { value: "vip", label: "VIP" },
    { value: "platinum", label: "プラチナスポンサー" },
    { value: "gold", label: "ゴールドスポンサー" },
    { value: "silver", label: "シルバースポンサー" },
    { value: "media", label: "メディア" },
    { value: "sponsor", label: "スポンサー" },
    { value: "online", label: "オンライン参加" },
];

type RegistrationStep = "form" | "payment" | "complete";

export default function SameDayRegistrationPage() {
    const { addParticipant, checkIn, venues } = useDemo();

    const [step, setStep] = useState<RegistrationStep>("form");
    const [formData, setFormData] = useState({
        name: "",
        organization: "",
        email: "",
        phone: "",
        status: "general" as ParticipantStatus,
        hasAfterParty: false,
    });
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
    const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);

    const handleSubmitForm = () => {
        if (!formData.name) return;

        const id = "W" + Date.now().toString().slice(-6);
        const newParticipant: Participant = {
            id,
            name: formData.name,
            organization: formData.organization,
            email: formData.email,
            phone: formData.phone,
            furigana: "",
            category: formData.status === 'vip' || formData.status === 'platinum' || formData.status === 'gold' ? 'VIP' : 'General',
            isVip: formData.status === 'vip' || formData.status === 'platinum' || formData.status === 'gold',
            registeredAt: new Date().toISOString(),
            status: formData.status,
            ticketType: "attendance",
            hasAfterParty: formData.hasAfterParty,
            hasMultipleTickets: false,
            confirmationStatus: "confirmed",
            paymentStatus: "unpaid",
            source: "other",  // 当日参加
        };

        addParticipant(newParticipant);
        setRegisteredParticipant(newParticipant);
        setStep("payment");
    };

    const handlePaymentConfirm = () => {
        if (registeredParticipant) {
            // 決済確認 & チェックイン実行
            const venueId = venues[0]?.id || "v1";
            checkIn(registeredParticipant.id, venueId, "manual");
        }
        setPaymentStatus("paid");
        setStep("complete");
    };

    const handleReset = () => {
        setStep("form");
        setFormData({
            name: "",
            organization: "",
            email: "",
            phone: "",
            status: "general",
            hasAfterParty: false,
        });
        setPaymentStatus("unpaid");
        setRegisteredParticipant(null);
    };

    return (
        <div className="w-full">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-2 flex items-center justify-center gap-3">
                        <UserPlus className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                        当日参加登録
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest">Walk-in Registration</p>
                </div>

                {/* Progress */}
                <div className="flex justify-center gap-4 mb-12">
                    {[
                        { key: "form", label: "情報入力", icon: UserPlus },
                        { key: "payment", label: "決済確認", icon: CreditCard },
                        { key: "complete", label: "完了", icon: Check },
                    ].map((s, i) => {
                        const Icon = s.icon;
                        const isActive = step === s.key;
                        const isPast = ["form", "payment", "complete"].indexOf(step) > i;

                        return (
                            <div key={s.key} className="flex items-center">
                                <div className={`flex flex-col items-center ${isActive ? 'text-black' : isPast ? 'text-red-600' : 'text-gray-400'}`}>
                                    <div className={`w-12 h-12 flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'border-black bg-black text-white' : isPast ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-400'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs mt-2 font-bold uppercase tracking-wider">{s.label}</span>
                                </div>
                                {i < 2 && <div className={`w-16 h-0.5 mx-2 ${isPast ? 'bg-red-600' : 'bg-gray-200'}`} />}
                            </div>
                        );
                    })}
                </div>

                {/* Step: Form */}
                {step === "form" && (
                    <Card className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold uppercase tracking-widest mb-2 block">名前 *</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-12 border-2 border-black focus:ring-0 focus:border-red-600 focus-visible:ring-0 rounded-none text-lg"
                                        placeholder="山田 太郎"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold uppercase tracking-widest mb-2 block">会社/組織</label>
                                    <Input
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        className="h-12 border-2 border-black focus:ring-0 focus:border-red-600 focus-visible:ring-0 rounded-none text-lg"
                                        placeholder="株式会社○○"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold uppercase tracking-widest mb-2 block">メールアドレス</label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-12 border-2 border-black focus:ring-0 focus:border-red-600 focus-visible:ring-0 rounded-none text-lg"
                                        placeholder="example@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold uppercase tracking-widest mb-2 block">電話番号</label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="h-12 border-2 border-black focus:ring-0 focus:border-red-600 focus-visible:ring-0 rounded-none text-lg"
                                        placeholder="090-1234-5678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold uppercase tracking-widest mb-2 block">参加種別</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ParticipantStatus })}
                                    className="w-full h-12 px-4 border-2 border-black focus:outline-none focus:border-red-600 rounded-none text-lg bg-white"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => setFormData({ ...formData, hasAfterParty: !formData.hasAfterParty })}>
                                <div className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-colors ${formData.hasAfterParty ? 'bg-black text-white' : 'bg-white'}`}>
                                    {formData.hasAfterParty && <Check className="w-4 h-4" />}
                                </div>
                                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                                    <Wine className="w-5 h-5 text-purple-600" />
                                    懇親会に参加する
                                </label>
                            </div>

                            <Button
                                onClick={handleSubmitForm}
                                disabled={!formData.name}
                                className="w-full h-16 bg-red-600 hover:bg-black text-white font-black uppercase text-xl rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                次へ: 決済確認
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step: Payment */}
                {step === "payment" && registeredParticipant && (
                    <Card className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
                        <CardContent className="p-8 space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto bg-yellow-400 border-2 border-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <CreditCard className="w-10 h-10 text-black" />
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">決済確認待ち</h2>
                            </div>

                            <div className="bg-gray-50 p-6 border-2 border-black space-y-3">
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 font-bold text-sm uppercase">登録ID</span>
                                    <span className="font-mono font-bold text-lg">{registeredParticipant.id}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 font-bold text-sm uppercase">名前</span>
                                    <span className="font-bold text-lg">{registeredParticipant.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 font-bold text-sm uppercase">参加種別</span>
                                    <span className="font-bold">{STATUS_OPTIONS.find(o => o.value === formData.status)?.label}</span>
                                </div>
                                {formData.hasAfterParty && (
                                    <div className="flex justify-between text-purple-700 font-bold">
                                        <span>懇親会</span>
                                        <span className="flex items-center gap-1"><Wine className="w-4 h-4" /> 参加</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-yellow-50 border-2 border-yellow-400 flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                <div className="text-sm text-yellow-800">
                                    <p className="font-bold">決済を確認してください</p>
                                    <p className="mt-1">現金/カード/QR決済の完了を確認後、「決済完了」ボタンを押してください。</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={handleReset}
                                    variant="outline"
                                    className="h-14 border-2 border-black font-bold uppercase hover:bg-gray-100 rounded-none text-black"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    onClick={handlePaymentConfirm}
                                    className="h-14 bg-green-600 hover:bg-green-700 text-white font-bold uppercase rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                                >
                                    <Check className="w-5 h-5 mr-2" />
                                    決済完了
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step: Complete */}
                {step === "complete" && registeredParticipant && (
                    <Card className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
                        <CardContent className="p-12 text-center space-y-8">
                            <div className="w-24 h-24 mx-auto bg-green-500 border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Check className="w-12 h-12 text-white" />
                            </div>

                            <div>
                                <h2 className="text-3xl font-black uppercase mb-2">登録完了</h2>
                                <p className="text-gray-500 font-bold">チェックインが完了しました</p>
                            </div>

                            <div className="bg-white p-6 border-2 border-black text-left relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
                                <div className="pl-4">
                                    <div className="text-center mb-4">
                                        <span className="text-5xl font-mono font-bold text-black tracking-wider">{registeredParticipant.id}</span>
                                    </div>
                                    <div className="text-3xl font-black text-center mb-2">{registeredParticipant.name}</div>
                                    {registeredParticipant.organization && (
                                        <div className="text-center text-gray-500 font-bold uppercase tracking-widest text-sm">{registeredParticipant.organization}</div>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={handleReset}
                                className="w-full h-16 bg-red-600 hover:bg-black text-white font-black uppercase text-xl rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                            >
                                次平の参加者を登録
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
