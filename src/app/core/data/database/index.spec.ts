/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AppDB } from './index';

// Mock Dexie
jest.mock('dexie', () => {
  return {
    __esModule: true,
    default: class MockDexie {
      version = jest.fn().mockReturnThis();
      stores = jest.fn().mockReturnThis();
      constructor(name: string) {
        this.name = name;
      }
      name: string;
    }
  };
});

describe('AppDB', () => {
  let db: AppDB;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    db = new AppDB();
  });

  it('should create a database with the correct name', () => {
    expect(db.name).toBe('stellar-db');
  });

  it('should initialize with version 1', () => {
    expect(db.version).toHaveBeenCalledWith(1);
  });

  it('should have users and studies tables defined as class properties', () => {
    // This test verifies that the TypeScript definitions are correct
    // We can't directly test the properties since they're initialized by Dexie
    // But we can check that they exist on the prototype
    expect(Object.getOwnPropertyDescriptor(db, 'users')).toBeDefined();
    expect(Object.getOwnPropertyDescriptor(db, 'studies')).toBeDefined();
  });
});
