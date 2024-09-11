'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PPTXContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const name = searchParams.get('name') || 'output.pptx';
        const newUrl = `https://deepnote.com/workspace/tomisakae-59909f41-bc0a-457b-92a3-3919af2aa9f2/project/Tomi-Sakaes-Untitled-project-c1bc4da6-34a0-43a6-ae76-ae3e33de7586/${name}?secondary-sidebar=app`;
        router.push(newUrl);
    }, [searchParams, router]);

    return null;
}

export default function PPTXPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PPTXContent />
        </Suspense>
    );
}
