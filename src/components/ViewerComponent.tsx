'use client'
import { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faCompress, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { getDatabaseInstance } from '@/lib/firebaseConfig';
import { ref, onValue } from 'firebase/database';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function ViewerComponent({ streamId }: { streamId: string }) {
    const router = useRouter();
    const videoRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [streamExists, setStreamExists] = useState<boolean | null>(null);

    useEffect(() => {
        const setupViewer = async () => {
            try {
                const response = await fetch('/api/agora/get-credentials');
                const { appId } = await response.json();

                if (!appId) {
                    throw new Error('Không thể lấy thông tin kết nối');
                }

                await client.join(appId, streamId, null);
                setIsConnected(true);

                client.on('user-published', async (user, mediaType) => {
                    await client.subscribe(user, mediaType);
                    if (mediaType === 'video' && videoRef.current) {
                        user.videoTrack?.play(videoRef.current);
                    }
                });

                client.on('user-unpublished', async (user) => {
                    await client.unsubscribe(user);
                });

            } catch (error) {
                console.error('Lỗi khi xem màn hình:', error);
                toast.error('Không thể kết nối tới luồng phát!');
            }
        };

        setupViewer();
        return () => {
            client.leave();
        };
    }, [streamId]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleGoBack = () => {
        router.push("/");
    };

    // Theo dõi trạng thái stream trong realtime
    useEffect(() => {
        const listenToStream = async () => {
            try {
                const db = await getDatabaseInstance();
                const streamRef = ref(db, `streams/${streamId}`);

                // Lắng nghe sự thay đổi của stream
                const unsubscribe = onValue(streamRef, (snapshot) => {
                    const exists = snapshot.exists();
                    setStreamExists(exists);

                    // Nếu stream không còn tồn tại, ngắt kết nối
                    if (!exists && isConnected) {
                        client.leave();
                        setIsConnected(false);
                    }
                });

                // Cleanup function
                return () => {
                    unsubscribe();
                };
            } catch (error) {
                console.error('Lỗi khi theo dõi stream:', error);
                setStreamExists(false);
            }
        };

        listenToStream();
    }, [streamId, isConnected]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="flex h-screen relative">
                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                        <div className="max-w-6xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-4">
                                <button
                                    onClick={handleGoBack}
                                    className="group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 
                                    text-sm md:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
                                    bg-gray-100 dark:bg-gray-700 rounded-lg 
                                    transition-all duration-200"
                                >
                                    <FontAwesomeIcon
                                        icon={faArrowLeft}
                                        className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-x-1 transition-transform"
                                    />
                                    <span className="font-medium">Quay lại</span>
                                </button>
                                <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">
                                    Xem Màn Hình
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-2 text-gray-600 dark:text-gray-300 
                                    hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                    transition-colors"
                                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                                >
                                    <FontAwesomeIcon
                                        icon={isFullscreen ? faCompress : faExpand}
                                        className="w-5 h-5"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Video Container */}
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="max-w-6xl mx-auto h-full">
                            {!streamExists ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center space-y-4 p-6 max-w-md mx-auto">
                                        <div className="text-gray-400 dark:text-gray-500">
                                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            Phát sóng đã kết thúc
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Người phát đã dừng chia sẻ màn hình
                                        </p>
                                        <button
                                            onClick={handleGoBack}
                                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg
                                                hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                                            <span>Quay lại</span>
                                        </button>
                                    </div>
                                </div>
                            ) : !isConnected ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Đang kết nối...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    ref={videoRef}
                                    className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 