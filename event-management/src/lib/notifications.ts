import { ParticipantStatus } from './demo-context';

interface NotificationChannels {
    discord?: string;  // Discord Webhook URL
    lineNotify?: string;  // LINE Notify Token
    slack?: string;  // Slack Webhook URL
}

// 二重通知防止用のクールダウン設定（ミリ秒）
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5分

export async function sendNotification(message: string, channels?: NotificationChannels) {
    const discordUrl = channels?.discord || process.env.DISCORD_WEBHOOK_URL;
    const lineNotifyToken = channels?.lineNotify || process.env.LINE_NOTIFY_TOKEN;
    const slackUrl = channels?.slack || process.env.SLACK_WEBHOOK_URL;

    const errors: Error[] = [];

    // Discord Webhook
    if (discordUrl) {
        try {
            await fetch(discordUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: message }),
            });
            console.log("Discord notification sent");
        } catch (e) {
            console.error("Discord Notification Error:", e);
            errors.push(e as Error);
        }
    }

    // LINE Notify
    if (lineNotifyToken) {
        try {
            await fetch("https://notify-api.line.me/api/notify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Bearer ${lineNotifyToken}`,
                },
                body: `message=${encodeURIComponent(message)}`,
            });
            console.log("LINE Notify sent");
        } catch (e) {
            console.error("LINE Notify Error:", e);
            errors.push(e as Error);
        }
    }

    // Slack Webhook
    if (slackUrl) {
        try {
            await fetch(slackUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message }),
            });
            console.log("Slack notification sent");
        } catch (e) {
            console.error("Slack Notification Error:", e);
            errors.push(e as Error);
        }
    }

    return { success: errors.length === 0, errors };
}

// VIPステータスかどうかを判定
export function isVipStatus(status: ParticipantStatus): boolean {
    return ['vip', 'platinum', 'gold', 'silver', 'sponsor', 'speaker', 'media'].includes(status);
}

// ステータス別の絵文字とラベル
const STATUS_EMOJI: Record<string, { emoji: string; label: string }> = {
    platinum: { emoji: '💎', label: 'プラチナスポンサー' },
    gold: { emoji: '🥇', label: 'ゴールドスポンサー' },
    silver: { emoji: '🥈', label: 'シルバースポンサー' },
    vip: { emoji: '⭐', label: 'VIP' },
    sponsor: { emoji: '🏢', label: 'スポンサー' },
    speaker: { emoji: '🎤', label: '登壇者' },
    media: { emoji: '📺', label: 'メディア' },
};

// 二重通知チェック（クールダウン内かどうか）
export function shouldNotify(lastNotifiedAt?: string): boolean {
    if (!lastNotifiedAt) return true;
    const lastTime = new Date(lastNotifiedAt).getTime();
    const now = Date.now();
    return (now - lastTime) > NOTIFICATION_COOLDOWN;
}

// VIP/スポンサー来場通知
export async function notifyVipArrival(
    participantName: string,
    status: ParticipantStatus,
    company?: string,
    lastNotifiedAt?: string,
    isReentry?: boolean,
    webhookUrl?: string,
    template?: string
): Promise<{ success: boolean; notified: boolean; errors?: Error[] }> {
    console.log(`[notifyVipArrival] Name:${participantName}, Status:${status}, Reentry:${isReentry}`);
    // 二重通知チェック
    if (!shouldNotify(lastNotifiedAt)) {
        console.log("[notifyVipArrival] Cooldown active");
        console.log(`Notification skipped for ${participantName} (cooldown)`);
        return { success: true, notified: false };
    }

    // VIPステータスかチェック
    if (!isVipStatus(status)) {
        return { success: true, notified: false };
    }

    const statusInfo = STATUS_EMOJI[status] || { emoji: '🎉', label: 'VIP' };
    const companyText = company ? `（${company}）` : "";
    const actionText = isReentry ? "再入場されました" : "ご来場されました";
    const prefix = isReentry ? "🔄 " : "";

    let messageTemplate = template || "@everyone\n{prefix}{emoji} {label}のお客様が{action}\n\n👤 {name}{company_brackets} 様";

    // エスケープされた改行文字を実際の改行に変換
    messageTemplate = messageTemplate.replace(/\\n/g, '\n');

    const message = messageTemplate
        .replace("{prefix}", prefix)
        .replace("{emoji}", statusInfo.emoji)
        .replace("{label}", statusInfo.label)
        .replace("{action}", actionText)
        .replace("{name}", participantName)
        .replace("{company}", company || "")
        .replace("{company_brackets}", companyText);

    const result = await sendNotification(message, { discord: webhookUrl });
    return { ...result, notified: true };
}

