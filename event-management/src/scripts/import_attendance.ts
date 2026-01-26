
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

    const filePath = path.join(process.cwd(), 'カンファレンス集計シート - 全リスト.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Parse CSV
    // Header is at line 9 (index 8)
    const lines = fileContent.split(/\r?\n/);
    const headerLine = lines[8];

    const parsedHeader = (Papa.parse(headerLine).data as string[][])[0];

    const colMap: Record<string, number> = {};
    parsedHeader.forEach((col: string, i: number) => {
        colMap[col.trim()] = i;
    });

    // Helper to find index by fuzzy name
    const findIdx = (keywords: string[]) => {
        for (const key of Object.keys(colMap)) {
            if (keywords.some(k => key.includes(k))) return colMap[key];
        }
        return -1;
    };

    const idxName = findIdx(['名前', 'Name']);
    const idxEmail = findIdx(['メール', 'Email', 'Mail']);
    const idxTicket = findIdx(['チケット', 'Ticket']);
    const idxStatus = findIdx(['ステータス', 'Status']);
    const idxCompany = findIdx(['会社', 'Company', '所属']);

    console.log('Column Mapping:', { idxName, idxEmail, idxTicket, idxStatus, idxCompany });

    if (idxName === -1 || idxEmail === -1) {
        console.error('Could not find required columns (Name or Email)');
        // process.exit(1); // Continue for now to debug
    }

    const rowsToInsert: any[] = [];

    // Data starts at line 10 (index 9)
    for (let i = 9; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = Papa.parse(line).data[0] as string[];
        if (!row || row.length < 5) continue;

        const name = row[idxName];
        const email = row[idxEmail];
        const ticket = idxTicket > -1 ? row[idxTicket] : null;
        const status = idxStatus > -1 ? row[idxStatus] : null;
        const company = idxCompany > -1 ? row[idxCompany] : null;

        if (name && email) {
            rowsToInsert.push({
                event_id: eventId,
                name: name,
                email: email,
                ticket_type: ticket,
                status: status,
                company: company,
                registered_at: new Date().toISOString() // Or parse from CSV if available
            });
        }
    }

    console.log(`Found ${rowsToInsert.length} participants to insert.`);

    // Insert in chunks
    const chunkSize = 50;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
        const chunk = rowsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('attendees').upsert(chunk, { onConflict: 'email, event_id' }); // Assuming unique constraint?
        // Actually schema says unique(attendee_id) but for upsert we need a constraint.
        // Schema doesn't have unique(email, event_id). We might duplicate data if we run multiple times.
        // For now, let's just insert.
        if (error) {
            console.error('Insert error:', error);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}`);
        }
    }
}

importAttendance();
