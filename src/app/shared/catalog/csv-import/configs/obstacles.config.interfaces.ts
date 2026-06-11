/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ObstacleConformityType } from '@infrastructure/database';

/** Wind pressure source for a rule reference point, as serialized in JSON. */
export type ObstacleRulePressureJson = number | 'WindZoneInput';

/** Reference cable point as serialized in JSON. */
export interface ObstacleRulePointJsonDto {
  temperature: number | null;
  pressure: ObstacleRulePressureJson;
  redZone: boolean;
}

/** Rule definition as serialized in JSON (`rules[]`). */
export interface ObstacleRuleJsonDto {
  ruleType: string;
  ruleName: string;
  color: string;
  lateralPoint: ObstacleRulePointJsonDto;
  overhangPoint: ObstacleRulePointJsonDto;
}

/** Distances for one (obstacle, rule) pair as serialized in JSON. */
export interface ObstacleDistanceJsonDto {
  ruleType: string;
  active: boolean;
  overhang: Record<string, number> | null;
  lateral: Record<string, number> | null;
}

/** Obstacle declaration as serialized in JSON (`obstacles[]`). */
export interface ObstacleJsonDto {
  obstacleType: string;
  obstacleName: string;
  details: string;
  redZone: boolean;
  conformity: ObstacleConformityType;
  distances: ObstacleDistanceJsonDto[];
}

/** Wind zone entry as serialized in JSON (`windZone.values[]`). */
export interface WindZoneValueJsonDto {
  label: string;
  normal: number;
  redZone: number;
}

/** Wind zone section as serialized in JSON (`windZone`). */
export interface WindZoneJsonDto {
  default: string;
  values: WindZoneValueJsonDto[];
}

/** Repartition temperature defaults as serialized in JSON. */
export interface RepartitionTemperatureFieldsJsonDto {
  defaultValue: number;
}

/** Lateral temperature field configuration as serialized in JSON. */
export interface LateralTemperatureFieldsJsonDto {
  ruleType: string;
  message: string;
}

/**
 * Full payload of `public/data/obstacle_configuration.json`.
 *
 * @remarks
 * Mirrors the file exactly — names are intentionally camelCase to match the
 * JSON source. Snake_case conversion happens in the helpers when mapping to
 * Dexie entities.
 */
export interface ObstacleConfigurationJsonDto {
  obstacles: ObstacleJsonDto[];
  rules: ObstacleRuleJsonDto[];
  repartitionTemperatureFields: RepartitionTemperatureFieldsJsonDto;
  lateralTemperatureFields: LateralTemperatureFieldsJsonDto;
  windZone: WindZoneJsonDto;
  intermediatePointPositions: number[];
}
