"use client";

import CheckInScanner from "@/components/CheckInScanner";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function StaffScanPage() {
    const params = useParams();
    const eventId = params?.eventId as string;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <Link
                    href={`/${eventId}/staff`}
                    className="inline-flex items-center text-gray-600 hover:text-black mb-6 font-bold"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    スタッフ画面に戻る
                </Link>

                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-6">
                        参加者チェックイン
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest mb-6">
                        チェックイン / チェックアウト処理
                    </p>
                    <CheckInScanner />
                </div>
            </div>
        </div>
    );
}
