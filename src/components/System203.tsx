import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const LightningEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Cải thiện hàm tạo tia sét
        const createLightning = (startX: number, startY: number, endX: number, endY: number, segments: number = 8) => {
            const points: [number, number][] = [];
            points.push([startX, startY]);

            let currentX = startX;
            let currentY = startY;
            const stepX = (endX - startX) / segments;
            const stepY = (endY - startY) / segments;

            // Giảm độ nhiễu để tia sét mượt mà hơn
            const noiseRange = 15; // giảm từ 30 xuống 15

            for (let i = 0; i < segments - 1; i++) {
                currentX += stepX;
                currentY += stepY;
                const offsetX = (Math.random() - 0.5) * noiseRange;
                const offsetY = (Math.random() - 0.5) * noiseRange;
                points.push([currentX + offsetX, currentY + offsetY]);
            }

            points.push([endX, endY]);
            return points;
        };

        // Cải thiện hàm vẽ tia sét
        const drawLightning = (points: [number, number][], alpha: number = 1) => {
            // Vẽ các vòng tròn dao động
            const drawPulsingCircles = () => {
                const time = Date.now() / 1000;
                const positions = [
                    { x: 30, y: canvas.height / 2 },
                    { x: canvas.width - 30, y: canvas.height / 2 },
                    { x: canvas.width / 2, y: 30 },
                    { x: canvas.width / 2, y: canvas.height - 30 }
                ];

                positions.forEach((pos, i) => {
                    const pulseSize = Math.sin(time * 2 + i) * 3 + 5;
                    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pulseSize);
                    gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha * 0.4})`);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
                    ctx.fill();
                });
            };

            // Vẽ các đường mạch điện phức tạp
            const drawComplexCircuits = () => {
                ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.1})`;
                ctx.lineWidth = 1;

                // Đường mạch ngang
                const drawHorizontalCircuits = () => {
                    const y = canvas.height / 2;
                    ctx.beginPath();
                    ctx.moveTo(20, y);
                    ctx.lineTo(canvas.width - 20, y);
                    for (let x = 40; x < canvas.width - 40; x += 20) {
                        const height = Math.sin(x * 0.1) * 5;
                        ctx.moveTo(x, y - 10);
                        ctx.lineTo(x, y + height);
                    }
                    ctx.stroke();
                };

                // Đường mạch góc
                const drawCornerCircuits = () => {
                    const corners = [
                        [20, 20], [canvas.width - 20, 20],
                        [20, canvas.height - 20], [canvas.width - 20, canvas.height - 20]
                    ];
                    corners.forEach(([x, y]) => {
                        ctx.beginPath();
                        ctx.arc(x, y, 8, 0, Math.PI * 2);
                        ctx.stroke();

                        // Thêm các đường nối
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + (x < canvas.width / 2 ? 15 : -15), y);
                        ctx.lineTo(x + (x < canvas.width / 2 ? 15 : -15), y + (y < canvas.height / 2 ? 15 : -15));
                        ctx.stroke();
                    });
                };

                drawHorizontalCircuits();
                drawCornerCircuits();
            };

            // Vẽ các đốm sáng ở các góc
            const cornerGlow = () => {
                const corners = [
                    [0, 0], [canvas.width, 0],
                    [0, canvas.height], [canvas.width, canvas.height]
                ];
                corners.forEach(([x, y]) => {
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
                    gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha * 0.4})`);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, 20, 0, Math.PI * 2);
                    ctx.fill();
                });
            };

            // Vẽ các đường mạch điện mờ
            const drawCircuits = () => {
                ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.1})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 8]);
                ctx.beginPath();
                // Vẽ đường cong theo viền
                ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 10);
                ctx.stroke();
                ctx.setLineDash([]);
            };

            // Vẽ các chi tiết phụ trước
            cornerGlow();
            drawCircuits();
            drawPulsingCircles();
            drawComplexCircuits();

            // Vẽ hiệu ứng outer glow
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.3})`;
            ctx.lineWidth = 6;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 15;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.stroke();

            // Vẽ tia sét chính
            ctx.beginPath();
            ctx.strokeStyle = `rgba(134, 239, 172, ${alpha * 0.8})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;

            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.stroke();

            // Vẽ lõi sáng
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 5;

            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.stroke();
        };

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const time = Date.now() / 2000; // Làm chậm animation
            const edges = [
                { start: [0, 0], end: [canvas.width, 0] },
                { start: [canvas.width, 0], end: [canvas.width, canvas.height] },
                { start: [canvas.width, canvas.height], end: [0, canvas.height] },
                { start: [0, canvas.height], end: [0, 0] }
            ];

            edges.forEach((edge, i) => {
                const offset = i * (Math.PI / 2);
                const alpha = Math.sin(time * 2 + offset) * 0.5 + 0.5;
                if (alpha > 0.1) {
                    const lightning = createLightning(
                        edge.start[0], edge.start[1],
                        edge.end[0], edge.end[1],
                        12
                    );
                    drawLightning(lightning, alpha);

                    // Giảm số lượng nhánh phụ
                    for (let j = 1; j < lightning.length - 1; j++) {
                        if (Math.random() < 0.2) { // Giảm xác suất xuống 0.2
                            const branchEnd = [
                                lightning[j][0] + (Math.random() - 0.5) * 30,
                                lightning[j][1] + (Math.random() - 0.5) * 30
                            ];
                            const branch = createLightning(
                                lightning[j][0], lightning[j][1],
                                branchEnd[0], branchEnd[1],
                                4
                            );
                            drawLightning(branch, alpha * 0.3);
                        }
                    }
                }
            });

            // Thêm hiệu ứng nhấp nháy ngẫu nhiên
            if (Math.random() < 0.03) {
                ctx.fillStyle = `rgba(34, 197, 94, ${Math.random() * 0.1})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            frame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
            style={{
                mixBlendMode: 'screen',
                filter: 'blur(0.5px)',
                mask: 'radial-gradient(circle at 50% 0%, black 60%, transparent 70%),radial-gradient(circle at 50% 100%, black 60%, transparent 70%)',
                WebkitMask: 'radial-gradient(circle at 50% 0%, black 60%, transparent 70%),radial-gradient(circle at 50% 100%, black 60%, transparent 70%)'
            }}
        />
    );
};

export default function System203() {
    const handleDownload = () => {
        window.location.href = 'https://drive.usercontent.google.com/download?id=17JAb9am6fSWQNlNeBaPis8scUBQETi8I&export=download&authuser=0';
    };

    return (
        <div className="relative overflow-hidden">
            {/* Thêm lớp nền với các mẫu kỹ thuật số */}
            <div className="absolute -inset-8 pointer-events-none">
                {/* Matrix effect - các ký tự rơi */}
                <div className="absolute inset-0 opacity-10">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute text-[8px] font-mono text-green-400/30"
                            style={{
                                left: `${i * 10}%`,
                                animation: `matrixDrop ${2 + i}s linear infinite`,
                                animationDelay: `${i * 0.3}s`
                            }}
                        >
                            {[...Array(8)].map((_, j) => (
                                <div key={j} className="my-1">
                                    {Math.random().toString(36).substring(2, 4)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Các vòng tròn đồng tâm */}
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-green-500/10 rounded-full"
                        style={{
                            width: `${(i + 1) * 100}px`,
                            height: `${(i + 1) * 100}px`,
                            animation: `ripple ${3 + i}s linear infinite`
                        }}
                    />
                ))}

                {/* Các đường mạch phức tạp */}
                <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-full h-[1px]"
                            style={{
                                top: `${i * 12.5}%`,
                                background: `linear-gradient(90deg, 
                                    transparent 0%, 
                                    rgba(34, 197, 94, 0.1) 20%, 
                                    rgba(34, 197, 94, 0.2) 50%,
                                    rgba(34, 197, 94, 0.1) 80%, 
                                    transparent 100%
                                )`,
                                animation: `circuit ${4 + i}s linear infinite`
                            }}
                        />
                    ))}
                </div>

                {/* Các điểm kết nối phụ */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    >
                        <div className="absolute w-full h-full bg-green-400/20 rounded-full animate-ping" />
                        <div className="absolute -inset-1 bg-green-400/10 rounded-full animate-pulse" />
                    </div>
                ))}

                {/* Mã hex động */}
                <div className="absolute top-2 right-4 text-[6px] font-mono text-green-500/30 text-right">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                            {`0x${Math.random().toString(16).substring(2, 6).toUpperCase()}`}
                        </div>
                    ))}
                </div>

                {/* Thông số kỹ thuật */}
                <div className="absolute bottom-4 left-4 text-[6px] font-mono space-y-1">
                    <div className="text-green-500/40">QUANTUM.CORE.v2.3</div>
                    <div className="text-green-500/30">TEMP: {Math.floor(Math.random() * 100)}°C</div>
                    <div className="text-green-500/30">LOAD: {Math.floor(Math.random() * 100)}%</div>
                    <div className="text-green-500/30">MEM: {Math.floor(Math.random() * 1000)}MB</div>
                </div>

                {/* Vòng xoay đa lớp */}
                <div className="absolute -right-6 bottom-8 w-12 h-12">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute inset-0 border border-green-500/20 rounded-full animate-spin"
                            style={{
                                animationDuration: `${3 + i}s`,
                                transform: `scale(${0.8 - i * 0.2})`
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Thêm lớp hiệu ứng NASA */}
            <div className="absolute -inset-12 pointer-events-none">
                {/* Radar quét */}
                <div className="absolute left-0 top-0 w-32 h-32 opacity-20">
                    <div className="absolute w-full h-full rounded-full border border-green-500/30" />
                    <div className="absolute w-full h-full origin-center animate-[radarSweep_4s_linear_infinite]"
                        style={{
                            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34, 197, 94, 0.2) 20deg, transparent 40deg)'
                        }}
                    />
                    <div className="absolute inset-4 border border-green-500/20 rounded-full" />
                    <div className="absolute inset-8 border border-green-500/10 rounded-full" />
                </div>

                {/* Holographic Display */}
                <div className="absolute right-4 top-4 w-40 h-24">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-green-400/30 to-transparent"
                            style={{
                                top: `${i * 12.5}%`,
                                animation: `hologramScan ${2 + i * 0.5}s linear infinite`,
                                opacity: 0.1 + (i * 0.1)
                            }}
                        />
                    ))}
                    <div className="absolute inset-0 border border-green-500/20 rounded-md" />
                    <div className="absolute top-1 left-2 text-[6px] font-mono text-green-500/40">
                        QUANTUM ANALYSIS
                    </div>
                    {/* Animated Data Points */}
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute h-1 bg-green-400/20 rounded-full"
                            style={{
                                width: `${Math.random() * 30 + 10}%`,
                                bottom: `${20 + i * 15}%`,
                                left: '10%',
                                animation: `dataFluctuate ${3 + i}s ease-in-out infinite`
                            }}
                        />
                    ))}
                </div>

                {/* Orbital Paths */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute border border-green-500/10 rounded-full"
                            style={{
                                width: `${200 + i * 60}px`,
                                height: `${200 + i * 60}px`,
                                animation: `orbit ${10 + i * 5}s linear infinite`,
                                transform: `rotate(${i * 30}deg)`
                            }}
                        >
                            <div
                                className="absolute w-2 h-2 bg-green-400/30 rounded-full"
                                style={{
                                    top: '0%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    animation: `pulse ${2 + i}s infinite`
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Quantum Particle System */}
                <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animation: `quantum ${5 + Math.random() * 5}s linear infinite`
                            }}
                        >
                            <div className="w-full h-full bg-green-400/30 rounded-full animate-ping" />
                            <div className="absolute -inset-1 bg-green-400/10 rounded-full animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Advanced Diagnostic Data */}
                <div className="absolute bottom-4 right-4 text-[6px] font-mono space-y-0.5">
                    <div className="text-green-500/40 animate-pulse">QUANTUM CORE STABLE</div>
                    <div className="text-green-500/30">ENTROPY: {(Math.random() * 100).toFixed(6)}%</div>
                    <div className="text-green-500/30">QUANTUM FLUX: {(Math.random() * 10).toFixed(8)}</div>
                    <div className="text-green-500/30">TIMELINE INTEGRITY: 99.999%</div>
                    <div className="text-green-500/30">DIMENSIONAL VARIANCE: 0.00001</div>
                </div>

                {/* Binary Data Stream */}
                <div className="absolute top-0 left-1/4 w-[1px] h-full opacity-20">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-8 text-[4px] font-mono text-green-500/40 whitespace-nowrap"
                            style={{
                                top: `${i * 5}%`,
                                animation: `binaryStream ${2 + i * 0.1}s linear infinite`,
                                transform: `translateY(${Math.random() * 100}%)`
                            }}
                        >
                            {Math.random().toString(2).substring(2, 10)}
                        </div>
                    ))}
                </div>
            </div>

            <motion.div
                onClick={handleDownload}
                className="relative flex items-center space-x-3 px-6 py-3.5 rounded-xl
                bg-green-900/10 border border-green-500/30
                hover:bg-green-800/20 hover:border-green-400/40
                transition-all duration-500
                text-green-400 font-medium cursor-pointer
                shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                whileHover={{
                    scale: 1.02,
                    boxShadow: '0 0 25px rgba(34,197,94,0.25)'
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15
                }}
            >
                <LightningEffect />

                {/* Thêm lớp chi tiết công nghệ mới */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Grid pattern phức tạp */}
                    <div className="absolute inset-0"
                        style={{
                            backgroundImage: `
                                linear-gradient(to right, rgba(34, 197, 94, 0.03) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(34, 197, 94, 0.03) 1px, transparent 1px),
                                radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.05) 0%, transparent 8%),
                                linear-gradient(45deg, transparent 48%, rgba(34, 197, 94, 0.02) 49%, rgba(34, 197, 94, 0.02) 51%, transparent 52%),
                                repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(34, 197, 94, 0.02) 5px, rgba(34, 197, 94, 0.02) 6px),
                                repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(34, 197, 94, 0.02) 5px, rgba(34, 197, 94, 0.02) 6px)
                            `,
                            backgroundSize: '20px 20px, 20px 20px, 120px 120px, 40px 40px, 20px 20px, 20px 20px'
                        }}
                    />

                    {/* Các đường trang trí góc nâng cao */}
                    {[
                        'top-2 left-2 border-l-2 border-t-2 rounded-tl-lg',
                        'top-2 right-2 border-r-2 border-t-2 rounded-tr-lg',
                        'bottom-2 left-2 border-l-2 border-b-2 rounded-bl-lg',
                        'bottom-2 right-2 border-r-2 border-b-2 rounded-br-lg'
                    ].map((className, i) => (
                        <div key={i} className="relative">
                            <div className={`absolute w-4 h-4 border-green-500/20 ${className}`} />
                            <div className={`absolute w-2 h-2 border-green-400/30 ${className}`} />
                            <div className={`absolute w-1 h-1 bg-green-400/20 ${className.replace('border-l-2 border-t-2', '')}`} />
                        </div>
                    ))}

                    {/* Các điểm kết nối với hiệu ứng pulse nâng cao */}
                    {[
                        'left-4', 'right-4', 'left-1/4', 'right-1/4'
                    ].map((position, i) => (
                        <div key={i} className={`absolute ${position} top-1/2 -translate-y-1/2`}>
                            <div className="relative">
                                <div className="w-1.5 h-1.5 bg-green-400/30 rounded-full" />
                                <div className="absolute inset-0 animate-ping bg-green-400/20 rounded-full" />
                                <div className="absolute -inset-1 animate-pulse bg-green-400/10 rounded-full" />
                                <div className="absolute -inset-2 border border-green-500/10 rounded-full" />
                            </div>
                        </div>
                    ))}

                    {/* Mã hệ thống và thông số nâng cao */}
                    <div className="absolute bottom-2 left-4 text-[6px] font-mono space-y-0.5">
                        <div className="text-green-500/30 animate-pulse">SYS:203.X</div>
                        <div className="text-green-500/20">CORE:QUANTUM</div>
                        <div className="text-green-500/20">PWR:∞</div>
                        <div className="text-green-500/20">LAT:0.001ms</div>
                        <div className="text-green-500/20">TEMP:291K</div>
                    </div>

                    {/* Vòng tròn xoay đa lớp */}
                    <div className="absolute right-6 bottom-3 w-6 h-6">
                        <div className="absolute inset-0 border border-green-500/20 rounded-full" />
                        <div className="absolute inset-0 border-t-2 border-green-400/20 rounded-full animate-spin"
                            style={{ animationDuration: '3s' }} />
                        <div className="absolute inset-1 border border-green-500/10 rounded-full animate-spin"
                            style={{ animationDuration: '2s' }} />
                        <div className="absolute inset-2 border-t border-green-400/30 rounded-full animate-spin"
                            style={{ animationDuration: '1s' }} />
                    </div>

                    {/* Đường kẻ với điểm chạy nâng cao */}
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/10 to-transparent">
                        <div className="absolute w-4 h-1 bg-gradient-to-r from-transparent via-green-400/30 to-transparent animate-[moveRight_4s_linear_infinite]" />
                        <div className="absolute w-2 h-[2px] bg-gradient-to-r from-transparent via-green-300/40 to-transparent animate-[moveRight_3s_linear_infinite]" />
                    </div>

                    {/* Hiệu ứng quét */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/5 to-transparent animate-[scan_3s_ease-in-out_infinite]" />

                    {/* Các đường nối mạch */}
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-green-500/10 to-transparent" />
                        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-green-500/10 to-transparent" />
                    </div>

                    {/* Mã hex trang trí */}
                    <div className="absolute top-2 right-4 text-[4px] font-mono text-green-500/20">
                        <div>0x2099</div>
                        <div>0xQNTM</div>
                    </div>
                </div>

                <svg className="w-5 h-5 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>

                {/* Text SYSTEM203 với hiệu ứng glitch và đa trạng thái */}
                <div className="relative z-10 flex items-center">
                    {/* Layer chính */}
                    <div className="relative flex items-center">
                        {/* SYSTEM với glitch */}
                        <div className="relative">
                            <span className="font-quantum tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 animate-gradient-x">
                                SYSTEM
                            </span>

                            {/* Glitch layers */}
                            <div className="absolute inset-0 opacity-70">
                                <span className="absolute -left-[2px] top-0 text-red-400/30 animate-glitch-1 select-none">SYSTEM</span>
                                <span className="absolute -left-[1px] top-[2px] text-blue-300/30 animate-glitch-2 select-none">SYSTEM</span>
                                <span className="absolute left-[1px] top-[-1px] text-green-400/30 animate-glitch-3 select-none">SYSTEM</span>
                            </div>

                            {/* Noise overlay */}
                            <div className="absolute inset-0 bg-noise opacity-5 mix-blend-overlay" />

                            {/* Quantum fluctuation */}
                            <div className="absolute inset-0 animate-quantum-shift">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent" />
                            </div>
                        </div>

                        {/* Separator với hiệu ứng năng lượng */}
                        <div className="relative mx-2 flex items-center space-x-[1px]">
                            <div className="w-[2px] h-5 bg-gradient-to-b from-green-400/0 via-green-400/50 to-green-400/0 animate-energy-pulse" />
                            <div className="w-[1px] h-3 bg-gradient-to-b from-green-400/0 via-green-400/30 to-green-400/0 animate-energy-pulse-delayed" />
                        </div>

                        {/* 203 với hiệu ứng binary state */}
                        <div className="relative">
                            <span className="font-quantum tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-200 to-green-400 animate-binary-state">
                                203
                            </span>

                            {/* Binary state overlay */}
                            <div className="absolute inset-0 flex justify-between items-center opacity-30">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i}
                                        className="w-[1px] h-full bg-green-400/50 animate-binary-flip"
                                        style={{ animationDelay: `${i * 0.2}s` }}
                                    />
                                ))}
                            </div>

                            {/* Data corruption effect */}
                            <div className="absolute inset-0">
                                <span className="absolute inset-0 text-red-400/20 animate-data-corruption select-none">203</span>
                                <span className="absolute inset-0 text-blue-400/20 animate-data-corruption-alt select-none">203</span>
                            </div>
                        </div>
                    </div>

                    {/* Quantum state indicators */}
                    <div className="absolute -top-2 -right-4 flex space-x-0.5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="relative w-1 h-1">
                                <div className="absolute inset-0 bg-green-400/50 rounded-full animate-quantum-state"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                <div className="absolute inset-0 border border-green-400/30 rounded-full animate-quantum-pulse" />
                            </div>
                        ))}
                    </div>
                </div>

                <svg className="w-5 h-5 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>

                {/* Thêm các chi tiết nhỏ xung quanh text */}
                <div className="absolute left-24 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-400/40 rounded-full animate-ping" />
                    <div className="text-[6px] font-mono text-green-500/60 animate-pulse">ACTIVE</div>
                </div>

                {/* Thêm đường kẻ trang trí */}
                <div className="absolute left-20 top-1/2 -translate-y-1/2 w-[1px] h-4">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-400/30 to-transparent" />
                </div>

                {/* Thêm icon download */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50">
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
}
const styles = `
@keyframes scanline {
    0% { transform: translateX(-100%) rotate(var(--rotate, 1deg)); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%) rotate(var(--rotate, 1deg)); opacity: 0; }
}

@keyframes matrixDrop {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
}

@keyframes ripple {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
    100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
}

@keyframes circuit {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

@keyframes moveRight {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

@keyframes scan {
    0%, 100% { transform: translateX(-100%); opacity: 0; }
    50% { transform: translateX(100%); opacity: 0.5; }
}

@keyframes radarSweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes hologramScan {
    0% { transform: translateY(0) scaleX(0.9); opacity: 0.5; }
    50% { transform: translateY(0) scaleX(1.1); opacity: 1; }
    100% { transform: translateY(0) scaleX(0.9); opacity: 0.5; }
}

@keyframes dataFluctuate {
    0%, 100% { transform: scaleX(1); opacity: 0.2; }
    50% { transform: scaleX(1.2); opacity: 0.4; }
}

@keyframes orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes quantum {
    0%, 100% { transform: scale(1) translate(0); opacity: 0.3; }
    50% { transform: scale(1.5) translate(2px, -2px); opacity: 0.6; }
}

@keyframes binaryStream {
    0% { transform: translateY(100vh); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(-100vh); opacity: 0; }
}

@keyframes gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

@keyframes gradient-slow {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

@keyframes gradient-fast {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

@keyframes glitch-1 {
    0%, 100% { clip-path: inset(50% 0 30% 0); transform: translate(-2px); }
    20% { clip-path: inset(20% 0 60% 0); transform: translate(2px); }
    40% { clip-path: inset(40% 0 40% 0); transform: translate(-4px); }
    60% { clip-path: inset(10% 0 70% 0); transform: translate(4px); }
    80% { clip-path: inset(30% 0 50% 0); transform: translate(0px); }
}

@keyframes glitch-2 {
    0%, 100% { clip-path: inset(30% 0 50% 0); transform: translate(2px); }
    20% { clip-path: inset(60% 0 20% 0); transform: translate(-2px); }
    40% { clip-path: inset(20% 0 60% 0); transform: translate(4px); }
    60% { clip-path: inset(50% 0 30% 0); transform: translate(-4px); }
    80% { clip-path: inset(40% 0 40% 0); transform: translate(0px); }
}

@keyframes glitch-3 {
    0%, 100% { clip-path: inset(40% 0 40% 0); transform: translate(0); }
    20% { clip-path: inset(10% 0 70% 0); transform: translate(-2px); }
    40% { clip-path: inset(30% 0 50% 0); transform: translate(2px); }
    60% { clip-path: inset(60% 0 20% 0); transform: translate(-1px); }
    80% { clip-path: inset(20% 0 60% 0); transform: translate(1px); }
}

@keyframes quantum-shift {
    0%, 100% { transform: translateX(-100%); opacity: 0; }
    50% { transform: translateX(100%); opacity: 0.5; }
}

@keyframes energy-pulse {
    0%, 100% { opacity: 0.3; height: 60%; }
    50% { opacity: 0.8; height: 100%; }
}

@keyframes energy-pulse-delayed {
    0%, 100% { opacity: 0.2; height: 40%; }
    50% { opacity: 0.6; height: 80%; }
}

@keyframes binary-state {
    0%, 100% { filter: hue-rotate(0deg) brightness(1); }
    50% { filter: hue-rotate(180deg) brightness(1.2); }
}

@keyframes binary-flip {
    0%, 100% { transform: scaleY(1); opacity: 0.3; }
    50% { transform: scaleY(0); opacity: 0.8; }
}

@keyframes data-corruption {
    0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
    20% { clip-path: inset(20% 0 0 0); transform: translate(2px); }
    40% { clip-path: inset(0 20% 0 0); transform: translate(-2px); }
    60% { clip-path: inset(0 0 20% 0); transform: translate(1px); }
    80% { clip-path: inset(0 0 0 20%); transform: translate(-1px); }
}

@keyframes data-corruption-alt {
    0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
    20% { clip-path: inset(0 20% 0 0); transform: translate(-2px); }
    40% { clip-path: inset(20% 0 0 0); transform: translate(2px); }
    60% { clip-path: inset(0 0 0 20%); transform: translate(-1px); }
    80% { clip-path: inset(0 0 20% 0); transform: translate(1px); }
}

@keyframes quantum-state {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(0.5); opacity: 1; }
}

@keyframes quantum-pulse {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.5); opacity: 0; }
}
`; 
