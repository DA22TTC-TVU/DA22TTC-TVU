import { google, drive_v3 } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '9');

        // Lấy tổng số files để tính số trang
        const totalFilesResponse = await drive.files.list({
            q: "'1QAf2EWDzsHKL8vrUNIzUAzbf7K4p2NKC' in parents",
            fields: 'files(id)',
        });

        const totalFiles = totalFilesResponse.data.files?.length || 0;
        const pageToken = await getPageToken(page, limit);

        const response = (await drive.files.list({
            q: `'1QAf2EWDzsHKL8vrUNIzUAzbf7K4p2NKC' in parents`,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
            orderBy: 'modifiedTime desc',
            pageSize: limit,
            pageToken: pageToken || undefined
        } as drive_v3.Params$Resource$Files$List) as unknown) as { data: { files: any[] } };

        return NextResponse.json({
            files: response.data.files,
            totalFiles,
            currentPage: page,
            totalPages: Math.ceil(totalFiles / limit)
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Lỗi khi lấy danh sách file' },
            { status: 500 }
        );
    }
}

// Hàm helper để lấy pageToken cho trang cụ thể
async function getPageToken(page: number, limit: number) {
    if (page === 1) return undefined;

    let token;
    let currentPage = 1;

    while (currentPage < page) {
        const response: { data: { nextPageToken?: string | null } } = await drive.files.list({
            q: "'1QAf2EWDzsHKL8vrUNIzUAzbf7K4p2NKC' in parents",
            pageSize: limit,
            pageToken: token,
            fields: 'nextPageToken'
        });

        token = response.data.nextPageToken;
        currentPage++;

        if (!token) break;
    }

    return token;
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