import { google, drive_v3 } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive'], // Sử dụng phạm vi rộng hơn
});

const drive = google.drive({ version: 'v3', auth });

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('folderId') || '1YAMjIdiDdhc5cjR7etXIpNoPW26TV1Yf';

        const query = folderId
            ? `'${folderId}' in parents`
            : "mimeType='application/vnd.google-apps.folder'";

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
            orderBy: 'modifiedTime desc',
            pageSize: 1000
        } as drive_v3.Params$Resource$Files$List);

        const totalFiles = response.data.files?.length || 0;

        return NextResponse.json({
            files: response.data.files,
            totalFiles
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Lỗi khi lấy danh sách thư mục hoặc tệp' },
            { status: 500 }
        );
    }
}