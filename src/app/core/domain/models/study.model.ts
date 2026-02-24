/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section } from './section.model';

/**
 * Study domain model - represents a power line study.
 *
 * @remarks
 * A study contains multiple sections and tracks metadata about
 * the author, creation time, and sharing settings.
 *
 * @example
 * ```typescript
 * const study: Study = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   author_email: 'user@example.com',
 *   title: 'Power Line Analysis',
 *   shareable: true,
 *   created_at_offline: '2026-01-27T10:00:00Z',
 *   updated_at_offline: '2026-01-27T10:00:00Z',
 *   saved: true,
 *   sections: []
 * };
 * ```
 *
 * @category Domain Models
 */
export interface Study {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Email address of the study author */
  author_email: string;
  /** Title of the study */
  title: string;
  /** Optional description of the study */
  description?: string;
  /** Whether the study can be shared with others */
  shareable: boolean;
  /** ISO 8601 timestamp of offline creation */
  created_at_offline: string;
  /** ISO 8601 timestamp of last offline update */
  updated_at_offline: string;
  /** Whether the study has been saved */
  saved: boolean;
  /** Array of sections in this study */
  sections: Section[];
}
