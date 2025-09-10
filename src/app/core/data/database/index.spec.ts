/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AppDB } from './index';
import { createStudiesMockData } from './helpers/createMocks';

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
            this.attachments = this.tables.attachments;
            this.branches = this.tables.branches;
            this.lines = this.tables.lines;
            this.maintenance_centers = this.tables.maintenance_centers;
            this.regional_maintenance_centers =
              this.tables.regional_maintenance_centers;
            this.sections = this.tables.sections;
            this.spans = this.tables.spans;
            this.tensions = this.tables.tensions;
            this.transit_links = this.tables.transit_links;
            this.cables = this.tables.cables;
            this.studies = this.tables.studies;
            this.users = this.tables.users;
            return this;
          }
        };
      }

      attachments!: MockTable;
      branches!: MockTable;
      lines!: MockTable;
      maintenance_centers!: MockTable;
      regional_maintenance_centers!: MockTable;
      sections!: MockTable;
      spans!: MockTable;
      tensions!: MockTable;
      transit_links!: MockTable;
      cables!: MockTable;
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
    expect(db.attachments).toBeDefined();
    expect(db.studies).toBeDefined();
  });

  it('should have users and studies tables defined as class properties', () => {
    expect(db.users).toBeDefined();
    expect(db.studies).toBeDefined();
  });

  describe('loadMockDataFromJson', () => {
    const mockJsonContent = {
      attachments: [{ id: 1 }],
      branches: [{ id: 1 }],
      lines: [{ id: 1 }],
      maintenance_centers: [{ id: 1 }],
      regional_maintenance_centers: [{ id: 1 }],
      sections: [{ id: 1 }],
      spans: [{ id: 1 }],
      tensions: [{ id: 1 }],
      transit_links: [{ id: 1 }],
      cables: [{ id: 1 }]
    };

    it('should load mock data into all tables', async () => {
      await db.loadMockDataFromJson(mockJsonContent);

      expect(db.attachments.bulkPut).toHaveBeenCalledWith(
        mockJsonContent.attachments
      );
      expect(db.branches.bulkPut).toHaveBeenCalledWith(
        mockJsonContent.branches
      );
      expect(db.lines.bulkPut).toHaveBeenCalledWith(mockJsonContent.lines);
      expect(db.sections.bulkPut).toHaveBeenCalledWith(
        mockJsonContent.sections
      );
      expect(db.spans.bulkPut).toHaveBeenCalledWith(mockJsonContent.spans);
      expect(db.tensions.bulkPut).toHaveBeenCalledWith(
        mockJsonContent.tensions
      );
      expect(db.transit_links.bulkPut).toHaveBeenCalledWith(
        mockJsonContent.transit_links
      );
      expect(db.cables.bulkPut).toHaveBeenCalledWith(mockJsonContent.cables);
    });
  });

  describe('fillDatabaseWithSectionsMockData', () => {
    it('should load mock data when attachments table is empty', async () => {
      (db.attachments.count as jest.Mock).mockResolvedValue(0);
      await db.fillDatabaseWithSectionsMockData();
      expect(db.attachments.bulkPut).toHaveBeenCalled();
    });

    it('should not load mock data when attachments table is not empty', async () => {
      (db.attachments.count as jest.Mock).mockResolvedValue(1);
      await db.fillDatabaseWithSectionsMockData();
      expect(db.attachments.bulkPut).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (db.attachments.count as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      await db.fillDatabaseWithSectionsMockData();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error filling database with mock data',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('fillDatabaseWithStudiesMockData', () => {
    it('should load studies mock data', async () => {
      await db.fillDatabaseWithStudiesMockData();
      expect(createStudiesMockData).toHaveBeenCalled();
      expect(db.studies.bulkPut).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (db.studies.bulkPut as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      await db.fillDatabaseWithStudiesMockData();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error filling database with mock data',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
