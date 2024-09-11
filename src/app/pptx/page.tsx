'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PPTXPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const name = searchParams.get('name') || 'output1.pptx';
        const newUrl = `https://deepnote.com/workspace/tomisakae-59909f41-bc0a-457b-92a3-3919af2aa9f2/project/Tomi-Sakaes-Untitled-project-c1bc4da6-34a0-43a6-ae76-ae3e33de7586/${name}?secondary-sidebar=app`;
        router.push(newUrl);
    }, [searchParams, router]);

    // Trang này sẽ không hiển thị gì cả vì chuyển hướng xảy ra ngay lập tức
    return null;
}
