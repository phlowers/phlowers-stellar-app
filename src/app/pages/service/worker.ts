/// <reference lib="webworker" />

import { loadPyodide } from 'pyodide';
import importScript from './python/imports.py';
// import { Task } from '../../../worker/tasks';
import pythonPackages from '../../../python-packages.json';
// import { handleTask, PyodideAPI, Task } from './helpers/pyodide/tasks';

export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;

let pyodide: PyodideAPI;

// const pythonPackages = {};

async function loadPyodideAndPackages() {
  const start = performance.now();
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full',
    packages: [
      'scipy',
      'numpy',
      'pandas',
      'pydantic',
      'packaging',
      'wrapt',
      ...Object.values(pythonPackages)
        .map((pkg: any) => (pkg.source === 'local' ? self.name + 'pyodide/' + pkg.file_name : ''))
        .filter(Boolean)
    ]
  });
  const loadEnd = performance.now();
  console.log('loadEnd is', loadEnd);
  postMessage({ loadTime: loadEnd - start });
  await pyodide.runPython(importScript);
  const importEnd = performance.now();
  console.log('importEnd is', importEnd - loadEnd);
  postMessage({ importTime: importEnd - loadEnd });
}

loadPyodideAndPackages();

addEventListener('message', ({ data }: { data: { task: any } }) => {
  console.log('data in worker is', data);
  //   handleTask(pyodide, data.task).then((result) => {
  //     console.log('result in worker is', result);
  //     postMessage(result);
  //   });
});
