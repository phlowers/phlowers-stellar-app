/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { CsvImportConfig, CsvKey } from '../csv-import.engine.interfaces';
import { createAttachmentsConfig } from './attachments.config';
import { createCablesConfig } from './cables.config';
import { createChainsConfig } from './chains.config';
import { createLinesConfig } from './lines.config';
import { createMaintenanceConfig } from './maintenance.config';
import { createObstaclesConfig } from './obstacles.config';

/**
 * Registry of catalog configurations. Each entry is a *factory* (not a
 * singleton) because some configs (e.g. lines) own per-import state.
 */
export const CSV_IMPORT_REGISTRY: Record<CsvKey, () => CsvImportConfig<unknown>> = {
  attachments: createAttachmentsConfig as () => CsvImportConfig<unknown>,
  cables: createCablesConfig as () => CsvImportConfig<unknown>,
  chains: createChainsConfig as () => CsvImportConfig<unknown>,
  lines: createLinesConfig as () => CsvImportConfig<unknown>,
  maintenance: createMaintenanceConfig as () => CsvImportConfig<unknown>,
  obstacles: createObstaclesConfig as () => CsvImportConfig<unknown>
};

/** Resolves and instantiates the config for a given catalog key. */
export const resolveCsvImportConfig = (csvKey: CsvKey): CsvImportConfig<unknown> => {
  const factory = CSV_IMPORT_REGISTRY[csvKey];
  if (!factory) {
    throw new Error(`Unknown CSV import key: ${csvKey}`);
  }
  return factory();
};
