/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CSV_IMPORT_REGISTRY, resolveCsvImportConfig } from './index';
import type { CsvKey } from '../csv-import.engine.interfaces';

describe('CSV_IMPORT_REGISTRY', () => {
  it('exposes a factory for every known CsvKey', () => {
    const keys: CsvKey[] = ['attachments', 'cables', 'chains', 'lines', 'maintenance', 'obstacles'];
    for (const k of keys) {
      expect(typeof CSV_IMPORT_REGISTRY[k]).toBe('function');
    }
  });

  it('factories produce fresh instances every call (no shared state)', () => {
    const a = CSV_IMPORT_REGISTRY.lines();
    const b = CSV_IMPORT_REGISTRY.lines();
    expect(a).not.toBe(b);
  });
});

describe('resolveCsvImportConfig', () => {
  it('returns a config whose csvKey matches the request', () => {
    for (const k of ['attachments', 'cables', 'chains', 'lines', 'maintenance', 'obstacles'] as CsvKey[]) {
      expect(resolveCsvImportConfig(k).csvKey).toBe(k);
    }
  });

  it('throws when the key is unknown', () => {
    expect(() => resolveCsvImportConfig('zzz' as CsvKey)).toThrow(/Unknown CSV import key/);
  });
});
