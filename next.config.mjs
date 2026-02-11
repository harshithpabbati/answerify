/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable compression for better performance
  compress: true,
  
  // Optimize bundle analyzer output
  poweredByHeader: false,
  
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
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
