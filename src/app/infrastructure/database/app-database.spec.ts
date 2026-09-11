import {
  USER_SCHEMA,
  USER_SCHEMA_V3,
  STUDY_SCHEMA,
  CATALOG_ATTACHMENT_SCHEMA,
  CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
  CATALOG_CABLE_SCHEMA,
  CATALOG_CHAIN_SCHEMA,
  CATALOG_LINE_SCHEMA,
  CATALOG_MAINTENANCE_SCHEMA,
  CATALOG_OBSTACLE_TYPE_SCHEMA,
  CATALOG_OBSTACLE_CONFIGURATION_SCHEMA,
  CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA,
  CATALOG_OBSTACLE_DISTANCE_SCHEMA,
  CATALOG_OBSTACLE_WIND_ZONE_SCHEMA,
  CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA,
  METADATA_SCHEMA
} from '@infrastructure/database/schemas';
import { STAGING_TABLE_PREFIX } from '@infrastructure/database/app-database.versions';

function toStagingSchema(schema: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(schema).map(([table, index]) => [`${STAGING_TABLE_PREFIX}${table}`, index]));
}

const dexieState = vi.hoisted(() => ({
  instances: [] as {
    name: string;
    versionCalls: { version: number; schema?: Record<string, string>; upgrade?: (tx: unknown) => Promise<void> }[];
  }[]
}));

vi.mock('dexie', () => {
  class DexieMock {
    name: string;
    versionCalls: { version: number; schema?: Record<string, string>; upgrade?: (tx: unknown) => Promise<void> }[] =
      [];

    constructor(name: string) {
      this.name = name;
      dexieState.instances.push(this);
    }

    version(version: number) {
      const versionCall: { version: number; schema?: Record<string, string>; upgrade?: (tx: unknown) => Promise<void> } =
        { version };
      this.versionCalls.push(versionCall);

      const chain = {
        stores: (schema: Record<string, string>) => {
          versionCall.schema = schema;
          return chain;
        },
        upgrade: (fn: (tx: unknown) => Promise<void>) => {
          versionCall.upgrade = fn;
          return chain;
        }
      };
      return chain;
    }
  }

  return {
    __esModule: true,
    default: DexieMock,
    Table: class TableMock {}
  };
});

describe('AppDatabase', () => {
  beforeEach(() => {
    dexieState.instances.length = 0;
    vi.resetModules();
  });

  it('should initialize Dexie with the expected database name', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    expect(dexieState.instances).toHaveLength(1);
    expect(dexieState.instances[0].name).toBe('stellar-db');
  });

  it('should register version 1 schema without metadata table', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    expect(dexieState.instances[0].versionCalls[0]).toEqual({
      version: 1,
      schema: {
        ...USER_SCHEMA,
        ...STUDY_SCHEMA,
        ...CATALOG_ATTACHMENT_SCHEMA,
        ...CATALOG_CABLE_SCHEMA,
        ...CATALOG_CHAIN_SCHEMA,
        ...CATALOG_LINE_SCHEMA,
        ...CATALOG_MAINTENANCE_SCHEMA,
        ...CATALOG_OBSTACLE_TYPE_SCHEMA
      }
    });
  });

  it('should register version 2 schema with metadata table', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    expect(dexieState.instances[0].versionCalls[1]).toEqual({
      version: 2,
      schema: {
        ...USER_SCHEMA,
        ...STUDY_SCHEMA,
        ...CATALOG_ATTACHMENT_SCHEMA,
        ...CATALOG_CABLE_SCHEMA,
        ...CATALOG_CHAIN_SCHEMA,
        ...CATALOG_LINE_SCHEMA,
        ...CATALOG_MAINTENANCE_SCHEMA,
        ...CATALOG_OBSTACLE_TYPE_SCHEMA,
        ...METADATA_SCHEMA
      }
    });
  });

  it('should expose AppDB as a deprecated alias of AppDatabase', async () => {
    const { AppDatabase, AppDB } = await import('@infrastructure/database/app-database');

    expect(AppDB).toBe(AppDatabase);
  });

  it('should register version 6 schema with catSupportAttachments and remove catAttachments', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    expect(dexieState.instances[0].versionCalls[5]).toEqual({
      version: 6,
      schema: {
        ...USER_SCHEMA_V3,
        ...STUDY_SCHEMA,
        catAttachments: null,
        ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
        ...CATALOG_CABLE_SCHEMA,
        ...CATALOG_CHAIN_SCHEMA,
        ...CATALOG_LINE_SCHEMA,
        ...CATALOG_MAINTENANCE_SCHEMA,
        ...CATALOG_OBSTACLE_TYPE_SCHEMA,
        ...METADATA_SCHEMA
      }
    });
  });

  it('should register version 7 schema with obstacle conformity configuration tables', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    expect(dexieState.instances[0].versionCalls[6]).toEqual({
      version: 7,
      schema: {
        ...USER_SCHEMA_V3,
        ...STUDY_SCHEMA,
        catAttachments: null,
        ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
        ...CATALOG_CABLE_SCHEMA,
        ...CATALOG_CHAIN_SCHEMA,
        ...CATALOG_LINE_SCHEMA,
        ...CATALOG_MAINTENANCE_SCHEMA,
        ...CATALOG_OBSTACLE_TYPE_SCHEMA,
        ...CATALOG_OBSTACLE_CONFIGURATION_SCHEMA,
        ...CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA,
        ...CATALOG_OBSTACLE_DISTANCE_SCHEMA,
        ...CATALOG_OBSTACLE_WIND_ZONE_SCHEMA,
        ...CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA,
        ...METADATA_SCHEMA
      }
    });
  });

  it('should register version 8 schema with staging counterparts for every catalog table', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    expect(dexieState.instances[0].versionCalls[7]).toEqual({
      version: 8,
      schema: {
        ...USER_SCHEMA_V3,
        ...STUDY_SCHEMA,
        catAttachments: null,
        ...CATALOG_SUPPORT_ATTACHMENT_SCHEMA,
        ...CATALOG_CABLE_SCHEMA,
        ...CATALOG_CHAIN_SCHEMA,
        ...CATALOG_LINE_SCHEMA,
        ...CATALOG_MAINTENANCE_SCHEMA,
        ...CATALOG_OBSTACLE_TYPE_SCHEMA,
        ...CATALOG_OBSTACLE_CONFIGURATION_SCHEMA,
        ...CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA,
        ...CATALOG_OBSTACLE_DISTANCE_SCHEMA,
        ...CATALOG_OBSTACLE_WIND_ZONE_SCHEMA,
        ...CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA,
        ...METADATA_SCHEMA,
        ...toStagingSchema(CATALOG_SUPPORT_ATTACHMENT_SCHEMA),
        ...toStagingSchema(CATALOG_CABLE_SCHEMA),
        ...toStagingSchema(CATALOG_CHAIN_SCHEMA),
        ...toStagingSchema(CATALOG_LINE_SCHEMA),
        ...toStagingSchema(CATALOG_MAINTENANCE_SCHEMA),
        ...toStagingSchema(CATALOG_OBSTACLE_TYPE_SCHEMA),
        ...toStagingSchema(CATALOG_OBSTACLE_CONFIGURATION_SCHEMA),
        ...toStagingSchema(CATALOG_OBSTACLE_RULE_DEFINITION_SCHEMA),
        ...toStagingSchema(CATALOG_OBSTACLE_DISTANCE_SCHEMA),
        ...toStagingSchema(CATALOG_OBSTACLE_WIND_ZONE_SCHEMA),
        ...toStagingSchema(CATALOG_OBSTACLE_CONFORMITY_CONFIG_SCHEMA)
      }
    });
  });

  it('should never register a staging counterpart for users or studies', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    const v8Schema = dexieState.instances[0].versionCalls[7].schema ?? {};
    const stagingTableNames = Object.keys(v8Schema).filter((name) => name.startsWith(STAGING_TABLE_PREFIX));
    expect(stagingTableNames).not.toContain(`${STAGING_TABLE_PREFIX}users`);
    expect(stagingTableNames).not.toContain(`${STAGING_TABLE_PREFIX}studies`);
    expect(stagingTableNames).toHaveLength(11);
  });

  it('should register version 9 as a data-only upgrade for section IDR/ADR field renames', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    const versionCall = dexieState.instances[0].versionCalls[8];
    expect(versionCall.version).toBe(9);
    expect(versionCall.schema).toBeUndefined();
    expect(versionCall.upgrade).toBeInstanceOf(Function);
  });

  it('should rename Section IDR/ADR fields and initialize the new ones during the version 9 upgrade', async () => {
    const { AppDatabase } = await import('@infrastructure/database/app-database');

    new AppDatabase();

    const upgrade = dexieState.instances[0].versionCalls[8].upgrade!;
    const study = {
      sections: [
        {
          lit_code: 'LIT001',
          lit_name: 'LitName',
          branch_idr: 'FLOREL61SSVIN01',
          link_name: 'LIA001'
        }
      ]
    };
    let modifyCallback: ((s: unknown) => void) | undefined;
    const tx = {
      table: (name: string) => {
        expect(name).toBe('studies');
        return {
          toCollection: () => ({
            modify: (cb: (s: unknown) => void) => {
              modifyCallback = cb;
              return Promise.resolve();
            }
          })
        };
      }
    };

    await upgrade(tx);
    modifyCallback!(study);

    const section = study.sections[0] as unknown as Record<string, unknown>;
    expect(section['lit_idr']).toBe('LIT001');
    expect(section['lit_code']).toBeUndefined();
    expect(section['lit_adr']).toBe('LitName');
    expect(section['lit_name']).toBeUndefined();
    expect(section['branch_code']).toBe('FLOREL61SSVIN01');
    expect(section['branch_idr']).toBeUndefined();
    expect(section['link_code']).toBe('LIA001');
    expect(section['link_name']).toBeUndefined();
    expect(section['voltage_adr']).toBeUndefined();
    expect(section['cm_idr']).toBeUndefined();
    expect(section['cm_adr']).toBeUndefined();
    expect(section['gmr_idr']).toBeUndefined();
    expect(section['gmr_adr']).toBeUndefined();
    expect(section['eel_idr']).toBeUndefined();
    expect(section['eel_adr']).toBeUndefined();
  });
});
