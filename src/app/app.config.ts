/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { primengPreset } from '../styles/primeng-preset';
import { provideMarkdown } from 'ngx-markdown';
import { StorageService } from '@services/storage/storage.service';
import { AuthService } from '@services/auth/auth.service';
import { authSessionInterceptor } from '@services/auth/auth-session.interceptor';
import { UpdateService } from '@services/worker_update/worker_update.service';

/** Root Angular application configuration with routing, HTTP, animations, PrimeNG theme, and markdown support. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      }),
      withEnabledBlockingInitialNavigation()
    ),
    provideHttpClient(withFetch(), withInterceptors([authSessionInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: primengPreset,
        options: { darkModeSelector: '.app-dark' }
      }
    }),
    provideMarkdown(),
    MessageService,
    /**
     * Application initializer.
     *
     * Enforces the V2 startup sequence (§5.1 of connexion-gaia.md):
     * 1. StorageService.setPersistentStorage()
     * 2. StorageService.createDatabase()
     * 3. AuthService.initialize() — cache-first: resolves instantly when a
     *    previously-authenticated OIDC user is cached, running the network
     *    resync in the background (does not block this initializer).
     * 4. UpdateService.checkForUpdateOnce() — started in the background, not
     *    awaited: the update/install prompt is not part of the critical
     *    first-render path and must never delay it.
     *
     * Steps 5 (setupData) and 6 (WorkerPythonService.setup) are handled by AppComponent.ngOnInit
     * after this initializer completes, with an explicit try/catch so step 6 always runs.
     */
    provideAppInitializer(async () => {
      const storageService = inject(StorageService);
      const authService = inject(AuthService);
      const updateService = inject(UpdateService);
      await storageService.setPersistentStorage();
      await storageService.createDatabase();
      await authService.initialize();
      void updateService.checkForUpdateOnce();
    })
  ]
};
