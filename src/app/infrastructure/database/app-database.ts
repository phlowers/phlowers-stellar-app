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
  CatalogSupportAttachmentEntity,
  CatalogCableEntity,
  CatalogChainEntity,
  CatalogLineEntity,
  CatalogMaintenanceEntity,
  CatalogObstacleTypeEntity,
  MetadataEntity
} from './entities';

import { applyStellarDbVersions } from './app-database.versions';

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
  /** Table storing user accounts (primary key: email string) */
  users!: Table<UserEntity, string>;
  /** Table storing power line studies */
  studies!: Table<StudyEntity, string>;

  /** Table storing attachment catalog data (legacy flat schema, removed in V6) */
  catAttachments!: Table<CatalogAttachmentEntity, string>;
  /** Table storing attachment catalog data grouped by support_name (V6+) */
  catSupportAttachments!: Table<CatalogSupportAttachmentEntity, string>;
  /** Table storing cable/conductor catalog data */
  catCables!: Table<CatalogCableEntity, string>;
  /** Table storing insulator chain catalog data */
  catChains!: Table<CatalogChainEntity, string>;
  /** Table storing power line catalog data */
  catLines!: Table<CatalogLineEntity, string>;
  /** Table storing maintenance organization catalog data */
  catMaintenance!: Table<CatalogMaintenanceEntity, string>;
  /** Table storing obstacle type catalog data */
  catObstacleTypes!: Table<CatalogObstacleTypeEntity, string>;
  /** Table storing metadata such as CSV hashes for incremental sync */
  metadata!: Table<MetadataEntity, string>;

  /**
   * Creates an AppDatabase instance named 'stellar-db' and registers
   * all table schemas (version 1).
   */
  constructor() {
    super('stellar-db');
    applyStellarDbVersions(this);
  }
}

/** @deprecated Use AppDatabase instead */
export const AppDB = AppDatabase;
