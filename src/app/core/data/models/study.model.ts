/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section } from '../database/interfaces/section';

export interface StudyModel {
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

export interface ModifyStudyModel {
  author_email?: string | null;
  title?: string | null;
  description?: string | null;
  created_at_offline?: string | null;
  updated_at_offline?: string | null;
}

export interface SearchStudyModel {
  uuid?: string | null;
  author_email?: string | null;
  title?: string | null;
  description?: string | null;
  created_after?: string | null;
  created_before?: string | null;
}
