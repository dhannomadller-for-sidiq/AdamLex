
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

        const activeOnly = searchParams.get('active_only') === 'true';
        if (activeOnly) {
            // Get unique assigned_to and associate_id from leads
            const { data: leadAdvocates } = await supabase
                .from('leads')
                .select('assigned_to, associate_id')
                .eq('status', 'Confirmed')
                .eq('admin_approved', true);

            const activeIds = new Set();
            leadAdvocates?.forEach(l => {
                if (l.assigned_to) activeIds.add(l.assigned_to);
                if (l.associate_id) activeIds.add(l.associate_id);
            });

            if (activeIds.size > 0) {
                query = query.in('id', Array.from(activeIds));
            } else {
                return NextResponse.json([]); // No active advocates
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
