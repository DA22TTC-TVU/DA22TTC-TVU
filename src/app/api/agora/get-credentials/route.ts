import { NextResponse } from "next/server";

export async function GET() {
    try {
        return NextResponse.json({
            appId: process.env.AGORA_APP_ID
        });
    } catch (error) {
        console.error('Lỗi khi lấy Agora credentials:', error);
        return NextResponse.json({ error: 'Không thể lấy credentials' }, { status: 500 });
    }
} 