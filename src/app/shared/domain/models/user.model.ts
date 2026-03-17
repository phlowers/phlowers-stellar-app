/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Study } from './study.model';

/**
 * User domain model representing application users.
 *
 * @remarks
 * A user is identified by their email address and can own multiple studies.
 * The application stores one user per browser instance.
 *
 * @example
 * ```typescript
 * const user: User = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   email: 'user@example.com',
 *   studies: []
 * };
 * ```
 *
 * @category Domain Models
 */
export interface User {
  /** Unique identifier (UUID v4) - optional for new users */
  uuid?: string;
  /** Email address of the user (used as primary identifier) */
  email: string;
  /** Array of studies owned by the user */
  studies?: Study[];
}
