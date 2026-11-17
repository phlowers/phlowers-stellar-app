/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section } from '@shared/domain/models/section.model';
import { FieldMeasure } from '@shared/domain/models/field-measure.model';
import { formatRfc9557OrNull, parseRfc9557 } from '@shared/helpers/date-time.helpers';

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
 * (study/section export then import) are RFC 9557 or ISO strings instead of `Date` instances.
 * @param value - A `Date`, an RFC 9557 / ISO date string, a timestamp, or anything else
 * @returns A valid `Date`, or `null` when the value cannot be converted
 */
export const toDateOrNull = (value: unknown): Date | null => parseRfc9557(value);

/**
 * Prepares a field measure for JSON: `date` and `time` become RFC 9557 strings (`null` when missing or invalid).
 * The result is a copy; the measure is not modified. `normalizeFieldMeasureDates` is the reverse operation.
 * @param measure - The field measure, whose dates are `Date` instances (or already strings)
 * @returns A JSON-ready copy, typed as `FieldMeasure` because its date fields are only read back through
 *   `normalizeFieldMeasureDates`
 */
export const serializeFieldMeasureDates = (measure: FieldMeasure): FieldMeasure =>
  ({
    ...measure,
    date: formatRfc9557OrNull(parseRfc9557(measure.date)),
    time: formatRfc9557OrNull(parseRfc9557(measure.time))
  }) as unknown as FieldMeasure;

/**
 * Prepares a section for JSON by serializing the dates of its field measures.
 * @param section - The section to export
 * @returns A copy of the section without `Date` instances in its field measures
 */
export const serializeSectionDates = (section: Section): Section => ({
  ...section,
  field_measures: section.field_measures?.map(serializeFieldMeasureDates)
});

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
