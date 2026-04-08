/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Distance, ObstacleOutput, Task } from '@services/worker_python/tasks/types';
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
 * 2. After calculateAndSave: call `addObstacle()` + `calculateDistances()`.
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
   * Register obstacles in the middleware state for the current view range.
   *
   * Filters `obstacles` to only those whose `supportIndex` falls within the
   * selected span (`startSupport` ≤ supportIndex < `endSupport`), then
   * passes the filtered list to Python in a single call.
   *
   * @param obstacles - All obstacles from the section (unfiltered).
   * @param plotOptions - Current view options used to filter by span range.
   * @returns Rendered obstacle positions after the operation, or `null` on error.
   */
  async addObstacle(obstacles: Obstacle[], plotOptions: PlotOptions): Promise<ObstacleOutput | null> {
    const filtered = obstacles.filter(
      (o) => o.supportIndex >= plotOptions.startSupport && o.supportIndex < plotOptions.endSupport
    );
    if (filtered.length === 0) {
      return { obstacles: [] };
    }
    const { result } = await this.workerPythonService.runTask(Task.addObstacle, filtered);
    return result ?? null;
  }

  /**
   * Remove a single obstacle from the middleware state by UUID.
   *
   * @param uuid - UUID of the obstacle to remove.
   * @returns Rendered obstacle positions after the removal, or `null` on error.
   */
  async deleteObstacle(uuid: string): Promise<ObstacleOutput | null> {
    const { result } = await this.workerPythonService.runTask(Task.deleteObstacle, { uuid });
    return result ?? null;
  }

  /**
   * Clear all obstacles from the middleware state and reset distance signals.
   *
   * @returns Rendered obstacle positions after the clear (empty list), or `null` on error.
   */
  async clearAllObstacles(): Promise<ObstacleOutput | null> {
    const { result } = await this.workerPythonService.runTask(Task.clearObstacles, undefined);
    this.distances.set([]);
    return result ?? null;
  }

  /**
   * Sync all obstacles from the section to the middleware state.
   *
   * Passes the full obstacle list to the middleware in a single call,
   * then recalculates distances.
   *
   * @param obstacles - All obstacles from the section.
   * @param plotOptions - Current view options for distance calculation.
   * @returns `ObstacleOutput` with all obstacles applied, or `null` on error.
   */
  async syncObstacles(obstacles: Obstacle[], plotOptions: PlotOptions): Promise<ObstacleOutput | null> {
    if (obstacles.length === 0) {
      return null;
    }

    const result = await this.addObstacle(obstacles, plotOptions);
    await this.calculateDistances(plotOptions);
    return result;
  }

  /**
   * Recalculate distances for all currently registered obstacles.
   *
   * Updates the `distances` signal on success.
   *
   * @param plotOptions - Current view options (startSupport, endSupport, view).
   */
  async calculateDistances(plotOptions: PlotOptions): Promise<void> {
    const { result } = await this.workerPythonService.runTask(Task.calculateObstaclesDistances, {
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
    this.distances.set(result ?? []);
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
