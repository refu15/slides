export default function GuestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <header className="bg-black text-white p-4 text-center">
                    <h1 className="text-xl font-black uppercase tracking-tight">Check-in</h1>
                </header>
                <main className="p-6">
                    {children}
                </main>
                <footer className="p-4 text-center text-xs text-gray-400 font-mono">
                    Powered by Event Manager
                </footer>
            </div>
        </div>
    );
}
