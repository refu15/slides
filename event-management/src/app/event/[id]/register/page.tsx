"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { u } from "framer-motion/client";

export default function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
    // Note: In Next.js 15, params is passed as a promise, but since we are mocking everything client-side
    // and not using the ID for server fetching, we can just handle the UI.

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSuccess(true);
    };

    if (isSuccess) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <CardTitle className="text-center text-xl text-green-700">Registration Successful!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                        <p>Thank you for registering.</p>
                        <p className="mt-2 text-sm">You verify your check-in at the venue.</p>

                        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs font-mono text-left">
                            <p className="font-bold text-gray-700 mb-1">Demo Debug Info:</p>
                            <p>Status: Registered (Mock)</p>
                            <p>Event ID: demo-event-1</p>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Button variant="outline" onClick={() => setIsSuccess(false)}>Register Another</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Welcome to the Event</CardTitle>
                    <p className="text-center text-sm text-gray-500">Please enter your details to access materials.</p>
                    <p className="text-center text-xs text-blue-500 mt-2 font-medium">🎮 Demo Mode Active</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" name="name" required placeholder="Your Name" disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">Company (Optional)</Label>
                            <Input id="company" name="company" placeholder="Company Name" disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input id="email" name="email" type="email" placeholder="Email Address" disabled={isSubmitting} />
                        </div>
                        <Button className="w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Registering..." : "Enter"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-xs text-gray-400">
                    Powered by Event Manager
                </CardFooter>
            </Card>
        </div>
    );
}
