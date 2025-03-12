import { loadPyodide } from 'pyodide';
import pythonScript from './python/example.py';
import testScript from './python/test.py';

export enum Task {
  runTests = 'runTests',
  runCode = 'runCode'
}

export type PyodideAPI = Awaited<ReturnType<typeof loadPyodide>>;

async function runTests(pyodide: PyodideAPI, script: string) {
  await pyodide.loadPackage(['pytest']);
  await pyodide.runPythonAsync(testScript);
  const results = pyodide.globals
    //@ts-ignore
    .get('results')
    .toJs({ dict_converter: Object.fromEntries });
  console.log('tests ran', results);
  return results;
}

async function runcode(pyodide: PyodideAPI, script: string) {
  const start = performance.now();
  let results = await pyodide.runPythonAsync(pythonScript);
  return { runTime: performance.now() - start };
}

export async function handleTask(pyodide: PyodideAPI, task: Task) {
  switch (task) {
    case Task.runTests:
      return await runTests(pyodide, testScript);
    case Task.runCode:
      return await runcode(pyodide, pythonScript);
    default:
      console.error('Unknown task:', task);
  }
}
