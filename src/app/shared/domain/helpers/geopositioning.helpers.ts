/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { isEqual } from 'lodash';
import { Section, Support } from '@shared/domain';
import { TaskInputs, Task } from '@core/services/worker_python/tasks/types';
import { SectionImportCoordinates } from '@shared/import/section-adapter/section-import-adapter.interfaces';
import { FootLocalization, GpsPoint } from './geopositioning.interfaces';

/**
 * Pure helpers around the WGS84 geopositioning stored on the supports of a section.
 * The section start point is the foot of `supports[0]`. Every helper tolerates `null` GPS and empty
 * supports: it returns `null` or the input unchanged and never throws.
 */

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const toGpsPoint = (support: Support | undefined): GpsPoint | null =>
  support && isFiniteNumber(support.footLatitude) && isFiniteNumber(support.footLongitude)
    ? { latitude: support.footLatitude, longitude: support.footLongitude }
    : null;

/** Foot GPS of each support, `null` when unknown. */
export function getFootGps(section: Section): (GpsPoint | null)[] {
  return (section.supports ?? []).map(toGpsPoint);
}

/** Section start GPS point (foot of the first support), `null` when unknown. */
export function getStartGps(section: Section): GpsPoint | null {
  return toGpsPoint(section.supports?.[0]);
}

/** Returns a copy of `section` whose first support foot GPS is `point`. Unchanged when there is no support. */
export function withStartGps(section: Section, point: GpsPoint): Section {
  if (!section.supports?.length) return section;
  const [first, ...others] = section.supports;
  return {
    ...section,
    supports: [{ ...first, footLatitude: point.latitude, footLongitude: point.longitude }, ...others]
  };
}

/** `true` when every support has a foot latitude and longitude. */
export function hasCompleteFootGps(section: Section): boolean {
  const supports = section.supports ?? [];
  return supports.length > 0 && supports.every((support) => toGpsPoint(support) !== null);
}

/**
 * Builds the `spanLength`/`lineAngle` arrays consumed by the geopositioning tasks. The last support has
 * no outgoing span, so it gets `NaN`/`0` placeholders.
 */
export function buildReprojectionAngles(supports: Support[]): { spanLength: number[]; lineAngle: number[] } {
  const lastIndex = supports.length - 1;
  return {
    spanLength: supports.map((s, i) => (i === lastIndex ? Number.NaN : s.spanLength!)),
    lineAngle: supports.map((s, i) => (i === lastIndex ? 0 : s.spanAngle!))
  };
}

/**
 * Builds the `computeLocalization` task inputs from the start GPS (first support), `start_azimuth`
 * and the span geometry. Returns `null` when any of them is missing.
 */
export function buildLocalizationInputs(section: Section): TaskInputs[Task.computeLocalization] | null {
  const supports = section.supports ?? [];
  const start = getStartGps(section);
  if (!start || !isFiniteNumber(section.start_azimuth) || supports.length === 0) return null;

  const isGeometryComplete = supports
    .slice(0, -1)
    .every((support) => isFiniteNumber(support.spanLength) && isFiniteNumber(support.spanAngle));
  if (!isGeometryComplete) return null;

  const { spanLength, lineAngle } = buildReprojectionAngles(supports);
  return {
    startLatitude: start.latitude,
    startLongitude: start.longitude,
    startAzimuth: section.start_azimuth,
    spanLength,
    lineAngle
  };
}

/** Returns a copy of `supports` with `footLatitude`/`footLongitude` set from the given arrays (by index). */
export function applyFootCoordinates(supports: Support[], latitude: number[], longitude: number[]): Support[] {
  return supports.map((support, i) => ({
    ...support,
    footLatitude: latitude[i] ?? null,
    footLongitude: longitude[i] ?? null
  }));
}

/** Returns a copy of `supports` with the foot GPS and `spanAzimut` set from `localization` (by index). */
export function applyLocalization(supports: Support[], localization: FootLocalization): Support[] {
  return applyFootCoordinates(supports, localization.latitude, localization.longitude).map((support, i) => ({
    ...support,
    spanAzimut: localization.azimuth[i] ?? null
  }));
}

/** Returns `true` when every entry of the coordinate arrays is a number (same length as `supportsCount`). */
export function areCoordinatesComplete(coordinates: SectionImportCoordinates, supportsCount: number): boolean {
  const isComplete = (values: readonly (number | null)[]): values is readonly number[] =>
    values.length === supportsCount && !values.includes(null);
  return isComplete(coordinates.x) && isComplete(coordinates.y);
}

/**
 * Absolute angular gap (degrees, within [0, 180]) between the `spanAzimut` of each support in `before` and
 * `after` (same order). `null` when either value is missing.
 */
export function computeSpanAzimuthErrors(before: Support[], after: Support[]): (number | null)[] {
  return before.map((support, i) => {
    const reference = support.spanAzimut;
    const computed = after[i]?.spanAzimut;
    if (!isFiniteNumber(reference) || !isFiniteNumber(computed)) return null;
    const gap = Math.abs(reference - computed) % 360;
    return gap > 180 ? 360 - gap : gap;
  });
}

const geometrySignature = (section: Section) => ({
  start: getStartGps(section),
  azimuth: section.start_azimuth ?? null,
  supports: (section.supports ?? []).map((support) => ({
    uuid: support.uuid,
    spanLength: support.spanLength ?? null,
    spanAngle: support.spanAngle ?? null
  }))
});

/**
 * `true` when the foot GPS must be recomputed: no previous version, or the support uuids/order,
 * a span length/angle, the start GPS or the start azimuth differ.
 */
export function hasGeometryChanged(previous: Section | undefined, next: Section): boolean {
  if (!previous) return true;
  return !isEqual(geometrySignature(previous), geometrySignature(next));
}
