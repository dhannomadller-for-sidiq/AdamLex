import { NextResponse } from 'next/server';
import { runScraper } from '@/../scraper/high_court_bot';

export async function GET(request: Request) {
    // 1. Verify Authorization (Cron Secret)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('⏰ Cron triggered: Syncing High Court cases...');

        // 2. Execute the scraper
        // Note: In a real production environment, this should ideally be an async background task
        // as scrapers can take minutes to run, potentially timing out the HTTP request.
        // For now, we'll run it directly.
        await runScraper();

        return NextResponse.json({
            success: true,
            message: 'High Court synchronization completed successfully.',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Cron Sync Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
