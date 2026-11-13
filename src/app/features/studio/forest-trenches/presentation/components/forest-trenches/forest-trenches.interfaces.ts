/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { CatalogObstacleRuleDefinitionEntity } from '@infrastructure/database/entities/catalog-obstacle-rule-definition.entity';
import type {
  CatalogObstacleConformityConfigEntity,
  ForestTrenchesChartSeriesStyle
} from '@infrastructure/database/entities/catalog-obstacle-conformity-config.entity';
import type { CatalogObstacleWindZoneEntity } from '@infrastructure/database/entities/catalog-obstacle-wind-zone.entity';
import type { ForestTrenchesSpanOutput } from '@services/worker_python/tasks/types';

export interface ForestTrenchesCatalogData {
  windZones: CatalogObstacleWindZoneEntity[];
  conformityConfig: CatalogObstacleConformityConfigEntity | null;
  ruleDefinitions: CatalogObstacleRuleDefinitionEntity[];
}

export interface ForestTrenchesSelectOption<T> {
  label: string;
  value: T;
}

export interface ForestTrenchesTableRow {
  id: string;
  label: string;
  unitKey: 'common.meter';
  values: number[];
}

export interface ForestTrenchesRowsConfig {
  selectedRules: readonly string[];
  lateralRules: readonly string[];
  overhangRules: readonly string[];
  ruleDefinitions: readonly CatalogObstacleRuleDefinitionEntity[];
  repartitionTemperature: number;
  lateralDistanceTemperature: number;
}

export type ForestTrenchesTranslate = (key: string, params?: Record<string, string | number>) => string;

export interface ForestTrenchesPlotOptions {
  lateralRuleTypes: readonly string[];
  overhangRuleTypes: readonly string[];
  ruleColors: Readonly<Record<string, string>>;
  ruleLabels: Readonly<Record<string, string>>;
  chart: ForestTrenchesChart;
  xAxisTitle: string;
  xTickLabels: readonly string[];
  yAxisTitle: string;
  axisLabel: string;
  overhangCableLabel: (ruleName: string) => string;
  lateralCableLabel: (ruleName: string) => string;
  lateralInverseCableLabel: (ruleName: string) => string;
  lateralLimitLabel: (ruleName: string) => string;
  lateralInverseLimitLabel: (ruleName: string) => string;
  showLegend?: boolean;
}

export type ForestTrenchesSpan = ForestTrenchesSpanOutput;

/** Marker and line styles of the cable and limit series, as catalog style names. */
export interface ForestTrenchesChart {
  cable: ForestTrenchesChartSeriesStyle;
  limit: ForestTrenchesChartSeriesStyle;
  /** Overrides the rule color of the overhang cable curves; null keeps the rule color. */
  overhang_color: string | null;
}

export interface ForestTrenchesFloorDistance {
  rule_type: string;
  active: boolean;
  overhang: Record<string, number> | null;
  lateral: Record<string, number> | null;
}

/** Forest-trenches part of the obstacle conformity config, only built when every field is valid. */
export interface ForestTrenchesConfig {
  nPointsChoices: number[];
  overhangRules: string[];
  lateralRules: string[];
  chart: ForestTrenchesChart;
  redZone: boolean;
  floorDistances: ForestTrenchesFloorDistance[];
}
