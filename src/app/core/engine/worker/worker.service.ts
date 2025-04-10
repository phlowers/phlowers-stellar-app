/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task } from './tasks';
// import { AppDB } from '../database/db';

@Injectable({
  providedIn: 'root'
})
export class WorkerService {
  private _ready = new BehaviorSubject<boolean>(false);
  public worker?: Worker;
  loadTime = 0;
  importTime = 0;
  runTime = 0;

  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  setupWorker() {
    //{
    // name: window.location.href
    // }
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
        const div = document.getElementById('plotly-output1');
        if (div) {
          div.innerHTML = data.result;
          const ele = document.getElementById('plotly-output1');
          const codes = ele?.getElementsByTagName('script') || [];
          for (const code of codes) {
            eval(code.text);
          }
        }
      }
    };
    // return worker;
  }

  async runTask(task: Task, data: any) {
    this.worker?.postMessage({ task, data });
  }

  //   async createDatabase(): Promise<void> {
  //     this.worker = this.setupWorker();
  //   }
}
