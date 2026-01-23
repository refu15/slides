import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <div className="bg-white border-2 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center max-w-lg w-full">
                <h1 className="text-8xl font-black text-black mb-4">404</h1>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Page Not Found</h2>
                <p className="text-gray-500 font-bold mb-8">
                    お探しのページが見つかりません。
                </p>
                <div className="space-y-4">
                    <Link href="/" className="block">
                        <Button className="w-full h-14 bg-black text-white font-black uppercase tracking-widest text-lg border-2 border-black hover:bg-white hover:text-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                            ポータルに戻る
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
