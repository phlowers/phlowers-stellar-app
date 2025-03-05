/// <reference lib="webworker" />

import { loadPyodide } from "pyodide";
import importScript from "./python/imports.py";
import pythonScript from "./python/example.py";
import pythonPackages from "../python-packages.json";

let pyodide: any;

async function loadPyodideAndPackages() {
  console.log("im in loadPyodideAndPackages", self.name);
  const start = performance.now();
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.3/full",
    packages: [
      "scipy",
      "numpy",
      "pandas",
      "pydantic",
      "packaging",
      "wrapt",
      ...Object.values(pythonPackages)
        .map((pkg: any) =>
          pkg.source === "local" ? self.name + "pyodide/" + pkg.file_name : "",
        )
        .filter(Boolean),
    ],
  });
  const loadEnd = performance.now();
  postMessage({ loadTime: loadEnd - start });
  await pyodide.runPython(importScript);
  const importEnd = performance.now();
  postMessage({ importTime: importEnd - loadEnd });
}

let pyodideReadyPromise = loadPyodideAndPackages();

addEventListener("message", (data) => {
  console.log("data in worker is", data);
  async function runcode() {
    await pyodideReadyPromise;
    const start = performance.now();
    let results = await pyodide.runPythonAsync(pythonScript);
    return { runTime: performance.now() - start };
  }
  runcode().then((result) => {
    postMessage(result);
  });
});
