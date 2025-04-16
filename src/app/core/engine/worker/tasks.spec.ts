/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { handleTask, Task, PyodideAPI } from './tasks';
import pythonScript from '../python-functions/example.py';
import testScript from '../python-functions/test.py';

// Mock the pyodide module
jest.mock('pyodide', () => ({
  loadPyodide: jest.fn()
}));

// Mock the python scripts
jest.mock('../python-functions/example.py', () => 'mock python script');
jest.mock('../python-functions/test.py', () => 'mock test script');

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
      const mockResults = { passed: 5, failed: 0 };
      mockPyodide.globals.get.mockReturnValue({
        toJs: jest.fn().mockReturnValue(mockResults)
      });

      // Execute
      const result = await handleTask(mockPyodide, Task.runTests, null);

      // Verify
      expect(mockPyodide.loadPackage).toHaveBeenCalledWith(['pytest']);
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(testScript);
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('results');
      expect(result).toEqual(mockResults);
    });

    it('should handle runCode task', async () => {
      // Setup
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time

      // Execute
      const result = await handleTask(mockPyodide, Task.runCode, null);

      // Verify
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(pythonScript);
      expect(result).toEqual({ runTime: 500 });
    });

    it('should handle runPython task', async () => {
      // Setup
      const mockData = { input: 'test data' };
      const mockResult = { output: 'test result' };
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200); // End time
      mockPyodide.globals.get.mockReturnValue(mockResult);

      // Execute
      const result = await handleTask(mockPyodide, Task.runPython, mockData);

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith('data1', mockData);
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(pythonScript);
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('result');
      expect(result).toEqual({ result: mockResult });
    });

    it('should handle unknown task', async () => {
      // Setup
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const unknownTask = 'unknownTask' as Task;

      // Execute
      const result = await handleTask(mockPyodide, unknownTask, null);

      // Verify
      expect(consoleSpy).toHaveBeenCalledWith('Unknown task:', unknownTask);
      expect(result).toBeUndefined();
    });
  });
});
