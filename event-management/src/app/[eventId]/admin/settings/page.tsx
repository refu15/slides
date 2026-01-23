"use client";

import { useState, useEffect } from "react";
import { useDemo, Settings } from "@/lib/demo-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Save, Bell, Download, Trash2, AlertTriangle, Database, Link2, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const {
        settings, venues, participants, checkInLogs, notificationLogs, sessions, categories,
        initializeSystem, clearAllParticipants, clearNotificationLogs, resetSystem, eventId
    } = useDemo();
    const router = useRouter();

    // Local state for form
    const [formData, setFormData] = useState<Settings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // 招待URL生成
    const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
    const [inviteUrl, setInviteUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (key: keyof Settings, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        initializeSystem({ ...formData, venues });
        setTimeout(() => {
            setIsSaving(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }, 500);
    };

    // --- Backup & Restore ---
    const handleBackup = () => {
        const data = {
            id: eventId,
            name: settings.eventName,
            createdAt: new Date().toISOString(),
            settings, venues, categories, participants, checkInLogs, sessions, notificationLogs
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-${eventId}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- Danger Actions ---
    const handleClearParticipants = () => {
        if (confirm("【警告】参加者名簿とチェックイン履歴をすべて消去しますか？\nこの操作は元に戻せません。")) {
            clearAllParticipants();
            alert("参加者データを消去しました。");
        }
    };

    const handleClearLogs = () => {
        if (confirm("通知ログ履歴をすべて消去しますか？")) {
            clearNotificationLogs();
            alert("通知ログを消去しました。");
        }
    };

    const generateInviteUrl = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    role: inviteRole,
                    expiresIn: 7 * 24 * 60 * 60, // 7日間
                    maxUses: 10
                })
            });
            const data = await res.json();
            if (data.inviteUrl) {
                setInviteUrl(data.inviteUrl);
            } else {
                alert('招待URLの生成に失敗しました');
            }
        } catch (e) {
            console.error('Invite generation error:', e);
            alert('招待URLの生成に失敗しました');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-12">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <SettingsIcon className="w-8 h-8" />
                システム設定
            </h1>

            <div className="grid gap-6">
                {/* Event Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>イベント基本情報</CardTitle>
                        <CardDescription>イベント名や開催日時の設定</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="eventName">イベント名</Label>
                                <Input
                                    id="eventName"
                                    value={formData.eventName}
                                    onChange={(e) => handleChange('eventName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eventDate">開催日</Label>
                                <Input
                                    id="eventDate"
                                    type="date"
                                    value={formData.eventDate}
                                    onChange={(e) => handleChange('eventDate', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">開始時間</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={formData.startTime || ""}
                                    onChange={(e) => handleChange('startTime', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">終了時間</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={formData.endTime || ""}
                                    onChange={(e) => handleChange('endTime', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">懇親会 (After Party)</Label>
                                <p className="text-sm text-muted-foreground">
                                    イベント終了後の懇親会を開催するかどうか
                                </p>
                            </div>
                            <Switch
                                checked={formData.enableAfterParty}
                                onCheckedChange={(checked) => handleChange('enableAfterParty', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* WiFi Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>会場情報 & WiFi設定</CardTitle>
                        <CardDescription>参加者向けに表示するWiFi情報など</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="wifiSSID">WiFi SSID</Label>
                                <Input
                                    id="wifiSSID"
                                    placeholder="Event_Guest_WiFi"
                                    value={formData.wifiSSID || ""}
                                    onChange={(e) => handleChange('wifiSSID', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wifiPassword">WiFi Password</Label>
                                <Input
                                    id="wifiPassword"
                                    placeholder="password123"
                                    value={formData.wifiPassword || ""}
                                    onChange={(e) => handleChange('wifiPassword', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wifiNote">補足メッセージ（配慮の一言）</Label>
                            <Input
                                id="wifiNote"
                                placeholder="※会場の電波が弱いためご注意ください、等"
                                value={formData.wifiNote || ""}
                                onChange={(e) => handleChange('wifiNote', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" /> 通知設定
                        </CardTitle>
                        <CardDescription>Discord通知などの設定</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="discordWebhookUrl">Discord Webhook URL</Label>
                            <Input
                                id="discordWebhookUrl"
                                placeholder="https://discord.com/api/webhooks/..."
                                value={formData.discordWebhookUrl || ""}
                                onChange={(e) => handleChange('discordWebhookUrl', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                ※Webhook URLを設定すると、VIP・スポンサー・登壇者・メディアが入場した際に通知が送信されます。
                            </p>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="discordTemplate">通知メッセージテンプレート</Label>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">テンプレートプリセット</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleChange('discordNotificationTemplate', e.target.value);
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- プリセットを選択 --</option>
                                    <option value="@everyone\n{prefix}{emoji} {label}のお客様が{action}\n\n👤 {name}{company_brackets} 様">標準 (@everyoneあり)</option>
                                    <option value="{prefix}{emoji} {label}のお客様が{action}\n\n👤 {name}{company_brackets} 様">標準 (メンションなし)</option>
                                    <option value="{prefix}{emoji} {name} 様 ({label}) が{action}">シンプル</option>
                                    <option value="@everyone\n----------------\n{prefix}{emoji} **{label} 通知**\n----------------\n会社名: {company}\n氏名: {name} 様\n\n{action}\n----------------">詳細 (強調スタイル)</option>
                                </select>
                            </div>

                            <textarea
                                id="discordTemplate"
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                placeholder="{emoji} {label}のお客様が{action}"
                                value={formData.discordNotificationTemplate || ""}
                                onChange={(e) => handleChange('discordNotificationTemplate', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                利用可能な変数: {'{emoji}'}, {'{label}'}, {'{name}'}, {'{company}'}, {'{action}'}
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">再入場通知</Label>
                                <p className="text-sm text-muted-foreground">
                                    一度チェックアウトした参加者が再入場した際にも通知を送ります。
                                </p>
                            </div>
                            <Switch
                                checked={formData.notifyReentry}
                                onCheckedChange={(checked) => handleChange('notifyReentry', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>セキュリティ設定</CardTitle>
                        <CardDescription>管理用・スタッフ用パスワードの変更</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adminPass">管理者パスワード</Label>
                                <Input
                                    id="adminPass"
                                    type="password"
                                    value={formData.adminPassword}
                                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staffPass">スタッフパスワード</Label>
                                <Input
                                    id="staffPass"
                                    type="password"
                                    value={formData.staffPassword}
                                    onChange={(e) => handleChange('staffPassword', e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Invite URL Generation */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5" /> 招待URL管理
                        </CardTitle>
                        <CardDescription>管理者・スタッフを招待するURLを生成</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>ロール</Label>
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'staff')}
                                className="w-full border-2 border-gray-300 rounded px-3 py-2 font-bold"
                            >
                                <option value="staff">スタッフ</option>
                                <option value="admin">管理者</option>
                            </select>
                            <p className="text-xs text-gray-500">
                                有効期限: 7日間 | 使用回数: 10回まで
                            </p>
                        </div>

                        <Button
                            onClick={generateInviteUrl}
                            disabled={isGenerating}
                            className="w-full bg-black text-white hover:bg-gray-800"
                        >
                            {isGenerating ? '生成中...' : '招待URLを生成'}
                        </Button>

                        {inviteUrl && (
                            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded space-y-2">
                                <p className="text-sm font-bold text-gray-700">招待URL:</p>
                                <code className="text-xs break-all block bg-white p-2 border border-gray-300 rounded">
                                    {inviteUrl}
                                </code>
                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            コピーしました!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-2" />
                                            URLをコピー
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex flex-col items-end gap-2 border-t pt-6">
                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded animate-in fade-in slide-in-from-bottom-2">
                            設定を保存しました！
                        </div>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto min-w-[150px]">
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "保存中..." : "設定を保存"}
                    </Button>
                </div>

                {/* Data Management Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    {/* Backup */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5" /> データのバックアップ
                            </CardTitle>
                            <CardDescription>現在の全データをJSONファイルとしてダウンロードします。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" onClick={handleBackup} className="w-full border-black">
                                <Download className="w-4 h-4 mr-2" />
                                バックアップ・データをダウンロード
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-5 h-5" /> 危険エリア (Danger Zone)
                            </CardTitle>
                            <CardDescription>注意：この操作は元に戻せません。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="destructive" onClick={handleClearParticipants} className="w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                                <Trash2 className="w-4 h-4 mr-2" />
                                参加者・履歴のみ消去
                            </Button>
                            <Button variant="destructive" onClick={handleClearLogs} className="w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                                <Trash2 className="w-4 h-4 mr-2" />
                                通知ログのみ消去
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}
