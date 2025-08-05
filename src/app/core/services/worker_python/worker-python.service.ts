/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskInputs, TaskOutputs } from './tasks/types';

@Injectable({
  providedIn: 'root'
})
export class WorkerPythonService {
  private readonly _ready = new BehaviorSubject<boolean>(false);
  public worker?: Worker;
  times = signal<{
    loadTime: number;
    importTime: number;
    runTime: number;
  }>({
    loadTime: 0,
    importTime: 0,
    runTime: 0
  });
  handlerMap: Record<string, (result: any) => void> = {};

  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  get ready() {
    return this._ready.value;
  }

  setup() {
    this.worker = new Worker(new URL('./worker-python', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      if (data.loadTime) {
        this.times.set({ ...this.times(), loadTime: data.loadTime });
      } else if (data.importTime) {
        this.times.set({ ...this.times(), importTime: data.importTime });
        this._ready.next(true);
      } else if (data.id) {
        this.handlerMap[data.id](data.result);
      }
    };
  }

  runTask<taskId extends Task>(
    task: taskId,
    inputs?: TaskInputs[taskId]
  ): Promise<TaskOutputs[taskId]> {
    const id = uuidv4();
    return new Promise((resolve) => {
      this.worker?.postMessage({ task, inputs, id });
      this.handlerMap[id] = (result: TaskOutputs[taskId]) => {
        delete this.handlerMap[id];
        resolve(result);
      };
    });
  }
}
