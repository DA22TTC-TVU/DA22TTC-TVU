'use client'
import dynamic from 'next/dynamic'

// Dynamic import với ssr: false
const ViewerComponent = dynamic(() => import('@/components/ViewerComponent'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
    )
})

export default function ViewScreen({ params }: { params: { streamId: string } }) {
    return <ViewerComponent streamId={params.streamId} />
} 