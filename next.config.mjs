/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: '/auth',
        destination: '/auth/sign-in',
        permanent: true,
      },
      {
        source: '/sign-in',
        destination: '/auth/sign-in',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/auth/sign-up',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
      },
    ],
  },
};

export default nextConfig;
