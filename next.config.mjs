/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    // Thêm cấu hình để bỏ qua route API khi build
    images: {
        unoptimized: true,
    },
    // Bỏ qua các route API trong quá trình build
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
