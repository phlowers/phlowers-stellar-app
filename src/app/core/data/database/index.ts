/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Dexie, { Table } from 'dexie';
import { userTable } from './tables/user';
import { studyTable } from './tables/study';
import { catLineTable } from './tables/catLine';
import { Study } from './interfaces/study';
import { User } from './interfaces/user';
import { catAttachmentTable } from './tables/catAttachment';
import { CatAttachment } from './interfaces/catAttachment';
import { CatLine } from './interfaces/catLine';
import { CatCable } from './interfaces/catCable';
import { catCableTable } from './tables/catCable';
import { CatMaintenanceData } from './interfaces/catMaintenance';
import { catMaintenance } from './tables/catMaintenance';
import { CatChain } from './interfaces/catChain';
import { catChainTable } from './tables/catChain';

export class AppDB extends Dexie {
  users!: Table<User, number>;
  studies!: Table<Study, string>;
  catAttachments!: Table<CatAttachment, string>;
  catLines!: Table<CatLine, string>;
  catMaintenance!: Table<CatMaintenanceData, string>;
  catCables!: Table<CatCable, string>;
  catChains!: Table<CatChain, string>;

  constructor() {
    super('stellar-db');
    this.version(1).stores({
      ...catChainTable,
      ...catAttachmentTable,
      ...catLineTable,
      ...catMaintenance,
      ...studyTable,
      ...userTable,
      ...catCableTable
    });
  }
}
