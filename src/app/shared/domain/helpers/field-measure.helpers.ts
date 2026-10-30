/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { FieldMeasure } from '@shared/domain/models/field-measure.model';

/**
 * Determines whether a date falls within Daylight Saving Time (DST), by comparing its timezone
 * offset with the standard (winter) offset of the same year.
 * @param date - The date to check (defaults to now)
 * @returns `true` if in DST (summer), `false` otherwise (winter)
 */
export const isDaylightSavingTime = (date: Date = new Date()): boolean => {
  const january = new Date(date.getFullYear(), 0, 1);
  const july = new Date(date.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());
  return date.getTimezoneOffset() < stdTimezoneOffset;
};

/**
 * Converts a persisted date value into a `Date`. Values coming from a JSON round-trip
 * (study/section export then import) are ISO strings instead of `Date` instances.
 * @param value - A `Date`, an ISO date string, a timestamp, or anything else
 * @returns A valid `Date`, or `null` when the value cannot be converted
 */
export const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Restores the date/time/season fields of a field measure after a JSON round-trip, so that
 * `date` and `time` are `Date` instances again and `season` is a valid value.
 * @param measure - The (possibly deserialized) field measure
 * @returns A field measure with revived `date`, `time` and `season` fields
 */
export const normalizeFieldMeasureDates = (measure: FieldMeasure): FieldMeasure => {
  const date = toDateOrNull(measure.date);
  const time = toDateOrNull(measure.time);
  const hasValidSeason = measure.season === 'summer' || measure.season === 'winter';
  const seasonReference = date ?? time;
  let season: FieldMeasure['season'] = measure.season;
  if (!hasValidSeason) {
    season = isDaylightSavingTime(seasonReference ?? new Date()) ? 'summer' : 'winter';
  }
  return { ...measure, date, time, season };
};
