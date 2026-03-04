/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { loadPyodide } from 'pyodide';
import { handleTask } from './tasks/handle-task';
import pythonPackages from './python-packages.json';

// Mock dependencies
jest.mock('pyodide', () => ({
  loadPyodide: jest.fn()
}));

jest.mock('./tasks/handle-task', () => ({
  handleTask: jest.fn()
}));

// Mock the Worker environment
const mockPostMessage = jest.fn();
const mockAddEventListener = jest.fn();
const mockPerformance = {
  now: jest.fn()
};

// Setup global objects to simulate web worker environment
Object.defineProperty(global, 'name', {
  value: 'test/',
  writable: true
});

Object.defineProperty(global, 'postMessage', {
  value: mockPostMessage,
  writable: true
});

Object.defineProperty(global, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('Worker', () => {
  let mockPyodide: { runPython: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Setup performance.now mock to return incremental values
    let timeCounter = 0;
    mockPerformance.now.mockImplementation(() => {
      timeCounter += 100;
      return timeCounter;
    });

    // Setup mock Pyodide instance
    mockPyodide = {
      runPython: jest.fn().mockResolvedValue(undefined)
    };

    (loadPyodide as jest.Mock).mockResolvedValue(mockPyodide);
    (handleTask as jest.Mock).mockResolvedValue({ result: 'success' });
  });

  describe('loadPyodideAndPackages', () => {
    it('should load Pyodide with correct configuration', async () => {
      // Import the worker to trigger the initialization
      await import('./worker-python');

      // Verify loadPyodide was called with correct parameters
      const allPythonPackages = Object.values(pythonPackages).map((pkg) => 'test/pyodide/' + pkg.file_name);
      expect(loadPyodide).toHaveBeenCalledWith({
        indexURL: 'test/pyodide/',
        packages: expect.arrayContaining(allPythonPackages)
      });

      // Verify all packages are included
      const allPackages = Object.values(pythonPackages).map((pkg) => 'test/pyodide/' + pkg.file_name);

      const callArgs = (loadPyodide as jest.Mock).mock.calls[0][0];
      expect(callArgs.packages).toEqual(expect.arrayContaining(allPackages));
    });
  });
});
