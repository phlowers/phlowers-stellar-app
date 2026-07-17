/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Pre-bootstrap error logger (no DI dependencies).
 *
 * Used during bootstrap phase before the DI container is ready.
 * Errors are temporarily stored and flushed via LoggerService
 * as soon as the app initializes via APP_INITIALIZER.
 *
 * This ensures all errors (including pre-bootstrap errors) flow
 * through a single, auditable `LoggerService` path, complying
 * with the repo's rule: never call `console.*` directly.
 */

interface StoredBootstrapError {
  timestamp: number;
  context: string;
  error: unknown;
}

const storedErrors: StoredBootstrapError[] = [];

/**
 * Log an error during the bootstrap phase.
 * The error is stored and will be flushed via LoggerService once the app is ready.
 */
export function logBootstrapError(context: string, error: unknown): void {
  storedErrors.push({
    timestamp: Date.now(),
    context,
    error
  });
}

/**
 * Retrieve all stored bootstrap errors and clear the buffer.
 * Called by APP_INITIALIZER to flush errors to LoggerService.
 */
export function getAndClearBootstrapErrors(): StoredBootstrapError[] {
  const errors = [...storedErrors];
  storedErrors.length = 0;
  return errors;
}
