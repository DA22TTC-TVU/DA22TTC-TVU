import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { Readable } from 'stream';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const parentId = formData.get('parentId') as string;

        console.log('File info:', {
            name: file.name,
            type: file.type,
            size: file.size
        });
        console.log('Parent ID:', parentId);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const fileMetadata = {
            name: file.name,
            parents: [parentId || '1YAMjIdiDdhc5cjR7etXIpNoPW26TV1Yf'],
        };

        const res = await drive.files.create({
            requestBody: fileMetadata,
            media: {
                mimeType: file.type,
                body: stream
            },
            fields: 'id',
            supportsAllDrives: true
        });

        if (!res.data || !res.data.id) {
            throw new Error('Upload không thành công: ' + JSON.stringify(res.data));
        }

        const parentKey = parentId
            ? `drive_files:${parentId}_`
            : 'drive_files:root_';

        await redis.del(parentKey);

        return NextResponse.json(res.data);
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Lỗi khi tải file lên' },
            { status: 500 }
        );
    }
}

// Tăng giới hạn kích thước body request
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '100mb'
        }
    }
}; 