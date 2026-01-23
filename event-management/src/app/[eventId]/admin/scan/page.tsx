"use client";

import CheckInScanner from "@/components/CheckInScanner";

export default function AdminScanPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">QRスキャナー</h1>
                <p className="text-gray-500 font-bold uppercase tracking-widest">チェックイン / チェックアウト処理</p>
            </div>
            <CheckInScanner />
        </div>
    );
}
