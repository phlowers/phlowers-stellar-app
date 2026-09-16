/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  FreePositioningCategory,
  FreePositioningPoint
} from '@features/studio/core/presentation/components/free-positioning/free-positioning.interfaces';
import { Section, Support } from '@shared/domain';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';
import { Position3D } from '@shared/domain/models/obstacle.model';

export interface AggregatePointsParams {
  frozenSpan: number;
  editableCategory: FreePositioningCategory;
  section: Section | null;
  litData: GetSectionOutput | null;
  supports: Support[];
  // Obstacle state
  activeObstaclePositions?: Position3D[];
  activeObstacleIndex?: number | null;
  activeObstacleSupportUuid?: string | null;
  referenceSupportAltitudeNgf?: number;
  isAbsoluteAltitude?: boolean;
  // Floor state
  activeFloorPoints?: { distanceToRefSupport: number | null; altitude: number | null; removable?: boolean }[];
  activeFloorIndex?: number | null;
  activeFloorSpan?: string | null;
  // Distance state
  distancePositions?: Position3D[];
  distanceActiveIndex?: number | null;
  distanceSupportUuid?: string | null;
  // Loads state
  loadPosition?: number | null;
  loadType?: 'punctual' | 'marking' | null;
  loadSpanSupportUuid?: string | null;
}

export type { FreePositioningCategory, FreePositioningPoint };
