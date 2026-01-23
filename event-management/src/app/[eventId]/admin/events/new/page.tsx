"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function NewEventPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setSuccess(true);
        setIsSubmitting(false);

        // Redirect after short delay
        setTimeout(() => {
            router.push("/admin/events");
        }, 1500);
    };

    return (
        <div className="container mx-auto flex max-w-2xl flex-col justify-center p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Create New Event</h1>
                <Link href="/admin/dashboard">
                    <Button variant="ghost">← Dashboard</Button>
                </Link>
            </div>
            <p className="text-sm text-gray-500 mb-4">🎮 Demo Mode</p>

            <Card>
                <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {success && (
                        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                            <AlertDescription>
                                ✅ Event created successfully! Redirecting...
                            </AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Event Name *</Label>
                            <Input id="name" name="name" required placeholder="e.g. Annual Tech Conference" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time *</Label>
                                <Input id="start_time" name="start_time" type="datetime-local" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">End Time *</Label>
                                <Input id="end_time" name="end_time" type="datetime-local" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="venue_name">Venue Name</Label>
                            <Input id="venue_name" name="venue_name" placeholder="Conference Room A" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input id="capacity" name="capacity" type="number" placeholder="100" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" name="description" placeholder="Brief description of the event" />
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Event"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
