/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site (frontend/out) that the FastAPI backend serves.
  output: "export",
  // Each route becomes a folder with index.html, which the static file server
  // resolves cleanly (e.g. /login/ -> /login/index.html).
  trailingSlash: true,
  // No Next.js image optimization server exists in a static export.
  images: { unoptimized: true },
};

export default nextConfig;
