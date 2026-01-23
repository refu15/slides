"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function VenueQRCodePage() {
    const [qrUrl, setQrUrl] = useState("");
    const [checkinUrl, setCheckinUrl] = useState("");

    useEffect(() => {
        // クライアントサイドでのみ実行
        const origin = window.location.origin;
        const url = `${origin}/guest/checkin`;
        setCheckinUrl(url);
        // QR Code APIを使用
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (!qrUrl) return null;

    return (
        <div className="min-h-screen bg-white text-black p-8 flex flex-col items-center">
            {/* 画面表示用コントロール（印刷時は非表示） */}
            <div className="w-full max-w-2xl mb-8 flex justify-between items-center print:hidden">
                <h1 className="text-xl font-bold">会場掲示用QRコード</h1>
                <Button onClick={handlePrint} className="bg-black text-white hover:bg-gray-800">
                    <Printer className="w-4 h-4 mr-2" />
                    印刷する
                </Button>
            </div>

            {/* 印刷エリア */}
            <div className="border-4 border-black p-12 max-w-[210mm] w-full aspect-[1/1.414] flex flex-col items-center justify-between text-center mx-auto bg-white">
                <div className="space-y-4 pt-8">
                    <h2 className="text-3xl font-bold uppercase tracking-widest text-gray-500">EVENT CHECK-IN</h2>
                    <h1 className="text-6xl font-black tracking-tighter">受付チェックイン</h1>
                </div>

                <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 border-4 border-black rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="Check-in QR Code" className="w-80 h-80 md:w-96 md:h-96" />
                    </div>
                    <p className="text-2xl font-bold">スマートフォンで読み取ってください</p>
                </div>

                <div className="space-y-4 pb-8 w-full">
                    <div className="border-t-4 border-black pt-6">
                        <p className="text-xl font-medium mb-2">読み取れない場合</p>
                        <p className="text-3xl font-mono font-bold">{checkinUrl}</p>
                    </div>
                    <p className="text-sm text-gray-500 pt-8">
                        ※ご自身のスマートフォンで簡単に入場手続きができます。<br />
                        ※登録したお名前と会社名を入力してください。
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        background: white;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
