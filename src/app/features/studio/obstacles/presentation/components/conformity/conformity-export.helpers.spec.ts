import { describe, expect, it } from 'vitest';
import { Section, Study } from '@shared/domain';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import {
  buildConformityExport,
  buildConformityExportFilename,
  buildConformityExportJson,
  parseVoltage
} from './conformity-export.helpers';
import { ConformityExportParams } from './conformity-export.interfaces';
import { ConformityRuleResult } from './conformity.model';

const section = {
  name: 'Section A',
  lit_idr: 'LIT-1',
  lit_adr: 'LIT ADR 1',
  voltage_idr: '90 KV',
  initial_conditions: [{ uuid: 'ic-1', name: 'Initial Condition 1' }],
  selected_initial_condition_uuid: 'ic-1',
  charges: [{ uuid: 'charge-1', name: 'Load case 1' }],
  selected_charge_uuid: 'charge-1'
} as unknown as Section;

const study = {
  author_email: 'user@example.com',
  title: 'Test Study',
  updated_at_offline: '2026-01-27T10:00:00Z'
} as unknown as Study;

const obstacle = { name: 'Obstacle 1', type: 'road' } as unknown as Obstacle;

const result: ConformityRuleResult = {
  overhangCableAltitude: 12.3456,
  lateralCableAltitude: 11,
  overhangCableLineAxisDistance: 5,
  lateralCableLineAxisDistance: 6,
  overhangDistanceToComply: 7,
  lateralDistanceToComply: 8,
  overhangComplianceAltitude: 9,
  lateralComplianceLineAxisDistance: 10,
  conformityCompliance: true,
  overhangTemperature: 15,
  lateralTemperature: -5,
  overhangWindPressure: 500,
  lateralWindPressure: 450,
  overhangMinimalDistance: 6,
  lateralMinimalDistance: 4
};

const buildParams = (overrides: Partial<ConformityExportParams> = {}): ConformityExportParams => ({
  section,
  study,
  obstacle,
  point: { x: 1.5, y: 2.5, z: 3.5 },
  pointLabel: 'Point 2',
  spanLabel: 'S1 - S2',
  referenceSupportLabel: 'S1',
  form: { windZone: 'Zone 1', windMinus: true, redZonePresence: false },
  rules: [
    { label: 'Rule B', value: 'rule_b' },
    { label: 'Rule A', value: 'rule_a' }
  ],
  results: { rule_a: result, rule_b: result },
  conformityType: 'vegetation',
  ...overrides
});

describe('parseVoltage', () => {
  it.each([
    ['90 KV', { value: 90, unit: 'KV' }],
    ['  225 kv ', { value: 225, unit: 'KV' }],
    ['HORS TENSION', { value: 'HORS TENSION', unit: null }],
    ['INFERIEUR A 45 KV', { value: 'INFERIEUR A 45 KV', unit: null }],
    [undefined, { value: null, unit: null }],
    ['  ', { value: null, unit: null }]
  ])('parses %j', (label, expected) => {
    expect(parseVoltage(label)).toEqual(expected);
  });
});

describe('buildConformityExport', () => {
  it('builds metadata, obstacle data and inputs in the selected rule order', () => {
    const exported = buildConformityExport(buildParams());

    expect(exported.metaData).toMatchObject({
      author: 'user@example.com',
      study: 'Test Study',
      litCode: 'LIT-1',
      litName: 'LIT ADR 1',
      section: 'Section A',
      initialCondition: 'Initial Condition 1',
      loadCase: 'Load case 1'
    });
    expect(exported.metaData.date).toEqual(expect.any(String));
    expect(exported.obstacleData).toEqual({
      name: 'Obstacle 1',
      spot: 'Point 2',
      type: 'road',
      span: 'S1 - S2',
      support: 'S1',
      supportDistance: { value: 1.5, unit: 'm' },
      height: { value: 3.5, unit: 'm' },
      lateralDistance: { value: 2.5, unit: 'm' }
    });
    expect(exported.conformityInput).toEqual({
      voltage: { value: 90, unit: 'KV' },
      wind: { direction: 'Zone 1', inverted: true, redzone: false },
      rules: ['Rule B', 'Rule A']
    });
    expect(exported.conformityChecks.map((c) => c.rule)).toEqual(['Rule B', 'Rule A']);
  });

  it('exports raw values and a null swinging angle, without minimumCase for non cable-track types', () => {
    const [check] = buildConformityExport(buildParams()).conformityChecks;

    expect(check.minimumCase).toBeUndefined();
    expect(check.calculations).toEqual([
      {
        cableHeight: { overhang: { value: 12.3456, unit: 'm' }, lateral: { value: 11, unit: 'm' } },
        cableLateralDistance: { overhang: { value: 5, unit: 'm' }, lateral: { value: 6, unit: 'm' } },
        cableSwingingAngle: { overhang: { value: null, unit: '°' }, lateral: { value: null, unit: '°' } },
        distanceLimits: { overhang: { value: 7, unit: 'm' }, lateral: { value: 8, unit: 'm' } },
        heightLimit: { overhang: { value: 9, unit: 'm' } },
        lateralLimit: { lateral: { value: 10, unit: 'm' } }
      }
    ]);
  });

  it('keeps a stable structure with null values for missing lateral results (overhang type)', () => {
    const overhangResult = { ...result, lateralCableAltitude: undefined } as unknown as ConformityRuleResult;
    const [check] = buildConformityExport(
      buildParams({ conformityType: 'overhang', results: { rule_a: overhangResult, rule_b: overhangResult } })
    ).conformityChecks;

    expect(check.calculations[0].cableHeight.lateral).toEqual({ value: null, unit: 'm' });
  });

  it('adds minimumCase for cable_track only', () => {
    const [check] = buildConformityExport(buildParams({ conformityType: 'cable_track' })).conformityChecks;

    expect(check.minimumCase).toEqual([
      {
        overhang: {
          temperature: { value: 15, unit: '°C' },
          pressure: { value: 500, unit: 'Pa' },
          distance: { value: 6, unit: 'm' }
        },
        lateral: {
          temperature: { value: -5, unit: '°C' },
          pressure: { value: 450, unit: 'Pa' },
          distance: { value: 4, unit: 'm' }
        }
      }
    ]);
  });

  it('returns null metadata without study and section', () => {
    const { metaData, conformityInput } = buildConformityExport(buildParams({ section: null, study: null }));

    expect(Object.values(metaData).every((value) => value === null)).toBe(true);
    expect(conformityInput.voltage).toEqual({ value: null, unit: null });
  });
});

describe('buildConformityExportJson', () => {
  it('wraps the export in a single-entry distancesConformityCheck array', () => {
    const parsed = JSON.parse(buildConformityExportJson(buildParams()));

    expect(Object.keys(parsed)).toEqual(['distancesConformityCheck']);
    expect(parsed.distancesConformityCheck).toHaveLength(1);
  });
});

describe('buildConformityExportFilename', () => {
  it('builds a sanitized file name with the local date', () => {
    expect(buildConformityExportFilename('Obs/1:x', 'Sec*A', new Date(2026, 0, 5))).toBe(
      'Export Distances de conformité_Obs-1-x_Sec-A_2026-01-05.json'
    );
  });
});
