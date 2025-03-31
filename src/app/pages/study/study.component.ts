/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { WorkerService } from '../../core/engine/worker/worker.service';
import { Task } from '../../core/engine/worker/tasks';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ButtonModule],
  template: `<div>
    <p-button (click)="runPython()">Run Python</p-button>
    <div id="plotly-output1"></div>
  </div>`
})
export class Study {
  // pyodide: PyodideAPI;
  workerReady = false;
  subscriptions = new Subscription();

  constructor(private workerService: WorkerService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.workerService.ready$.subscribe((workerReady) => {
        this.workerReady = workerReady;
      })
    );
  }

  runPython() {
    this.workerService.runTask(Task.runPython);
    // this.pyodide.runPython(pythonScript, {});
  }
}
