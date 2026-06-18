/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/// <reference lib="webworker" />

import { loadPyodide } from 'pyodide';
import functions from './tasks/python-scripts/functions.py';
import api from './tasks/python-scripts/api.py';
import change_state from './tasks/python-scripts/change_state.py';
import cable_modification from './tasks/python-scripts/cable_modification.py';
import pythonPackages from './python-packages.json';
import { handleTask } from './tasks/handle-task';
import { Task, TaskError, TaskInputs } from './tasks/types';

const pythonFiles = [functions, api, cable_modification];

const getFirstLinePreview = (content: string): string => {
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return firstLine.length > 0 ? firstLine : '<empty>';
};

/** Type alias for the initialised Pyodide runtime API. */
export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;
let pyodide: PyodideAPI;

/**
 * Loads the Pyodide runtime and all required Python packages,
 * then executes the bundled Python source files.
 * Posts `loadTime` and `importTime` messages back to the main thread.
 */
console.debug('Loading pyodide...');
try {
  const allPythonPackages = Object.values(pythonPackages).map((pkg) => self.name + 'pyodide/' + pkg.file_name);
  const start = performance.now();
  pyodide = await loadPyodide({
    indexURL: self.name + 'pyodide/',
    packages: allPythonPackages
  });
  console.debug('===> Pyodide loaded');
  const loadEnd = performance.now();
  postMessage({ loadTime: loadEnd - start });
  for (const file of pythonFiles) {
    const start = performance.now();
    const preview = getFirstLinePreview(file);
    console.debug(`===> Running Python file: ${preview}`);
    await pyodide.runPython(file);
    console.debug(`===> Finished running Python file: ${preview}`);
    const end = performance.now();
    console.debug(`===> Time to run ${preview}: ${end - start} ms`);
  }
  const importEnd = performance.now();
  postMessage({ importTime: importEnd - loadEnd });
} catch (error) {
  postMessage({
    error: TaskError.PYODIDE_LOAD_ERROR,
    log: {
      level: 'error',
      message: 'Error loading pyodide',
      details: error instanceof Error ? error.message : String(error)
    }
  });
}

addEventListener('message', ({ data }: { data: { task: Task; inputs: TaskInputs[Task]; id: string } }) => {
  if (pyodide) {
    handleTask(pyodide, data.task, data.inputs).then((result) => {
      postMessage({
        ...result,
        id: data.id
      });
    });
  } else {
    postMessage({
      id: data.id,
      result: null,
      error: TaskError.PYODIDE_LOAD_ERROR,
      pythonErrorCode: null,
      log: {
        level: 'error',
        message: `pyodide is not loaded, cannot handle task ${String(data.task)}`
      }
    });
  }
});
