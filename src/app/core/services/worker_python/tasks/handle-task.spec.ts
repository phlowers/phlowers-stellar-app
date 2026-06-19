/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { handleTask, PyodideAPI } from './handle-task';
// import functions from './python-scripts/functions.py';
import { Task } from './types';

// Mock the pyodide module
vi.mock('pyodide', () => ({
  loadPyodide: vi.fn()
}));

// Mock the python script bundle
vi.mock('./python-scripts/functions.py', () => 'mock functions script');

describe('Task handlers', () => {
  let mockPyodide: vi.Mocked<PyodideAPI>;

  beforeEach(() => {
    // Create a mock Pyodide instance
    mockPyodide = {
      loadPackage: vi.fn().mockResolvedValue(undefined),
      runPythonAsync: vi.fn().mockResolvedValue(undefined),
      globals: {
        get: vi.fn(),
        set: vi.fn()
      }
    } as unknown as vi.Mocked<PyodideAPI>;

    // Reset mocks between tests
    vi.clearAllMocks();
  });

  describe('handleTask', () => {
    it('should handle initLit task', async () => {
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
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200); // End time

      const mockToJs = vi.fn().mockReturnValue(mockResult);
      (mockPyodide.globals.get as vi.Mock)
        .mockReturnValueOnce(() => ({ toJs: mockToJs, destroy: vi.fn() }))
        .mockReturnValueOnce(undefined as never);

      // Execute
      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith('js_inputs', undefined);
      // script is loaded at worker boot time; here we only call the exposed function
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('load_initialize_study');
      expect(mockToJs).toHaveBeenCalledWith({
        dict_converter: Object.fromEntries
      });
      expect(result).toEqual({ result: mockResult, runTime: 200, error: null, pythonErrorCode: null });
    });

    it('should handle unknown task', async () => {
      // Setup
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      const unknownTask = 'unknownTask' as Task;

      // Execute
      const result = await handleTask(mockPyodide, unknownTask, undefined);

      // Verify
      expect(result).toEqual({
        result: null,
        runTime: expect.any(Number),
        error: 'CALCULATION_ERROR',
        pythonErrorCode: null
      });
    });

    it('should extract pythonErrorCode when the exception message contains a PythonErrorCode value', async () => {
      // The mock task function raises an error whose message includes 'SolverError'
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error('mechaphlowers.SolverError: mechanical equilibrium failed');
      });

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.result).toBeNull();
      expect(result.error).toBe('CALCULATION_ERROR');
      expect(result.pythonErrorCode).toBe('SolverError');
    });

    it('should extract pythonErrorCode ConvergenceError from exception message', async () => {
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error('ConvergenceError: optimizer reached maximum iterations');
      });

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.pythonErrorCode).toBe('ConvergenceError');
    });

    it('should set pythonErrorCode to null when exception message contains no known PythonErrorCode', async () => {
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error('ValueError: unexpected input shape');
      });

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.pythonErrorCode).toBeNull();
    });
  });
});
