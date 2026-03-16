
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const rolesStr = searchParams.get('role');
    const roles = rolesStr ? rolesStr.split(',') : [];

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    try {
        let query = supabase.from('profiles').select('*');
        if (roles.length > 0) {
            query = query.in('role', roles);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
