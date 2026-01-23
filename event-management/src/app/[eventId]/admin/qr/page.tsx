"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useDemo, Participant } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";

export default function QRGeneratorPage() {
    const { participants } = useDemo();
    const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const generate = async () => {
            setIsGenerating(true);
            const urls: Record<string, string> = {};
            for (const p of participants) {
                try {
                    urls[p.id] = await QRCode.toDataURL(p.id, { margin: 1, width: 200, color: { dark: '#000000', light: '#ffffff' } });
                } catch (e) {
                    console.error(e);
                }
            }
            setQrDataUrls(urls);
            setIsGenerating(false);
        };
        if (participants.length > 0) generate();
    }, [participants]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8">
            <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-4 border-black pb-6">
                <div>
                    <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-2">ID CARDS</h2>
                    <p className="text-xs md:text-sm font-bold text-neutral-400 uppercase tracking-widest">
                        Generate & Print ({participants.length} Attendees)
                    </p>
                </div>
                <Button onClick={handlePrint} size="lg" className="w-full md:w-auto text-xl px-12 h-16 bg-black hover:bg-red-600 text-white font-black uppercase tracking-widest">PRINT ALL</Button>
            </div>

            {/* Preview / Print Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 print:block print:w-full">
                {participants.map(p => (
                    <div key={p.id} className="print:inline-block print:w-[48%] print:m-[1%] print:break-inside-avoid">
                        <IDCard participant={p} qrUrl={qrDataUrls[p.id]} />
                    </div>
                ))}

                {participants.length === 0 && (
                    <div className="col-span-1 md:col-span-3 text-center py-20 text-gray-400 font-bold uppercase">No participants data found</div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body * { visibility: hidden; }
                    .print\\:block, .print\\:block * { visibility: visible; }
                    .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
                    .print\\:hidden { display: none !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
}

function IDCard({ participant, qrUrl }: { participant: Participant, qrUrl?: string }) {
    return (
        <div className="border-[3px] border-black bg-white p-6 relative aspect-[1.58/1] flex flex-col justify-between overflow-hidden group hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2">
                <div className="flex-1 mr-2">
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none line-clamp-1">{participant.name}</h3>
                    <p className="text-[10px] font-bold uppercase text-gray-500 mt-1">{participant.organization || "Guest"}</p>
                </div>
                {participant.isVip && (
                    <div className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest transform rotate-0 shrink-0">VIP</div>
                )}
            </div>

            {/* Body */}
            <div className="flex items-end justify-between mt-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-gray-400">ID / REGISTRATION</p>
                    <p className="font-mono text-lg md:text-xl font-bold">{participant.id}</p>
                    <p className="text-[10px] font-bold uppercase mt-2">{participant.category}</p>
                </div>

                <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-black p-1 shrink-0">
                    {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-200 animate-pulse" />}
                </div>
            </div>

            {/* Footer Decoration */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-black"></div>
            {participant.isVip && <div className="absolute bottom-0 left-0 w-full h-2 bg-red-600 z-10"></div>}
        </div>
    );
}
