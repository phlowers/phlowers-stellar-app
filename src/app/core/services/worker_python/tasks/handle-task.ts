/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { loadPyodide } from 'pyodide';
import type { PyProxy } from 'pyodide/ffi';
import { Task, TaskError, TaskInputs, TaskOutputs } from './types';

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
  [Task.changeClimateLoad]: {
    function: 'change_climate_load',
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
  [Task.addLoad]: {
    function: 'add_load',
    externalPackages: []
  }
};

export async function handleTask<taskId extends Task>(
  pyodide: PyodideAPI,
  task: Task,
  inputs: TaskInputs[taskId]
): Promise<{
  result: TaskOutputs[taskId] | null;
  runTime: number;
  error: TaskError | null;
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

    const functionToRun = pyodide.globals.get(tasks[task].function) as (
      inputs?: TaskInputs[taskId]
    ) => PyProxy;
    const result = inputs ? functionToRun(inputs) : functionToRun();
    const resultJs = result.toJs({ dict_converter: Object.fromEntries });
    result.destroy();
    return {
      result: resultJs as TaskOutputs[taskId],
      runTime: performance.now() - start,
      error: null
    };
  } catch (error: any) {
    console.error(error);
    let errorType = TaskError.CALCULATION_ERROR;
    if (
      error?.message &&
      error?.message?.toLowerCase().includes('did not converge')
    ) {
      errorType = TaskError.SOLVER_DID_NOT_CONVERGE;
    }
    return {
      result: null,
      runTime: performance.now() - start,
      error: errorType
    };
  }
}
