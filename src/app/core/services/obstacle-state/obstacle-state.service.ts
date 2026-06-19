/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Distance, Task } from '@services/worker_python/tasks/types';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { PlotOptions } from '@shared/types/plot.types';

/**
 * Manages obstacle state in the Pyodide middleware.
 *
 * @remarks
 * Owns the obstacle-specific state (distances, distanceType) and orchestrates
 * all obstacle task calls to the Python worker. It does NOT manage section state,
 * form state, or persistence — those remain in PlotService, ObstacleFormService,
 * and SectionService respectively.
 *
 * Typical lifecycle:
 * 1. After section loads: call `syncObstacles()` to restore all saved obstacles.
 * 2. After calculateAndSave: call `addSingleObstacle()` + `refreshProjection()`.
 * 3. After deleteObstacle: call `deleteObstacle()`.
 * 4. When leaving studio: call `reset()`.
 */
@Injectable({
  providedIn: 'root'
})
export class ObstacleStateService {
  private readonly workerPythonService = inject(WorkerPythonService);

  /** Distance results from the last `calculateDistances()` call. */
  readonly distances = signal<Distance[]>([]);

  /** Distance type currently selected for display. */
  readonly distanceType = signal<'oblique' | 'vertical' | 'horizontal' | null>(null);

  /**
   * Register obstacles in bulk in the middleware state for the current view range.
   *
   * @param obstacles - All obstacles from the section (unfiltered).
   * @param plotOptions - Current view options used to filter by span range.
   */
  async addBulkObstacles(obstacles: Obstacle[], plotOptions: PlotOptions): Promise<void> {
    await this.workerPythonService.runTaskWithTimeout(Task.addBulkObstacles, {
      obstacles,
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
  }

  /**
   * Register a single obstacle in the middleware state for the current view range.
   *
   * @param obstacle - The single obstacle to register (from the form).
   * @param plotOptions - Current view options used to filter by span range.
   */
  async addSingleObstacle(obstacle: Obstacle, plotOptions: PlotOptions): Promise<void> {
    await this.workerPythonService.runTaskWithTimeout(Task.addSingleObstacle, {
      obstacle,
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
  }

  /**
   * Remove a single obstacle from the middleware state by UUID.
   *
   * @param uuid - UUID of the obstacle to remove.
   * @param plotOptions - Current view options.
   */
  async deleteObstacle(uuid: string, plotOptions: PlotOptions): Promise<void> {
    await this.workerPythonService.runTaskWithTimeout(Task.deleteObstacle, {
      uuid,
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
  }

  /**
   * Clear all obstacles from the middleware state and reset distance signals.
   */
  async clearAllObstacles(): Promise<void> {
    await this.workerPythonService.runTaskWithTimeout(Task.clearObstacles, undefined);
    this.distances.set([]);
  }

  /**
   * Sync all obstacles from the section to the middleware state.
   *
   * Passes the full obstacle list to the middleware in a single call.
   * Distances are computed by the subsequent refreshProjection call.
   *
   * @param obstacles - All obstacles from the section.
   * @param plotOptions - Current view options for distance calculation.
   */
  async syncObstacles(obstacles: Obstacle[], plotOptions: PlotOptions): Promise<void> {
    if (obstacles.length === 0) {
      return;
    }

    await this.addBulkObstacles(obstacles, plotOptions);
  }

  /** Reset all obstacle state signals to their defaults. */
  reset(): void {
    this.distances.set([]);
    this.distanceType.set(null);
  }

  /**
   * Directly set the distances (e.g. from a refreshProjection task that already computes them).
   *
   * @param distances - Pre-computed Distance array.
   */
  setDistances(distances: Distance[]): void {
    this.distances.set(distances);
  }
}
