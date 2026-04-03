/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { primengPreset } from '../styles/primeng-preset';
import { provideMarkdown } from 'ngx-markdown';
import { StorageService } from '@services/storage/storage.service';
import { AuthService } from '@services/auth/auth.service';
import { UpdateService } from '@services/worker_update/worker_update.service';

/**
 * Factory for the application initializer.
 *
 * Enforces the V2 startup sequence (§5.1 of connexion-gaia.md):
 * 1. StorageService.setPersistentStorage()
 * 2. StorageService.createDatabase()
 * 3. AuthService.initialize()
 * 4. UpdateService.checkForUpdateOnce()
 *
 * Steps 5 (setupData) and 6 (WorkerPythonService.setup) are handled by AppComponent.ngOnInit
 * after this initializer completes, with an explicit try/catch so step 6 always runs.
 */
function appInitializerFactory(storageService: StorageService, authService: AuthService, updateService: UpdateService) {
  return async (): Promise<void> => {
    await storageService.setPersistentStorage();
    await storageService.createDatabase();
    await authService.initialize();
    await updateService.checkForUpdateOnce();
  };
}

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
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: primengPreset,
        options: { darkModeSelector: '.app-dark' }
      }
    }),
    provideMarkdown(),
    MessageService,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [StorageService, AuthService, UpdateService],
      multi: true
    }
  ]
};
