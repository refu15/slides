"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Send, Check, MessageSquare } from "lucide-react";

export default function SessionFeedbackPage() {
    const params = useParams();
    const sessionId = params.id as string;
    const { sessions } = useDemo();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    const session = sessions.find(s => s.id === sessionId);

    const handleSubmit = () => {
        if (rating === 0) return;

        // ここで実際にはAPIに送信
        console.log("Feedback submitted:", { sessionId, rating, comment });
        setSubmitted(true);
    };

    if (!session) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-xl">セッションが見つかりません</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-black text-white flex items-center justify-center p-6">
                <Card className="bg-black/50 border-green-500 text-white max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-green-500/20 border-4 border-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold">ありがとうございました！</h2>
                        <p className="text-gray-400">フィードバックを送信しました。</p>
                        <a
                            href="/guest/schedule"
                            className="block w-full py-4 bg-white text-black font-bold text-center hover:bg-gray-200 transition-colors"
                        >
                            タイムテーブルに戻る
                        </a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
            <div className="max-w-lg mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">セッションフィードバック</h1>
                    <p className="text-gray-400">ご意見をお聞かせください</p>
                </div>

                {/* Session Info */}
                <Card className="bg-gray-900/50 border-gray-700 text-white">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-bold mb-2">{session.title}</h2>
                        <p className="text-gray-400">{session.speaker}</p>
                        <p className="text-sm text-gray-500 mt-2">{session.startTime} - {session.endTime}</p>
                    </CardContent>
                </Card>

                {/* Rating */}
                <div className="text-center space-y-4">
                    <p className="text-lg font-bold">このセッションはいかがでしたか？</p>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-2 transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-10 h-10 transition-colors ${star <= (hoverRating || rating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-600'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-yellow-400 font-bold">
                            {rating === 5 ? '最高！' : rating === 4 ? 'とても良い' : rating === 3 ? '普通' : rating === 2 ? 'いまいち' : '改善が必要'}
                        </p>
                    )}
                </div>

                {/* Comment */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase">コメント（任意）</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="感想やご意見があればお書きください..."
                        className="w-full h-32 p-4 bg-black border border-gray-700 text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none resize-none"
                    />
                </div>

                {/* Submit */}
                <Button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-lg disabled:bg-gray-700 disabled:text-gray-500"
                >
                    <Send className="w-5 h-5 mr-2" />
                    フィードバックを送信
                </Button>

                <a
                    href="/guest/schedule"
                    className="block text-center text-gray-500 hover:text-white transition-colors"
                >
                    スキップ
                </a>
            </div>
        </div>
    );
}
