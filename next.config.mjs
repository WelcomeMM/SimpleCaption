/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@remotion/renderer',
    '@remotion/bundler',
    'ffmpeg-static',
    '@remotion/install-whisper-cpp',
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
