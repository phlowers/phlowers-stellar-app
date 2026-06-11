/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { Table } from 'dexie';
import type {
  CatalogObstacleConfigurationEntity,
  CatalogObstacleConformityConfigEntity,
  CatalogObstacleDistanceEntity,
  CatalogObstacleRuleDefinitionEntity,
  CatalogObstacleTypeEntity,
  CatalogObstacleWindZoneEntity
} from '@infrastructure/database';
import type { JsonImportApplyResult, JsonImportConfig, JsonImportContext } from '../json-import.engine.interfaces';
import {
  assertObstacleConfigurationJson,
  buildConformityConfig,
  mapObstacleConfiguration,
  mapObstacleDistances,
  mapObstacleType,
  mapRule,
  mapWindZone
} from './obstacles.config.helpers';

/**
 * Replace-mode JSON config for `obstacle_configuration.json`.
 *
 * @remarks
 * Persists six tables atomically inside one Dexie `rw` transaction:
 * - `catObstacleTypes` (public dropdown surface — iso-functional)
 * - `catObstacleConfigurations` (per-obstacle `red_zone` / `conformity`)
 * - `catObstacleRuleDefinitions` (regulatory rule metadata)
 * - `catObstacleDistances` (legal distances per obstacle × rule)
 * - `catObstacleWindZones` (wind pressure zones)
 * - `catObstacleConformityConfig` (singleton scalar config)
 *
 * Every table is cleared then bulk-written, so the JSON file remains the
 * single source of truth.
 */
export const createObstaclesConfig = (): JsonImportConfig => ({
  kind: 'json',
  csvKey: 'obstacles',
  filename: 'obstacle_configuration.json',
  apply: applyObstacleConfiguration
});

async function applyObstacleConfiguration(payload: unknown, ctx: JsonImportContext): Promise<JsonImportApplyResult> {
  assertObstacleConfigurationJson(payload);

  const types = payload.obstacles.map(mapObstacleType);
  const configurations = payload.obstacles.map(mapObstacleConfiguration);
  const distances = payload.obstacles.flatMap(mapObstacleDistances);
  const rules = payload.rules.map(mapRule);
  const windZones = payload.windZone.values.map(mapWindZone);
  const conformityConfig = buildConformityConfig(payload);

  const db = ctx.db;
  const typesTable = db['catObstacleTypes'] as Table<CatalogObstacleTypeEntity, string>;
  const configurationsTable = db['catObstacleConfigurations'] as Table<CatalogObstacleConfigurationEntity, string>;
  const distancesTable = db['catObstacleDistances'] as Table<CatalogObstacleDistanceEntity, [string, string]>;
  const rulesTable = db['catObstacleRuleDefinitions'] as Table<CatalogObstacleRuleDefinitionEntity, string>;
  const windZonesTable = db['catObstacleWindZones'] as Table<CatalogObstacleWindZoneEntity, string>;
  const conformityConfigTable = db['catObstacleConformityConfig'] as Table<
    CatalogObstacleConformityConfigEntity,
    string
  >;

  await db.transaction(
    'rw',
    [typesTable, configurationsTable, distancesTable, rulesTable, windZonesTable, conformityConfigTable],
    async () => {
      await typesTable.clear();
      await configurationsTable.clear();
      await distancesTable.clear();
      await rulesTable.clear();
      await windZonesTable.clear();
      await conformityConfigTable.clear();

      if (types.length > 0) await typesTable.bulkPut(types);
      if (configurations.length > 0) await configurationsTable.bulkPut(configurations);
      if (distances.length > 0) await distancesTable.bulkPut(distances);
      if (rules.length > 0) await rulesTable.bulkPut(rules);
      if (windZones.length > 0) await windZonesTable.bulkPut(windZones);
      await conformityConfigTable.put(conformityConfig);
    }
  );

  const totalRows =
    payload.obstacles.length +
    payload.rules.length +
    payload.windZone.values.length +
    1; /* singleton conformity-config row */
  const totalKeys = types.length + configurations.length + distances.length + rules.length + windZones.length + 1;

  return { totalRows, totalKeys };
}
