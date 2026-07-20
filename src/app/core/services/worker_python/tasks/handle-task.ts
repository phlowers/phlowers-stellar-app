/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { loadPyodide } from 'pyodide';
import type { PyProxy } from 'pyodide/ffi';
import { PythonDiagnostic } from './python-diagnostic.interfaces';
import { PYTHON_ERROR_SEVERITY } from './python-error-severity';
import { PythonErrorCode, Task, TaskError, TaskInputs, TaskOutputs } from './types';

/** Type alias for the initialised Pyodide runtime API. */
export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;

const tasks: Record<
  Task,
  {
    function: string;
    externalPackages: string[];
  }
> = {
  [Task.initLit]: {
    function: 'initialize_study',
    externalPackages: []
  },
  [Task.changeState]: {
    function: 'change_state',
    externalPackages: []
  },
  [Task.getSupportCoordinates]: {
    function: 'get_support_coordinates',
    externalPackages: []
  },
  [Task.refreshProjection]: {
    function: 'refresh_projection',
    externalPackages: []
  },
  [Task.calculatePapoto]: {
    function: 'calculate_papoto',
    externalPackages: []
  },
  [Task.calculateGuying]: {
    function: 'calculate_guying',
    externalPackages: []
  },
  [Task.setLogLevel]: {
    function: 'set_log_level',
    externalPackages: []
  },
  [Task.temperatureCalculation]: {
    function: 'temperature_calculation',
    externalPackages: []
  },
  [Task.diffuseAndBeamRadiationsCalculation]: {
    function: 'compute_diffuse_and_beam_radiations',
    externalPackages: []
  },
  [Task.calculateParameter15CWithoutWind]: {
    function: 'parameter_15_without_wind',
    externalPackages: []
  },
  [Task.setResolution]: {
    function: 'set_resolution',
    externalPackages: []
  },
  [Task.getConfig]: {
    function: 'get_config',
    externalPackages: []
  },
  [Task.addBulkObstacles]: {
    function: 'add_bulk_obstacles',
    externalPackages: []
  },
  [Task.addSingleObstacle]: {
    function: 'add_single_obstacle',
    externalPackages: []
  },
  [Task.deleteObstacle]: {
    function: 'delete_obstacle',
    externalPackages: []
  },
  [Task.clearObstacles]: {
    function: 'clear_obstacles',
    externalPackages: []
  },
  [Task.shortenLengthenCable]: {
    function: 'shorten_lengthen_cable',
    externalPackages: []
  },
  [Task.getAspectRatio]: {
    function: 'get_aspect_ratio',
    externalPackages: []
  },
  [Task.getWindIncidence]: {
    function: 'get_wind_incidence',
    externalPackages: []
  },
  [Task.computeLocalization]: {
    function: 'compute_localization',
    externalPackages: []
  },
  [Task.importLambert]: {
    function: 'import_lambert',
    externalPackages: []
  },
  [Task.importLambertAndValidate]: {
    function: 'import_lambert_and_validate',
    externalPackages: []
  },
  [Task.getEquivalentSpan]: {
    function: 'get_equivalent_span',
    externalPackages: []
  },
  [Task.getPoseTable]: {
    function: 'get_pose_table',
    externalPackages: []
  },
  [Task.deleteAllLoads]: {
    function: 'delete_all_loads',
    externalPackages: []
  },
  [Task.deleteLoad]: {
    function: 'delete_load',
    externalPackages: []
  },
  [Task.setLoads]: {
    function: 'set_loads',
    externalPackages: []
  },
  [Task.measureDistance]: {
    function: 'measure_distance',
    externalPackages: []
  },
  [Task.addMeasureDistanceAnglePoints]: {
    function: 'add_measure_distance_angle_points',
    externalPackages: []
  },
  [Task.clearMeasureDistanceAnglePoints]: {
    function: 'clear_measure_distance_angle_points',
    externalPackages: []
  },
  [Task.getConformity]: {
    function: 'get_conformity',
    externalPackages: []
  }
};

/**
 * Retrieves Python warnings captured since the last call (via `warnings.warn()`,
 * e.g. inside mechaphlowers) and maps each one to a known `PythonErrorCode`.
 * Warnings that don't match any known code are logged but dropped — no toast is shown for them.
 */
function collectWarningDiagnostics(
  pyodide: PyodideAPI,
  task: Task,
  log?: (level: 'debug' | 'error', message: string, details?: unknown) => void
): PythonDiagnostic[] {
  if (!pyodide.globals.has('get_and_clear_warnings')) {
    log?.(
      'error',
      `Task ${task}: get_and_clear_warnings is not defined in Python globals, skipping warning collection`
    );
    return [];
  }

  const getAndClearWarnings = pyodide.globals.get('get_and_clear_warnings') as (() => PyProxy) & PyProxy;
  let capturedWarnings: string[];
  try {
    const warningsProxy = getAndClearWarnings();
    capturedWarnings = warningsProxy.toJs() as string[];
    warningsProxy.destroy();
  } finally {
    getAndClearWarnings.destroy();
  }

  const diagnostics: PythonDiagnostic[] = [];
  const seenCodes = new Set<PythonErrorCode>();
  for (const warningText of capturedWarnings) {
    const matchedCode = Object.values(PythonErrorCode).find((code) => warningText.includes(code)) ?? null;
    const isDuplicate = matchedCode !== null && seenCodes.has(matchedCode);

    if (matchedCode && !isDuplicate) {
      diagnostics.push({
        code: matchedCode,
        severity: PYTHON_ERROR_SEVERITY[matchedCode],
        origin: 'warning',
        rawText: warningText
      });
      seenCodes.add(matchedCode);
    }
    log?.(
      'debug',
      `Task ${task}: captured Python warning "${warningText}" -> pythonWarningCode=${matchedCode ?? 'null (no PythonErrorCode matched, no toast)'}${isDuplicate ? ' (duplicate, skipped)' : ''}`
    );
  }
  return diagnostics;
}

/**
 * Executes a Python task inside the Pyodide runtime.
 *
 * Loads any required external packages, passes `inputs` to the corresponding
 * Python function, and converts the result back to a JavaScript object.
 *
 * @param pyodide - The initialised Pyodide API.
 * @param task - The task identifier to execute.
 * @param inputs - Input data forwarded to the Python function.
 * @returns An object containing the `result`, `runTime` in ms, and any `error`.
 */
export async function handleTask(
  pyodide: PyodideAPI,
  task: Task,
  inputs: TaskInputs[Task],
  log?: (level: 'debug' | 'error', message: string, details?: unknown) => void
): Promise<{
  result: TaskOutputs[Task] | null;
  runTime: number;
  error: TaskError | null;
  diagnostics: PythonDiagnostic[];
}> {
  const start = performance.now();
  try {
    // Check if task exists in tasks object
    if (!tasks[task]) {
      throw new Error(`Unknown task: ${task}`);
    }

    const { externalPackages } = tasks[task];
    if (externalPackages.length > 0) {
      await pyodide.loadPackage(externalPackages);
    }
    pyodide.globals.set('js_inputs', inputs);

    log?.('debug', `Executing task: ${task}, triggering Python function: ${tasks[task].function}`);
    const functionToRun = pyodide.globals.get(tasks[task].function) as (inputs?: TaskInputs[Task]) => PyProxy;
    const result = inputs ? functionToRun(inputs) : functionToRun();
    log?.('debug', `Task ${task} executed successfully, converting result to JS object`);
    const resultJs = result.toJs({ dict_converter: Object.fromEntries });
    result.destroy();
    const diagnostics = collectWarningDiagnostics(pyodide, task, log);
    log?.('debug', `Task ${task} succeeded, no error raised`);
    return {
      result: resultJs as TaskOutputs[Task],
      runTime: performance.now() - start,
      error: null,
      diagnostics
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log?.('error', `Task ${task} execution failed, raw error message: "${errorMessage}"`);
    let errorType = TaskError.CALCULATION_ERROR;
    if (errorMessage.toLowerCase().includes('did not converge')) {
      errorType = TaskError.SOLVER_DID_NOT_CONVERGE;
    }
    const pythonErrorCode = Object.values(PythonErrorCode).find((code) => errorMessage.includes(code)) ?? null;
    const diagnostics = collectWarningDiagnostics(pyodide, task, log);
    if (pythonErrorCode) {
      diagnostics.unshift({
        code: pythonErrorCode,
        severity: PYTHON_ERROR_SEVERITY[pythonErrorCode],
        origin: 'exception',
        rawText: errorMessage
      });
    }
    log?.(
      'debug',
      `Task ${task}: derived errorType=${errorType}, pythonErrorCode=${pythonErrorCode ?? 'null (no PythonErrorCode matched in error message)'}`
    );
    return {
      result: null,
      runTime: performance.now() - start,
      error: errorType,
      diagnostics
    };
  }
}
