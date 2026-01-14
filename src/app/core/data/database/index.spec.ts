/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AppDB } from './index';

// Mock createStudiesMockData
jest.mock('./helpers/createMocks', () => ({
  createStudiesMockData: jest.fn().mockReturnValue([
    { id: 'study1', name: 'Test Study 1' },
    { id: 'study2', name: 'Test Study 2' }
  ])
}));

interface MockTable {
  bulkPut: jest.Mock;
  count: jest.Mock;
}

interface MockDexieBase {
  name: string;
  version: (version: number) => {
    stores: (schema: Record<string, string>) => MockDexieBase;
  };
}

// Mock Dexie
jest.mock('dexie', () => {
  return {
    __esModule: true,
    default: class MockDexie implements MockDexieBase {
      name: string;
      private tables: Record<string, MockTable> = {};

      constructor(name: string) {
        this.name = name;
      }

      version() {
        return {
          stores: (schema: Record<string, string>) => {
            // Initialize all tables based on the schema
            Object.keys(schema).forEach((tableName) => {
              this.tables[tableName] = {
                bulkPut: jest.fn().mockResolvedValue(undefined),
                count: jest.fn().mockResolvedValue(0)
              };
            });
            this.catAttachments = this.tables.catAttachments;
            this.catLines = this.tables.catLines;
            this.catMaintenance = this.tables.catMaintenance;
            this.catCables = this.tables.catCables;
            this.catChains = this.tables.catChains;
            this.studies = this.tables.studies;
            this.users = this.tables.users;
            return this;
          }
        };
      }

      catAttachments!: MockTable;
      catLines!: MockTable;
      catMaintenance!: MockTable;
      catCables!: MockTable;
      catChains!: MockTable;
      studies!: MockTable;
      users!: MockTable;
    }
  };
});

describe('AppDB', () => {
  let db: AppDB;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    db = new AppDB();
    db.version(1);
    // db.cre;
  });

  it('should create a database with the correct name', () => {
    expect(db.name).toBe('stellar-db');
  });

  it('should initialize with version 1', () => {
    expect(db.catAttachments).toBeDefined();
    expect(db.studies).toBeDefined();
  });

  it('should have users and studies tables defined as class properties', () => {
    expect(db.users).toBeDefined();
    expect(db.studies).toBeDefined();
  });
});
