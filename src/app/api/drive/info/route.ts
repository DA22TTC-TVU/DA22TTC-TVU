import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export async function GET() {
    try {
        const about = await drive.about.get({
            fields: 'storageQuota'
        });

        const { storageQuota } = about.data;

        return NextResponse.json({
            total: storageQuota?.limit,
            used: storageQuota?.usage,
            remaining: Number(storageQuota?.limit) - Number(storageQuota?.usage)
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Lỗi khi lấy thông tin drive' },
            { status: 500 }
        );
    }
} 