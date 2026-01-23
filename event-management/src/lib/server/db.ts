import fs from 'fs';
import path from 'path';

// Define the Data Structure
export type DemoDB = {
    events: EventData[];
};

export type EventData = {
    id: string; // e.g. "ev_123"
    name: string;
    createdAt: string;
    description?: string;

    // Core Data (previously in separate localStorage keys)
    settings: any;
    venues: any[];
    categories: any[];
    participants: any[];
    checkInLogs: any[];
    sessions: any[];
    notificationLogs: any[];
};

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');
const DATA_DIR = path.join(process.cwd(), 'src', 'data');

// Initialize DB if not exists
function initDB() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        const initialDB: DemoDB = { events: [] };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialDB, null, 2), 'utf-8');
    }
}

// Read DB
export function getDB(): DemoDB {
    initDB();
    try {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (e) {
        console.error("Failed to read DB:", e);
        return { events: [] };
    }
}

// Write DB
export function saveDB(db: DemoDB) {
    initDB();
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
        console.error("Failed to write DB:", e);
    }
}

// --- Helpers ---

export function getEvent(eventId: string): EventData | undefined {
    const db = getDB();
    return db.events.find(e => e.id === eventId);
}

export function saveEvent(event: EventData) {
    const db = getDB();
    const index = db.events.findIndex(e => e.id === event.id);
    if (index >= 0) {
        db.events[index] = event;
    } else {
        db.events.push(event);
    }
    saveDB(db);
}

export function deleteEvent(eventId: string) {
    const db = getDB();
    db.events = db.events.filter(e => e.id !== eventId);
    saveDB(db);
}

export function createEvent(name: string): EventData {
    const id = `ev_${Date.now()}`;
    const newEvent: EventData = {
        id,
        name,
        createdAt: new Date().toISOString(),
        settings: {}, // Will be populated with defaults by Context/API on init
        venues: [],
        categories: [],
        participants: [],
        checkInLogs: [],
        sessions: [],
        notificationLogs: []
    };
    saveEvent(newEvent);
    return newEvent;
}
