import type { Request } from 'express';

/**
 * Express only applies X-Forwarded-For when `trust proxy` is configured.
 * Reading req.ip therefore keeps the trust boundary in one place (main.ts).
 */
export function getTrustedClientIp(request: Request): string {
  return normalizeIp(request.ip || request.socket?.remoteAddress || 'unknown');
}

function normalizeIp(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}
