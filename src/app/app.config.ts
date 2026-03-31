/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { primengPreset } from '../styles/primeng-preset';
import { provideMarkdown } from 'ngx-markdown';
import { oidcTokenInterceptor } from '@core/interceptors/oidc-token.interceptor';
import { AuthService } from '@services/auth/auth.service';

/** Root Angular application configuration with routing, HTTP, animations, PrimeNG theme, and markdown support. */
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService) => () => authService.initialize(),
      deps: [AuthService],
      multi: true
    },
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      }),
      withEnabledBlockingInitialNavigation()
    ),
    provideHttpClient(withFetch(), withInterceptors([oidcTokenInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: primengPreset,
        options: { darkModeSelector: '.app-dark' }
      }
    }),
    provideMarkdown(),
    MessageService
  ]
};
