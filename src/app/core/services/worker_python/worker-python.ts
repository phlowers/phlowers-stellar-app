/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/// <reference lib="webworker" />

import { loadPyodide } from 'pyodide';
import change_state from './tasks/python-scripts/change_state.py';
import functions from './tasks/python-scripts/functions.py';
import guying from './tasks/python-scripts/guying.py';
import temperature from './tasks/python-scripts/temperature.py';
import parameter_15_without_wind from './tasks/python-scripts/parameter_15_without_wind.py';
import pythonPackages from './python-packages.json';
import { handleTask } from './tasks/handle-task';
import { Task, TaskError, TaskInputs } from './tasks/types';

const pythonFiles = [functions, change_state, guying, temperature, parameter_15_without_wind];

/** Type alias for the resolved Pyodide API instance returned by loadPyodide */
export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;
let pyodide: PyodideAPI;

async function loadPyodideAndPackages() {
  try {
    const allPythonPackages = Object.values(pythonPackages).map((pkg) => self.name + 'pyodide/' + pkg.file_name);
    const start = performance.now();
    pyodide = await loadPyodide({
      indexURL: self.name + 'pyodide/',
      packages: allPythonPackages
    });
    const loadEnd = performance.now();
    postMessage({ loadTime: loadEnd - start });
    for (const file of pythonFiles) {
      await pyodide.runPython(file);
    }
    const importEnd = performance.now();
    postMessage({ importTime: importEnd - loadEnd });
  } catch (error) {
    console.error('Error loading pyodide', error);
    postMessage({ error: TaskError.PYODIDE_LOAD_ERROR });
  }
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
    console.error('pyodide is not loaded, cannot handle task ' + data.task);
  }
});

loadPyodideAndPackages();
