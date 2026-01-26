
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Note: Ideally use SERVICE_ROLE_KEY for admin tasks, but ANON might work if RLS allows or if we are admin.
// If ANON fails, we prompt user.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importAttendance() {
    const eventId = process.argv[2];
    if (!eventId) {
        console.error('Please provide event_id as argument');
        process.exit(1);
    }

    // Determine run mode
    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) console.log('--- DRY RUN MODE (No changes to DB) ---');

    const filePath = path.join(process.cwd(), 'カンファレンス集計シート - 全リスト.csv');
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split(/\r?\n/);

    // Dynamic header search
    let headerIndex = -1;
    let parsedHeader: string[] = [];

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const row = (Papa.parse(lines[i]).data as string[][])[0];
        if (row && (row.includes('名前') || row.includes('Name'))) {
            headerIndex = i;
            parsedHeader = row;
            console.log(`Found header at line ${i + 1}`);
            break;
        }
    }

    if (headerIndex === -1) {
        console.error('Could not find header row (looking for "名前" or "Name")');
        process.exit(1);
    }

    const colMap: Record<string, number> = {};
    parsedHeader.forEach((col: string, i: number) => {
        colMap[col.trim()] = i;
    });

    // Helper to find index by fuzzy name
    const findIdx = (keywords: string[]) => {
        for (const key of Object.keys(colMap)) {
            if (keywords.some(k => key.includes(k) || key.toLowerCase() === k.toLowerCase())) return colMap[key];
        }
        return -1;
    };

    const idxDisplayName = findIdx(['表示名', 'Display Name']);
    const idxNameRaw = findIdx(['名前', 'Name']);
    // Prefer Display Name (Kanji) if available, otherwise fallback to Name (Kana)
    const idxName = idxDisplayName > -1 ? idxDisplayName : idxNameRaw;

    const idxEmail = findIdx(['メール', 'Email', 'Mail']);
    const idxTicket = findIdx(['チケット', 'Ticket']);
    const idxStatus = findIdx(['ステータス', 'Status']);
    const idxCompany = findIdx(['会社', 'Company', '所属']);

    console.log('Column Mapping:', { idxName, idxEmail, idxTicket, idxStatus, idxCompany });

    if (idxName === -1 || idxEmail === -1) {
        console.error('Missing required columns: Name or Email');
        // process.exit(1); 
    }

    const rowsToInsert: any[] = [];

    // Data starts after header
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = (Papa.parse(line).data as string[][])[0];
        if (!row || row.length < 5) continue;

        const name = idxName > -1 ? row[idxName] : null;
        const email = idxEmail > -1 ? row[idxEmail] : null;

        // Skip if name or email is missing/empty
        if (!name || !email || !name.trim() || !email.trim()) continue;

        const ticket = idxTicket > -1 ? row[idxTicket] : null;
        const status = idxStatus > -1 ? row[idxStatus] : null;
        const company = idxCompany > -1 ? row[idxCompany] : null;

        rowsToInsert.push({
            event_id: eventId,
            name: name,
            email: email,
            ticket_type: ticket,
            status: status,
            company: company,
            registered_at: new Date().toISOString()
        });
    }

    console.log(`Found ${rowsToInsert.length} participants to insert.`);

    if (dryRun) {
        if (rowsToInsert.length > 0) {
            console.log('Sample Data (First 3):');
            console.log(rowsToInsert.slice(0, 3));
        }
        return;
    }

    // Insert in chunks
    const chunkSize = 50;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
        const chunk = rowsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('attendees').upsert(chunk, { onConflict: 'event_id, email' });

        if (error) {
            console.error('Insert error:', error);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1} (${chunk.length} records)`);
        }
    }
}

importAttendance();
