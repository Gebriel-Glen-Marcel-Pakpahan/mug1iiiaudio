/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: "/katalog", destination: "/", permanent: true },
      { source: "/catalog", destination: "/", permanent: true },
      { source: "/cart", destination: "/keranjang", permanent: true },
      { source: "/orders", destination: "/pesanan", permanent: true },
      { source: "/login", destination: "/masuk", permanent: true },
    ];
  },
};

export default nextConfig;
