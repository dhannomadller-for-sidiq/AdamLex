import { NextResponse } from 'next/server';
import { syncAdvocateCases } from '../../../../../scraper/high_court_bot';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Simple security check using an environment variable
    if (key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Trigger the sync process
        // Note: In a production environment with serverless functions,
        // you might want to run this as a background job or use an edge function
        // if the execution time exceeds limits.
        await syncAdvocateCases();

        return NextResponse.json({ success: true, message: 'Sync started' });
    } catch (error: any) {
        console.error('Cron Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
