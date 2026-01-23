"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-4">
            <div className="bg-white border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center max-w-lg w-full">
                <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl font-black">!</span>
                </div>
                <h1 className="text-4xl font-black text-black mb-2 uppercase tracking-tighter">System Error</h1>
                <p className="text-red-600 font-bold mb-8 uppercase tracking-widest text-sm">
                    Something went wrong
                </p>

                <div className="bg-gray-100 p-4 border-2 border-dashed border-gray-300 mb-8 text-left overflow-auto max-h-40">
                    <p className="font-mono text-xs text-gray-500 break-all">
                        {error.message || "Unknown error occurred."}
                    </p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={() => reset()}
                        className="w-full h-14 bg-black text-white font-black uppercase tracking-widest text-lg border-2 border-black hover:bg-white hover:text-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        Try Again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/'}
                        className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-lg border-2 border-black hover:bg-black hover:text-white transition-all"
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
