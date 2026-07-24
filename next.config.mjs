/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ssh2', 'sqlite3', 'node-ssh'],
};

export default nextConfig;
