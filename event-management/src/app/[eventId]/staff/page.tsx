"use client";

import { useParams } from "next/navigation";
import { useDemo } from "@/lib/demo-context";
import Link from "next/link";
import { ArrowLeft, User, Clock, MapPin } from "lucide-react";

export default function StaffPage() {
    const params = useParams();
    const eventId = params?.eventId as string;
    const { settings } = useDemo();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <Link
                    href={`/${eventId}/admin/dashboard`}
                    className="inline-flex items-center text-gray-600 hover:text-black mb-6 font-bold"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    管理画面に戻る
                </Link>

                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-6">
                        スタッフ画面
                    </h1>

                    <div className="space-y-6">
                        <div className="bg-blue-50 border-2 border-blue-600 p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                イベント情報
                            </h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-bold">イベント名:</span>
                                    <span>{settings.eventName || "未設定"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">開催日:</span>
                                    <span>{settings.eventDate || "未設定"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">会場:</span>
                                    <span>{settings.venueName || "未設定"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link
                                href={`/${eventId}/staff/scan`}
                                className="bg-black text-white p-6 hover:bg-gray-800 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                            >
                                <h3 className="text-xl font-bold mb-2">QRスキャン</h3>
                                <p className="text-sm text-gray-300">参加者のチェックイン</p>
                            </Link>

                            <Link
                                href={`/${eventId}/staff/participants`}
                                className="bg-white text-black p-6 hover:bg-gray-100 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                            >
                                <h3 className="text-xl font-bold mb-2">参加者一覧</h3>
                                <p className="text-sm text-gray-600">参加者の確認</p>
                            </Link>
                        </div>

                        <div className="text-center text-sm text-gray-500 mt-8">
                            <p>スタッフ用の機能にアクセスできます</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
