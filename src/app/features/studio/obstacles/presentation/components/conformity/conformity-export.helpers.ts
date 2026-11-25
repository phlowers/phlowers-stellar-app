/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { formatRfc9557OrNull, parseRfc9557 } from '@shared/helpers/date-time.helpers';
import { sanitizeFilenamePart } from '@shared/helpers/filename.helpers';
import { Section, Study } from '@shared/domain';
import { CONFORMITY_EXPORT_FILENAME_PREFIX, CONFORMITY_EXPORT_UNITS } from './conformity-export.constantes';
import {
  ConformityCalculationExport,
  ConformityCheckExport,
  ConformityExport,
  ConformityExportFile,
  ConformityExportParams,
  ConformityExportUnits,
  ConformityMetaDataExport,
  ConformityMinimumCaseSideExport,
  ConformityValueUnit,
  ConformityVoltageExport
} from './conformity-export.interfaces';
import { ConformityRuleResult } from './conformity.model';

const NUMERIC_KV_VOLTAGE = /^\s*(\d+(?:[.,]\d+)?)\s*KV\s*$/i;

const valueUnit = (value: number | null | undefined, unit: string): ConformityValueUnit => ({
  value: value ?? null,
  unit
});

/** Splits a `"<number> KV"` label into value and unit; any other label is kept raw with a `null` unit. */
export const parseVoltage = (label: string | null | undefined): ConformityVoltageExport => {
  if (!label?.trim()) return { value: null, unit: null };
  const match = NUMERIC_KV_VOLTAGE.exec(label);
  return match
    ? { value: Number(match[1].replace(',', '.')), unit: CONFORMITY_EXPORT_UNITS.kilovolt }
    : { value: label, unit: null };
};

const buildMetaData = (section: Section | null, study: Study | null): ConformityMetaDataExport => ({
  author: study?.author_email ?? null,
  date: formatRfc9557OrNull(parseRfc9557(study?.updated_at_offline)),
  study: study?.title ?? null,
  litCode: section?.lit_idr ?? null,
  litName: section?.lit_adr ?? null,
  section: section?.name ?? null,
  initialCondition:
    section?.initial_conditions.find((ic) => ic.uuid === section.selected_initial_condition_uuid)?.name ?? null,
  loadCase: section?.charges.find((charge) => charge.uuid === section.selected_charge_uuid)?.name ?? null
});

const buildCalculation = (result: ConformityRuleResult, UNITS: ConformityExportUnits): ConformityCalculationExport => ({
  cableHeight: {
    overhang: valueUnit(result.overhangCableAltitude, UNITS.meter),
    lateral: valueUnit(result.lateralCableAltitude, UNITS.meter)
  },
  cableLateralDistance: {
    overhang: valueUnit(result.overhangCableLineAxisDistance, UNITS.meter),
    lateral: valueUnit(result.lateralCableLineAxisDistance, UNITS.meter)
  },
  // The swinging angle is not computed by the engine
  cableSwingingAngle: { overhang: valueUnit(null, UNITS.degree), lateral: valueUnit(null, UNITS.degree) },
  distanceLimits: {
    overhang: valueUnit(result.overhangDistanceToComply, UNITS.meter),
    lateral: valueUnit(result.lateralDistanceToComply, UNITS.meter)
  },
  heightLimit: { overhang: valueUnit(result.overhangComplianceAltitude, UNITS.meter) },
  lateralLimit: { lateral: valueUnit(result.lateralComplianceLineAxisDistance, UNITS.meter) }
});

const buildMinimumCaseSide = (
  temperature: number | undefined,
  pressure: number | undefined,
  distance: number | undefined,
  UNITS: ConformityExportUnits
): ConformityMinimumCaseSideExport => ({
  temperature: valueUnit(temperature, UNITS.celsius),
  pressure: valueUnit(pressure, UNITS.pascal),
  distance: valueUnit(distance, UNITS.meter)
});

export const buildConformityExport = (params: ConformityExportParams): ConformityExport => {
  const { section, study, obstacle, point, results, conformityType } = params;
  const UNITS = params.units ?? CONFORMITY_EXPORT_UNITS;
  const conformityChecks: ConformityCheckExport[] = params.rules.map(({ label, value }) => {
    const result = results[value];
    const check: ConformityCheckExport = { rule: label, calculations: [buildCalculation(result, UNITS)] };
    if (conformityType === 'cable_track') {
      check.minimumCase = [
        {
          overhang: buildMinimumCaseSide(
            result.overhangTemperature,
            result.overhangWindPressure,
            result.overhangMinimalDistance,
            UNITS
          ),
          lateral: buildMinimumCaseSide(
            result.lateralTemperature,
            result.lateralWindPressure,
            result.lateralMinimalDistance,
            UNITS
          )
        }
      ];
    }
    return check;
  });

  return {
    metaData: buildMetaData(section, study),
    obstacleData: {
      name: obstacle.name,
      spot: params.pointLabel,
      type: obstacle.type,
      span: params.spanLabel,
      support: params.referenceSupportLabel,
      supportDistance: valueUnit(point.x, UNITS.meter),
      height: valueUnit(point.z, UNITS.meter),
      lateralDistance: valueUnit(point.y, UNITS.meter),
      altitudeType: obstacle.altitudeType,
      lateralDistanceType: obstacle.lateralDistanceType
    },
    conformityInput: {
      voltage: parseVoltage(section?.voltage_idr),
      wind: {
        direction: params.form.windZone,
        inverted: params.form.windMinus,
        redzone: params.form.redZonePresence
      },
      rules: params.rules.map((rule) => rule.label)
    },
    conformityChecks
  };
};

/** Serializes the conformity export contract (`{ distancesConformityCheck: [...] }`) to pretty-printed JSON. */
export const buildConformityExportJson = (params: ConformityExportParams): string => {
  const file: ConformityExportFile = { distancesConformityCheck: [buildConformityExport(params)] };
  return JSON.stringify(file, null, 2);
};

const formatLocalDate = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Builds the download file name: "Export Distances de conformité_<obstacle>_<section>_<YYYY-MM-DD>.json". */
export const buildConformityExportFilename = (
  obstacleName: string,
  sectionName: string | null,
  date: Date = new Date()
): string =>
  [
    CONFORMITY_EXPORT_FILENAME_PREFIX,
    sanitizeFilenamePart(obstacleName),
    sanitizeFilenamePart(sectionName ?? ''),
    formatLocalDate(date)
  ].join('_') + '.json';
