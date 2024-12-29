import { NextResponse } from "next/server";

export async function GET() {
    try {
        return NextResponse.json({
            apiKey: process.env.GEMINI_API_KEY,
            groqApiKey: process.env.GROQ_API_KEY,
            togetherApiKey: process.env.TOGETHER_API_KEY,
            hyperbolicApiKey: process.env.HYPERBOLIC_API_KEY
        });
    } catch (error) {
        console.error('Lỗi khi lấy API key:', error);
        return NextResponse.json({ error: 'Không thể lấy API key' }, { status: 500 });
    }
} 