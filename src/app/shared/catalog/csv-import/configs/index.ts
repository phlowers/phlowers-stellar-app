/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { CsvImportConfig, CsvKey } from '../csv-import.engine.interfaces';
import type { JsonImportConfig } from '../json-import.engine.interfaces';
import { createAttachmentsConfig } from './attachments.config';
import { createCablesConfig } from './cables.config';
import { createChainsConfig } from './chains.config';
import { createLinesConfig } from './lines.config';
import { createMaintenanceConfig } from './maintenance.config';
import { createObstaclesConfig } from './obstacles.config';

/** Union of every catalog import config kind handled by the worker. */
export type CatalogImportConfig = CsvImportConfig<unknown> | JsonImportConfig;

/**
 * Registry of catalog configurations. Each entry is a *factory* (not a
 * singleton) because some configs (e.g. lines) own per-import state.
 */
export const CSV_IMPORT_REGISTRY: Record<CsvKey, () => CatalogImportConfig> = {
  attachments: createAttachmentsConfig as () => CsvImportConfig<unknown>,
  cables: createCablesConfig as () => CsvImportConfig<unknown>,
  chains: createChainsConfig as () => CsvImportConfig<unknown>,
  lines: createLinesConfig as () => CsvImportConfig<unknown>,
  maintenance: createMaintenanceConfig as () => CsvImportConfig<unknown>,
  obstacles: createObstaclesConfig
};

/** Type-guard distinguishing JSON catalog configs from streamed CSV configs. */
export const isJsonImportConfig = (config: CatalogImportConfig): config is JsonImportConfig => config.kind === 'json';

/** Resolves and instantiates the config for a given catalog key. */
export const resolveCsvImportConfig = (csvKey: CsvKey): CatalogImportConfig => {
  const factory = CSV_IMPORT_REGISTRY[csvKey];
  if (!factory) {
    throw new Error(`Unknown CSV import key: ${csvKey}`);
  }
  return factory();
};
