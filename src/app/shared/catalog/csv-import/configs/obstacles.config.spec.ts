/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { OBSTACLE_CONFORMITY_CONFIG_KEY } from '@infrastructure/database';
import { createObstaclesConfig } from './obstacles.config';
import {
  assertObstacleConfigurationJson,
  buildConformityConfig,
  mapObstacleConfiguration,
  mapObstacleDistances,
  mapObstacleType,
  mapRule,
  mapWindZone
} from './obstacles.config.helpers';
import type { ObstacleConfigurationJsonDto, ObstacleJsonDto, ObstacleRuleJsonDto } from './obstacles.config.interfaces';
import type { JsonImportContext } from '../json-import.engine.interfaces';

/** Minimal valid JSON payload exercising every section of the catalog. */
const validPayload: ObstacleConfigurationJsonDto = {
  obstacles: [
    {
      obstacleType: 'ordinary_ground',
      obstacleName: 'Terrain ordinaire',
      details: 'Terrain ordinaire',
      redZone: false,
      conformity: 'overhang',
      distances: [
        {
          ruleType: 'AT',
          active: true,
          overhang: { '63': 6.2, '400': 7.0 },
          lateral: null
        }
      ]
    },
    {
      obstacleType: 'high_clearance_equipment_area',
      obstacleName: 'Aire engin gde hauteur',
      details: "Aire d'évolution d'engins",
      redZone: false,
      conformity: null,
      distances: []
    },
    {
      obstacleType: 'vegetation',
      obstacleName: 'Végétation',
      details: 'Arbre isolé',
      redZone: true,
      conformity: 'vegetation',
      distances: [
        {
          ruleType: 'AT',
          active: true,
          overhang: { '63': 2.0 },
          lateral: { '63': 2.0 }
        },
        {
          ruleType: 'CCG-LA',
          active: true,
          overhang: { '63': 3.5 },
          lateral: { '63': 8.5 }
        }
      ]
    }
  ],
  rules: [
    {
      ruleType: 'AT',
      ruleName: 'AT',
      color: '#FF0000',
      lateralPoint: { temperature: 15, pressure: 'WindZoneInput', redZone: false },
      overhangPoint: { temperature: null, pressure: 0, redZone: false }
    },
    {
      ruleType: 'CCG-LA',
      ruleName: 'CCG-LA',
      color: '#FFA500',
      lateralPoint: { temperature: 65, pressure: 'WindZoneInput', redZone: true },
      overhangPoint: { temperature: null, pressure: 0, redZone: false }
    }
  ],
  repartitionTemperatureFields: { defaultValue: 75 },
  lateralTemperatureFields: { ruleType: 'CCG-LA', message: 'msg' },
  windZone: {
    default: 'ZVN',
    values: [
      { label: 'ZVN', normal: 240, redZone: 360 },
      { label: 'ZVF', normal: 360, redZone: 480 }
    ]
  },
  intermediatePointPositions: [0.33, 0.66]
};

describe('obstacles.config - pure helpers', () => {
  describe('mapObstacleType', () => {
    it('projects camelCase JSON fields to snake_case entity fields', () => {
      const json: ObstacleJsonDto = validPayload.obstacles[0];
      expect(mapObstacleType(json)).toEqual({
        obstacle_type: 'ordinary_ground',
        obstacle_type_name: 'Terrain ordinaire',
        details: 'Terrain ordinaire'
      });
    });
  });

  describe('mapObstacleConfiguration', () => {
    it('extracts red_zone and conformity', () => {
      expect(mapObstacleConfiguration(validPayload.obstacles[2])).toEqual({
        obstacle_type: 'vegetation',
        red_zone: true,
        conformity: 'vegetation'
      });
    });

    it('passes null conformity through', () => {
      expect(mapObstacleConfiguration(validPayload.obstacles[1]).conformity).toBeNull();
    });

    it('throws on invalid conformity value', () => {
      const bad: ObstacleJsonDto = {
        ...validPayload.obstacles[0],
        conformity: 'unknown' as unknown as ObstacleJsonDto['conformity']
      };
      expect(() => mapObstacleConfiguration(bad)).toThrow(/Invalid obstacle conformity/);
    });
  });

  describe('mapObstacleDistances', () => {
    it('returns one distance row per declared rule', () => {
      const rows = mapObstacleDistances(validPayload.obstacles[2]);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        obstacle_type: 'vegetation',
        rule_type: 'AT',
        active: true,
        overhang: { '63': 2.0 },
        lateral: { '63': 2.0 }
      });
      expect(rows[1].rule_type).toBe('CCG-LA');
    });

    it('returns an empty array for obstacles without distances', () => {
      expect(mapObstacleDistances(validPayload.obstacles[1])).toEqual([]);
    });
  });

  describe('mapRule', () => {
    it('preserves WindZoneInput pressure literal and numeric pressure', () => {
      const at = mapRule(validPayload.rules[0]);
      expect(at.lateral_point.pressure).toBe('WindZoneInput');
      expect(at.overhang_point.pressure).toBe(0);
      expect(at.lateral_point.red_zone).toBe(false);
    });

    it('throws on invalid pressure value', () => {
      const bad: ObstacleRuleJsonDto = {
        ...validPayload.rules[0],
        lateralPoint: {
          ...validPayload.rules[0].lateralPoint,
          pressure: 'Bad' as unknown as ObstacleRuleJsonDto['lateralPoint']['pressure']
        }
      };
      expect(() => mapRule(bad)).toThrow(/Invalid rule pressure/);
    });
  });

  describe('mapWindZone', () => {
    it('renames redZone to red_zone', () => {
      expect(mapWindZone(validPayload.windZone.values[1])).toEqual({
        label: 'ZVF',
        normal: 360,
        red_zone: 480
      });
    });
  });

  describe('buildConformityConfig', () => {
    it('produces the singleton key and flattens scalar config', () => {
      const config = buildConformityConfig(validPayload);
      expect(config.key).toBe(OBSTACLE_CONFORMITY_CONFIG_KEY);
      expect(config.repartition_temperature_default).toBe(75);
      expect(config.lateral_temperature_rule_type).toBe('CCG-LA');
      expect(config.lateral_temperature_message).toBe('msg');
      expect(config.wind_zone_default).toBe('ZVN');
      expect(config.intermediate_point_positions).toEqual([0.33, 0.66]);
    });

    it('returns a defensive copy of intermediatePointPositions', () => {
      const config = buildConformityConfig(validPayload);
      config.intermediate_point_positions.push(0.99);
      expect(validPayload.intermediatePointPositions).toEqual([0.33, 0.66]);
    });
  });

  describe('assertObstacleConfigurationJson', () => {
    it('does not throw on a valid payload', () => {
      expect(() => assertObstacleConfigurationJson(validPayload)).not.toThrow();
    });

    it.each([
      [null, 'root must be an object'],
      [{}, '`obstacles` must be an array'],
      [{ obstacles: [] }, '`rules` must be an array'],
      [{ obstacles: [], rules: [] }, '`windZone` must be an object'],
      [{ obstacles: [], rules: [], windZone: {} }, '`windZone.values` must be an array'],
      [{ obstacles: [], rules: [], windZone: { values: [] } }, '`repartitionTemperatureFields` must be an object'],
      [
        {
          obstacles: [],
          rules: [],
          windZone: { values: [] },
          repartitionTemperatureFields: {}
        },
        '`lateralTemperatureFields` must be an object'
      ],
      [
        {
          obstacles: [],
          rules: [],
          windZone: { values: [] },
          repartitionTemperatureFields: {},
          lateralTemperatureFields: {}
        },
        '`intermediatePointPositions` must be an array'
      ]
    ])('throws when payload is %#', (payload, expectedMessage) => {
      expect(() => assertObstacleConfigurationJson(payload)).toThrow(expectedMessage as string);
    });
  });
});

describe('obstacles.config - createObstaclesConfig', () => {
  it('declares the JSON kind, filename and csvKey', () => {
    const config = createObstaclesConfig();
    expect(config.kind).toBe('json');
    expect(config.csvKey).toBe('obstacles');
    expect(config.filename).toBe('obstacle_configuration.json');
  });

  it('declares its 6 live table names for generic staging promotion', () => {
    const config = createObstaclesConfig();
    expect(config.tableNames).toEqual([
      'catObstacleTypes',
      'catObstacleConfigurations',
      'catObstacleDistances',
      'catObstacleRuleDefinitions',
      'catObstacleWindZones',
      'catObstacleConformityConfig'
    ]);
  });

  describe('apply', () => {
    /** Builds an in-memory fake Dexie handle capturing writes per table. */
    function makeFakeDb() {
      const calls: Record<string, { clears: number; bulkPut: unknown[][]; put: unknown[] }> = {};
      const tableNames = [
        'catObstacleTypes',
        'catObstacleConfigurations',
        'catObstacleDistances',
        'catObstacleRuleDefinitions',
        'catObstacleWindZones',
        'catObstacleConformityConfig'
      ];
      for (const name of tableNames) {
        calls[name] = { clears: 0, bulkPut: [], put: [] };
      }
      const makeTable = (name: string) => ({
        clear: vi.fn(async () => {
          calls[name].clears += 1;
        }),
        bulkPut: vi.fn(async (items: unknown[]) => {
          calls[name].bulkPut.push(items);
        }),
        put: vi.fn(async (item: unknown) => {
          calls[name].put.push(item);
        })
      });
      const tables = Object.fromEntries(tableNames.map((n) => [n, makeTable(n)]));
      const db = {
        ...tables,
        transaction: vi.fn(async (_mode: string, _tables: unknown[], cb: () => Promise<void>) => {
          await cb();
        })
      };
      return { db, calls };
    }

    it('writes every table inside one transaction (clear → bulkPut/put)', async () => {
      const config = createObstaclesConfig();
      const { db, calls } = makeFakeDb();
      const ctx = { db: db as never, now: '2026-06-05T00:00:00Z' } as JsonImportContext;

      const result = await config.apply(validPayload, ctx);

      // single transaction call wrapping all writes
      expect(db.transaction).toHaveBeenCalledTimes(1);
      // every table cleared exactly once before writing
      for (const name of Object.keys(calls)) {
        expect(calls[name].clears).toBe(1);
      }
      // types: 3 rows
      expect(calls['catObstacleTypes'].bulkPut[0]).toHaveLength(3);
      // configurations: 3 rows
      expect(calls['catObstacleConfigurations'].bulkPut[0]).toHaveLength(3);
      // distances: 1 (ordinary_ground) + 0 (high_clearance) + 2 (vegetation) = 3
      expect(calls['catObstacleDistances'].bulkPut[0]).toHaveLength(3);
      // rules: 2 rows
      expect(calls['catObstacleRuleDefinitions'].bulkPut[0]).toHaveLength(2);
      // wind zones: 2 rows
      expect(calls['catObstacleWindZones'].bulkPut[0]).toHaveLength(2);
      // conformity config: singleton via put()
      expect(calls['catObstacleConformityConfig'].put).toHaveLength(1);
      // result counts (3 + 2 + 2 + 1 sources, 3 + 3 + 3 + 2 + 2 + 1 keys)
      expect(result.totalRows).toBe(8);
      expect(result.totalKeys).toBe(14);
    });

    it('rejects when payload is malformed', async () => {
      const config = createObstaclesConfig();
      const { db } = makeFakeDb();
      await expect(config.apply({}, { db: db as never, now: '2026-06-05' } as JsonImportContext)).rejects.toThrow(
        /obstacles/
      );
    });

    it('persists obstacles without distances with no extra distance rows', async () => {
      const config = createObstaclesConfig();
      const { db, calls } = makeFakeDb();
      const onlyEmpty: ObstacleConfigurationJsonDto = {
        ...validPayload,
        obstacles: [validPayload.obstacles[1]]
      };
      await config.apply(onlyEmpty, {
        db: db as never,
        now: '2026-06-05'
      } as JsonImportContext);
      // No bulkPut on distances when array is empty
      expect(calls['catObstacleDistances'].bulkPut).toHaveLength(0);
      // Type and configuration still written
      expect(calls['catObstacleTypes'].bulkPut[0]).toHaveLength(1);
      expect(calls['catObstacleConfigurations'].bulkPut[0]).toHaveLength(1);
    });

    it('writes to the staging-prefixed tables when ctx.tableNamePrefix is set', async () => {
      const config = createObstaclesConfig();
      const calls: Record<string, { clears: number; bulkPut: unknown[][]; put: unknown[] }> = {};
      const stagingNames = config.tableNames.map((name) => `staging_${name}`);
      for (const name of stagingNames) {
        calls[name] = { clears: 0, bulkPut: [], put: [] };
      }
      const makeTable = (name: string) => ({
        clear: vi.fn(async () => {
          calls[name].clears += 1;
        }),
        bulkPut: vi.fn(async (items: unknown[]) => {
          calls[name].bulkPut.push(items);
        }),
        put: vi.fn(async (item: unknown) => {
          calls[name].put.push(item);
        })
      });
      const tables = Object.fromEntries(stagingNames.map((n) => [n, makeTable(n)]));
      const db = {
        ...tables,
        transaction: vi.fn(async (_mode: string, _tables: unknown[], cb: () => Promise<void>) => {
          await cb();
        })
      };

      await config.apply(validPayload, {
        db: db as never,
        now: '2026-06-05',
        tableNamePrefix: 'staging_'
      } as JsonImportContext);

      for (const name of stagingNames) {
        expect(calls[name].clears).toBe(1);
      }
      expect(calls['staging_catObstacleTypes'].bulkPut[0]).toHaveLength(3);
      expect(calls['staging_catObstacleConformityConfig'].put).toHaveLength(1);
    });
  });
});
