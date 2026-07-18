/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Uploads (course material, policy PDFs, vault/onboarding docs) send base64
    // payloads through Server Actions; an 8MB file is ~11MB base64, over Next's
    // 1MB default. Raise the ceiling to cover the largest allowed upload.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
