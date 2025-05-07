/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { isDevMode } from '@angular/core';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    if ('serviceWorker' in navigator && !isDevMode()) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          ?.catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  })
  .catch((err) => console.error(err));
