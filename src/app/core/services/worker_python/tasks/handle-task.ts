/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { loadPyodide } from 'pyodide';
import getLit from './python-scripts/get_lit.py';
import testsScript from './python-scripts/tests.py';
import { Task, TaskInputs, TaskOutputs } from './types';

export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;

const tasks: Record<Task, { script: string; externalPackages: string[] }> = {
  [Task.runTests]: {
    script: testsScript,
    externalPackages: ['pytest']
  },
  [Task.getLit]: {
    script: getLit,
    externalPackages: []
  }
};

export async function handleTask<taskId extends Task>(
  pyodide: PyodideAPI,
  task: Task,
  inputs: TaskInputs[taskId]
): Promise<{ result: TaskOutputs[taskId]; runTime: number }> {
  const start = performance.now();
  pyodide.globals.set('js_inputs', inputs);
  const { script, externalPackages } = tasks[task];
  if (externalPackages.length > 0) {
    await pyodide.loadPackage(externalPackages);
  }
  await pyodide.runPythonAsync(script);
  const result = pyodide.globals.get('result');
  const resultJs = result.toJs({ dict_converter: Object.fromEntries });
  return { result: resultJs, runTime: performance.now() - start };
}
