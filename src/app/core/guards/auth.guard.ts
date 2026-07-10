/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';

/**
 * Route guard that redirects unauthenticated users to the login page.
 *
 * When server-side OIDC is unavailable and no cached user exists in IndexedDB,
 * the guard redirects to `/login` so the user can enter their email manually.
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Offline-first: never block navigation on a network round-trip. The
  // authoritative resync runs in the background (AuthService.initialize) and
  // any 401/403 is handled by the auth-session interceptor (G@IA redirect),
  // so the guard only needs the already-resolved user or the IndexedDB cache.
  if (authService.currentUser()) {
    return true;
  }

  // Fallback: re-check IndexedDB in case the signal was not yet set. This
  // honours the current OIDC mode and returns false when a server mismatch is
  // proven while online (shouldForceServerResync), routing to /login.
  const restored = await authService.tryRestoreFromCache();
  if (restored) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
