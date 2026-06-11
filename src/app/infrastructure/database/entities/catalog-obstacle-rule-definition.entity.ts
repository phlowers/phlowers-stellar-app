/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Wind pressure source for a rule's reference cable point.
 *
 * - A numeric value (Pa) is used directly without consulting the wind zone catalog.
 * - The sentinel string `'WindZoneInput'` means the pressure must be resolved at
 *   runtime from the wind zone selected by the user in the Conformity modal.
 */
export type ObstacleRulePressure = number | 'WindZoneInput';

/**
 * Climatic conditions of a reference cable point (lateral or overhang) used to
 * locate the cable position before applying the conformity distance.
 */
export interface ObstacleRulePoint {
  /** Reference cable temperature (°C), or null when not used (`overhangPoint.temperature` is often null). */
  temperature: number | null;
  /** Wind pressure (Pa) or `'WindZoneInput'` when it depends on the wind zone selection. */
  pressure: ObstacleRulePressure;
  /** Whether the rule may apply to the obstacle's "red zone" for this point. */
  red_zone: boolean;
}

/**
 * Definition of one conformity rule (e.g. AT, CCG-LA, CDT) as declared in
 * `obstacle_configuration.json`.
 *
 * @remarks
 * Stored in the `catObstacleRuleDefinitions` Dexie table (primary key
 * `rule_type`). Used by the future Conformity modal to label, color and
 * compute reference cable points for each rule.
 *
 * @category Infrastructure
 */
export interface CatalogObstacleRuleDefinitionEntity {
  /** Technical identifier of the rule (e.g. `'AT'`, `'CCG-LA'`, `'CDT'`). */
  rule_type: string;
  /** Human-readable rule name displayed in the Conformity modal. */
  rule_name: string;
  /** Hexadecimal color used to trace the rule's limit zone (e.g. `'#FF0000'`). */
  color: string;
  /** Reference cable point used to compute lateral conformity distances. */
  lateral_point: ObstacleRulePoint;
  /** Reference cable point used to compute overhang conformity distances. */
  overhang_point: ObstacleRulePoint;
}
