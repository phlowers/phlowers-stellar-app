/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/// <reference lib="webworker" />

import { loadPyodide } from 'pyodide';
import importScript from './tasks/python-scripts/functions.py';
import pythonPackages from './python-packages.json';
import { handleTask } from './tasks/handle-task';
import { Task, TaskError, TaskInputs } from './tasks/types';

export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;
let pyodide: PyodideAPI;

async function loadPyodideAndPackages() {
  try {
    const localPythonPackages = [
      ...Object.values(pythonPackages)
        .map((pkg) =>
          pkg.source === 'local' ? self.name + 'pyodide/' + pkg.file_name : ''
        )
        .filter(Boolean)
    ];
    const start = performance.now();
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.4/full',
      packages: [
        'numpy',
        'pandas',
        'pydantic',
        'packaging',
        'wrapt',
        ...localPythonPackages
      ]
    });
    const loadEnd = performance.now();
    postMessage({ loadTime: loadEnd - start });
    await pyodide.runPython(importScript);
    const importEnd = performance.now();
    postMessage({ importTime: importEnd - loadEnd });
  } catch (error) {
    console.error('Error loading pyodide', error);
    postMessage({ error: TaskError.PYODIDE_LOAD_ERROR });
  }
}

addEventListener(
  'message',
  ({
    data
  }: {
    data: { task: Task; inputs: TaskInputs[Task]; id: string };
  }) => {
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
  }
);

loadPyodideAndPackages();
