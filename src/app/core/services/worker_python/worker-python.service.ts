/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '@services/logger/logger.service';
import { PythonErrorCode, Task, TaskError, TaskInputs, TaskOutputs } from './tasks/types';

/** Log levels accepted from worker `log` messages. */
export type WorkerLogLevel = 'log' | 'info' | 'warn' | 'error';

/** Structured log entry forwarded by the Python worker to the main thread. */
export interface WorkerLogMessage {
  level: WorkerLogLevel;
  message: string;
  details?: unknown;
}

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
 *       workerService.runTask(Task.initLit, { section, cable });
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
  private readonly logger = inject(LoggerService);
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
    if (this.worker) {
      return;
    }

    this.worker = new Worker(new URL('./worker-python', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      if (data.log) {
        this.handleWorkerLog(data.log as WorkerLogMessage);
      }
      if (data.error === TaskError.PYODIDE_LOAD_ERROR && !data.id) {
        this.pyodideLoadError$.next(true);
      } else if (data.loadTime) {
        this.times.set({ ...this.times(), loadTime: data.loadTime });
      } else if (data.importTime) {
        this.times.set({ ...this.times(), importTime: data.importTime });
        this._ready.next(true);
        const activateDebugLogs = localStorage.getItem('activateDebugLogs') === 'true';
        this.runTask(Task.setLogLevel, { activateDebugLogs });
      } else if (data.id) {
        const handler = this.handlerMap[data.id];
        if (handler) {
          const error = (data.error as TaskError) ?? null;
          const pythonErrorCode = (data.pythonErrorCode as PythonErrorCode) ?? null;
          handler(data.result, error, pythonErrorCode);
        }
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
   *   Task.initLit,
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
    return this.runTaskInternal(task, inputs);
  }

  /**
   * Run a calculation task in the Python worker with a timeout.
   *
   * @typeParam taskId - The task type from the Task enum
   * @param task - The task to execute
   * @param inputs - Input parameters for the task
   * @param timeout - Timeout in milliseconds (default: 30000ms = 30s)
   * @returns Promise resolving to the task result and any error, or rejecting on timeout
   *
   * @throws Error if the task execution exceeds the specified timeout
   *
   * @example
   * ```typescript
   * try {
   *   const { result, error } = await workerService.runTaskWithTimeout(
   *     Task.calculateObstaclesDistances,
   *     { obstacles, startSupport, endSupport, view },
   *     30000
   *   );
   *   if (!error) {
   *     console.log('Calculation result:', result);
   *   }
   * } catch (timeoutError) {
   *   console.error('Task timed out:', timeoutError);
   * }
   * ```
   */
  runTaskWithTimeout<taskId extends Task>(
    task: taskId,
    inputs: TaskInputs[taskId],
    timeout = 30000
  ): Promise<{ result: TaskOutputs[taskId]; error: TaskError | null; pythonErrorCode: PythonErrorCode | null }> {
    return this.runTaskInternal(task, inputs, timeout);
  }

  private runTaskInternal<taskId extends Task>(
    task: taskId,
    inputs: TaskInputs[taskId],
    timeout = 30000
  ): Promise<{ result: TaskOutputs[taskId]; error: TaskError | null; pythonErrorCode: PythonErrorCode | null }> {
    const worker = this.worker;
    if (!worker) {
      return Promise.reject(new Error('Python worker is not initialized. Call setup() before running tasks.'));
    }

    const id = uuidv4();
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

      if (timeout !== undefined) {
        timeoutId = globalThis.setTimeout(() => {
          delete this.handlerMap[id];
          reject(new Error(`Task ${String(task)} timed out after ${timeout}ms`));
        }, timeout);
      }

      this.handlerMap[id] = ((
        result: TaskOutputs[taskId],
        error: TaskError | null,
        pythonErrorCode: PythonErrorCode | null
      ) => {
        if (timeoutId !== null) {
          globalThis.clearTimeout(timeoutId);
        }
        delete this.handlerMap[id];
        resolve({ result, error, pythonErrorCode });
      }) as (result: TaskOutputs[Task], error: TaskError | null, pythonErrorCode: PythonErrorCode | null) => void;

      worker.postMessage({ task, inputs, id });
    });
  }

  /**
   * Forward a structured log message emitted by the Python worker to the
   * shared LoggerService, preserving the original log level.
   */
  private handleWorkerLog(log: WorkerLogMessage): void {
    const { level, message, details } = log;
    const args: unknown[] = details === undefined ? [] : [details];
    switch (level) {
      case 'error':
        this.logger.error(message, ...args);
        break;
      case 'warn':
        this.logger.warn(message, ...args);
        break;
      case 'info':
        this.logger.info(message, ...args);
        break;
      default:
        this.logger.log(message, ...args);
        break;
    }
  }
}
