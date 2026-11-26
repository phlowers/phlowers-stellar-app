/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OBSTACLES_TABLE_METRICS, PDF_OBSTACLES_TABLE_LABEL_KEYS } from './obstacles-table-report.constantes';

const loadCatalog = (lang: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(process.cwd(), `public/i18n/${lang}.json`), 'utf8'));

const hasTranslation = (catalog: Record<string, unknown>, key: string): boolean =>
  typeof key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog) === 'string';

// The report specs translate every key to itself, so a key missing from the catalogs would only show up as the raw
// translation path printed in the PDF
describe('obstacles table report translation keys', () => {
  const keys = [
    ...OBSTACLES_TABLE_METRICS.map((metric) => metric.labelKey),
    ...Object.values(PDF_OBSTACLES_TABLE_LABEL_KEYS)
  ];

  it.each(['en', 'fr'])('should only use keys defined in the %s catalog', (lang) => {
    const catalog = loadCatalog(lang);

    expect(keys.filter((key) => !hasTranslation(catalog, key))).toEqual([]);
  });
});
