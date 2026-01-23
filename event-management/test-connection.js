require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: Missing Supabase environment variables.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testing connection to Supabase...');

    try {
        const { data, error } = await supabase.from('events').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection failed:', error.message);
            // Check for common errors
            if (error.code === '42P01') {
                console.error('Hint: The table "events" does not exist. Did you run the schema.sql?');
            }
        } else {
            console.log('Connection successful!');
            console.log('Events table accessible.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
