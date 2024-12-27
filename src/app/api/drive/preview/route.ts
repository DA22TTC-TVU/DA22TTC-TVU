import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export async function GET(request: NextRequest) {
    try {
        const fileId = request.nextUrl.searchParams.get('fileId');
        if (!fileId) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const file = await drive.files.get({
            fileId: fileId,
            fields: 'mimeType',
        });

        const mimeType = file.data.mimeType;
        if (!isPreviewableMimeType(mimeType)) {
            return NextResponse.json({ error: 'File type not supported for preview' }, { status: 400 });
        }

        const response = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'stream' });

        const chunks: Buffer[] = [];
        for await (const chunk of response.data) {
            chunks.push(Buffer.from(chunk));
        }
        const content = Buffer.concat(chunks).toString('utf-8');

        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });

    } catch (error) {
        console.error('Error previewing file:', error);
        return NextResponse.json({ error: 'Failed to preview file' }, { status: 500 });
    }
}

function isPreviewableMimeType(mimeType?: string | null): boolean {
    if (!mimeType) return false;

    const previewableMimeTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'application/xml',
        'text/xml',
        'text/markdown',
        'text/x-python',
        'text/x-java',
        'text/x-c',
        'text/x-cpp',
    ];

    return previewableMimeTypes.includes(mimeType);
} 