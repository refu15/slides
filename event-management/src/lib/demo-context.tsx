"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { notifyVipArrival } from '@/lib/notifications';
import { romajiToHiragana, toKatakana, hasMinOverlap, calculateMatchScore } from './kana';

// --- Types (Matching Server Data Structure) ---

export type Venue = {
    id: string;
    name: string;
    capacity: number;
};

export type Category = {
    id: string;
    name: string;
    color: string;
    isVip: boolean;
};

export type ParticipantStatus = string;
export type TicketType = 'attendance' | 'online' | 'archive';
export type ConfirmationStatus = 'unconfirmed' | 'confirmed';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending';
export type ParticipantSource = 'ptx' | 'invitation' | 'sponsor' | 'media' | 'other';

export type Participant = {
    id: string;
    name: string;
    furigana: string;
    email: string;
    phone: string;
    organization: string;
    category: string;
    isVip: boolean;
    registeredAt: string;
    status: ParticipantStatus;
    ticketType: TicketType;
    hasAfterParty: boolean;
    confirmationStatus: ConfirmationStatus;
    paymentStatus: PaymentStatus;
    lastNotifiedAt?: string;
    source: ParticipantSource;
    ptxOrderKey?: string;
    ticketCount?: number;
    hasMultipleTickets: boolean;
    ticketDetails?: string;
    notes?: string;
    multiTicketNote?: string;
    multiTicketConfirmed?: boolean;
};

export type CheckInLog = {
    timestamp: string;
    userId: string;
    name: string;
    action: 'checkin' | 'checkout' | 'temporary_exit';
    venue: string;
    method: 'qr' | 'manual' | 'self';
    staffName: string;
    memo?: string;
};

export type NotificationLog = {
    id: string;
    timestamp: string;
    type: 'vip_arrival' | 'reentry' | 'other';
    targetName: string;
    targetOrg: string;
    message: string;
    status: 'success' | 'failed';
    error?: string;
};

export type Session = {
    id: string;
    title: string;
    description: string;
    speaker?: string;
    startTime: string;
    endTime: string;
    venueId: string;
    allowFeedback: boolean;
};

export type Settings = {
    eventName: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    venueName: string;
    address: string;
    adminPassword: string;
    staffPassword: string;
    isInitialized: boolean;
    notifyReentry: boolean;
    enableAfterParty: boolean;
    wifiSSID?: string;
    wifiPassword?: string;
    discordWebhookUrl?: string;
    discordNotificationTemplate?: string;
    wifiNote?: string;
};

type DemoContextType = {
    isLoading: boolean;
    eventId: string;
    settings: Settings;
    venues: Venue[];
    categories: Category[];
    participants: Participant[];
    checkInLogs: CheckInLog[];
    sessions: Session[];
    notificationLogs: NotificationLog[];

    // Actions
    initializeSystem: (data: Partial<Settings> & { venues: Venue[] }) => void;
    addParticipant: (p: Participant) => void;
    bulkAddParticipants: (ps: Participant[]) => void;
    checkIn: (userId: string, venueId: string, method: 'qr' | 'manual' | 'self', staffName?: string, memo?: string) => Promise<{ success: boolean, message: string, participant?: Participant, isReentry?: boolean, isAlreadyIn?: boolean }>;
    checkOut: (userId: string, venueId: string, method: 'qr' | 'manual' | 'self', staffName?: string, actionType?: 'checkout' | 'temporary_exit') => Promise<{ success: boolean, message: string, participant?: Participant }>;
    getVenueStats: (venueId: string) => { current: number, total: number, capacity: number };
    verifyPassword: (password: string, type: 'admin' | 'staff') => boolean;
    resetSystem: () => void;
    updateParticipant: (id: string, data: Partial<Participant>) => void;
    deleteParticipant: (id: string) => void;
    bulkDeleteParticipants: (ids: string[]) => void;
    addSession: (s: Session) => void;
    updateSession: (id: string, data: Partial<Session>) => void;
    deleteSession: (id: string) => void;
    findParticipants: (name: string, organization: string, email?: string) => Participant[];
    addNotificationLog: (log: Omit<NotificationLog, 'id' | 'timestamp'>) => void;
    addCategory: (c: Category) => void;
    updateCategory: (id: string, data: Partial<Category>) => void;
    deleteCategory: (id: string) => void;

    // Data Management
    clearAllParticipants: () => void;
    clearNotificationLogs: () => void;
};

const DEFAULT_SETTINGS: Settings = {
    eventName: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    venueName: "",
    address: "",
    adminPassword: "admin",
    staffPassword: "staff",
    isInitialized: false,
    notifyReentry: false,
    enableAfterParty: true,
    wifiSSID: "",
    wifiPassword: "",
    discordWebhookUrl: "",
    discordNotificationTemplate: "@everyone\n{emoji} {label}のお客様が{action}\n\n👤 {name}{company_brackets} 様",
    wifiNote: "※会場の電波状況により接続しづらい場合があります。",
};

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'general', name: '一般', color: 'bg-gray-100 text-gray-600', isVip: false },
    { id: 'student', name: '学生', color: 'bg-blue-100 text-blue-600', isVip: false },
    { id: 'vip', name: 'VIP', color: 'bg-red-100 text-red-600', isVip: true },
    { id: 'platinum', name: 'プラチナ', color: 'bg-purple-100 text-purple-600', isVip: true },
    { id: 'gold', name: 'ゴールド', color: 'bg-yellow-100 text-yellow-700', isVip: true },
    { id: 'silver', name: 'シルバー', color: 'bg-gray-200 text-gray-700', isVip: true },
    { id: 'media', name: 'メディア', color: 'bg-green-100 text-green-600', isVip: false },
    { id: 'speaker', name: '登壇者', color: 'bg-indigo-100 text-indigo-700', isVip: true },
    { id: 'sponsor', name: 'スポンサー', color: 'bg-orange-100 text-orange-600', isVip: true },
    { id: 'guest', name: '招待・関係者', color: 'bg-teal-100 text-teal-700', isVip: false },
    { id: 'online', name: 'オンライン', color: 'bg-cyan-100 text-cyan-600', isVip: false },
];

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children, eventId = "" }: { children: ReactNode, eventId?: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);

    // Track last local update to prevent polling overwrites
    const lastLocalUpdate = React.useRef(0);

    // --- Sync Logic ---

    // Initial Load
    useEffect(() => {
        if (!eventId) return;
        setIsLoading(true);
        fetch(`/api/events/${eventId}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data && !data.error) {
                    // Load data if exists, otherwise use defaults
                    if (data.settings && Object.keys(data.settings).length > 0) setSettings(data.settings);
                    if (data.venues) setVenues(data.venues);
                    if (data.categories) setCategories(data.categories);
                    if (data.participants) setParticipants(data.participants);
                    if (data.checkInLogs) setCheckInLogs(data.checkInLogs);
                    if (data.sessions) setSessions(data.sessions);
                    if (data.notificationLogs) setNotificationLogs(data.notificationLogs);
                }
            })
            .catch(err => console.error("Failed to load event data:", err))
            .finally(() => setIsLoading(false));
    }, [eventId]);

    // Polling for updates (Simulated Real-time)
    useEffect(() => {
        if (!eventId) return;
        const interval = setInterval(() => {
            // Skip polling if local update happened recently (within 5 seconds)
            if (Date.now() - lastLocalUpdate.current < 5000) return;

            fetch(`/api/events/${eventId}`)
                .then(res => {
                    if (res.status === 404) return null; // Gracefully handle not found
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    if (data && !data.error) {
                        // Check again in case update happened during fetch
                        if (Date.now() - lastLocalUpdate.current < 5000) return;

                        // Optimistic merge needed in production, but for simple sync we replace
                        // Note: This might overwrite local pending state in a real heavy app
                        setParticipants(data.participants || []);
                        setCheckInLogs(data.checkInLogs || []);
                        setNotificationLogs(data.notificationLogs || []);
                        // Settings/Categories/Sessions likely don't change often by others
                    }
                })
                .catch(e => console.error("Poll error", e));
        }, 3000); // 3 seconds poll

        return () => clearInterval(interval);
    }, [eventId]);

    // Sync to Server
    const sync = useCallback(async (newData: any) => {
        if (!eventId) return;
        try {
            await fetch(`/api/events/${eventId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
        } catch (e) {
            console.error("Sync failed:", e);
        }
    }, [eventId]);

    // Auto-save effect with debouncing
    // Batches all state changes into a single sync call to reduce network overhead
    useEffect(() => {
        if (isLoading) return;

        const timeoutId = setTimeout(() => {
            sync({
                settings,
                venues,
                categories,
                participants,
                checkInLogs,
                sessions,
                notificationLogs
            });
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [settings, venues, categories, participants, checkInLogs, sessions, notificationLogs, sync, isLoading]);


    // --- Actions (Similar to before but updating local state) ---

    const initializeSystem = (data: Partial<Settings> & { venues: Venue[] }) => {
        setSettings(prev => ({ ...prev, ...data, isInitialized: true }));
        setVenues(data.venues);
    };

    const addParticipant = (p: Participant) => {
        setParticipants(prev => [...prev, { ...p, registeredAt: new Date().toISOString() }]);
    };

    const bulkAddParticipants = (ps: Participant[]) => {
        const newParticipants = ps.map(p => ({ ...p, registeredAt: new Date().toISOString() }));
        setParticipants(prev => [...prev, ...newParticipants]);
    };

    const updateParticipant = (id: string, data: Partial<Participant>) => {
        setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    };

    const deleteParticipant = (id: string) => {
        setParticipants(prev => prev.filter(p => p.id !== id));
    };

    const bulkDeleteParticipants = (ids: string[]) => {
        const idSet = new Set(ids);
        setParticipants(prev => prev.filter(p => !idSet.has(p.id)));
    };

    const addCategory = (c: Category) => {
        setCategories(prev => [...prev, c]);
    };

    const updateCategory = (id: string, data: Partial<Category>) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    };

    const deleteCategory = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    const checkIn = async (userId: string, venueId: string, method: 'qr' | 'manual' | 'self', staffName: string = "", memo?: string) => {
        const participant = participants.find(p => p.id === userId);
        if (!participant) return { success: false, message: "参加者が見つかりません" };

        const userLogs = checkInLogs
            .filter(l => l.userId === userId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const lastLog = userLogs[0];
        const isCurrentlyCheckedIn = lastLog?.action === 'checkin';
        const wasCheckedOutBefore = lastLog?.action === 'checkout' || lastLog?.action === 'temporary_exit';

        let isAlreadyIn = false;
        let isReentry = false;
        let message = "チェックイン完了";

        if (isCurrentlyCheckedIn) {
            isAlreadyIn = true;
            message = "既にチェックイン済みです（再読み取り記録）";
        } else if (wasCheckedOutBefore) {
            isReentry = true;
            message = "再入場を記録しました";
        }

        const log: CheckInLog = {
            timestamp: new Date().toISOString(),
            userId,
            name: participant.name,
            action: 'checkin',
            venue: venueId,
            method,
            staffName,
            memo
        };

        // Create new logs array
        const newLogs = [...checkInLogs, log];
        setCheckInLogs(newLogs);
        lastLocalUpdate.current = Date.now();

        // Immediate sync to prevent polling overwrite
        sync({ checkInLogs: newLogs });

        // Notify
        if ((!isAlreadyIn || isReentry) && settings.discordWebhookUrl) {
            notifyVipArrival(
                participant.name,
                participant.status,
                participant.organization,
                participant.lastNotifiedAt,
                isReentry,
                settings.discordWebhookUrl,
                settings.discordNotificationTemplate
            ).then(res => {
                if (res.notified) {
                    updateParticipant(userId, { lastNotifiedAt: new Date().toISOString() });
                }
            });
        }

        return { success: true, message, participant, isReentry, isAlreadyIn };
    };

    const checkOut = async (userId: string, venueId: string, method: 'qr' | 'manual' | 'self', staffName: string = "", actionType: 'checkout' | 'temporary_exit' = 'checkout') => {
        const participant = participants.find(p => p.id === userId);
        if (!participant) return { success: false, message: "ID not found" };

        const log: CheckInLog = {
            timestamp: new Date().toISOString(),
            userId,
            name: participant.name,
            action: actionType,
            venue: venueId,
            method,
            staffName
        };

        const newLogs = [...checkInLogs, log];
        setCheckInLogs(newLogs);
        lastLocalUpdate.current = Date.now();

        // Immediate sync
        sync({ checkInLogs: newLogs });
        return { success: true, message: "Checked Out", participant };
    };

    const getVenueStats = (venueId: string) => {
        const venue = venues.find(v => v.id === venueId);
        const capacity = venue?.capacity || 0;
        let current = 0;
        const venueLogs = checkInLogs.filter(l => l.venue === venueId);
        const uniqueCheckins = new Set<string>();

        venueLogs.forEach(log => {
            if (log.action === 'checkin') {
                current++;
                uniqueCheckins.add(log.userId);
            } else if (log.action === 'checkout' || log.action === 'temporary_exit') {
                current--;
            }
        });

        current = Math.max(0, current);
        return { current, total: uniqueCheckins.size, capacity };
    };

    const verifyPassword = (password: string, type: 'admin' | 'staff') => {
        if (type === 'admin') return password === settings.adminPassword;
        if (type === 'staff') return password === settings.staffPassword;
        return false;
    };

    const resetSystem = () => {
        // In Multi-event, we don't clear localstorage, we just reload or clear specific data
        window.location.reload();
    };

    const addSession = (s: Session) => {
        setSessions(prev => [...prev, s]);
    };

    const updateSession = (id: string, data: Partial<Session>) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    };

    const deleteSession = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
    };

    const findParticipants = (name: string, organization: string, email: string = ""): Participant[] => {
        if (!name && !organization && !email) return [];

        const MAX_RESULTS = 15;
        const MIN_CHARS = 3;

        const normEmail = email.trim().toLowerCase();
        const normName = name.trim().toLowerCase().replace(/\s+/g, '');
        const normNameKana = toKatakana(normName);
        const normNameRomaji = toKatakana(romajiToHiragana(normName));
        const normOrg = organization.trim().toLowerCase().replace(/\s+/g, '');

        // Email search: exact match only
        if (normEmail) {
            return participants.filter(p => p.email.toLowerCase() === normEmail);
        }

        // Name/Org fuzzy search with scoring
        const scoredResults: { participant: Participant; score: number }[] = [];

        for (const p of participants) {
            const pName = p.name.toLowerCase().replace(/\s+/g, '');
            const pKana = (p.furigana || '').toLowerCase().replace(/\s+/g, '');
            const pKanaKatakana = toKatakana(pKana);

            let nameMatch = false;
            let score = 0;

            if (normName) {
                // Check various matching conditions
                const matchTargets = [pName, pKana, pKanaKatakana];
                const queryVariants = [normName, normNameKana, normNameRomaji];

                for (const target of matchTargets) {
                    if (!target) continue;
                    for (const query of queryVariants) {
                        if (!query) continue;

                        // Exact or substring match
                        if (target.includes(query) || query.includes(target)) {
                            nameMatch = true;
                            score = Math.max(score, calculateMatchScore(query, pName, pKana));
                        }
                        // Fuzzy 3-char overlap match
                        else if (hasMinOverlap(query, target, MIN_CHARS)) {
                            nameMatch = true;
                            score = Math.max(score, calculateMatchScore(query, pName, pKana));
                        }
                    }
                }
            } else {
                nameMatch = true; // No name filter
                score = 50;
            }

            let orgMatch = true;
            if (normOrg && p.organization) {
                orgMatch = p.organization.toLowerCase().replace(/\s+/g, '').includes(normOrg);
            } else if (normOrg && !p.organization) {
                orgMatch = false;
            }

            if (nameMatch && orgMatch && score > 0) {
                scoredResults.push({ participant: p, score });
            }
        }

        // Sort by score descending, then limit results
        scoredResults.sort((a, b) => b.score - a.score);

        return scoredResults.slice(0, MAX_RESULTS).map(r => r.participant);
    };

    const addNotificationLog = (data: Omit<NotificationLog, 'id' | 'timestamp'>) => {
        const log: NotificationLog = {
            ...data,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        };
        setNotificationLogs(prev => [log, ...prev]);
    };

    // --- Deletion Features ---
    const clearAllParticipants = () => {
        setParticipants([]);
        setCheckInLogs([]);
    };

    const clearNotificationLogs = () => {
        setNotificationLogs([]);
    };

    return (
        <DemoContext.Provider value={{
            isLoading,
            eventId,
            settings,
            venues,
            categories,
            participants,
            checkInLogs,
            sessions,
            notificationLogs,
            initializeSystem,
            addParticipant,
            bulkAddParticipants,
            checkIn,
            checkOut,
            getVenueStats,
            verifyPassword,
            resetSystem,
            updateParticipant,
            deleteParticipant,
            bulkDeleteParticipants,
            addSession,
            updateSession,
            deleteSession,
            findParticipants,
            addNotificationLog,
            addCategory,
            updateCategory,
            deleteCategory,
            clearAllParticipants,
            clearNotificationLogs
        }}>
            {children}
        </DemoContext.Provider>
    );
}

export const useDemo = () => {
    const context = useContext(DemoContext);
    if (context === undefined) {
        throw new Error('useDemo must be used within a DemoProvider');
    }
    return context;
};
