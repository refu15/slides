"use client";

import { DemoProvider } from "@/lib/demo-context";
import { useParams } from "next/navigation";

export default function EventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const eventId = params.eventId as string;

    return (
        <DemoProvider eventId={eventId}>
            {children}
        </DemoProvider>
    );
}
