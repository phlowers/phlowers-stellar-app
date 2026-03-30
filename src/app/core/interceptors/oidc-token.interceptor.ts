import { HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';

/**
 * Functional OIDC Token Interceptor (Angular 19 best practice).
 *
 * Injects OIDC Bearer token into protected HTTP requests.
 * This enables update orchestration to work with Apache OIDC module.
 */
export const oidcTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const OIDC_TOKEN_KEY = 'oidc_token';
  const PROTECTED_PATHS = ['/assets_list.json'];
  const isDevelopment = isDevMode();

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
      if (isDevelopment) {
        console.log('OIDC INTERCEPTOR: Token injected for', req.url);
      }
    } else if (isDevelopment) {
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
    const storage = globalThis.localStorage;
    const tokenValue = storage?.getItem(key) ?? null;
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
