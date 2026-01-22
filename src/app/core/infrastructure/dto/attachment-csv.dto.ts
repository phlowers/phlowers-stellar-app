/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * DTO for importing attachments from RTE CSV files
 */
export interface AttachmentCsvDto {
  support_id_catalog: string;
  support_idr: string;
  support_adr: string;
  support_tower: string;
  support_family: string;
  position: string;
  X: string;
  Y: string;
  Z: string;
  L: string;
}
