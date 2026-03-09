import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, full_name, phone_number, location, specialization, username } = body;

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

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
        const authEmail = isEmail ? username.toLowerCase() : `${username.replace(/\s+/g, '').toLowerCase()}@firm.com`;

        // 1. Create the Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const newUserId = authData.user.id;

        // 2. Insert into Profiles table
        const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
            id: newUserId,
            role: 'associate',
            full_name,
            phone_number,
            username
        }]);

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        // 3. Insert into Associates table
        const { error: associateError } = await supabaseAdmin.from('associates').insert([{
            id: newUserId,
            location,
            specialization
        }]);

        if (associateError) {
            await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return NextResponse.json({ error: associateError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Associate created successfully', user_id: newUserId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
