/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { buildFieldMeasureExportFilename, createTestMeasureData } from './helpers';

describe('buildFieldMeasureExportFilename', () => {
  const date = new Date(2026, 8, 30);

  it('should keep accents, spaces and hyphens', () => {
    const measureData = createTestMeasureData({ name: 'MT-2 - Portée-AB1-AB2' });
    expect(buildFieldMeasureExportFilename(measureData, 'Canton démo 3', date)).toBe(
      'Export Mesure de terrain_MT-2 - Portée-AB1-AB2_Canton démo 3_2026-09-30'
    );
  });

  it('should remove forbidden file system characters', () => {
    const measureData = createTestMeasureData({ name: 'a/b:c*d?e"f<g>h|i\\j' });
    expect(buildFieldMeasureExportFilename(measureData, 'sec', date)).toBe(
      'Export Mesure de terrain_abcdefghij_sec_2026-09-30'
    );
  });

  it('should fall back to field-measure when the measure name is empty after sanitizing', () => {
    const measureData = createTestMeasureData({ name: '  ' });
    expect(buildFieldMeasureExportFilename(measureData, null, date)).toBe(
      'Export Mesure de terrain_field-measure_field-measure_2026-09-30'
    );
  });
});
