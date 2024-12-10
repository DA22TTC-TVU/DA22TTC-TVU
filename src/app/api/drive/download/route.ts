import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
    ],
});

const drive = google.drive({ version: 'v3', auth });

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
        return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    try {
        const file = await drive.files.get({
            fileId: fileId,
            fields: 'webContentLink, name',
        });

        if (!file.data.webContentLink) {
            return NextResponse.json({ error: 'Download link not available' }, { status: 404 });
        }

        // Trả về URL tải xuống trực tiếp
        return NextResponse.json({
            downloadUrl: file.data.webContentLink,
            fileName: file.data.name
        });
    } catch (error) {
        console.error('Error getting download link:', error);
        return NextResponse.json({ error: 'Error getting download link' }, { status: 500 });
    }
} 