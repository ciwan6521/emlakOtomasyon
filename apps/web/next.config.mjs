function mediaPatternsFromEnv() {
  const urls = [process.env.S3_PUBLIC_URL, process.env.NEXT_PUBLIC_MEDIA_URL];
  const seen = new Set(["media.pointstepup.com"]);
  const patterns = [];
  for (const raw of urls) {
    if (!raw) continue;
    try {
      const u = new URL(raw);
      if (seen.has(u.hostname)) continue;
      seen.add(u.hostname);
      patterns.push({
        protocol: u.protocol.replace(":", ""),
        hostname: u.hostname,
        pathname: "/**",
      });
    } catch {
      /* ignore invalid URLs */
    }
  }
  return patterns;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@reos/shared'],
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "media.pointstepup.com", pathname: "/**" },
      ...mediaPatternsFromEnv(),
    ],
  },
};

export default nextConfig;
