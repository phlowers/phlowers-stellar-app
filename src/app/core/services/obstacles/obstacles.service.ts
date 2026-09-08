/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { CatalogObstacleTypeEntity } from '@infrastructure/database';
import { CsvImportClientService } from '@shared/catalog/csv-import';

/**
 * Service for managing obstacle type catalog data.
 *
 * @remarks
 * Delegates CSV import (semicolon-delimited) to the shared
 * `CsvImportClientService` which streams `obstacle_type_rte.csv`
 * through a dedicated Web Worker. Also exposes UI selection signals shared
 * with the quick-measures p-select and the plot highlighting layer.
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class ObstaclesService {
  /** BehaviorSubject indicating whether the service is ready to use. */
  public readonly ready = new BehaviorSubject<boolean>(false);

  /**
   * UUID of the obstacle **or floor** currently selected for measurement — set from the quick-measures
   * p-select, a plot click, or an obstacle save; read by the quick-measures card, the distance results
   * and the plot's highlighting/distance layer. Floors are registered as obstacles in the worker
   * (see `mapFloorToObstacle`), so a floor uuid matches `Distance.obstacleUuid` just the same.
   */
  selectedMeasureUuid = signal<string | null>(null);

  /** Index of the active point within the selected measure — shared by form editor and plot highlighting. */
  activePointIndex = signal<number | null>(null);

  private readonly storageService = inject(StorageService);
  private readonly csvImportClient = inject(CsvImportClientService);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /** Sets the active point index within the selected measure. */
  setCurrentPointIndex(index: number): void {
    this.activePointIndex.set(index);
  }

  /** Resets the active point index to null (no point selected). */
  resetCurrentPointIndex(): void {
    this.activePointIndex.set(null);
  }

  /** Selects the obstacle or floor (and its point) to measure, for quick-measures display and plot highlighting. */
  setSelectedMeasure(uuid: string | null, pointIndex: number | null): void {
    this.selectedMeasureUuid.set(uuid);
    this.activePointIndex.set(pointIndex);
  }

  /** Retrieve all obstacle types from the database. */
  async getObstacleTypes(): Promise<CatalogObstacleTypeEntity[] | undefined> {
    return this.storageService.db?.catObstacleTypes?.toArray();
  }

  /** Retrieve a specific obstacle type by its key. */
  async getObstacleType(obstacleType: string): Promise<CatalogObstacleTypeEntity | undefined> {
    return this.storageService.db?.catObstacleTypes?.where('obstacle_type').equals(obstacleType).first();
  }

  /**
   * Import obstacle configuration catalog from `obstacle_configuration.json`
   * via the generic catalog import Web Worker. Persists obstacle types,
   * per-obstacle configuration, regulatory rules, conformity distances and
   * wind zones atomically.
   *
   * @param expectedHash - SHA-256 hex digest the downloaded file must match
   * (see `CatalogUpdateService`). Verified by the worker before any Dexie
   * mutation; errors are propagated (never swallowed) so a caller can decide
   * whether to continue with other catalogs.
   */
  async importFromFile(expectedHash?: string): Promise<void> {
    await this.csvImportClient.importCsv('obstacles', { expectedHash });
  }
}
