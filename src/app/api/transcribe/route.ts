import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set');
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        // Convert the audio Blob to a base64 string
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        // Gemini API is strict about mime types. It rejects formats like 'audio/webm;codecs=opus'
        let mimeType = file.type || "audio/webm";
        if (mimeType.includes(';')) {
            mimeType = mimeType.split(';')[0];
        }

        // Prepare the payload for Gemini API
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: "Please carefully transcribe the following audio exactly as spoken. Detect the language automatically. If the audio is in Malayalam, output the transcription in Malayalam text (മലയാളം). If it is in English, Hindi, or any other language, output in that language's script. If it is a mix of languages, transcribe the mix accurately. Do not add any extra text, markdown formatting or commentary; just output the raw transcription text."
                        },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Audio
                            }
                        }
                    ]
                }
            ]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            const detailedMessage = errorData.error?.message || 'Transcription failed due to API error';
            return NextResponse.json({ error: detailedMessage, details: errorData }, { status: response.status });
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            console.error('Unexpected Gemini response format:', data);
            return NextResponse.json({ error: 'Failed to parse transcription from Gemini' }, { status: 500 });
        }

        // Gemini sometimes returns text with leading/trailing whitespace
        return NextResponse.json({ text: textResponse.trim() });

    } catch (error: any) {
        console.error('Error in /api/transcribe:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
