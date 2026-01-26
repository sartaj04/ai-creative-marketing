/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone', // For Docker production builds
    reactStrictMode: true,
    images: {
        domains: [
            'localhost',
            'pixo-assets.s3.ap-south-1.amazonaws.com',
            'images.unsplash.com',
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.amazonaws.com',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
            },
        ];
    },
};

export default nextConfig;
