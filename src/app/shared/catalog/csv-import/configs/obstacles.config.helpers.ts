/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type {
  CatalogObstacleConfigurationEntity,
  CatalogObstacleConformityConfigEntity,
  CatalogObstacleDistanceEntity,
  CatalogObstacleRuleDefinitionEntity,
  CatalogObstacleTypeEntity,
  CatalogObstacleWindZoneEntity,
  ObstacleConformityType,
  ObstacleRulePoint,
  ObstacleRulePressure
} from '@infrastructure/database';
import { OBSTACLE_CONFORMITY_CONFIG_KEY } from '@infrastructure/database';
import type {
  ObstacleConfigurationJsonDto,
  ObstacleDistanceJsonDto,
  ObstacleJsonDto,
  ObstacleRuleJsonDto,
  ObstacleRulePointJsonDto,
  ObstacleRulePressureJson,
  WindZoneValueJsonDto
} from './obstacles.config.interfaces';

const ALLOWED_CONFORMITY: ReadonlySet<string> = new Set(['overhang', 'cable_track', 'vegetation']);

/** Narrowing guard — accepts any non-null object shape for downstream property checks. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asConformity(value: unknown): ObstacleConformityType {
  if (value === null) return null;
  if (typeof value === 'string' && ALLOWED_CONFORMITY.has(value)) {
    return value as ObstacleConformityType;
  }
  throw new Error(`Invalid obstacle conformity value: ${String(value)}`);
}

function asPressure(value: unknown): ObstacleRulePressure {
  if (value === 'WindZoneInput') return 'WindZoneInput';
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error(`Invalid rule pressure value: ${String(value)}`);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertObstacleDistanceEntry(value: unknown, obstacleIndex: number, distanceIndex: number): void {
  if (!isObject(value)) {
    throw new Error(
      `Obstacle configuration: obstacles[${obstacleIndex}].distances[${distanceIndex}] must be an object`
    );
  }
  if (typeof value['ruleType'] !== 'string') {
    throw new Error(
      `Obstacle configuration: obstacles[${obstacleIndex}].distances[${distanceIndex}].ruleType must be a string`
    );
  }
  if (typeof value['active'] !== 'boolean') {
    throw new Error(
      `Obstacle configuration: obstacles[${obstacleIndex}].distances[${distanceIndex}].active must be a boolean`
    );
  }
  if (value['overhang'] !== null && !isObject(value['overhang'])) {
    throw new Error(
      `Obstacle configuration: obstacles[${obstacleIndex}].distances[${distanceIndex}].overhang must be an object or null`
    );
  }
  if (value['lateral'] !== null && !isObject(value['lateral'])) {
    throw new Error(
      `Obstacle configuration: obstacles[${obstacleIndex}].distances[${distanceIndex}].lateral must be an object or null`
    );
  }
}

function assertObstacleEntry(value: unknown, index: number): void {
  if (!isObject(value)) {
    throw new Error(`Obstacle configuration: obstacles[${index}] must be an object`);
  }
  if (typeof value['obstacleType'] !== 'string') {
    throw new Error(`Obstacle configuration: obstacles[${index}].obstacleType must be a string`);
  }
  if (typeof value['obstacleName'] !== 'string') {
    throw new Error(`Obstacle configuration: obstacles[${index}].obstacleName must be a string`);
  }
  if (typeof value['details'] !== 'string') {
    throw new Error(`Obstacle configuration: obstacles[${index}].details must be a string`);
  }
  if (typeof value['redZone'] !== 'boolean') {
    throw new Error(`Obstacle configuration: obstacles[${index}].redZone must be a boolean`);
  }
  asConformity(value['conformity']);
  if (!Array.isArray(value['distances'])) {
    throw new Error(`Obstacle configuration: obstacles[${index}].distances must be an array`);
  }

  value['distances'].forEach((distance, distanceIndex) => {
    assertObstacleDistanceEntry(distance, index, distanceIndex);
  });
}

function assertRulePointEntry(value: unknown, ruleIndex: number, pointName: 'lateralPoint' | 'overhangPoint'): void {
  if (!isObject(value)) {
    throw new Error(`Obstacle configuration: rules[${ruleIndex}].${pointName} must be an object`);
  }
  if (value['temperature'] !== null && !isFiniteNumber(value['temperature'])) {
    throw new Error(
      `Obstacle configuration: rules[${ruleIndex}].${pointName}.temperature must be a finite number or null`
    );
  }
  asPressure(value['pressure']);
  if (typeof value['redZone'] !== 'boolean') {
    throw new Error(`Obstacle configuration: rules[${ruleIndex}].${pointName}.redZone must be a boolean`);
  }
}

function assertRuleEntry(value: unknown, index: number): void {
  if (!isObject(value)) {
    throw new Error(`Obstacle configuration: rules[${index}] must be an object`);
  }
  if (typeof value['ruleType'] !== 'string') {
    throw new Error(`Obstacle configuration: rules[${index}].ruleType must be a string`);
  }
  if (typeof value['ruleName'] !== 'string') {
    throw new Error(`Obstacle configuration: rules[${index}].ruleName must be a string`);
  }
  if (typeof value['color'] !== 'string') {
    throw new Error(`Obstacle configuration: rules[${index}].color must be a string`);
  }
  assertRulePointEntry(value['lateralPoint'], index, 'lateralPoint');
  assertRulePointEntry(value['overhangPoint'], index, 'overhangPoint');
}

function assertWindZoneValueEntry(value: unknown, index: number): void {
  if (!isObject(value)) {
    throw new Error(`Obstacle configuration: windZone.values[${index}] must be an object`);
  }
  if (typeof value['label'] !== 'string') {
    throw new Error(`Obstacle configuration: windZone.values[${index}].label must be a string`);
  }
  if (!isFiniteNumber(value['normal'])) {
    throw new Error(`Obstacle configuration: windZone.values[${index}].normal must be a finite number`);
  }
  if (!isFiniteNumber(value['redZone'])) {
    throw new Error(`Obstacle configuration: windZone.values[${index}].redZone must be a finite number`);
  }
}

/**
 * Type guard validating the expected top-level shape and the basic
 * nested-entry shape of `obstacle_configuration.json`. Throws a
 * descriptive error when the payload is malformed.
 */
export function assertObstacleConfigurationJson(value: unknown): asserts value is ObstacleConfigurationJsonDto {
  if (!isObject(value)) throw new Error('Obstacle configuration: root must be an object');
  const obstacles = value['obstacles'];
  if (!Array.isArray(obstacles)) {
    throw new Error('Obstacle configuration: `obstacles` must be an array');
  }
  const rules = value['rules'];
  if (!Array.isArray(rules)) {
    throw new Error('Obstacle configuration: `rules` must be an array');
  }
  const windZone = value['windZone'];
  if (!isObject(windZone)) {
    throw new Error('Obstacle configuration: `windZone` must be an object');
  }
  const windZoneValues = windZone['values'];
  if (!Array.isArray(windZoneValues)) {
    throw new Error('Obstacle configuration: `windZone.values` must be an array');
  }
  if (!isObject(value['repartitionTemperatureFields'])) {
    throw new Error('Obstacle configuration: `repartitionTemperatureFields` must be an object');
  }
  if (!isObject(value['lateralTemperatureFields'])) {
    throw new Error('Obstacle configuration: `lateralTemperatureFields` must be an object');
  }
  if (!Array.isArray(value['intermediatePointPositions'])) {
    throw new Error('Obstacle configuration: `intermediatePointPositions` must be an array');
  }

  obstacles.forEach((obstacle, index) => {
    assertObstacleEntry(obstacle, index);
  });
  rules.forEach((rule, index) => {
    assertRuleEntry(rule, index);
  });
  windZoneValues.forEach((entry, index) => {
    assertWindZoneValueEntry(entry, index);
  });
}

/**
 * Project a JSON obstacle entry to the public `catObstacleTypes` row.
 * The 3-field shape is preserved for iso-functional compatibility with the
 * existing UI dropdown.
 */
export function mapObstacleType(json: ObstacleJsonDto): CatalogObstacleTypeEntity {
  return {
    obstacle_type: json.obstacleType,
    obstacle_type_name: json.obstacleName,
    details: json.details
  };
}

/** Project a JSON obstacle entry to its conformity configuration row. */
export function mapObstacleConfiguration(json: ObstacleJsonDto): CatalogObstacleConfigurationEntity {
  return {
    obstacle_type: json.obstacleType,
    red_zone: json.redZone,
    conformity: asConformity(json.conformity)
  };
}

function mapDistance(obstacleType: string, distance: ObstacleDistanceJsonDto): CatalogObstacleDistanceEntity {
  return {
    obstacle_type: obstacleType,
    rule_type: distance.ruleType,
    active: distance.active,
    overhang: distance.overhang,
    lateral: distance.lateral
  };
}

/**
 * Project the distances array of one JSON obstacle to its `catObstacleDistances`
 * rows. Returns an empty array for obstacles without legal distances.
 */
export function mapObstacleDistances(json: ObstacleJsonDto): CatalogObstacleDistanceEntity[] {
  return json.distances.map((d) => mapDistance(json.obstacleType, d));
}

function mapRulePoint(json: ObstacleRulePointJsonDto): ObstacleRulePoint {
  const pressure: ObstacleRulePressureJson = json.pressure;
  return {
    temperature: json.temperature,
    pressure: asPressure(pressure),
    red_zone: json.redZone
  };
}

/** Project a JSON rule definition to its `catObstacleRuleDefinitions` row. */
export function mapRule(json: ObstacleRuleJsonDto): CatalogObstacleRuleDefinitionEntity {
  return {
    rule_type: json.ruleType,
    rule_name: json.ruleName,
    color: json.color,
    lateral_point: mapRulePoint(json.lateralPoint),
    overhang_point: mapRulePoint(json.overhangPoint)
  };
}

/** Project a JSON wind zone entry to its `catObstacleWindZones` row. */
export function mapWindZone(json: WindZoneValueJsonDto): CatalogObstacleWindZoneEntity {
  return {
    label: json.label,
    normal: json.normal,
    red_zone: json.redZone
  };
}

/** Build the singleton conformity-config row from the JSON payload. */
export function buildConformityConfig(payload: ObstacleConfigurationJsonDto): CatalogObstacleConformityConfigEntity {
  return {
    key: OBSTACLE_CONFORMITY_CONFIG_KEY,
    repartition_temperature_default: payload.repartitionTemperatureFields.defaultValue,
    lateral_temperature_rule_type: payload.lateralTemperatureFields.ruleType,
    lateral_temperature_message: payload.lateralTemperatureFields.message,
    wind_zone_default: payload.windZone.default,
    intermediate_point_positions: [...payload.intermediatePointPositions]
  };
}
