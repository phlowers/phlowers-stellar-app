import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { loadPyodide } from "pyodide";
import pythonScript from "./python/example.py";
import importScript from "./python/imports.py";
import { CommonModule } from "@angular/common";

type PyodideAPI = Awaited<ReturnType<any>>;

@Component({
  selector: "app-root",
  imports: [CommonModule, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit {
  title = "phlowers-stellar-app";
  loadTime = 0;
  importTime = 0;
  runTime = 0;
  pythonWorker: Worker | null = null;

  constructor() {
    this.pythonWorker = this.setupWorker();
  }

  setupWorker() {
    const worker = new Worker(new URL("./app.worker", import.meta.url), {
      name: window.location.href,
    });
    worker.onmessage = ({ data }) => {
      if (data.loadTime) {
        this.loadTime = data.loadTime;
      } else if (data.importTime) {
        this.importTime = data.importTime;
      } else if (data.runTime) {
        this.runTime = data.runTime;
      }
    };
    return worker;
  }

  run() {
    this.pythonWorker?.postMessage(4);
  }

  async ngOnInit() {}
}
