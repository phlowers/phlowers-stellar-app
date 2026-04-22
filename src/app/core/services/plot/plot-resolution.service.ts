/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Task } from '@services/worker_python/tasks/types';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';

const MIN_RESOLUTION = 25;
const RESOLUTION_STORAGE_KEY = 'plotResolution';

@Injectable({
  providedIn: 'root'
})
/** Service managing plot resolution state, localStorage persistence, and Python engine configuration. */
export class PlotResolutionService implements OnDestroy {
  readonly resolution = signal<number>(100);
  readonly appliedResolution = signal<number | null>(null);
  /** Default resolution value loaded from Python engine configuration. Also used as maximum for the UI slider. */
  readonly defaultResolution = signal<number>(100);

  private readonly workerReady = signal<boolean>(false);
  private readonly workerPythonService = inject(WorkerPythonService);
  private subscription: Subscription | null = null;

  constructor() {
    const storedResolution = Number(globalThis.localStorage.getItem(RESOLUTION_STORAGE_KEY));
    if (Number.isFinite(storedResolution) && storedResolution >= MIN_RESOLUTION) {
      this.resolution.set(storedResolution);
    }

    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });

    effect(() => {
      if (this.workerReady()) {
        this.workerPythonService.runTask(Task.getConfig, undefined).then(({ result }) => {
          if (result?.resolution) {
            this.defaultResolution.set(result.resolution);
            const currentResolution = this.resolution();
            if (currentResolution > result.resolution) {
              this.setResolution(result.resolution);
            }
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  setResolution(value: number): void {
    const normalizedResolution = this.normalizeResolution(value);
    if (normalizedResolution === this.resolution()) {
      return;
    }
    this.resolution.set(normalizedResolution);
    globalThis.localStorage.setItem(RESOLUTION_STORAGE_KEY, normalizedResolution.toString());
  }

  async applyResolution(value: number): Promise<void> {
    if (!this.workerPythonService.ready) {
      return;
    }
    const normalizedResolution = this.normalizeResolution(value);
    if (this.appliedResolution() === normalizedResolution) {
      return;
    }
    const { error } = await this.workerPythonService.runTask(Task.setResolution, {
      resolution: normalizedResolution
    });
    if (!error) {
      this.appliedResolution.set(normalizedResolution);
    }
  }

  private normalizeResolution(value: number): number {
    if (!Number.isFinite(value)) {
      return this.defaultResolution();
    }
    const rounded = Math.round(value);
    const max = this.defaultResolution();
    return Math.max(MIN_RESOLUTION, Math.min(max, rounded));
  }
}
