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
 * Application database class using Dexie (IndexedDB wrapper).
 *
 * @remarks
 * This class centralizes all data persistence for the application using
 * IndexedDB through the Dexie.js library. It defines tables for domain
 * entities (users, studies) and catalog data (cables, chains, lines, etc.).
 *
 * @example
 * ```typescript
 * const db = new AppDatabase();
 * const studies = await db.studies.toArray();
 * const cable = await db.catCables.where('name').equals('ASTER_570').first();
 * ```
 *
 * @category Infrastructure
 */
export class AppDatabase extends Dexie {
  /** Table storing user accounts */
  users!: Table<UserEntity, number>;
  /** Table storing power line studies */
  studies!: Table<StudyEntity, string>;

  /** Table storing attachment catalog data */
  catAttachments!: Table<CatalogAttachmentEntity, string>;
  /** Table storing cable/conductor catalog data */
  catCables!: Table<CatalogCableEntity, string>;
  /** Table storing insulator chain catalog data */
  catChains!: Table<CatalogChainEntity, string>;
  /** Table storing power line catalog data */
  catLines!: Table<CatalogLineEntity, string>;
  /** Table storing maintenance organization catalog data */
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
