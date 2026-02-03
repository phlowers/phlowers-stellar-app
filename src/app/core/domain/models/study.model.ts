/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section } from './section.model';

/**
 * Study domain model - represents a power line study
 */
export interface Study {
  uuid: string;
  author_email: string;
  title: string;
  description?: string;
  shareable: boolean;
  created_at_offline: string;
  updated_at_offline: string;
  saved: boolean;
  sections: Section[];
}
