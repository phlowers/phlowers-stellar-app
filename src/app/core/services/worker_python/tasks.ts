/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { loadPyodide } from 'pyodide';
import pythonScript2 from './python-functions/example2.py';
import pythonScript3 from './python-functions/example3.py';
import stateChangeScript from './python-functions/state-change.py';
import testScript from './python-functions/test.py';

export enum Task {
  runTests = 'runTests',
  runCode = 'runCode',
  runPython = 'runPython',
  runPython2 = 'runPython2',
  runStateChange = 'runStateChange'
}

export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;

async function runTests(pyodide: PyodideAPI) {
  await pyodide.loadPackage(['pytest']);
  await pyodide.runPythonAsync(testScript);
  const results = pyodide.globals
    .get('results')
    .toJs({ dict_converter: Object.fromEntries });
  console.log('tests ran', results);
  return results;
}

async function runcode(pyodide: PyodideAPI) {
  const start = performance.now();
  await pyodide.runPythonAsync(pythonScript2);
  return { runTime: performance.now() - start };
}

async function runPython(pyodide: PyodideAPI, script: string, data: any) {
  const start = performance.now();
  pyodide.globals.set('js_inputs', data);
  await pyodide.runPythonAsync(script);
  return { runTime: performance.now() - start };
}

export async function handleTask(pyodide: PyodideAPI, task: Task, data: any) {
  switch (task) {
    case Task.runTests:
      return await runTests(pyodide);
    case Task.runCode:
      return await runcode(pyodide);
    case Task.runPython: {
      await runPython(pyodide, pythonScript2, data);
      const result = pyodide.globals.get('result');
      console.log('pyodide.globals result', result);
      return { result: result };
    }
    case Task.runPython2: {
      await runPython(pyodide, pythonScript3, data);
      const result = pyodide.globals.get('result');
      console.log('pyodide.globals result', result);
      const resultJs = result.toJs({ dict_converter: Object.fromEntries });
      console.log('resultJs', resultJs);
      return { result: resultJs };
    }
    case Task.runStateChange: {
      pyodide.globals.set('inputs', data);
      await runPython(pyodide, stateChangeScript, data);
      const result = pyodide.globals.get('result');
      console.log('pyodide.globals result', result);
      const resultJs = result.toJs({ dict_converter: Object.fromEntries });
      console.log('resultJs', resultJs);
      return { result: resultJs };
    }
    default:
      console.error('Unknown task:', task);
  }
}
