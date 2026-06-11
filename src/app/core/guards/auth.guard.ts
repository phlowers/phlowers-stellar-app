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

  if (authService.shouldForceServerResync()) {
    const refreshedUser = await authService.refreshFromNetwork();
    if (refreshedUser) {
      return true;
    }
    return router.createUrlTree(['/login']);
  }

  if (authService.currentUser()) {
    return true;
  }

  // Fallback: re-check IndexedDB in case the signal was not yet set.
  const restored = await authService.tryRestoreFromCache();
  if (restored) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
