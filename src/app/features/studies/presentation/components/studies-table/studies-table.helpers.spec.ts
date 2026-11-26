/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Study } from '@shared/domain';
import { sortStudiesByField } from './studies-table.helpers';

const study = (overrides: Partial<Study>): Study =>
  ({
    uuid: 'u',
    title: 'T',
    author_email: 'a@b.c',
    updated_at_offline: '2026-01-01T00:00:00.000Z',
    ...overrides
  }) as Study;

describe('studies-table helpers', () => {
  describe('sortStudiesByField', () => {
    const studies = (): Study[] => [
      study({ uuid: 'bad', updated_at_offline: 'not-a-date' }),
      study({ uuid: 'winter', updated_at_offline: '2026-12-01T10:00:00.000+01:00[Europe/Paris]' }),
      study({ uuid: 'legacy', updated_at_offline: '2026-07-01T07:59:00.000Z' }),
      study({ uuid: 'summer', updated_at_offline: '2026-07-01T10:00:00.000+02:00[Europe/Paris]' })
    ];

    it('should sort the modification date by instant, ascending, with unreadable dates last', () => {
      const list = studies();
      sortStudiesByField(list, 'updated_at_offline', 1);
      expect(list.map((s) => s.uuid)).toEqual(['legacy', 'summer', 'winter', 'bad']);
    });

    it('should sort the modification date by instant, descending, with unreadable dates last', () => {
      const list = studies();
      sortStudiesByField(list, 'updated_at_offline', -1);
      expect(list.map((s) => s.uuid)).toEqual(['winter', 'summer', 'legacy', 'bad']);
    });

    it('should sort the other columns as text in both directions, empty values first', () => {
      const list = [
        study({ uuid: 'b', title: 'Bravo' }),
        study({ uuid: 'none', title: undefined as unknown as string }),
        study({ uuid: 'a', title: 'alpha' })
      ];
      sortStudiesByField(list, 'title', 1);
      expect(list.map((s) => s.uuid)).toEqual(['none', 'a', 'b']);
      sortStudiesByField(list, 'title', -1);
      expect(list.map((s) => s.uuid)).toEqual(['b', 'a', 'none']);
    });

    it('should compare non-text values with the natural order', () => {
      const list = [study({ uuid: '2', description: undefined }), study({ uuid: '1' })];
      (list[0] as unknown as Record<string, unknown>)['rank'] = 2;
      (list[1] as unknown as Record<string, unknown>)['rank'] = 1;
      sortStudiesByField(list, 'rank', 1);
      expect(list.map((s) => s.uuid)).toEqual(['1', '2']);
    });
  });
});
