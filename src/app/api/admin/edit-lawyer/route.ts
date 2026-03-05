import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, password, full_name, phone_number, enrollment_no, designation, username } = body;

        if (!id || !full_name) {
            return NextResponse.json({ error: 'Missing required fundamental fields' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server misconfiguration: Service Role Key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Update Profile Information
        const { error: profileError } = await supabaseAdmin.from('profiles').update({
            full_name,
            phone_number,
            enrollment_no,
            designation,
            username
        }).eq('id', id);

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        // 2. Optional: Reset password if provided
        if (password && password.length >= 6) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                password: password,
                user_metadata: { full_name }
            });

            if (authError) {
                return NextResponse.json({ error: 'Profile updated, but failed to reset password: ' + authError.message }, { status: 400 });
            }
        } else {
            // Just update metadata if no new password
            await supabaseAdmin.auth.admin.updateUserById(id, {
                user_metadata: { full_name }
            });
        }

        return NextResponse.json({ success: true, message: 'Lawyer updated successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
