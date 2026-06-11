/**
 * Cooldown between two automatic OIDC login redirects, in milliseconds.
 * Prevents redirect loops when protected requests keep failing.
 */
export const AUTH_RESYNC_REDIRECT_COOLDOWN_MS = 15000;

/** Session storage key used to persist the last automatic OIDC redirect timestamp. */
export const AUTH_RESYNC_LAST_REDIRECT_AT_STORAGE_KEY = 'auth_resync:last_redirect_at';
