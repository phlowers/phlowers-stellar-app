/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { isDevMode, provideZoneChangeDetection } from '@angular/core';
import { logBootstrapError } from './bootstrap-logger';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';
(globalThis as unknown as { global: typeof globalThis }).global = globalThis;

// Register Service Worker before bootstrap so registration starts early.
// Note: activation may still complete after APP_INITIALIZER runs.
if ('serviceWorker' in navigator && !isDevMode()) {
  navigator.serviceWorker.register('/service-worker.js').catch((error) => {
    logBootstrapError('Service Worker registration', error);
  });
}

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    provideZoneChangeDetection(),
    ...appConfig.providers,
    provideTransloco({
      config: {
        availableLangs: ['en', 'fr'],
        // Overridden at startup by AppConfigService.loadDefaultLang(), which reads
        // assets/config/app-config.json (regenerated at Docker build time from the
        // DEFAULT_LANGUAGE build arg, see Dockerfile).
        defaultLang: 'fr',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode()
      },
      loader: TranslocoHttpLoader
    })
  ]
}).catch((err) => logBootstrapError('Application bootstrap', err));
