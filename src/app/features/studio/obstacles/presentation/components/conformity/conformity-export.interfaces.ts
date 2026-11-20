/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Obstacle, Position3D } from '@shared/domain/models/obstacle.model';
import { Section, Study } from '@shared/domain';
import { ObstacleConformityType } from '@infrastructure/database/entities/catalog-obstacle-configuration.entity';
import { ConformityRuleResult } from './conformity.model';

/** A value paired with its unit of measure. */
export interface ConformityValueUnit<T = number | null> {
  value: T;
  unit: string;
}

/** Voltage: numeric `KV` value, or the raw label with a `null` unit when it is not numeric. */
export interface ConformityVoltageExport {
  value: number | string | null;
  unit: 'KV' | null;
}

/** An overhang / lateral pair of values. */
export interface ConformitySidesExport<T> {
  overhang: T;
  lateral: T;
}

export interface ConformityMetaDataExport {
  author: string | null;
  date: string | null;
  study: string | null;
  litCode: string | null;
  litName: string | null;
  section: string | null;
  initialCondition: string | null;
  loadCase: string | null;
}

export interface ConformityObstacleDataExport {
  name: string;
  spot: string;
  type: string;
  span: string;
  support: string;
  supportDistance: ConformityValueUnit;
  height: ConformityValueUnit;
  lateralDistance: ConformityValueUnit;
  /** Reference of `height` (absolute altitude, or relative to the support / cable). */
  altitudeType: Obstacle['altitudeType'];
  /** Reference of `lateralDistance` (span axis or line axis). */
  lateralDistanceType: Obstacle['lateralDistanceType'];
}

export interface ConformityInputExport {
  voltage: ConformityVoltageExport;
  wind: { direction: string | null; inverted: boolean; redzone: boolean };
  rules: string[];
}

export interface ConformityCalculationExport {
  cableHeight: ConformitySidesExport<ConformityValueUnit>;
  cableLateralDistance: ConformitySidesExport<ConformityValueUnit>;
  cableSwingingAngle: ConformitySidesExport<ConformityValueUnit>;
  distanceLimits: ConformitySidesExport<ConformityValueUnit>;
  heightLimit: { overhang: ConformityValueUnit };
  lateralLimit: { lateral: ConformityValueUnit };
}

export interface ConformityMinimumCaseSideExport {
  temperature: ConformityValueUnit;
  pressure: ConformityValueUnit;
  distance: ConformityValueUnit;
}

export interface ConformityCheckExport {
  rule: string;
  calculations: ConformityCalculationExport[];
  minimumCase?: ConformitySidesExport<ConformityMinimumCaseSideExport>[];
}

export interface ConformityExport {
  metaData: ConformityMetaDataExport;
  obstacleData: ConformityObstacleDataExport;
  conformityInput: ConformityInputExport;
  conformityChecks: ConformityCheckExport[];
}

/** Root export file structure — always a single-entry `distancesConformityCheck` array. */
export interface ConformityExportFile {
  distancesConformityCheck: ConformityExport[];
}

export interface ConformityExportParams {
  section: Section | null;
  study: Study | null;
  obstacle: Obstacle;
  point: Position3D;
  pointLabel: string;
  spanLabel: string;
  referenceSupportLabel: string;
  form: { windZone: string | null; windMinus: boolean; redZonePresence: boolean };
  rules: { label: string; value: string }[];
  results: Record<string, ConformityRuleResult>;
  conformityType: ObstacleConformityType;
}

/** Form values and point index the displayed conformity results were computed from. */
export interface ConformityCalculatedInputs {
  form: {
    windZone: string | null;
    windMinus: boolean | null;
    redZonePresence: boolean | null;
    conformity: string[] | null;
  };
  pointIndex: number;
}
