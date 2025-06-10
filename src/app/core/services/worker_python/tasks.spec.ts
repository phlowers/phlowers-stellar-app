/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { handleTask, Task, PyodideAPI } from './tasks';
import testScript from './python-functions/test.py';

// Mock the pyodide module
jest.mock('pyodide', () => ({
  loadPyodide: jest.fn()
}));

// Mock the python scripts
jest.mock('./python-functions/example.py', () => 'mock python script');
jest.mock('./python-functions/example2.py', () => 'example2.py');
jest.mock('./python-functions/test.py', () => 'mock test script');
jest.mock('./python-functions/example3.py', () => 'mock example3 script');

// Add mock for state-change.py
jest.mock(
  './python-functions/state-change.py',
  () => 'mock state-change script'
);

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
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith('example2.py');
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
      expect(mockPyodide.globals.set).toHaveBeenCalledWith(
        'js_inputs',
        mockData
      );
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith('example2.py');
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('result');
      expect(result).toEqual({ result: mockResult });
    });

    it('should handle runPython2 task', async () => {
      // Setup
      const mockData = { input: 'test data' };
      const mockJsResult = { output: 'converted result' };
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200); // End time

      const mockToJs = jest.fn().mockReturnValue(mockJsResult);
      mockPyodide.globals.get.mockReturnValue({
        toJs: mockToJs
      });

      // Execute
      const result = await handleTask(mockPyodide, Task.runPython2, mockData);

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith(
        'js_inputs',
        mockData
      );
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(
        'mock example3 script'
      );
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('result');
      expect(mockToJs).toHaveBeenCalledWith({
        dict_converter: Object.fromEntries
      });
      expect(result).toEqual({ result: mockJsResult });
    });

    it('should handle runStateChange task', async () => {
      // Setup
      const mockData = { state: 'initial', action: 'transform' };
      const mockJsResult = { newState: 'transformed' };
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1300); // End time

      const mockToJs = jest.fn().mockReturnValue(mockJsResult);
      mockPyodide.globals.get.mockReturnValue({
        toJs: mockToJs
      });

      // Execute
      const result = await handleTask(
        mockPyodide,
        Task.runStateChange,
        mockData
      );

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith('inputs', mockData);
      expect(mockPyodide.globals.set).toHaveBeenCalledWith(
        'js_inputs',
        mockData
      );
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(
        'mock state-change script'
      );
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('result');
      expect(mockToJs).toHaveBeenCalledWith({
        dict_converter: Object.fromEntries
      });
      expect(result).toEqual({ result: mockJsResult });
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
