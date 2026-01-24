import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Link as LinkIcon } from "lucide-react";

export default async function PortalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = await params;
    const cookieStore = await cookies();
    const attendeeId = cookieStore.get("attendee_id")?.value;
    const supabase = await createClient();

    let attendee = null;
    let isStaff = false;

    // Check for staff session if no attendee_id
    if (!attendeeId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: role } = await supabase
                .from('event_roles')
                .select('role')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .single();

            if (role && (role.role === 'owner' || role.role === 'admin' || role.role === 'staff')) {
                isStaff = true;
            }
        }

        if (!isStaff) {
            redirect(`/event/${eventId}/register`);
        }
    } else {
        // Fetch Attendee
        const { data } = await supabase
            .from("attendees")
            .select("*")
            .eq("id", attendeeId)
            .single();
        attendee = data;
    }

    // Fetch Event
    const { data: event } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <div>Event not found</div>;

    // Fetch Materials
    const { data: materials } = await supabase
        .from("event_materials")
        .select("*")
        .eq("event_id", eventId);

    return (
        <div className="container mx-auto min-h-screen max-w-lg p-4 pb-20">
            <header className="mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold">{event.name}</h1>
                <p className="text-gray-500">Welcome, {attendee?.name}</p>
            </header>

            <div className="space-y-6">
                {/* Materials Section */}
                <section>
                    <h2 className="mb-3 text-lg font-semibold">Materials</h2>
                    <div className="grid gap-3">
                        {materials && materials.length > 0 ? (
                            materials.map((mat) => (
                                <Card key={mat.id} className="hover:bg-gray-50">
                                    <CardContent className="flex items-center gap-3 p-4">
                                        {mat.type === 'file' ? <FileText className="h-5 w-5 text-blue-500" /> : <LinkIcon className="h-5 w-5 text-green-500" />}
                                        <a href={mat.url} target="_blank" rel="noopener noreferrer" className="flex-1 font-medium text-blue-600 hover:underline">
                                            {mat.title}
                                        </a>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-gray-400 text-sm">No materials available yet.</p>
                        )}
                    </div>
                </section>

                {/* Survey Section */}
                <section>
                    <h2 className="mb-3 text-lg font-semibold">Feedback</h2>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="mb-4 text-sm text-gray-600">Please let us know your thoughts!</p>
                            <Link href={`/event/${eventId}/survey`}>
                                <Button variant="outline" className="w-full">
                                    Take Survey
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </section>

                {/* Info */}
                <section>
                    <h2 className="mb-3 text-lg font-semibold">My ID</h2>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-400 mb-1">Pass this ID to staff if QR fails</p>
                            <p className="font-mono font-bold text-lg tracking-widest">{attendeeId?.slice(0, 8)}...</p>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}
