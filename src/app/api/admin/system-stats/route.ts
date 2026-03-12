import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabaseAdmin.rpc('get_database_size');

        if (error) {
            console.error('Error fetching database size:', error);
            // Fallback gracefully instead of failing
            return NextResponse.json({ size: 'Data Unavailable' });
        }

        const bytes = Number(data);
        const formatBytes = (bytes: number, decimals = 2) => {
            if (!+bytes) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        };

        return NextResponse.json({ size: formatBytes(bytes) });
    } catch (error) {
        console.error('System Stats Error:', error);
        return NextResponse.json({ size: 'Error' }, { status: 500 });
    }
}
