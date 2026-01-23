"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

// Demo attendees data
const DEMO_ATTENDEES = [
    { id: "demo-001", name: "山田 太郎", company: "Tech Corp", category: "vip", checkins: [{ checked_in_at: "2026-01-15T10:30:00" }] },
    { id: "demo-002", name: "佐藤 花子", company: "Design Studio", category: "general", checkins: [] },
    { id: "demo-003", name: "田中 一郎", company: "Startup Inc", category: "general", checkins: [{ checked_in_at: "2026-01-15T11:15:00" }] },
    { id: "demo-004", name: "鈴木 美咲", company: "Marketing Agency", category: "vip", checkins: [] },
];

const DEMO_EVENTS: Record<string, { name: string; venue_name: string; start_time: string }> = {
    "demo-event-1": { name: "Tech Conference 2026", venue_name: "Convention Center A", start_time: "2026-02-15T09:00:00" },
    "demo-event-2": { name: "Product Launch Event", venue_name: "Grand Hall B", start_time: "2026-02-20T14:00:00" },
    "demo-event-3": { name: "Networking Meetup", venue_name: "Startup Hub", start_time: "2026-03-01T18:00:00" },
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams.id;
    const router = useRouter();

    const [attendees, setAttendees] = useState(DEMO_ATTENDEES);
    const [success, setSuccess] = useState(false);
    const [newAttendee, setNewAttendee] = useState({ name: "", email: "", company: "", category: "general" });
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    const event = DEMO_EVENTS[eventId] || { name: "Demo Event", venue_name: "Demo Venue", start_time: "2026-01-01T10:00:00" };
    const registrationUrl = `http://localhost:3000/event/${eventId}/register`;

    // Check auth & generate QR
    useEffect(() => {
        const cookies = document.cookie;
        if (!cookies.includes("demo_user_role")) {
            router.push("/login");
            return;
        }

        // Generate QR code
        import("qrcode").then(QRCode => {
            QRCode.toDataURL(registrationUrl).then(url => setQrCodeUrl(url));
        });
    }, [router, registrationUrl]);

    const handleAddAttendee = (e: React.FormEvent) => {
        e.preventDefault();
        const id = `attendee-${Date.now()}`;
        setAttendees(prev => [...prev, {
            id,
            name: newAttendee.name,
            company: newAttendee.company,
            category: newAttendee.category,
            checkins: []
        }]);
        setNewAttendee({ name: "", email: "", company: "", category: "general" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    return (
        <div className="container mx-auto p-8">
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/admin/events">
                            <Button variant="ghost" size="sm">← Back</Button>
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold">{event.name}</h1>
                    <p className="text-gray-500">{event.venue_name}</p>
                    <p className="text-sm text-gray-500 mt-1">🎮 Demo Mode</p>
                </div>
                <div className="text-center">
                    <p className="mb-2 text-sm font-medium">Registration QR</p>
                    {qrCodeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrCodeUrl} alt="Event QR" className="h-32 w-32 border" />
                    ) : (
                        <div className="h-32 w-32 border bg-gray-100 flex items-center justify-center text-gray-400">
                            Loading...
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Add Attendee Form */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Add Attendee</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {success && (
                            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                                <AlertDescription>✅ Attendee added!</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={handleAddAttendee} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={newAttendee.name}
                                    onChange={(e) => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newAttendee.email}
                                    onChange={(e) => setNewAttendee(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    value={newAttendee.company}
                                    onChange={(e) => setNewAttendee(prev => ({ ...prev, company: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <select
                                    name="category"
                                    className="w-full rounded-md border p-2 text-sm"
                                    value={newAttendee.category}
                                    onChange={(e) => setNewAttendee(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value="general">General</option>
                                    <option value="vip">VIP</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full">
                                Add Attendee
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Attendee List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Attendee List ({attendees.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendees.map((att) => (
                                    <TableRow key={att.id}>
                                        <TableCell>
                                            <div>{att.name}</div>
                                            <div className="text-xs text-gray-500">{att.company}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`rounded px-2 py-1 text-xs font-bold ${att.category === 'vip' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {att.category.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {att.checkins && att.checkins.length > 0 ? (
                                                <span className="text-green-600 font-medium">Checked In</span>
                                            ) : (
                                                <span className="text-gray-400">Waiting</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{att.id}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
