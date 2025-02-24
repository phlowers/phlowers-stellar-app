import { useEffect, useState, useLayoutEffect } from "react";
import "./App.css";
import { loadPyodide } from "../public/pyodide/pyodide.mjs";
import pythonScript from "./python/example.py";
// const pythonScript = require("./python/python_script.py");

const initPyodide = async () => {
  return loadPyodide({
    indexURL: window.location.origin + "/pyodide/",
    // indexURL: "localhost:8003/",
    packages: ["mechaphlowers"],
  });
};

type PyodideAPI = Awaited<ReturnType<typeof initPyodide>>;

const runPython = (pyodide: PyodideAPI) => {
  pyodide.runPython(pythonScript, {});
  const ele = document.getElementById("plotly-output1");
  const codes = ele?.getElementsByTagName("script") || [];
  for (let i = 0; i < codes.length; i++) {
    eval(codes[i].text);
  }
};

function App() {
  const [pyodide, setPyodide] = useState<PyodideAPI>();
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [runTime, setRunTime] = useState<number>(0);
  useLayoutEffect(() => {
    const start = performance.now();
    initPyodide().then((pyodide) => {
      setPyodide(pyodide);
      setLoadingTime(performance.now() - start);
    });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (pyodide) {
        const start = performance.now();
        runPython(pyodide);
        setRunTime(performance.now() - start);
      }
    }, 0);
  }, [pyodide]);

  return (
    <div>
      <div>
        {!pyodide ? "Loading Pyodide..." : `Pyodide loaded in ${loadingTime}!`}
      </div>
      <div>
        {pyodide && !runTime
          ? `Python script executing`
          : runTime
            ? `Python script executed in ${runTime}!`
            : ""}
      </div>
      <div id="plotly-output1"></div>
    </div>
  );
}

export default App;
