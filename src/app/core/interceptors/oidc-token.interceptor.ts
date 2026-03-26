import { HttpInterceptorFn } from '@angular/common/http';

/**
 * OidcTokenInterceptor — Phase 2 refactoring
 *
 * Injects OIDC Bearer token into HTTP requests for update-related endpoints.
 *
 * @remarks
 * This interceptor enables update orchestration to work with Apache OIDC module
 * while maintaining compatibility with offline mode (no token needed for catalog requests).
 *
 * **Token source:**
 * - Reads OIDC token from localStorage key `oidc_token` (set by Apache OIDC module or login flow)
 * - Token should be stored post-authentication
 * - If token is missing, request proceeds without Authorization header (fallback to public access)
 *
 * **Scope:**
 * - Adds Bearer token to `/assets_list.json` requests (app manifest)
 * - Optionally extends to other critical update-related endpoints
 * - Catalog CSV requests from IndexedDB don't need token (read-only public data)
 *
 * **Design rationale:**
 * Service Worker cannot access OIDC tokens (no DOM/localStorage in Worker context).
 * Therefore, all authenticated fetches (manifest, optional catalog updates) must be
 * orchestrated from Angular main thread via HttpClient, which has access to token.
 *
 * @category Services
 * @category Interceptors
 * @category Phase 2 Refactoring
 */
/**
 * Functional OIDC Token Interceptor (Angular 19 best practice).
 *
 * Injects OIDC Bearer token into protected HTTP requests.
 * This enables update orchestration to work with Apache OIDC module.
 */
export const oidcTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const OIDC_TOKEN_KEY = 'oidc_token';
  const PROTECTED_PATHS = ['/assets_list.json'];

  // Check if this request is one that may require OIDC token
  if (PROTECTED_PATHS.some((path) => req.url.includes(path))) {
    const token = getOidcToken(OIDC_TOKEN_KEY);
    if (token) {
      // Clone request and add Bearer token to Authorization header
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('OIDC INTERCEPTOR: Token injected for', req.url);
    } else {
      console.log('OIDC INTERCEPTOR: No token available for', req.url, '- proceeding without Authorization');
    }
  }

  return next(req);
};

/**
 * Retrieve OIDC token from localStorage.
 *
 * @remarks
 * Token is stored by Apache OIDC module or login workflow.
 * Format may be "Bearer <token>" or just "<token>".
 *
 * @param key - Storage key name
 * @returns Token string without "Bearer " prefix, or null if unavailable
 */
function getOidcToken(key: string): string | null {
  try {
    const tokenValue = localStorage.getItem(key);
    if (!tokenValue) {
      return null;
    }

    // Token may be stored as "Bearer <token>" or just "<token>"
    // Extract the actual token value
    if (tokenValue.startsWith('Bearer ')) {
      return tokenValue.substring(7);
    }
    return tokenValue;
  } catch (error) {
    console.warn('OIDC INTERCEPTOR: Could not read token from localStorage:', error);
    return null;
  }
}
