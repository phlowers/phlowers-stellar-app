/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { handleTask, PyodideAPI } from './handle-task';
import testsScript from './python-scripts/tests.py';
import getLitScript from './python-scripts/get_lit.py';
import { Task } from './types';

// Mock the pyodide module
jest.mock('pyodide', () => ({
  loadPyodide: jest.fn()
}));

// Mock the python scripts
jest.mock('./python-scripts/tests.py', () => 'mock tests script');
jest.mock('./python-scripts/get_lit.py', () => 'mock get_lit script');

describe('Task handlers', () => {
  let mockPyodide: jest.Mocked<PyodideAPI>;

  beforeEach(() => {
    // Create a mock Pyodide instance
    mockPyodide = {
      loadPackage: jest.fn().mockResolvedValue(undefined),
      runPythonAsync: jest.fn().mockResolvedValue(undefined),
      globals: {
        get: jest.fn(),
        set: jest.fn()
      }
    } as unknown as jest.Mocked<PyodideAPI>;

    // Reset mocks between tests
    jest.clearAllMocks();
  });

  describe('handleTask', () => {
    it('should handle runTests task', async () => {
      // Setup
      const mockResult = { passed: 5, failed: 0 };
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time

      const mockToJs = jest.fn().mockReturnValue(mockResult);
      mockPyodide.globals.get.mockReturnValue({
        toJs: mockToJs
      });

      // Execute
      const result = await handleTask(mockPyodide, Task.runTests, undefined);

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith(
        'js_inputs',
        undefined
      );
      expect(mockPyodide.loadPackage).toHaveBeenCalledWith(['pytest']);
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(testsScript);
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('result');
      expect(mockToJs).toHaveBeenCalledWith({
        dict_converter: Object.fromEntries
      });
      expect(result).toEqual({ result: mockResult, runTime: 500, error: null });
    });

    it('should handle getLit task', async () => {
      // Setup
      const mockResult = {
        x: { key1: 1, key2: 2 },
        y: { key1: 10, key2: 20 },
        z: { key1: 100, key2: 200 },
        support: { key1: 'support1', key2: 'support2' },
        type: { key1: 'type1', key2: 'type2' },
        section: { key1: 'section1', key2: 'section2' },
        color_select: { key1: 'color1', key2: 'color2' }
      };
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200); // End time

      const mockToJs = jest.fn().mockReturnValue(mockResult);
      mockPyodide.globals.get.mockReturnValue({
        toJs: mockToJs
      });

      // Execute
      const result = await handleTask(mockPyodide, Task.getLit, undefined);

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith(
        'js_inputs',
        undefined
      );
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(getLitScript);
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('result');
      expect(mockToJs).toHaveBeenCalledWith({
        dict_converter: Object.fromEntries
      });
      expect(result).toEqual({ result: mockResult, runTime: 200, error: null });
    });

    it('should handle unknown task', async () => {
      // Setup
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const unknownTask = 'unknownTask' as Task;

      // Execute
      const result = await handleTask(mockPyodide, unknownTask, undefined);

      // Verify
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(result).toEqual({
        result: null,
        runTime: expect.any(Number),
        error: 'UNKNOWN_ERROR'
      });
    });
  });
});
