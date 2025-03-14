/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppDB } from '../database/db';

@Injectable({
  providedIn: 'root'
})
export class WorkerService {
  private _ready = new BehaviorSubject<boolean>(false);
  public worker?: Worker;
  loadTime = 0;
  importTime = 0;
  runTime = 0;

  constructor() {}

  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  setupWorker() {
    this.worker = new Worker(new URL('./worker', import.meta.url), {
      /* @vite-ignore */
      name: window.location.href
    });
    this.worker.onmessage = ({ data }) => {
      console.log('Worker message', data);
      if (data.loadTime) {
        this.loadTime = data.loadTime;
      } else if (data.importTime) {
        this.importTime = data.importTime;
        this._ready.next(true);
      } else if (data.runTime) {
        this.runTime = data.runTime;
      }
    };
    // return worker;
  }

  //   async createDatabase(): Promise<void> {
  //     this.worker = this.setupWorker();
  //   }
}
