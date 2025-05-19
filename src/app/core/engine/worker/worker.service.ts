/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task } from './tasks';

@Injectable({
  providedIn: 'root'
})
export class WorkerService {
  private readonly _ready = new BehaviorSubject<boolean>(false);
  public worker?: Worker;
  loadTime = 0;
  importTime = 0;
  runTime = 0;
  result = signal<any>(null);

  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  setupWorker() {
    this.worker = new Worker(new URL('./worker', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      console.log('Worker message', data);
      if (data.loadTime) {
        this.loadTime = data.loadTime;
      } else if (data.importTime) {
        this.importTime = data.importTime;
        this._ready.next(true);
      } else if (data.runTime) {
        this.runTime = data.runTime;
      } else if (data.result) {
        this.result.set(data.result);
      }
    };
  }

  async runTask(task: Task, data: any) {
    this.worker?.postMessage({ task, data });
  }
}
