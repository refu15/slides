"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                    },
                },
            });

            if (authError) throw authError;

            // 2. Create Profile
            // Attempt manual profile creation (for when trigger fails or doesn't exist)
            // We ignore error if it's already created by trigger.
            if (authData.user) {
                const { error: profileError } = await supabase.from("profiles").insert({
                    id: authData.user.id,
                    email: email,
                    display_name: displayName,
                    role: "admin", // Defaulting to admin for MVP trial
                    is_password_changed: false,
                });

                if (profileError && profileError.code !== '23505') { // 23505 is unique constraint violation (already exists)
                    console.error("Profile creation warning:", profileError);
                    // We don't block flow here because Auth is successful.
                }
            }

            router.push("/admin/dashboard");

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to sign up");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-none shadow-2xl bg-white/90 dark:bg-gray-900/90">
                    <CardHeader>
                        <CardTitle className="text-center text-3xl font-extrabold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                            Get Started
                        </CardTitle>
                        <p className="text-center text-sm text-gray-500 mt-2">Create your admin account</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-6">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="display_name">Full Name</Label>
                                <Input
                                    id="display_name"
                                    placeholder="John Doe"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                />
                                <p className="text-xs text-gray-400">Must be at least 6 characters</p>
                            </div>
                            <Button type="submit" className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600" disabled={loading}>
                                {loading ? "Creating Account..." : "Create Account"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center text-sm text-gray-500 pb-8">
                        Already have an account?
                        <Link href="/login" className="ml-1 font-semibold text-pink-600 hover:underline">
                            Sign in
                        </Link>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
