import type { NextConfig } from "next";

// In the Claude Code remote environment ports are proxied through claude.ai
// subdomains, so the browser's WebSocket Origin doesn't match localhost and
// Next.js 16's cross-origin dev protection blocks HMR connections.
// ALLOWED_DEV_ORIGINS (comma-separated) can override/extend this at runtime.
function getAllowedDevOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.CLAUDE_CODE_PROXY_RESOLVES_HOSTS) {
    origins.push("**.claude.ai");
  }

  if (process.env.ALLOWED_DEV_ORIGINS) {
    origins.push(
      ...process.env.ALLOWED_DEV_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }

  return origins;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
};

export default nextConfig;
