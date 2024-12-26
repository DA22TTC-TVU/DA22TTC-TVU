'use client'
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { toast } from 'react-hot-toast';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, onValue, set, remove } from 'firebase/database';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// Thêm prop onClick vào interface
interface BroadcastProps {
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
}

export default function Broadcast({ isModalOpen, setIsModalOpen }: BroadcastProps) {
    const [streams, setStreams] = useState<Array<{ id: string, name: string, timestamp: number }>>([]);
    const [isSharing, setIsSharing] = useState(false);
    const [myStreamId, setMyStreamId] = useState('');
    const [agoraAppId, setAgoraAppId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [isStarting, setIsStarting] = useState(false);

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
        const listenToStreams = async () => {
            const db = await getDatabaseInstance();
            const streamsRef = ref(db, 'streams');

            return onValue(streamsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const streamList = Object.entries(data).map(([id, stream]: [string, any]) => ({
                        id,
                        name: stream.name,
                        timestamp: stream.timestamp
                    }));
                    // Sắp xếp theo thời gian mới nhất
                    streamList.sort((a, b) => b.timestamp - a.timestamp);
                    setStreams(streamList);
                } else {
                    setStreams([]);
                }
            });
        };

        const unsubscribe = listenToStreams();

        // Cleanup function
        return () => {
            if (unsubscribe) {
                unsubscribe.then(unsub => unsub());
            }
        };
    }, []); // Chỉ chạy một lần khi component mount

    const handleStartSharing = async () => {
        setIsPasswordModalOpen(true);
    };

    const startSharingWithPassword = async () => {
        if (!password.trim()) {
            toast.error('Vui lòng nhập mật khẩu!');
            return;
        }

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

            // Lưu thông tin stream và mật khẩu vào Firebase
            const db = await getDatabaseInstance();
            await set(ref(db, `streams/${streamId}`), {
                name: 'Màn hình của ' + streamId,
                timestamp: Date.now(),
                password: password
            });

            setIsSharing(true);
            setIsPasswordModalOpen(false);
            toast.success('Bắt đầu chia sẻ màn hình!');

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
                    <span>Phát Sóng</span>
                </div>
            )}

            {/* Password Modal */}
            {isPasswordModalOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center"
                    onClick={() => setIsPasswordModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Đặt mật khẩu cho buổi phát
                            </h2>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                            placeholder="Nhập mật khẩu..."
                        />
                        <button
                            onClick={startSharingWithPassword}
                            disabled={isStarting || !password}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg
                                     hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isStarting ? 'Đang bắt đầu...' : 'Bắt đầu phát sóng'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Main Modal Content */}
            {isModalOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 w-full max-w-lg mx-4 rounded-2xl shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                Phát Sóng
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {/* Nút chia sẻ màn hình */}
                            {!isSharing ? (
                                <button
                                    onClick={handleStartSharing}
                                    className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg 
                                    hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                    </svg>
                                    <span>Chia Sẻ Màn Hình</span>
                                </button>
                            ) : (
                                <button
                                    onClick={stopSharing}
                                    className="w-full mb-4 px-4 py-2 bg-red-500 text-white rounded-lg 
                                    hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Dừng Chia Sẻ</span>
                                </button>
                            )}

                            {/* Danh sách stream */}
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                    Đang phát sóng
                                </h4>
                                {streams.length > 0 ? (
                                    <div className="space-y-2">
                                        {streams.map(stream => (
                                            <div
                                                key={stream.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 
                                                dark:bg-gray-700 rounded-lg"
                                            >
                                                <span className="text-gray-800 dark:text-gray-200">
                                                    {stream.name}
                                                </span>
                                                <a
                                                    href={`/screen-share/view/${stream.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1 bg-blue-500 text-white rounded-lg 
                                                    hover:bg-blue-600 transition-colors text-sm"
                                                >
                                                    Xem
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        Chưa có luồng phát sóng nào
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
} 