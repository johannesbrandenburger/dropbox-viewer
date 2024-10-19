/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*dropboxusercontent.com',
                port: ''
            },
        ],
    },
    reactStrictMode: false
};

export default nextConfig;
