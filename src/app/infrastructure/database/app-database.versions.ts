/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type Dexie from 'dexie';
import {
  USER_SCHEMA,
  USER_SCHEMA_V3,
  STUDY_SCHEMA,
  CATALOG_ATTACHMENT_SCHEMA,
  CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
  CATALOG_CABLE_SCHEMA,
  CATALOG_CHAIN_SCHEMA,
  CATALOG_LINE_SCHEMA,
  CATALOG_MAINTENANCE_SCHEMA,
  CATALOG_OBSTACLE_TYPE_SCHEMA,
  CATALOG_OBSTACLE_CONFIGURATION_SCHEMA,
  CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA,
  CATALOG_OBSTACLE_DISTANCE_SCHEMA,
  CATALOG_OBSTACLE_WIND_ZONE_SCHEMA,
  CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA,
  METADATA_SCHEMA
} from './schemas';

/**
 * Prefix used for the staging counterpart of every catalog table (Step 4.2
 * of the atomic catalog update). Shared with `run-worker-import.helpers.ts`, which
 * imports into `${STAGING_TABLE_PREFIX}<table>` and only promotes to the
 * live table inside a single Dexie transaction once the download has been
 * fully verified.
 */
export const STAGING_TABLE_PREFIX = 'staging_';

/** Derives a staging schema (same indexes, table names prefixed) from a live catalog schema. */
function toStagingSchema(schema: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(schema).map(([table, index]) => [`${STAGING_TABLE_PREFIX}${table}`, index]));
}

/**
 * Declares every historical version of the Stellar IndexedDB schema on a Dexie
 * instance.
 *
 * @remarks
 * Single source of truth shared by `AppDatabase` (main thread) and the
 * generic CSV import Web Worker (`openWorkerDb()`). Adding a new version
 * requires touching this file only — both contexts stay in sync automatically.
 */
export function applyStellarDbVersions(db: Dexie): void {
  db.version(1).stores({
    ...USER_SCHEMA,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA
  });

  db.version(2).stores({
    ...USER_SCHEMA,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });

  // V3: adds OIDC claims fields and sub index on users table.
  db.version(3).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });

  // V4: adds support_name and attachment_set indexes on catAttachments for Dexie-side filtering.
  db.version(4).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });

  // V5: adds compound index [support_name+attachment_set] on catAttachments
  // to allow IndexedDB to filter and order in a single indexed scan.
  db.version(5).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    ...CATALOG_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });

  // V6: replaces flat catAttachments with grouped catSupportAttachments
  // (one row per support_name instead of one row per attachment set).
  // Drastically reduces IndexedDB write/read cost for large attachments.csv imports.
  db.version(6).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    catAttachments: null,
    ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...METADATA_SCHEMA
  });

  // V7: introduces obstacle conformity configuration tables loaded from
  // obstacle_configuration.json. Adds per-obstacle configuration, regulatory
  // rule definitions, conformity distances by (obstacle, rule), wind zones and
  // a singleton conformity-config row. The legacy catObstacleTypes table is
  // preserved to keep the obstacle type dropdown strictly iso-functional.
  db.version(7).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    catAttachments: null,
    ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...CATALOG_OBSTACLE_CONFIGURATION_SCHEMA,
    ...CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA,
    ...CATALOG_OBSTACLE_DISTANCE_SCHEMA,
    ...CATALOG_OBSTACLE_WIND_ZONE_SCHEMA,
    ...CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA,
    ...METADATA_SCHEMA
  });

  // V8: adds a staging counterpart for every catalog table (Étape 4.2 of the
  // atomic catalog update). A catalog is imported into its staging table(s)
  // first; only a single Dexie transaction promotes staging -> live and
  // writes the recorded hash, so a catalog's active data and its hash always
  // change together or not at all. `users`/`studies` are untouched.
  db.version(8).stores({
    ...USER_SCHEMA_V3,
    ...STUDY_SCHEMA,
    catAttachments: null,
    ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
    ...CATALOG_CABLE_SCHEMA,
    ...CATALOG_CHAIN_SCHEMA,
    ...CATALOG_LINE_SCHEMA,
    ...CATALOG_MAINTENANCE_SCHEMA,
    ...CATALOG_OBSTACLE_TYPE_SCHEMA,
    ...CATALOG_OBSTACLE_CONFIGURATION_SCHEMA,
    ...CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA,
    ...CATALOG_OBSTACLE_DISTANCE_SCHEMA,
    ...CATALOG_OBSTACLE_WIND_ZONE_SCHEMA,
    ...CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA,
    ...METADATA_SCHEMA,
    ...toStagingSchema(CATALOG_SUPPORT_ATTACHMENT_SCHEMA),
    ...toStagingSchema(CATALOG_CABLE_SCHEMA),
    ...toStagingSchema(CATALOG_CHAIN_SCHEMA),
    ...toStagingSchema(CATALOG_LINE_SCHEMA),
    ...toStagingSchema(CATALOG_MAINTENANCE_SCHEMA),
    ...toStagingSchema(CATALOG_OBSTACLE_TYPE_SCHEMA),
    ...toStagingSchema(CATALOG_OBSTACLE_CONFIGURATION_SCHEMA),
    ...toStagingSchema(CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA),
    ...toStagingSchema(CATALOG_OBSTACLE_DISTANCE_SCHEMA),
    ...toStagingSchema(CATALOG_OBSTACLE_WIND_ZONE_SCHEMA),
    ...toStagingSchema(CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA)
  });
}
