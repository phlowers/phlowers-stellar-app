import {
  USER_SCHEMA,
  STUDY_SCHEMA,
  CATALOG_ATTACHMENT_SCHEMA,
  CATALOG_CABLE_SCHEMA,
  CATALOG_CHAIN_SCHEMA,
  CATALOG_LINE_SCHEMA,
  CATALOG_MAINTENANCE_SCHEMA,
  CATALOG_OBSTACLE_TYPE_SCHEMA,
  METADATA_SCHEMA
} from '@infrastructure/database/schemas';

const dexieState = vi.hoisted(() => ({
  instances: [] as { name: string; versionCalls: { version: number; schema?: Record<string, string> }[] }[]
}));

vi.mock('dexie', () => {
  class DexieMock {
    name: string;
    versionCalls: { version: number; schema?: Record<string, string> }[] = [];

    constructor(name: string) {
      this.name = name;
      dexieState.instances.push(this);
    }

    version(version: number) {
      const versionCall: { version: number; schema?: Record<string, string> } = { version };
      this.versionCalls.push(versionCall);

      return {
        stores: (schema: Record<string, string>) => {
          versionCall.schema = schema;
          return this;
        }
      };
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
});
