/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { loadPyodide } from 'pyodide';
import type { PyProxy } from 'pyodide/ffi';
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
  [Task.runTests]: {
    function: 'run_tests',
    externalPackages: ['pytest']
  },
  [Task.getLit]: {
    function: 'init_section',
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
  [Task.addObstacle]: {
    function: 'add_obstacles',
    externalPackages: []
  },
  [Task.calculateObstaclesDistances]: {
    function: 'calculate_obstacles_distances',
    externalPackages: []
  },
  [Task.cableModification]: {
    function: 'cable_modification',
    externalPackages: []
  },
  [Task.getAspectRatio]: {
    function: 'get_aspect_ratio',
    externalPackages: []
  }
};

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
  inputs: TaskInputs[Task]
): Promise<{
  result: TaskOutputs[Task] | null;
  runTime: number;
  error: TaskError | null;
  pythonErrorCode: PythonErrorCode | null;
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

    const functionToRun = pyodide.globals.get(tasks[task].function) as (inputs?: TaskInputs[Task]) => PyProxy;
    const result = inputs ? functionToRun(inputs) : functionToRun();
    const resultJs = result.toJs({ dict_converter: Object.fromEntries });
    result.destroy();
    return {
      result: resultJs as TaskOutputs[Task],
      runTime: performance.now() - start,
      error: null,
      pythonErrorCode: null
    };
  } catch (error: unknown) {
    console.error(error);
    let errorType = TaskError.CALCULATION_ERROR;
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('did not converge')) {
      errorType = TaskError.SOLVER_DID_NOT_CONVERGE;
    }
    const pythonErrorCode = Object.values(PythonErrorCode).find((code) => errorMessage.includes(code)) ?? null;
    return {
      result: null,
      runTime: performance.now() - start,
      error: errorType,
      pythonErrorCode
    };
  }
}
