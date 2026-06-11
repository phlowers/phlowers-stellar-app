/** Returns true when automatic OIDC redirect should be skipped for the current path. */
export const isRedirectSuppressedPath = (pathname: string): boolean =>
  pathname.startsWith('/auth/') || pathname === '/login';

/** Returns true when cooldown has not elapsed yet. */
export const isCooldownActive = (lastRedirectAt: number, now: number, cooldownMs: number): boolean =>
  now - lastRedirectAt < cooldownMs;

/** Parses a persisted timestamp and returns 0 when invalid. */
export const parseStoredTimestamp = (value: string | null): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
