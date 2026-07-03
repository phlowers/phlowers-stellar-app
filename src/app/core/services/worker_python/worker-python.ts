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
import cable_modification from './tasks/python-scripts/cable_modification.py';
import pythonPackages from './python-packages.json';
import { handleTask } from './tasks/handle-task';
import { Task, TaskError, TaskInputs } from './tasks/types';

const pythonFiles = [
  { name: 'functions', content: functions },
  { name: 'api', content: api },
  { name: 'cable_modification', content: cable_modification }
];

/** Type alias for the initialised Pyodide runtime API. */
export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;
let pyodide: PyodideAPI;

/**
 * Loads the Pyodide runtime and all required Python packages,
 * then executes the bundled Python source files.
 * Posts `loadTime` and `importTime` messages back to the main thread.
 */
const log = (level: 'debug' | 'error', message: string, details?: unknown): void => {
  postMessage({ log: { level, message, details } });
};

log('debug', 'Loading pyodide...');
try {
  const allPythonPackages = Object.values(pythonPackages).map((pkg) => self.name + 'pyodide/' + pkg.file_name);
  const start = performance.now();
  pyodide = await loadPyodide({
    indexURL: self.name + 'pyodide/',
    packages: allPythonPackages
  });
  const loadEnd = performance.now();
  const loadTime = loadEnd - start;
  postMessage({ loadTime });
  log('debug', 'Pyodide loaded', loadTime);
  for (const file of pythonFiles) {
    log('debug', `Running Python file: ${file.name}`);
    await pyodide.runPython(file.content);
    log('debug', `Finished running Python file: ${file.name}`);
  }
  const importEnd = performance.now();
  const importTime = importEnd - loadEnd;
  log('debug', 'Python packages imported', importTime);
  postMessage({ importTime });
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
    handleTask(pyodide, data.task, data.inputs, log).then((result) => {
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
      diagnostics: [],
      log: {
        level: 'error',
        message: `pyodide is not loaded, cannot handle task ${String(data.task)}`
      }
    });
  }
});
