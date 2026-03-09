import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { lead_id, new_advance_payment, remarks } = body;

        if (!lead_id || new_advance_payment === undefined) {
            return NextResponse.json({ error: 'Missing required associate settlement fields' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server misconfiguration: Service Role Key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabaseAdmin.from('leads').update({
            associate_advance_payment: Number(new_advance_payment),
            associate_remarks: remarks
        }).eq('id', lead_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Associate settled successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
