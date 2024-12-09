import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export async function POST(request: Request) {
    const { name, parentId } = await request.json();
    try {
        const fileMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId || '1YAMjIdiDdhc5cjR7etXIpNoPW26TV1Yf'],
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Create folder error:', error);
        return NextResponse.json({ error: 'Lỗi khi tạo thư mục' }, { status: 500 });
    }
} 