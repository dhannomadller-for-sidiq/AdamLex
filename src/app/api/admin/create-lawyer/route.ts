import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, full_name, phone_number, enrollment_no, designation, username } = body;

        // Ensure required fields
        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Missing required fundamental fields' }, { status: 400 });
        }

        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server misconfiguration: Service Role Key missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // We use the email field for Supabase Auth as the primary identifier.
        // If the admin provided a username that IS an email, we'll just use it.
        // Otherwise, construct a mock email from the username.
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
        const authEmail = isEmail ? username.toLowerCase() : `${username.replace(/\s+/g, '').toLowerCase()}@firm.com`;

        // 1. Create the Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password,
            email_confirm: true, // Auto-confirm to skip verification step
            user_metadata: { full_name }
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const newUserId = authData.user.id;

        // 2. Insert into Profiles table (RLS is bypassed by service role)
        const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
            id: newUserId,
            role: 'lawyer',
            full_name,
            phone_number,
            enrollment_no,
            designation,
            username
        }]);

        if (profileError) {
            // Rollback user creation if profile fails (basic cleanup)
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Lawyer created successfully', user_id: newUserId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
