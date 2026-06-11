import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthResyncService } from '@services/auth/auth-resync.service';
import { AuthService } from '@services/auth/auth.service';
import { catchError, throwError } from 'rxjs';

const TRACKED_STATUS_CODES = new Set([401, 403, 501]);

const isSameOriginRequest = (requestUrl: string): boolean => {
  try {
    const resolvedUrl = new URL(requestUrl, globalThis.location.origin);
    return resolvedUrl.origin === globalThis.location.origin;
  } catch {
    return false;
  }
};

export const authSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const authResyncService = inject(AuthResyncService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        TRACKED_STATUS_CODES.has(error.status) &&
        isSameOriginRequest(request.url)
      ) {
        authService.markServerMismatchFromStatus(error.status);
        authResyncService.triggerImmediateRedirect();
      }
      return throwError(() => error);
    })
  );
};
