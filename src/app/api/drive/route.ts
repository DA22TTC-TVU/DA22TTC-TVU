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
        const folderId = searchParams.get('folderId');
        const searchTerm = searchParams.get('q');

        let query = '';

        if (searchTerm) {
            // Tìm kiếm trong toàn bộ Drive với điều kiện không phải là file trong thùng rác
            query = `name contains '${searchTerm}' and trashed = false`;
        } else if (folderId) {
            // Nếu không có từ khóa tìm kiếm, hiển thị nội dung thư mục hiện tại
            query = `'${folderId}' in parents and trashed = false`;
        } else {
            // Hiển thị thư mục gốc
            query = `'1YAMjIdiDdhc5cjR7etXIpNoPW26TV1Yf' in parents and trashed = false`;
        }

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents)',
            orderBy: 'modifiedTime desc',
            pageSize: 1000
        } as drive_v3.Params$Resource$Files$List);

        const totalFiles = response.data.files?.length || 0;

        return NextResponse.json({
            files: response.data.files,
            totalFiles
        }, {
            headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Lỗi khi lấy danh sách thư mục hoặc tệp' },
            { status: 500 }
        );
    }
}