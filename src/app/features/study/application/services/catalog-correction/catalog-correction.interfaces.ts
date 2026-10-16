/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Support } from '@shared/domain';

/** Outcome of the attachment catalog correction of a list of supports. */
export interface AttachmentCorrectionResult {
  readonly supports: Support[];
  /** `true` when at least one support has no complete entry in the attachment catalog. */
  readonly hasMissingCatalogEntries: boolean;
}
