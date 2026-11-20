/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { environment } from '@src/environments/environment';
import { DEFAULT_TIME_ZONE, RFC_9557_FORMAT_OPTIONS } from './date-time.constantes';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Throws a `RangeError` when `timeZone` is not a valid IANA zone. */
const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { ...RFC_9557_FORMAT_OPTIONS, timeZone });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

/**
 * Returns `candidate` when it is a valid IANA time zone, `DEFAULT_TIME_ZONE` otherwise
 * (missing value, or a placeholder left unsubstituted by the build).
 * @param candidate - The time zone to check
 * @returns A valid IANA time zone
 */
export const resolveTimeZone = (candidate: string | undefined): string => {
  try {
    getFormatter(candidate ?? '');
    return candidate as string;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
};

/** Time zone of the raw dates, from `environment.timeZone`. */
export const getConfiguredTimeZone = (): string => resolveTimeZone(environment.timeZone);

/** Converts an Intl `longOffset` value (`GMT`, `GMT+01:00`, `GMT−05:30`) to `±HH:MM`. */
const toIsoOffset = (longOffset: string): string => {
  const match = /([+\-\u2212])(\d{1,2})(?::(\d{2}))?/.exec(longOffset);
  if (!match) {
    return '+00:00';
  }
  const sign = match[1] === '+' ? '+' : '-';
  return `${sign}${match[2].padStart(2, '0')}:${match[3] ?? '00'}`;
};

/**
 * Formats an instant as an RFC 9557 date-time: `YYYY-MM-DDTHH:mm:ss.SSS±HH:MM[Zone]`, expressed in the given
 * time zone with the offset in force at that instant (daylight saving time included).
 * @param date - A valid date (use `formatRfc9557OrNull` when it may be invalid)
 * @param timeZone - The IANA zone, defaults to the configured one
 * @returns The RFC 9557 string
 */
export const formatRfc9557 = (date: Date, timeZone: string = getConfiguredTimeZone()): string => {
  const zone = resolveTimeZone(timeZone);
  const parts: Record<string, string> = {};
  for (const { type, value } of getFormatter(zone).formatToParts(date)) {
    parts[type] = value;
  }
  const day = `${parts['year']}-${parts['month']}-${parts['day']}`;
  const time = `${parts['hour']}:${parts['minute']}:${parts['second']}.${parts['fractionalSecond']}`;
  return `${day}T${time}${toIsoOffset(parts['timeZoneName'])}[${zone}]`;
};

/** Offset in milliseconds of `timeZone` from UTC at the given instant (daylight saving time included). */
const getZoneOffsetMs = (instantMs: number, timeZone: string): number => {
  const parts: Record<string, string> = {};
  for (const { type, value } of getFormatter(timeZone).formatToParts(new Date(instantMs))) {
    parts[type] = value;
  }
  const wallClockAsUtc = Date.UTC(
    Number(parts['year']),
    Number(parts['month']) - 1,
    Number(parts['day']),
    Number(parts['hour']) % 24,
    Number(parts['minute']),
    Number(parts['second'])
  );
  return wallClockAsUtc - Math.floor(instantMs / 1000) * 1000;
};

/**
 * Returns the instant at which the wall clock of `timeZone` reads the given fields, whatever the time zone of the
 * browser. The offset is the one in force at that instant (daylight saving time included).
 * @param wallClock - Calendar and clock fields, `month` being 0-based (missing clock fields default to midnight)
 * @param timeZone - The IANA zone, defaults to the configured one
 * @returns The matching instant
 */
export const zonedWallClockToDate = (
  wallClock: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  },
  timeZone: string = getConfiguredTimeZone()
): Date => {
  const zone = resolveTimeZone(timeZone);
  const { year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 } = wallClock;
  const wallClockAsUtc = Date.UTC(year, month, day, hour, minute, second, millisecond);
  const firstGuess = wallClockAsUtc - getZoneOffsetMs(wallClockAsUtc, zone);
  return new Date(wallClockAsUtc - getZoneOffsetMs(firstGuess, zone));
};

/** Same as `formatRfc9557`, returning `null` for a missing or invalid date. */
export const formatRfc9557OrNull = (date: Date | null | undefined, timeZone?: string): string | null =>
  date instanceof Date && !Number.isNaN(date.getTime()) ? formatRfc9557(date, timeZone) : null;

/** The current instant as an RFC 9557 date-time. */
export const nowRfc9557 = (): string => formatRfc9557(new Date());

/**
 * Reads a raw date: an RFC 9557 string (the `[...]` suffix is ignored, the offset gives the instant), a legacy
 * ISO 8601 string (`...Z`, `±HH:MM`, date only), a timestamp or a `Date`.
 * @param value - The raw date
 * @returns The matching `Date`, or `null` when `value` is empty or cannot be read
 */
export const parseRfc9557 = (value: unknown): Date | null => {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'string' && value.trim() !== '') {
    // Strip the trailing RFC 9557 suffix(es), e.g. `[Europe/Paris]` or `[u-ca=iso8601]`
    date = new Date(value.trim().replace(/(\[[^[\]]*\])+$/, ''));
  } else {
    return null;
  }
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Compares two raw dates by instant. A missing or unreadable date is always placed last, in either order.
 * @param a - First raw date
 * @param b - Second raw date
 * @param order - `1` for oldest first (default), `-1` for newest first
 * @returns A negative, zero or positive number, usable in `Array.sort`
 */
export const compareRfc9557 = (a: unknown, b: unknown, order: 1 | -1 = 1): number => {
  const first = parseRfc9557(a)?.getTime();
  const second = parseRfc9557(b)?.getTime();
  if (first === undefined || second === undefined) {
    return Number(first === undefined) - Number(second === undefined);
  }
  return order * Math.sign(first - second);
};
