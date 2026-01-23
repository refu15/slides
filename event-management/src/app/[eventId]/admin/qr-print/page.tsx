"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Printer, Search, Download, Check } from "lucide-react";

import { useParams } from "next/navigation";

export default function QRPrintPage() {
    const { settings } = useDemo();
    const params = useParams();
    const eventId = params.eventId as string;
    const [checkInUrl, setCheckInUrl] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");

    // URL generation on client-side only
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCheckInUrl(`${window.location.protocol}//${window.location.host}/${eventId}/guest/checkin`);
        }
    }, []);

    // Generate QR locally
    useEffect(() => {
        if (!checkInUrl) return;
        QRCode.toDataURL(checkInUrl, { width: 500, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
            .then(url => setQrDataUrl(url))
            .catch(err => console.error(err));
    }, [checkInUrl]);

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = 'checkin-qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !checkInUrl || !qrDataUrl) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>チェックイン用QRコード</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: sans-serif; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
                    .container { width: 100%; max-width: 210mm; padding: 20mm; box-sizing: border-box; }
                    .title { font-size: 48px; font-weight: 900; margin-bottom: 10mm; text-transform: uppercase; }
                    .qr { width: 120mm; height: 120mm; margin: 0 auto 10mm; }
                    .qr img { width: 100%; height: 100%; object-fit: contain; }
                    .desc { font-size: 24px; color: #555; font-weight: bold; margin-bottom: 5mm; }
                    .url { font-family: monospace; font-size: 18px; color: #888; }
                    .logo { margin-bottom: 10mm; font-size: 24px; font-weight: bold; border: 4px solid black; display: inline-block; padding: 10px 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">EVENT CHECK-IN</div>
                    <div class="title">チェックイン</div>
                    <div class="desc">カメラでQRコードを読み取ってください</div>
                    <div class="qr">
                        <img src="${qrDataUrl}" />
                    </div>
                    <div class="desc">ご自身のスマートフォンで簡単チェックイン！</div>
                    <div class="url">${checkInUrl}</div>
                </div>
                <script>
                    window.onload = () => {
                        setTimeout(() => window.print(), 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black uppercase tracking-tight">チェックイン用QRコード</h1>
                <p className="text-gray-500 text-lg">
                    会場掲示用のQRコードを印刷・ダウンロードできます。<br />
                    参加者はこのQRコードを読み取り、セルフチェックインを行います。
                </p>
            </div>

            <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <CardContent className="p-12 text-center flex flex-col items-center gap-8">
                    <div className="bg-gray-100 p-8 rounded-xl border-2 border-gray-200">
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="Check-in QR"
                                className="w-64 h-64 object-contain"
                            />
                        ) : (
                            <div className="w-64 h-64 flex items-center justify-center bg-gray-200 text-gray-400">
                                <QrCode className="w-12 h-12" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="font-bold text-xl break-all">{checkInUrl}</p>
                        <p className="text-sm text-gray-500">※同じネットワークまたはインターネット経由でアクセスできる必要があります。</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <Button
                            onClick={handleDownload}
                            size="lg"
                            className="h-16 px-8 text-lg bg-white text-black border-2 border-black hover:bg-gray-100 font-bold uppercase tracking-widest rounded-none shadow-sm hover:translate-y-1 transition-all"
                        >
                            <Download className="w-5 h-5 mr-3" />
                            画像を保存 (PNG)
                        </Button>
                        <Button
                            onClick={handlePrint}
                            size="lg"
                            className="h-16 px-12 text-xl bg-red-600 hover:bg-black text-white font-bold uppercase tracking-widest rounded-none shadow-lg hover:translate-y-1 transition-all"
                        >
                            <Printer className="w-6 h-6 mr-3" />
                            ポスター印刷 (A4)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-none">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                        <QrCode className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900 text-lg mb-1">運用フローの変更</h3>
                        <p className="text-blue-800 leading-relaxed">
                            従来の「スタッフが参加者の個別QRをスキャンする」方式から、<br />
                            <strong>「参加者が会場QRをスキャンして自分でチェックインする」</strong>方式に変更されました。<br />
                            このQRコードを印刷し、受付や会場入口に掲示してください。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
