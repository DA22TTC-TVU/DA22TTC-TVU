import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function GET() {
    try {
        const response = await drive.files.list({
            q: "'1QAf2EWDzsHKL8vrUNIzUAzbf7K4p2NKC' in parents",
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
            orderBy: 'modifiedTime desc',
        });

        return NextResponse.json(response.data);
    } catch (error) {
        return NextResponse.json({ error: 'Lỗi khi lấy danh sách file' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileMetadata = {
            name: file.name,
            parents: ['1QAf2EWDzsHKL8vrUNIzUAzbf7K4p2NKC'],
        };

        const media = {
            mimeType: file.type,
            body: require('stream').Readable.from(buffer)
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Lỗi khi tải file lên' }, { status: 500 });
    }
}