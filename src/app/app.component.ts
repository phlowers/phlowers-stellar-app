import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { loadPyodide } from "pyodide";
import pythonScript from "./python/example.py";
import importScript from "./python/imports.py";
import { CommonModule } from "@angular/common";

const initPyodide = async () => {
  console.log("Loading Pyodide...");
  let root = window.location.origin;
  // if (root.includes("github.io") || root.includes("localhost")) {
  const repoName = window.location.href.split("/")[3];
  root = window.location.origin + "/" + repoName;
  // }
  console.log("indexURL:", root + "/pyodide");
  return loadPyodide({
    indexURL: root + "/pyodide/",
    // lockFileURL: root + "/pyodide/pyodide-lock.json",
    packages: ["mechaphlowers"],
  });
};

type PyodideAPI = Awaited<ReturnType<typeof initPyodide>>;

@Component({
  selector: "app-root",
  imports: [CommonModule, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit {
  title = "phlowers-stellar-app";
  pyodideLoadTime = 0;
  importTime = 0;
  runTime = 0;
  pyodide: PyodideAPI | null = null;

  run() {
    const start = performance.now();
    this.pyodide?.runPython(pythonScript, {});
    this.runTime = performance.now() - start;
  }

  async ngOnInit() {
    const start = performance.now();
    this.pyodide = await initPyodide();
    this.pyodideLoadTime = performance.now() - start;
    this.pyodide.runPython(importScript, {});
    this.importTime = performance.now() - this.pyodideLoadTime;
  }
}
