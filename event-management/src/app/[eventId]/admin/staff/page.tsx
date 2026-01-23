"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

// Demo staff data
const DEMO_STAFF = [
    { id: "staff-1", display_name: "田中 花子", email: "tanaka@demo.com", created_at: "2025-12-01" },
    { id: "staff-2", display_name: "鈴木 太郎", email: "suzuki@demo.com", created_at: "2025-12-15" },
    { id: "staff-3", display_name: "佐藤 美咲", email: "sato@demo.com", created_at: "2026-01-05" },
];

export default function StaffPage() {
    const router = useRouter();
    const [staffList, setStaffList] = useState(DEMO_STAFF);
    const [success, setSuccess] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });

    // Check auth
    useEffect(() => {
        const cookies = document.cookie;
        if (!cookies.includes("demo_user_role=admin")) {
            router.push("/login");
        }
    }, [router]);

    const handleAddStaff = (e: React.FormEvent) => {
        e.preventDefault();
        const id = `staff-${Date.now()}`;
        setStaffList(prev => [...prev, {
            id,
            display_name: newStaff.name,
            email: newStaff.email,
            created_at: new Date().toISOString().split("T")[0]
        }]);
        setNewStaff({ name: "", email: "", password: "" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    return (
        <div className="container mx-auto p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Staff Management</h1>
                    <p className="text-sm text-gray-500 mt-1">🎮 Demo Mode</p>
                </div>
                <Link href="/admin/dashboard">
                    <Button variant="ghost">← Dashboard</Button>
                </Link>
            </header>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Create Staff Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Invite New Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {success && (
                            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                                <AlertDescription>✅ Staff added successfully!</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="display_name">Name</Label>
                                <Input
                                    id="display_name"
                                    value={newStaff.name}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    placeholder="Staff Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newStaff.email}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                    placeholder="staff@company.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Initial Password</Label>
                                <Input
                                    id="password"
                                    type="text"
                                    value={newStaff.password}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, password: e.target.value }))}
                                    required
                                    placeholder="TemporaryPassword123"
                                />
                            </div>
                            <Button type="submit">
                                Create Account
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Staff List */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffList.map((staff) => (
                                <TableRow key={staff.id}>
                                    <TableCell>{staff.display_name}</TableCell>
                                    <TableCell>{staff.email}</TableCell>
                                    <TableCell>
                                        {new Date(staff.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
