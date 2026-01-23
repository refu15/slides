"use client";

import { useDemo } from "@/lib/demo-context";
import { Clock, MapPin, User, MessageSquare, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SchedulePage() {
    const { sessions, venues, settings } = useDemo();

    const sortedSessions = [...sessions].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );

    const getVenueName = (venueId: string) => {
        return venues.find(v => v.id === venueId)?.name || venueId;
    };

    // Group sessions by time blocks
    const currentTime = new Date().toTimeString().slice(0, 5);

    const upcomingSessions = sortedSessions.filter(s => s.startTime > currentTime);
    const ongoingSessions = sortedSessions.filter(s => s.startTime <= currentTime && s.endTime > currentTime);
    const pastSessions = sortedSessions.filter(s => s.endTime <= currentTime);

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b-4 border-black p-6">
                <div className="max-w-2xl mx-auto">
                    <Link href="/guest" className="inline-flex items-center text-gray-500 hover:text-black mb-4 font-bold uppercase tracking-widest text-sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        戻る
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                        タイムテーブル
                    </h1>
                    <div className="flex items-center gap-2 text-gray-500 mt-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{settings.eventDate || new Date().toLocaleDateString("ja-JP")}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto p-6 space-y-8">

                {sessions.length === 0 ? (
                    <div className="border-4 border-dashed border-gray-200 p-16 text-center">
                        <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-400 uppercase">セッションがありません</h3>
                        <p className="text-gray-400 mt-2">まもなく公開されます</p>
                    </div>
                ) : (
                    <>
                        {/* Ongoing Sessions */}
                        {ongoingSessions.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                                    開催中
                                </h2>
                                <div className="space-y-4">
                                    {ongoingSessions.map((session) => (
                                        <SessionCard key={session.id} session={session} getVenueName={getVenueName} highlight />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Upcoming Sessions */}
                        {upcomingSessions.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
                                    これから
                                </h2>
                                <div className="space-y-4">
                                    {upcomingSessions.map((session) => (
                                        <SessionCard key={session.id} session={session} getVenueName={getVenueName} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Past Sessions */}
                        {pastSessions.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300 mb-4">
                                    終了
                                </h2>
                                <div className="space-y-4 opacity-50">
                                    {pastSessions.map((session) => (
                                        <SessionCard key={session.id} session={session} getVenueName={getVenueName} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

function SessionCard({ session, getVenueName, highlight = false }: {
    session: any;
    getVenueName: (id: string) => string;
    highlight?: boolean;
}) {
    return (
        <div className={`border-2 ${highlight ? 'border-red-600 bg-red-50' : 'border-black'} p-5`}>
            <div className="flex items-center gap-3 mb-2">
                <span className={`text-sm font-mono font-bold ${highlight ? 'text-red-600' : 'text-gray-600'}`}>
                    {session.startTime} - {session.endTime}
                </span>
                {session.allowFeedback && (
                    <Link
                        href={`/guest/feedback/${session.id}`}
                        className="flex items-center gap-1 text-xs font-bold uppercase text-green-600 hover:underline"
                    >
                        <MessageSquare className="w-3 h-3" />
                        評価する
                    </Link>
                )}
            </div>
            <h3 className="text-lg font-black uppercase mb-2">
                {session.title}
            </h3>
            {session.description && (
                <p className="text-gray-600 text-sm mb-3">{session.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {session.speaker && (
                    <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {session.speaker}
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {getVenueName(session.venueId)}
                </span>
            </div>
        </div>
    );
}
