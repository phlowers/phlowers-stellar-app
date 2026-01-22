/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import Dexie, { Table } from 'dexie';

import {
  UserEntity,
  StudyEntity,
  CatalogAttachmentEntity,
  CatalogCableEntity,
  CatalogChainEntity,
  CatalogLineEntity,
  CatalogMaintenanceEntity
} from './entities';

import {
  USER_SCHEMA,
  STUDY_SCHEMA,
  CATALOG_ATTACHMENT_SCHEMA,
  CATALOG_CABLE_SCHEMA,
  CATALOG_CHAIN_SCHEMA,
  CATALOG_LINE_SCHEMA,
  CATALOG_MAINTENANCE_SCHEMA
} from './schemas';

/**
 * Application database class using Dexie (IndexedDB wrapper)
 * Centralizes all data persistence for the application
 */
export class AppDatabase extends Dexie {
  // Domain tables
  users!: Table<UserEntity, number>;
  studies!: Table<StudyEntity, string>;

  // Catalog tables
  catAttachments!: Table<CatalogAttachmentEntity, string>;
  catCables!: Table<CatalogCableEntity, string>;
  catChains!: Table<CatalogChainEntity, string>;
  catLines!: Table<CatalogLineEntity, string>;
  catMaintenance!: Table<CatalogMaintenanceEntity, string>;

  constructor() {
    super('stellar-db');

    this.version(1).stores({
      ...USER_SCHEMA,
      ...STUDY_SCHEMA,
      ...CATALOG_ATTACHMENT_SCHEMA,
      ...CATALOG_CABLE_SCHEMA,
      ...CATALOG_CHAIN_SCHEMA,
      ...CATALOG_LINE_SCHEMA,
      ...CATALOG_MAINTENANCE_SCHEMA
    });
  }
}

/** @deprecated Use AppDatabase instead */
export const AppDB = AppDatabase;
