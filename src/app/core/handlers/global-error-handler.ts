/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { LoggerService } from '@services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';

/** Minimum delay (ms) between two user-facing error notifications. */
const NOTIFICATION_COOLDOWN_MS = 10000;

/**
 * Application-wide error handler (last-resort safety net).
 *
 * Replaces Angular's default handler so that:
 *  - every uncaught error is logged through `LoggerService` (repo policy:
 *    never call `console.*` directly), and
 *  - an unexpected runtime error degrades into a single, throttled friendly
 *    toast instead of a silent broken state or a blank/technical screen.
 *
 * Services are resolved lazily via `Injector` because the `ErrorHandler` is
 * instantiated very early during bootstrap; eager constructor injection could
 * create a dependency cycle.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);
  private lastNotifiedAt = 0;

  handleError(error: unknown): void {
    const logger = this.injector.get(LoggerService, null);
    logger?.error('Unhandled application error', error);

    const now = Date.now();
    if (now - this.lastNotifiedAt >= NOTIFICATION_COOLDOWN_MS) {
      this.lastNotifiedAt = now;
      const notificationService = this.injector.get(NotificationService, null);
      notificationService?.error(
        $localize`An unexpected error occurred. Please reload the page if the problem persists.`
      );
    }
  }
}
