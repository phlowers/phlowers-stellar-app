/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';

/**
 * Centralized logging service wrapping the browser console API.
 *
 * Provides typed methods for each log level so that all console output
 * in Angular DI contexts goes through a single injectable point.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  /** Logs a general-purpose message. */
  log(message: unknown, ...data: unknown[]): void {
    console.log(message, ...data);
  }

  /** Logs an error message. */
  error(message: unknown, ...data: unknown[]): void {
    console.error(message, ...data);
  }

  /** Logs a warning message. */
  warn(message: unknown, ...data: unknown[]): void {
    console.warn(message, ...data);
  }

  /** Logs an informational message. */
  info(message: unknown, ...data: unknown[]): void {
    console.info(message, ...data);
  }
}
