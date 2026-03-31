/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { WINDOW } from '@core/tokens/window.token';
import { environment } from '@src/environments/environment';

/** Route guard that redirects to the OIDC login when no authenticated user exists. */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const windowRef = inject(WINDOW);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to OIDC login (handled by Apache in prod, Vite middleware in dev)
  windowRef.location.href = environment.oidcLoginUrl;
  return false;
};
