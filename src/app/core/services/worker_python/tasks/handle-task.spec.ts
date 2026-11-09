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
        has: vi.fn(() => true),
        get: vi.fn((name: string) =>
          name === 'get_and_clear_warnings'
            ? Object.assign(() => ({ toJs: () => [], destroy: vi.fn() }), { destroy: vi.fn() })
            : undefined
        ),
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
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => ({ toJs: mockToJs, destroy: vi.fn() }));
      (mockPyodide.globals.has as vi.Mock).mockReturnValue(true);

      // Execute
      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      // Verify
      expect(mockPyodide.globals.set).toHaveBeenCalledWith('js_inputs', undefined);
      // script is loaded at worker boot time; here we only call the exposed function
      expect(mockPyodide.globals.get).toHaveBeenCalledWith('initialize_study');
      expect(mockToJs).toHaveBeenCalledWith({
        dict_converter: Object.fromEntries
      });
      expect(result).toEqual({
        result: mockResult,
        runTime: 200,
        error: null,
        diagnostics: []
      });
    });

    it('should call calculate_cable_adjustment for the calculateCableAdjustment task', async () => {
      const mockResult = { horizontalSightAngle: 100, verticalSightAngle: 100 };
      const mockToJs = vi.fn().mockReturnValue(mockResult);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => ({ toJs: mockToJs, destroy: vi.fn() }));

      const result = await handleTask(mockPyodide, Task.calculateCableAdjustment, undefined);

      expect(mockPyodide.globals.get).toHaveBeenCalledWith('calculate_cable_adjustment');
      expect(result.result).toEqual(mockResult);
      expect(result.error).toBeNull();
    });

    it.each([
      [Task.estimateRope, 'estimate_rope'],
      [Task.estimateTemperature, 'estimate_temperature'],
      [Task.estimateLoad, 'estimate_load'],
      [Task.estimateWind, 'estimate_wind']
    ])('should call the matching Python function for the %s task', async (task, pythonFunction) => {
      const mockResult = { value: 60, residual: 0.01, iterations: 7, converged: true };
      const mockToJs = vi.fn().mockReturnValue(mockResult);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => ({ toJs: mockToJs, destroy: vi.fn() }));
      const inputs = { spanIndex: 0, obstaclePoint: [250, 10, 20], targetDistance: 30 };

      const result = await handleTask(mockPyodide, task, inputs as never);

      expect(mockPyodide.globals.set).toHaveBeenCalledWith('js_inputs', inputs);
      expect(mockPyodide.globals.get).toHaveBeenCalledWith(pythonFunction);
      expect(result.result).toEqual(mockResult);
      expect(result.error).toBeNull();
    });

    it.each([
      [Task.estimateEffort, 'estimate_effort', { value: -12.5, residual: 0.001, iterations: 6, converged: true }],
      [Task.getLoadPoints, 'get_load_points', { points: [[250, 10, 60]] }]
    ])('should call the matching Python function for the %s task', async (task, pythonFunction, mockResult) => {
      const mockToJs = vi.fn().mockReturnValue(mockResult);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => ({ toJs: mockToJs, destroy: vi.fn() }));
      const inputs = { spanIndex: 0, loadPositionDistance: 250, temperature: 15 };

      const result = await handleTask(mockPyodide, task, inputs as never);

      expect(mockPyodide.globals.set).toHaveBeenCalledWith('js_inputs', inputs);
      expect(mockPyodide.globals.get).toHaveBeenCalledWith(pythonFunction);
      expect(result.result).toEqual(mockResult);
      expect(result.error).toBeNull();
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
        diagnostics: []
      });
    });

    it('should extract a matching diagnostic when the exception message contains a PythonErrorCode value', async () => {
      // The mock task function raises an error whose message includes 'SolverError'
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error('mechaphlowers.SolverError: mechanical equilibrium failed');
      });

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.result).toBeNull();
      expect(result.error).toBe('CALCULATION_ERROR');
      expect(result.diagnostics).toEqual([
        {
          code: 'SolverError',
          severity: 'error',
          origin: 'exception',
          rawText: 'mechaphlowers.SolverError: mechanical equilibrium failed'
        }
      ]);
    });

    it('should extract ConvergenceError diagnostic from exception message', async () => {
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error('ConvergenceError: optimizer reached maximum iterations');
      });

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.diagnostics).toEqual([
        {
          code: 'ConvergenceError',
          severity: 'error',
          origin: 'exception',
          rawText: 'ConvergenceError: optimizer reached maximum iterations'
        }
      ]);
    });

    it.each([
      [
        'stellar_engine.entities.errors.EstimationNotConvergedError: Temperature estimation did not converge',
        'EstimationNotConvergedError',
        'SOLVER_DID_NOT_CONVERGE'
      ],
      [
        'stellar_engine.entities.errors.EstimationInputError: Missing estimation input: targetDistance',
        'EstimationInputError',
        'CALCULATION_ERROR'
      ],
      [
        'mechaphlowers.entities.errors.EstimateOnSplitSupportError: Span 0 is split by a virtual support',
        'EstimateOnSplitSupportError',
        'CALCULATION_ERROR'
      ]
    ])('should extract the estimation error code from "%s"', async (rawText, code, taskError) => {
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error(rawText);
      });

      const result = await handleTask(mockPyodide, Task.estimateTemperature, undefined);

      expect(result.error).toBe(taskError);
      expect(result.diagnostics).toEqual([{ code, severity: 'error', origin: 'exception', rawText }]);
    });

    it('should return an EstimationWarning diagnostic when an existing load is ignored', async () => {
      const warningText = 'EstimationWarning: Existing load on estimation span target: load is ignored';
      const mockToJs = vi.fn().mockReturnValue({ value: 50, residual: 0, iterations: 5, converged: true });
      (mockPyodide.globals.get as vi.Mock).mockImplementation((name: unknown) =>
        name === 'get_and_clear_warnings'
          ? Object.assign(() => ({ toJs: () => [warningText], destroy: vi.fn() }), { destroy: vi.fn() })
          : () => ({ toJs: mockToJs, destroy: vi.fn() })
      );

      const result = await handleTask(mockPyodide, Task.estimateLoad, undefined);

      expect(result.diagnostics).toEqual([
        { code: 'EstimationWarning', severity: 'warning', origin: 'warning', rawText: warningText }
      ]);
    });

    it('should return an empty diagnostics array when exception message contains no known PythonErrorCode', async () => {
      vi.spyOn(console, 'error').mockReturnValue(undefined);
      (mockPyodide.globals.get as vi.Mock).mockReturnValueOnce(() => {
        throw new Error('ValueError: unexpected input shape');
      });

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.diagnostics).toEqual([]);
    });

    it('should return a matched warning diagnostic from captured Python warnings', async () => {
      const mockToJs = vi.fn().mockReturnValue({ success: true });
      (mockPyodide.globals.get as vi.Mock).mockImplementation((name: unknown) =>
        name === 'get_and_clear_warnings'
          ? Object.assign(
              () => ({
                toJs: () => ['NoIntersectionPlaneWarning: no intersection found for this point'],
                destroy: vi.fn()
              }),
              { destroy: vi.fn() }
            )
          : () => ({ toJs: mockToJs, destroy: vi.fn() })
      );

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.diagnostics).toEqual([
        {
          code: 'NoIntersectionPlaneWarning',
          severity: 'warning',
          origin: 'warning',
          rawText: 'NoIntersectionPlaneWarning: no intersection found for this point'
        }
      ]);
    });

    it('should drop captured warnings that match no known PythonErrorCode', async () => {
      const mockToJs = vi.fn().mockReturnValue({ success: true });
      (mockPyodide.globals.get as vi.Mock).mockImplementation((name: unknown) =>
        name === 'get_and_clear_warnings'
          ? Object.assign(
              () => ({
                toJs: () => ['DeprecationWarning: section_pts was renamed coords_calculator'],
                destroy: vi.fn()
              }),
              { destroy: vi.fn() }
            )
          : () => ({ toJs: mockToJs, destroy: vi.fn() })
      );

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.diagnostics).toEqual([]);
    });

    it('should keep every warning sharing a PythonErrorCode (de-duplication happens at toast level)', async () => {
      const mockToJs = vi.fn().mockReturnValue({ success: true });
      (mockPyodide.globals.get as vi.Mock).mockImplementation((name: unknown) =>
        name === 'get_and_clear_warnings'
          ? Object.assign(
              () => ({
                toJs: () => [
                  'NoIntersectionPlaneWarning: no intersection found for point 1',
                  'NoIntersectionPlaneWarning: no intersection found for point 2',
                  'DataWarning: some data issue'
                ],
                destroy: vi.fn()
              }),
              { destroy: vi.fn() }
            )
          : () => ({ toJs: mockToJs, destroy: vi.fn() })
      );

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.diagnostics).toEqual([
        {
          code: 'NoIntersectionPlaneWarning',
          severity: 'warning',
          origin: 'warning',
          rawText: 'NoIntersectionPlaneWarning: no intersection found for point 1'
        },
        {
          code: 'NoIntersectionPlaneWarning',
          severity: 'warning',
          origin: 'warning',
          rawText: 'NoIntersectionPlaneWarning: no intersection found for point 2'
        },
        {
          code: 'DataWarning',
          severity: 'warning',
          origin: 'warning',
          rawText: 'DataWarning: some data issue'
        }
      ]);
    });

    it('should destroy the get_and_clear_warnings function proxy after use', async () => {
      const mockToJs = vi.fn().mockReturnValue({ success: true });
      const warningsProxyDestroy = vi.fn();
      const functionProxyDestroy = vi.fn();
      (mockPyodide.globals.get as vi.Mock).mockImplementation((name: unknown) =>
        name === 'get_and_clear_warnings'
          ? Object.assign(() => ({ toJs: () => [], destroy: warningsProxyDestroy }), { destroy: functionProxyDestroy })
          : () => ({ toJs: mockToJs, destroy: vi.fn() })
      );

      await handleTask(mockPyodide, Task.initLit, undefined);

      expect(warningsProxyDestroy).toHaveBeenCalled();
      expect(functionProxyDestroy).toHaveBeenCalled();
    });

    it('should skip warning collection and return empty diagnostics when get_and_clear_warnings is not defined', async () => {
      const mockToJs = vi.fn().mockReturnValue({ success: true });
      (mockPyodide.globals.has as vi.Mock).mockReturnValue(false);
      (mockPyodide.globals.get as vi.Mock).mockImplementation((name: unknown) =>
        name === 'get_and_clear_warnings' ? undefined : () => ({ toJs: mockToJs, destroy: vi.fn() })
      );

      const result = await handleTask(mockPyodide, Task.initLit, undefined);

      expect(result.result).toEqual({ success: true });
      expect(result.error).toBeNull();
      expect(result.diagnostics).toEqual([]);
    });
  });
});
