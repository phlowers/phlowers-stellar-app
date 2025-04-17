/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Dexie, { Table } from 'dexie';
import { userTable } from './tables/user';
import { studyTable } from './tables/study';
import { branchTable } from './tables/branch';
import { lineTable } from './tables/line';
import { regionalMaintenanceCenterTable } from './tables/regionalMaintenanceCenter';
import { maintenanceCenterTable } from './tables/maintenanceCenter';
import { tensionTable } from './tables/tension';
import { transitLinkTable } from './tables/transitLink';
import { Study } from './interfaces/study';
import { User } from './interfaces/user';
import { attachmentTable } from './tables/attachment';
import { sectionTable } from './tables/section';
import { spanTable } from './tables/span';
export class AppDB extends Dexie {
  users!: Table<User, number>;
  studies!: Table<Study, string>;

  constructor() {
    super('stellar-db');
    this.version(1).stores({
      ...attachmentTable,
      ...branchTable,
      ...lineTable,
      ...maintenanceCenterTable,
      ...regionalMaintenanceCenterTable,
      ...sectionTable,
      ...spanTable,
      ...studyTable,
      ...tensionTable,
      ...transitLinkTable,
      ...userTable
    });
  }
}
