/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const maintenanceCenterTable = {
  maintenanceCenters: '&uuid, internal_id, name, created_at, updated_at'
};

export interface MaintenanceCenter {
  uuid: string;
  internal_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
