/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { FieldMeasure } from '@shared/domain/models/field-measure.model';
import { isDaylightSavingTime, normalizeFieldMeasureDates, toDateOrNull } from './field-measure.helpers';

const buildMeasure = (overrides: Record<string, unknown>): FieldMeasure =>
  ({ uuid: 'measure-uuid', name: 'Measure', ...overrides }) as unknown as FieldMeasure;

describe('field-measure.helpers', () => {
  describe('toDateOrNull', () => {
    it('should return the same Date instance when valid', () => {
      const date = new Date(2026, 0, 1);
      expect(toDateOrNull(date)).toBe(date);
    });

    it('should return null for an invalid Date', () => {
      expect(toDateOrNull(new Date('invalid'))).toBeNull();
    });

    it('should parse an ISO string', () => {
      const date = new Date(2026, 6, 14, 10, 30);
      expect(toDateOrNull(date.toISOString())?.getTime()).toBe(date.getTime());
    });

    it('should parse a timestamp', () => {
      expect(toDateOrNull(0)?.getTime()).toBe(0);
    });

    it.each([null, undefined, '', '   ', 'not-a-date', {}, true])('should return null for %p', (value) => {
      expect(toDateOrNull(value)).toBeNull();
    });
  });

  describe('isDaylightSavingTime', () => {
    it('should be consistent with the timezone offsets of the year', () => {
      const january = new Date(2026, 0, 15);
      const july = new Date(2026, 6, 15);
      const hasDst = january.getTimezoneOffset() !== july.getTimezoneOffset();
      expect(isDaylightSavingTime(january)).toBe(false);
      expect(isDaylightSavingTime(july)).toBe(hasDst && july.getTimezoneOffset() < january.getTimezoneOffset());
    });

    it('should default to the current date', () => {
      expect(typeof isDaylightSavingTime()).toBe('boolean');
    });
  });

  describe('normalizeFieldMeasureDates', () => {
    it('should revive ISO strings into Date instances and keep a valid season', () => {
      const date = new Date(2026, 6, 14, 10, 30);
      const result = normalizeFieldMeasureDates(
        buildMeasure({ date: date.toISOString(), time: date.toISOString(), season: 'winter' })
      );
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date?.getTime()).toBe(date.getTime());
      expect(result.time).toBeInstanceOf(Date);
      expect(result.time?.getTime()).toBe(date.getTime());
      expect(result.season).toBe('winter');
    });

    it('should keep Date instances untouched', () => {
      const date = new Date(2026, 0, 1);
      const result = normalizeFieldMeasureDates(buildMeasure({ date, time: date, season: 'summer' }));
      expect(result.date).toBe(date);
      expect(result.time).toBe(date);
      expect(result.season).toBe('summer');
    });

    it('should set invalid date/time to null', () => {
      const result = normalizeFieldMeasureDates(buildMeasure({ date: 'oops', time: undefined, season: 'summer' }));
      expect(result.date).toBeNull();
      expect(result.time).toBeNull();
    });

    it('should derive a missing season from the measure date', () => {
      const date = new Date(2026, 0, 15);
      const result = normalizeFieldMeasureDates(buildMeasure({ date: date.toISOString(), time: null }));
      expect(result.season).toBe(isDaylightSavingTime(date) ? 'summer' : 'winter');
    });

    it('should derive a missing season from the time when the date is missing', () => {
      const time = new Date(2026, 6, 15);
      const result = normalizeFieldMeasureDates(buildMeasure({ date: null, time, season: 'unknown' }));
      expect(result.season).toBe(isDaylightSavingTime(time) ? 'summer' : 'winter');
    });

    it('should fall back to the current date for the season when no date nor time is available', () => {
      const result = normalizeFieldMeasureDates(buildMeasure({ date: null, time: null }));
      expect(result.season).toBe(isDaylightSavingTime() ? 'summer' : 'winter');
    });
  });
});
