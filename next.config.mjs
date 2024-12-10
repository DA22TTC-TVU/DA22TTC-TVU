/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0',
                    },
                ],
            },
        ];
    },
    api: {
        bodyParser: {
            sizeLimit: '100mb',
        },
        responseLimit: '100mb',
    },
};

export default nextConfig;
