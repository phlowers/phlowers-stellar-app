/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DEFAULT_TIME_ZONE } from './date-time.constantes';
import {
  compareRfc9557,
  formatRfc9557,
  formatRfc9557OrNull,
  getConfiguredTimeZone,
  nowRfc9557,
  parseRfc9557,
  resolveTimeZone,
  zonedWallClockToDate
} from './date-time.helpers';

describe('date-time.helpers', () => {
  describe('resolveTimeZone / getConfiguredTimeZone', () => {
    it('should keep a valid IANA zone', () => {
      expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
    });

    it('should fall back to the default zone for a missing, empty or unsubstituted value', () => {
      expect(resolveTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
      expect(resolveTimeZone('')).toBe(DEFAULT_TIME_ZONE);
      expect(resolveTimeZone('{TIME_ZONE}')).toBe(DEFAULT_TIME_ZONE);
      expect(resolveTimeZone('Mars/Olympus')).toBe(DEFAULT_TIME_ZONE);
    });

    it('should read the zone of the environment', () => {
      expect(getConfiguredTimeZone()).toBe('Europe/Paris');
    });
  });

  describe('formatRfc9557', () => {
    it('should express an instant in the configured zone with its winter offset', () => {
      expect(formatRfc9557(new Date('2026-11-06T15:46:15.869Z'))).toBe('2026-11-06T16:46:15.869+01:00[Europe/Paris]');
    });

    it('should use the summer offset in summer', () => {
      expect(formatRfc9557(new Date('2026-07-06T14:46:15.869Z'))).toBe('2026-07-06T16:46:15.869+02:00[Europe/Paris]');
    });

    it('should switch offset at the spring daylight saving change (last Sunday of March)', () => {
      expect(formatRfc9557(new Date('2026-03-29T00:59:59.999Z'))).toBe('2026-03-29T01:59:59.999+01:00[Europe/Paris]');
      expect(formatRfc9557(new Date('2026-03-29T01:00:00.000Z'))).toBe('2026-03-29T03:00:00.000+02:00[Europe/Paris]');
    });

    it('should switch offset at the autumn daylight saving change (last Sunday of October)', () => {
      expect(formatRfc9557(new Date('2026-10-25T00:59:59.999Z'))).toBe('2026-10-25T02:59:59.999+02:00[Europe/Paris]');
      expect(formatRfc9557(new Date('2026-10-25T01:00:00.000Z'))).toBe('2026-10-25T02:00:00.000+01:00[Europe/Paris]');
    });

    it('should render midnight as 00 (never 24) and handle zero, negative and half-hour offsets', () => {
      const instant = new Date('2026-01-15T23:00:00.000Z');
      expect(formatRfc9557(instant)).toBe('2026-01-16T00:00:00.000+01:00[Europe/Paris]');
      expect(formatRfc9557(instant, 'UTC')).toBe('2026-01-15T23:00:00.000+00:00[UTC]');
      expect(formatRfc9557(instant, 'America/New_York')).toBe('2026-01-15T18:00:00.000-05:00[America/New_York]');
      expect(formatRfc9557(instant, 'Asia/Kolkata')).toBe('2026-01-16T04:30:00.000+05:30[Asia/Kolkata]');
    });

    it('should use the default zone when the given zone is invalid', () => {
      expect(formatRfc9557(new Date('2026-11-06T15:46:15.869Z'), 'Mars/Olympus')).toBe(
        '2026-11-06T16:46:15.869+01:00[Europe/Paris]'
      );
    });
  });

  describe('formatRfc9557OrNull', () => {
    it('should return null for a missing or invalid date', () => {
      expect(formatRfc9557OrNull(null)).toBeNull();
      expect(formatRfc9557OrNull(undefined)).toBeNull();
      expect(formatRfc9557OrNull(new Date('invalid'))).toBeNull();
    });

    it('should format a valid date', () => {
      expect(formatRfc9557OrNull(new Date('2026-11-06T15:46:15.869Z'))).toBe(
        '2026-11-06T16:46:15.869+01:00[Europe/Paris]'
      );
    });
  });

  describe('nowRfc9557', () => {
    it('should return the current instant in RFC 9557', () => {
      const before = Date.now();
      const value = nowRfc9557();
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}\[Europe\/Paris\]$/);
      const instant = parseRfc9557(value)!.getTime();
      expect(instant).toBeGreaterThanOrEqual(before);
      expect(instant).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('parseRfc9557', () => {
    it('should read an RFC 9557 string and keep the instant', () => {
      expect(parseRfc9557('2026-11-06T16:46:15.869+01:00[Europe/Paris]')?.toISOString()).toBe(
        '2026-11-06T15:46:15.869Z'
      );
      expect(parseRfc9557('2026-07-06T16:46:15.869+02:00[Europe/Paris]')?.toISOString()).toBe(
        '2026-07-06T14:46:15.869Z'
      );
    });

    it('should ignore extra suffix tags such as a calendar', () => {
      expect(parseRfc9557('2026-11-06T16:46:15.869+01:00[Europe/Paris][u-ca=gregory]')?.toISOString()).toBe(
        '2026-11-06T15:46:15.869Z'
      );
    });

    it('should still read the legacy formats', () => {
      expect(parseRfc9557('2026-11-06T15:46:15.869Z')?.toISOString()).toBe('2026-11-06T15:46:15.869Z');
      expect(parseRfc9557('2026-11-06T16:46:15.869+01:00')?.toISOString()).toBe('2026-11-06T15:46:15.869Z');
      expect(parseRfc9557('2026-11-06')?.toISOString()).toBe('2026-11-06T00:00:00.000Z');
    });

    it('should accept a Date and a timestamp', () => {
      const date = new Date('2026-11-06T15:46:15.869Z');
      expect(parseRfc9557(date)).toBe(date);
      expect(parseRfc9557(date.getTime())?.toISOString()).toBe(date.toISOString());
    });

    it('should return null for empty, invalid or unsupported values', () => {
      for (const value of [null, undefined, '', '   ', 'not-a-date', new Date('invalid'), Number.NaN, {}, true]) {
        expect(parseRfc9557(value)).toBeNull();
      }
    });

    it('should round-trip with formatRfc9557 whatever the season', () => {
      for (const iso of ['2026-01-05T10:00:00.123Z', '2026-07-05T10:00:00.456Z', '2026-10-25T00:30:00.000Z']) {
        const date = new Date(iso);
        expect(parseRfc9557(formatRfc9557(date))?.getTime()).toBe(date.getTime());
      }
    });
  });

  describe('zonedWallClockToDate', () => {
    it('should read the wall clock in the given zone, whatever the browser zone', () => {
      expect(zonedWallClockToDate({ year: 2026, month: 0, day: 5 }, 'Asia/Tokyo').toISOString()).toBe(
        '2026-01-04T15:00:00.000Z'
      );
      expect(zonedWallClockToDate({ year: 2026, month: 6, day: 1, hour: 10 }, 'Europe/Paris').toISOString()).toBe(
        '2026-07-01T08:00:00.000Z'
      );
    });

    it('should use the offset in force on that day, daylight saving time included', () => {
      expect(zonedWallClockToDate({ year: 2026, month: 0, day: 15, hour: 14 }, 'Europe/Paris').toISOString()).toBe(
        '2026-01-15T13:00:00.000Z'
      );
    });
  });

  describe('compareRfc9557', () => {
    it('should order by instant across mixed formats and offsets', () => {
      const values = [
        '2026-07-01T10:00:00.000+02:00[Europe/Paris]',
        '2026-01-01T09:30:00.000Z',
        '2026-12-01T10:00:00.000+01:00[Europe/Paris]',
        '2026-07-01T07:59:00.000Z'
      ];
      expect([...values].sort(compareRfc9557)).toEqual([
        '2026-01-01T09:30:00.000Z',
        '2026-07-01T07:59:00.000Z',
        '2026-07-01T10:00:00.000+02:00[Europe/Paris]',
        '2026-12-01T10:00:00.000+01:00[Europe/Paris]'
      ]);
    });

    it('should treat the same instant in two notations as equal', () => {
      expect(compareRfc9557('2026-07-01T10:00:00.000+02:00[Europe/Paris]', '2026-07-01T08:00:00.000Z')).toBe(0);
    });

    it('should place missing and unreadable values last', () => {
      const values = ['bad', '2026-01-01T00:00:00.000Z', null, '2025-01-01T00:00:00.000Z'];
      expect([...values].sort(compareRfc9557)).toEqual([
        '2025-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
        'bad',
        null
      ]);
    });

    it('should order newest first and still place unreadable values last', () => {
      const values = ['bad', '2025-01-01T00:00:00.000Z', null, '2026-01-01T00:00:00.000Z'];
      expect([...values].sort((a, b) => compareRfc9557(a, b, -1))).toEqual([
        '2026-01-01T00:00:00.000Z',
        '2025-01-01T00:00:00.000Z',
        'bad',
        null
      ]);
    });
  });
});
