/// <reference lib="webworker" />

import { loadPyodide } from 'pyodide';
import importScript from '../python-functions/imports.py';
import pythonPackages from '../python-packages.json';

export type PyodideAPI = Awaited<ReturnType<any>>;

let pyodide: PyodideAPI;

async function loadPyodideAndPackages() {
  const localPythonPackages = [
    ...Object.values(pythonPackages)
      .map((pkg: any) => (pkg.source === 'local' ? self.name + 'pyodide/' + pkg.file_name : ''))
      .filter(Boolean)
  ];
  const start = performance.now();
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full',
    packages: ['scipy', 'numpy', 'pandas', 'pydantic', 'packaging', 'wrapt', ...localPythonPackages]
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
