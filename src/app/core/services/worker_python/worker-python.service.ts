/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { PythonErrorCode, Task, TaskError, TaskInputs, TaskOutputs } from './tasks/types';

/**
 * Service for managing the Python (Pyodide) web worker.
 *
 * @remarks
 * This service initializes and communicates with a web worker running
 * Pyodide (Python in WebAssembly). It handles task execution for
 * mechanical calculations using the mechaphlowers library.
 *
 * @example
 * ```typescript
 * constructor(private workerService: WorkerPythonService) {
 *   // Wait for worker to be ready
 *   workerService.ready$.subscribe(ready => {
 *     if (ready) {
 *       // Run a calculation task
 *       workerService.runTask(Task.getLit, { section, cable });
 *     }
 *   });
 * }
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class WorkerPythonService {
  private readonly _ready = new BehaviorSubject<boolean>(false);
  /** Observable indicating if Pyodide failed to load */
  readonly pyodideLoadError$ = new BehaviorSubject<boolean>(false);
  /** Reference to the web worker instance */
  public worker?: Worker;
  /** Signal containing timing information for diagnostics */
  times = signal<{
    /** Time to load Pyodide runtime (ms) */
    loadTime: number;
    /** Time to import Python packages (ms) */
    importTime: number;
    /** Time to run the last task (ms) */
    runTime: number;
  }>({
    loadTime: 0,
    importTime: 0,
    runTime: 0
  });
  /** Map of pending task IDs to their resolve callbacks, used to correlate worker responses */
  handlerMap: Record<
    string,
    (result: TaskOutputs[Task], error: TaskError | null, pythonErrorCode: PythonErrorCode | null) => void
  > = {};

  /**
   * Observable indicating whether the worker is ready.
   * @returns Observable that emits true when Pyodide is loaded and ready
   */
  get ready$(): Observable<boolean> {
    return this._ready.asObservable();
  }

  /**
   * Current ready state of the worker.
   * @returns True if the worker is ready to execute tasks
   */
  get ready() {
    return this._ready.value;
  }

  /**
   * Initialize the web worker and load Pyodide.
   *
   * @remarks
   * This method creates the web worker and sets up message handlers.
   * It should be called once during application initialization.
   *
   * @example
   * ```typescript
   * workerService.setup();
   * ```
   */
  setup() {
    this.worker = new Worker(new URL('./worker-python', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      if (data.error === TaskError.PYODIDE_LOAD_ERROR) {
        this.pyodideLoadError$.next(true);
      } else if (data.loadTime) {
        this.times.set({ ...this.times(), loadTime: data.loadTime });
      } else if (data.importTime) {
        this.times.set({ ...this.times(), importTime: data.importTime });
        this._ready.next(true);
        const activateDebugLogs = localStorage.getItem('activateDebugLogs') === 'true';
        this.runTask(Task.setLogLevel, { activateDebugLogs });
      } else if (data.id) {
        this.handlerMap[data.id](data.result, data.error, data.pythonErrorCode ?? null);
      }
    };
  }

  /**
   * Run a calculation task in the Python worker.
   *
   * @typeParam taskId - The task type from the Task enum
   * @param task - The task to execute
   * @param inputs - Input parameters for the task
   * @returns Promise resolving to the task result and any error
   *
   * @example
   * ```typescript
   * const { result, error } = await workerService.runTask(
   *   Task.getLit,
   *   { section: mySection, cable: myCable }
   * );
   * if (!error) {
   *   console.log('Calculation result:', result);
   * }
   * ```
   */
  runTask<taskId extends Task>(
    task: taskId,
    inputs: TaskInputs[taskId]
  ): Promise<{ result: TaskOutputs[taskId]; error: TaskError | null; pythonErrorCode: PythonErrorCode | null }> {
    const id = uuidv4();
    return new Promise((resolve) => {
      this.worker?.postMessage({ task, inputs, id });
      this.handlerMap[id] = ((
        result: TaskOutputs[taskId],
        error: TaskError | null,
        pythonErrorCode: PythonErrorCode | null
      ) => {
        delete this.handlerMap[id];
        resolve({ result, error, pythonErrorCode });
      }) as (result: TaskOutputs[Task], error: TaskError | null, pythonErrorCode: PythonErrorCode | null) => void;
    });
  }
}
