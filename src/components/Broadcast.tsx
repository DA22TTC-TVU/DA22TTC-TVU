'use client'
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { toast } from 'react-hot-toast';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, set, remove } from 'firebase/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// Thêm prop onClick vào interface
interface BroadcastProps {
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
}

export default function Broadcast({ isModalOpen, setIsModalOpen }: BroadcastProps) {
    const router = useRouter();
    const [isSharing, setIsSharing] = useState(false);
    const [myStreamId, setMyStreamId] = useState('');
    const [agoraAppId, setAgoraAppId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    useEffect(() => {
        const getCredentials = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/agora/get-credentials');
                const data = await response.json();
                if (data.appId) {
                    setAgoraAppId(data.appId);
                }
            } catch (error) {
                console.error('Lỗi khi lấy credentials:', error);
                toast.error('Không thể kết nối tới server!');
            } finally {
                setIsLoading(false);
            }
        };

        getCredentials();
    }, []);

    useEffect(() => {
        // Thêm event listener để xử lý khi người dùng rời trang
        const handleBeforeUnload = async () => {
            if (myStreamId) {
                const db = await getDatabaseInstance();
                await remove(ref(db, `streams/${myStreamId}`));
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Cleanup khi component unmount
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Đảm bảo dừng stream và xóa dữ liệu Firebase khi unmount
            if (isSharing) {
                stopSharing();
            }
        };
    }, [myStreamId, isSharing]);

    const handleStartSharing = async () => {
        setIsStarting(true);
        try {
            const streamId = Math.random().toString(36).substring(7);
            setMyStreamId(streamId);

            await client.join(agoraAppId, streamId, null);

            const screenTrack = await AgoraRTC.createScreenVideoTrack({}).catch(error => {
                client.leave();
                setMyStreamId('');
                throw error;
            });

            await client.publish(screenTrack);

            // Lưu thông tin stream vào Firebase
            const db = await getDatabaseInstance();
            await set(ref(db, `streams/${streamId}`), {
                name: 'Màn hình của ' + streamId,
                timestamp: Date.now()
            });

            setIsSharing(true);
            toast.success('Bắt đầu chia sẻ màn hình! Mã phát: ' + streamId);

            // Xử lý khi người dùng dừng chia sẻ từ UI Chrome
            const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
            track.on('track-ended', async () => {
                try {
                    // Xóa thông tin từ Firebase trước
                    const db = await getDatabaseInstance();
                    await remove(ref(db, `streams/${streamId}`));

                    // Sau đó mới gọi stopSharing để cleanup Agora
                    await stopSharing();
                    toast.success('Đã dừng chia sẻ màn hình');
                } catch (error) {
                    console.error('Lỗi khi xử lý dừng chia sẻ từ Chrome:', error);
                    toast.error('Có lỗi khi dừng chia sẻ màn hình!');
                }
            });

        } catch (error) {
            console.error('Lỗi khi chia sẻ màn hình:', error);
            toast.error('Không thể chia sẻ màn hình!');
            setIsSharing(false);
            setMyStreamId('');
            try {
                await client.leave();
            } catch (e) {
                console.error('Lỗi khi rời khỏi kênh:', e);
            }
        } finally {
            setIsStarting(false);
        }
    };

    const stopSharing = async () => {
        try {
            // Unpublish và đóng track
            client.remoteUsers.forEach((user) => {
                const videoTrack = user.videoTrack;
                if (videoTrack) {
                    videoTrack.stop();
                }
            });

            // Dừng và đóng tất cả local tracks
            client.localTracks.forEach((track) => {
                track.stop();
                track.close();
            });
            await client.unpublish();

            // Rời khỏi kênh
            await client.leave();

            // Xóa thông tin từ Firebase
            if (myStreamId) {
                const db = await getDatabaseInstance();
                await remove(ref(db, `streams/${myStreamId}`));
            }

            setIsSharing(false);
            setMyStreamId('');
        } catch (error) {
            console.error('Lỗi khi dừng chia sẻ:', error);
            toast.error('Có lỗi khi dừng chia sẻ màn hình!');
        }
    };

    const handleJoinStream = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        router.push(`screen-share/view/${joinCode.trim()}`);
    };

    return (
        <>
            {isLoading ? (
                // Loading skeleton
                <div className="flex items-center space-x-3 animate-pulse">
                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </div>
            ) : (
                // Nội dung thực
                <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="flex items-center gap-2">
                        Phát Sóng
                    </span>
                </div>
            )}

            {/* Main Modal Content */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center"
                    onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg mx-4 rounded-2xl shadow-xl"
                        onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                Phát Sóng
                            </h3>
                            <button onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-6">
                            {/* Form nhập mã phát */}
                            <form onSubmit={handleJoinStream} className="space-y-4">
                                <div>
                                    <label htmlFor="joinCode"
                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nhập mã phát để xem
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            id="joinCode"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            placeholder="Nhập mã phát..."
                                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 
                                                border border-gray-200 dark:border-gray-600 rounded-lg 
                                                focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!joinCode.trim()}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg
                                                hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                                                transition-colors"
                                        >
                                            Xem
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">hoặc</span>
                                </div>
                            </div>

                            {/* Phần chia sẻ màn hình */}
                            {!isSharing ? (
                                <button onClick={handleStartSharing}
                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg 
                                    hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                    </svg>
                                    <span>Chia Sẻ Màn Hình</span>
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Mã phát của bạn:</p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded font-mono">
                                                {myStreamId}
                                            </code>
                                            <button onClick={() => {
                                                navigator.clipboard.writeText(myStreamId);
                                                toast.success('Đã sao chép mã phát!');
                                            }}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
                                                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={stopSharing}
                                        className="w-full px-4 py-2 bg-red-500 text-white rounded-lg 
                                        hover:bg-red-600 transition-colors flex items-center justify-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span>Dừng Chia Sẻ</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
} 