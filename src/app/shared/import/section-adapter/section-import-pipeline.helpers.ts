/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { isNil } from 'lodash';
import { Section, Support } from '@shared/domain';
import { SectionImportCoordinates } from './section-import-adapter.interfaces';

// ---------------------------------------------------------------------------
// Coordinates reprojection helpers
// ---------------------------------------------------------------------------

/**
 * Builds the `spanLength`/`lineAngle` arrays consumed by the Lambert93-to-GPS reprojection
 * tasks. The last support has no outgoing span, so it gets `NaN`/`0` placeholders.
 */
export function buildReprojectionAngles(supports: Support[]): { spanLength: number[]; lineAngle: number[] } {
  const lastIndex = supports.length - 1;
  return {
    spanLength: supports.map((s, i) => (i === lastIndex ? Number.NaN : s.spanLength!)),
    lineAngle: supports.map((s, i) => (i === lastIndex ? 0 : s.spanAngle!))
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

/** Returns `true` when every entry of the coordinate arrays is a number (same length as `supportsCount`). */
export function areCoordinatesComplete(coordinates: SectionImportCoordinates, supportsCount: number): boolean {
  const isComplete = (values: readonly (number | null)[]): values is readonly number[] =>
    values.length === supportsCount && !values.includes(null);
  return isComplete(coordinates.x) && isComplete(coordinates.y);
}

// ---------------------------------------------------------------------------
// Generic section validation
// ---------------------------------------------------------------------------

/**
 * Returns the list of model field paths that fail the required-field check.
 * When `requireCableName` is false, the cable_name check is skipped.
 */
export function getMissingRequiredFields(section: Section, requireCableName = true): string[] {
  const missing: string[] = [];
  if (!section.name.trim()) missing.push('name');
  if (!section.type) missing.push('type');
  if (!section.cables_amount) missing.push('cables_amount');
  if (requireCableName && !section.cable_name) missing.push('cable_name');
  section.supports.forEach((s, i) => {
    if (isNil(s.number)) missing.push(`supports[${i}].number`);
    if (isNil(s.spanLength) && i !== section.supports.length - 1) missing.push(`supports[${i}].spanLength`);
    if (isNil(s.spanAngle)) missing.push(`supports[${i}].spanAngle`);
    if (isNil(s.chainLength)) missing.push(`supports[${i}].chainLength`);
    if (isNil(s.attachmentHeight)) missing.push(`supports[${i}].attachmentHeight`);
  });
  return missing;
}
