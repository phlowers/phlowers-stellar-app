/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Charge, Section } from '@shared/domain';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { SanitizedCharges, SectionGeometrySanitizeResult } from './section-geometry.interfaces';

const isUserDefinedSpanLoad = (loadWeight: number): boolean => loadWeight !== 0;

/** Keeps only obstacles whose span (identified by its starting support) still exists. */
const sanitizeObstacles = (obstacles: Obstacle[], spanStartSupportUuids: Set<string>): Obstacle[] =>
  obstacles.filter((obstacle) => spanStartSupportUuids.has(obstacle.supportUuid));

/** Prunes stale span loads from every charge, tracking whether a user-defined one was removed. */
const sanitizeCharges = (charges: Charge[], allSupportUuids: Set<string>): SanitizedCharges => {
  let chargesChanged = false;
  let removedUserDefinedSpanLoad = false;

  const sanitizedCharges = charges.map((charge) => {
    const sanitizedSpanLoads = charge.data.spanLoads.filter((load) => allSupportUuids.has(load.supportUuid));
    if (sanitizedSpanLoads.length === charge.data.spanLoads.length) {
      return charge;
    }
    chargesChanged = true;
    removedUserDefinedSpanLoad ||= charge.data.spanLoads.some(
      (load) => !allSupportUuids.has(load.supportUuid) && isUserDefinedSpanLoad(load.loadWeight)
    );
    return { ...charge, data: { ...charge.data, spanLoads: sanitizedSpanLoads } };
  });

  return { sanitizedCharges, chargesChanged, removedUserDefinedSpanLoad };
};

/**
 * Removes obstacles and span loads that reference a support/span no longer present in the
 * section geometry (e.g. a support was deleted outside the Studio).
 *
 * @remarks
 * Obstacles are span-bound: a span is identified by the UUID of the support it starts from, and
 * with N supports there are N-1 spans, so the last support never starts a span and cannot host an
 * obstacle. Span loads instead follow the `recheckSpanLoads` convention: one entry may exist per
 * support (including the last), so a load is only stale when its `supportUuid` no longer exists at
 * all. Charges are kept even when all their span loads are removed, since a charge also carries its
 * own climate configuration.
 */
export const sanitizeSectionGeometry = (section: Section): SectionGeometrySanitizeResult => {
  const spanStartSupportUuids = new Set(section.supports.slice(0, -1).map((support) => support.uuid));
  const allSupportUuids = new Set(section.supports.map((support) => support.uuid));

  const sanitizedObstacles = sanitizeObstacles(section.obstacles, spanStartSupportUuids);
  const { sanitizedCharges, chargesChanged, removedUserDefinedSpanLoad } = sanitizeCharges(
    section.charges,
    allSupportUuids
  );

  const removedGeometryBoundObjects =
    sanitizedObstacles.length !== section.obstacles.length || removedUserDefinedSpanLoad;
  const geometryChanged = sanitizedObstacles.length !== section.obstacles.length || chargesChanged;
  if (!geometryChanged) {
    return { section, removedGeometryBoundObjects };
  }

  return {
    section: { ...section, obstacles: sanitizedObstacles, charges: sanitizedCharges },
    removedGeometryBoundObjects
  };
};
