"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SetupPage() {
    const router = useRouter();
    const { initializeSystem, settings } = useDemo();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        eventName: "ファッションウィーク 2026",
        eventDate: new Date().toISOString().split('T')[0],
        startTime: "10:00",
        endTime: "18:00",
        adminPassword: "admin",
        staffPassword: "staff",
        enableAfterParty: true,
    });

    // Dynamic Venue State
    const [venueList, setVenueList] = useState([
        { name: "メイン会場", capacity: 500 },
        { name: "サブ会場", capacity: 50 }
    ]);

    // ... (useEffect removed as per original)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Venue Handlers
    const handleVenueChange = (index: number, field: string, value: string | number) => {
        const newVenues = [...venueList];
        newVenues[index] = { ...newVenues[index], [field]: value };
        setVenueList(newVenues);
    };

    const addVenue = () => {
        setVenueList([...venueList, { name: "", capacity: 100 }]);
    };

    const removeVenue = (index: number) => {
        if (venueList.length > 1) {
            setVenueList(venueList.filter((_, i) => i !== index));
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        initializeSystem({
            eventName: formData.eventName,
            eventDate: formData.eventDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            adminPassword: formData.adminPassword,
            staffPassword: formData.staffPassword,
            enableAfterParty: formData.enableAfterParty,
            venues: venueList.map((v, i) => ({
                id: `v${i + 1}`,
                name: v.name || `会場${i + 1}`,
                capacity: Number(v.capacity) || 0
            }))
        });

        // Wait briefly to ensure background sync triggers and network request is dispatched
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect to the event-specific dashboard
        const eventId = window.location.pathname.split('/')[1];
        router.push(`/${eventId}/admin/dashboard`);
    };

    // Require imports for Trash2 and Plus
    // import { Trash2, Plus } from "lucide-react"; 
    // This replace needs to include imports if they are missing at top.
    // Assuming imports are at top, let's include them in Step 2 rendering logic for safety or assume global.
    // Actually, I should check imports. The file view in step 1932 didn't show imports for Trash2/Plus.
    // I need to update imports too. But replace_file_content is single block.
    // I will use multi_replace.

    return (
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
            {/* ... (Background & Header as original) ... */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-red-600 hidden md:block z-0 mix-blend-multiply opacity-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-gray-100 rounded-full blur-3xl z-0"></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto p-6 md:p-12 flex flex-col min-h-screen justify-between">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 mb-8 md:mb-12">
                    <div>
                        <h1 className="text-5xl md:text-9xl font-black uppercase tracking-tighter leading-none">
                            初期<br /><span className="text-red-600">設定</span>
                        </h1>
                    </div>
                    <div className="text-left md:text-right mt-4 md:mt-0">
                        <p className="text-xs md:text-sm font-bold uppercase tracking-widest">システム初期設定</p>
                        <p className="text-[10px] md:text-xs text-gray-400 font-mono">ステップ {step} / 3</p>
                    </div>
                </header>

                <div className="flex-1 max-w-4xl pb-12">
                    <form onSubmit={handleSubmit} className="space-y-8 md:space-y-12">

                        {step === 1 && (
                            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right duration-500">
                                <h2 className="text-3xl md:text-4xl font-black uppercase">01. イベント情報</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                    <InputGroup label="イベント名" name="eventName" value={formData.eventName} onChange={handleChange} autoFocus />
                                    <InputGroup label="開催日" type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} />
                                    <InputGroup label="開始時間" type="time" name="startTime" value={formData.startTime} onChange={handleChange} />
                                    <InputGroup label="終了時間" type="time" name="endTime" value={formData.endTime} onChange={handleChange} />

                                    <div className="flex items-center space-x-2 md:col-span-2 pt-4">
                                        <input
                                            type="checkbox"
                                            id="enableAfterParty"
                                            checked={formData.enableAfterParty}
                                            onChange={(e) => setFormData({ ...formData, enableAfterParty: e.target.checked })}
                                            className="w-6 h-6 accent-red-600"
                                        />
                                        <label htmlFor="enableAfterParty" className="text-lg font-bold uppercase tracking-widest cursor-pointer select-none">
                                            懇親会を開催する
                                        </label>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-8 md:pt-12">
                                    <NavButton onClick={nextStep}>次へ: 会場設定</NavButton>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-10 md:space-y-12 animate-in slide-in-from-right duration-500">
                                <h2 className="text-3xl md:text-5xl font-black uppercase">02. 会場設定</h2>
                                <div className="space-y-6">
                                    {venueList.map((venue, index) => (
                                        <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex-1">
                                                <InputGroup
                                                    label={`会場名 #${index + 1}`}
                                                    value={venue.name}
                                                    onChange={(e: any) => handleVenueChange(index, 'name', e.target.value)}
                                                    autoFocus={index === 0}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <InputGroup
                                                    label="収容人数"
                                                    type="number"
                                                    value={venue.capacity}
                                                    onChange={(e: any) => handleVenueChange(index, 'capacity', e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={() => removeVenue(index)}
                                                disabled={venueList.length === 1}
                                                className="h-12 w-12 bg-gray-100 hover:bg-red-600 hover:text-white border-2 border-gray-200 rounded-none disabled:opacity-50"
                                            >
                                                { /* Trash Icon here - inline SVG to avoid import issues or use simple text X if needed, but lets try to rely on imports being added separately or use Lucide if I can add imports */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    onClick={addVenue}
                                    variant="outline"
                                    className="w-full h-14 border-2 border-dashed border-gray-300 hover:border-black hover:bg-gray-50 text-gray-500 hover:text-black uppercase font-bold tracking-widest"
                                >
                                    ＋ 会場を追加
                                </Button>

                                <div className="flex justify-between pt-8 md:pt-12">
                                    <NavButton onClick={prevStep} variant="outline">戻る</NavButton>
                                    <NavButton onClick={nextStep}>次へ: セキュリティ</NavButton>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-10 md:space-y-12 animate-in slide-in-from-right duration-500">
                                <h2 className="text-3xl md:text-5xl font-black uppercase text-red-600">03. セキュリティ</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                    <InputGroup label="管理者パスワード" name="adminPassword" value={formData.adminPassword} onChange={handleChange} autoFocus />
                                    <InputGroup label="スタッフパスワード" name="staffPassword" value={formData.staffPassword} onChange={handleChange} />
                                </div>
                                <div className="flex flex-col md:flex-row justify-between pt-8 md:pt-12 items-center gap-6">
                                    <NavButton onClick={prevStep} variant="outline" type="button" className="w-full md:w-auto">戻る</NavButton>
                                    <Button type="submit" className="w-full md:w-auto h-20 md:h-24 px-10 md:px-16 text-xl md:text-3xl bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest transition-all">
                                        システム起動
                                    </Button>
                                </div>
                            </div>
                        )}

                    </form>
                </div>

            </div>
        </div>
    );
}

function InputGroup({ label, ...props }: any) {
    return (
        <div className="space-y-3 group">
            <label className="text-sm md:text-base font-bold uppercase tracking-widest text-gray-500 group-focus-within:text-red-600 transition-colors">{label}</label>
            <Input
                className="w-full"
                {...props}
            />
        </div>
    );
}

function NavButton({ children, variant = 'default', className, ...props }: any) {
    const isOutline = variant === 'outline';
    return (
        <Button
            type="button"
            className={`h-14 md:h-16 px-8 md:px-10 text-lg md:text-xl font-bold uppercase tracking-widest rounded-none ${isOutline ? 'bg-transparent border-2 border-gray-200 text-gray-400 hover:text-black hover:border-black' : 'bg-black text-white hover:bg-red-600'} ${className}`}
            {...props}
        >
            {children}
        </Button>
    )
}
