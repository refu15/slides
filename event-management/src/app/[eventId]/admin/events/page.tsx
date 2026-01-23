import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Demo events data
const DEMO_EVENTS = [
    {
        id: "demo-event-1",
        name: "Tech Conference 2026",
        start_time: "2026-02-15T09:00:00",
        venue_name: "Convention Center A",
        capacity: 200,
    },
    {
        id: "demo-event-2",
        name: "Product Launch Event",
        start_time: "2026-02-20T14:00:00",
        venue_name: "Grand Hall B",
        capacity: 100,
    },
    {
        id: "demo-event-3",
        name: "Networking Meetup",
        start_time: "2026-03-01T18:00:00",
        venue_name: "Startup Hub",
        capacity: 50,
    },
];

export default async function EventsPage() {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get("demo_user_role")?.value;

    if (!demoRole) {
        redirect("/login");
    }

    return (
        <div className="container mx-auto p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Events</h1>
                    <p className="text-sm text-gray-500 mt-1">🎮 Demo Mode</p>
                </div>
                <div className="flex gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="ghost">← Dashboard</Button>
                    </Link>
                    <Link href="/admin/events/new">
                        <Button>Create New Event</Button>
                    </Link>
                </div>
            </header>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {DEMO_EVENTS.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.name}</TableCell>
                                <TableCell>
                                    {new Date(event.start_time).toLocaleDateString("ja-JP", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </TableCell>
                                <TableCell>{event.venue_name}</TableCell>
                                <TableCell>{event.capacity}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/admin/events/${event.id}`}>
                                        <Button variant="outline" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
