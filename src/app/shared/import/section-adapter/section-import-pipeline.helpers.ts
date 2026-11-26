/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { isNil } from 'lodash';
import { Section } from '@shared/domain';

// ---------------------------------------------------------------------------
// Generic section validation
// ---------------------------------------------------------------------------

/**
 * Returns the list of model field paths that fail the required-field check.
 * When `requireCableName` is false, the cable_name check is skipped.
 */
export function getMissingRequiredFields(section: Section, requireCableName = true): string[] {
  const missing: string[] = [];
  if (typeof section.name !== 'string' || !section.name.trim()) missing.push('name');
  if (!section.type) missing.push('type');
  if (!section.cables_amount) missing.push('cables_amount');
  if (requireCableName && !section.cable_name) missing.push('cable_name');
  if (section.supports.length < 2) missing.push('supports');
  section.supports.forEach((s, i) => {
    if (isNil(s.number)) missing.push(`supports[${i}].number`);
    if (isNil(s.spanLength) && i !== section.supports.length - 1) missing.push(`supports[${i}].spanLength`);
    if (isNil(s.spanAngle)) missing.push(`supports[${i}].spanAngle`);
    if (isNil(s.chainLength)) missing.push(`supports[${i}].chainLength`);
    if (isNil(s.attachmentHeight)) missing.push(`supports[${i}].attachmentHeight`);
  });
  return missing;
}
