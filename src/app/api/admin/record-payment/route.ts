import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { lead_id, total_payment, advance_payment, payment_id, remarks } = body;

        if (!lead_id || advance_payment === undefined) {
            return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server misconfiguration: Service Role Key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabaseAdmin.from('payments').insert({
            lead_id,
            total_payment,
            advance_payment: Number(advance_payment),
            payment_id,
            remarks
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Payment recorded successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
