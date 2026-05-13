/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { CatalogObstacleTypeEntity } from '@infrastructure/database';
import { ObstacleTypeCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';
import { replaceTableData } from '@services/storage/replace-table-data.helper';

/**
 * Service for managing obstacle type catalog data.
 *
 * @remarks
 * The ObstacleTypesService handles loading, storing, and querying obstacle type
 * catalog data from CSV files into the IndexedDB database. Obstacle types define
 * the different categories of physical obstacles that can be found near power lines
 * (e.g., ordinary ground, vegetation, buildings, traffic lanes).
 *
 * @example
 * ```typescript
 * // Get a specific obstacle type
 * const type = await this.obstacleTypesService.getObstacleType('vegetation');
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class ObstaclesService {
  /**
   * BehaviorSubject indicating whether the service is ready to use.
   * Becomes true when the storage service is initialized.
   */
  public readonly ready = new BehaviorSubject<boolean>(false);

  /** UUID of the obstacle currently selected in the quick-measures p-select (drives plot highlighting). */
  selectedObstacleUuid = signal<string | null>(null);

  /** Index of the currently active obstacle point — shared by the form editor and plot highlighting. */
  activePointIndex = signal<number | null>(null);

  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);

  constructor() {
    this.storageService.ready$.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.ready.next(value);
    });
  }

  /** Sets the active obstacle point index. */
  setCurrentPointIndex(index: number): void {
    this.activePointIndex.set(index);
  }

  /** Resets the active obstacle point index to null (no point selected). */
  resetCurrentPointIndex(): void {
    this.activePointIndex.set(null);
  }

  /** Sets the selected obstacle and point for quick-measures display and plot highlighting. */
  setSelectedObstacle(uuid: string | null, pointIndex: number | null): void {
    this.selectedObstacleUuid.set(uuid);
    this.activePointIndex.set(pointIndex);
  }

  /** Retrieve all obstacle types from the database.
   *
   * @returns Promise resolving to an array of obstacle type entities, or undefined if not available
   */
  async getObstacleTypes(): Promise<CatalogObstacleTypeEntity[] | undefined> {
    return this.storageService.db?.catObstacleTypes?.toArray();
  }

  /**
   * Retrieve a specific obstacle type by its key.
   *
   * @param obstacleType - The unique obstacle type key
   * @returns Promise resolving to the obstacle type entity if found, undefined otherwise
   */
  async getObstacleType(obstacleType: string): Promise<CatalogObstacleTypeEntity | undefined> {
    return this.storageService.db?.catObstacleTypes?.where('obstacle_type').equals(obstacleType).first();
  }

  /**
   * Import obstacle type catalog data from a CSV file.
   *
   * @remarks
   * This method fetches the obstacle_type_rte.csv file from the server, parses it,
   * transforms the data into the appropriate entity format, and stores
   * the results in the IndexedDB database.
   *
   * The CSV uses semicolons as delimiters and contains columns:
   * obstacle_type, obstacle_type_name, details.
   *
   * @returns Promise that resolves when import is complete
   */
  private static readonly CSV_PARSE_TIMEOUT_MS = 60_000;

  async importFromFile() {
    await this.parseCsvAndStore();
  }

  private async parseCsvAndStore(): Promise<void> {
    let rawData: ObstacleTypeCsvDto[];
    try {
      rawData = await this.parseCsvFromUrl(`${globalThis.location.origin}/data/obstacle_type_rte.csv`);
    } catch (error) {
      this.logger.error('Error importing obstacle types', error);
      return;
    }
    if (!rawData.length) {
      return;
    }
    const entities = this.mapToEntities(rawData);
    await this.storeInDatabase(entities);
  }

  private parseCsvFromUrl(url: string): Promise<ObstacleTypeCsvDto[]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('CSV parse timeout')), ObstaclesService.CSV_PARSE_TIMEOUT_MS);
      Papa.parse<ObstacleTypeCsvDto>(url, {
        download: true,
        worker: true,
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: (results) => {
          clearTimeout(timeoutId);
          resolve(results.data ?? []);
        },
        error: (err) => {
          clearTimeout(timeoutId);
          reject(new Error(String(err)));
        }
      });
    });
  }

  /**
   * Map parsed CSV DTOs to database entities, filtering out invalid entries.
   *
   * @param data - Array of parsed CSV DTOs
   * @returns Array of valid obstacle type entities
   */
  private mapToEntities(data: ObstacleTypeCsvDto[]): CatalogObstacleTypeEntity[] {
    return data
      .map((item) => ({
        obstacle_type: item.obstacle_type,
        obstacle_type_name: item.obstacle_type_name,
        details: item.details
      }))
      .filter((item) => item.obstacle_type);
  }

  /**
   * Clear existing data and store new entities in the database.
   *
   * @param entities - Array of obstacle type entities to store
   */
  private async storeInDatabase(entities: CatalogObstacleTypeEntity[]): Promise<void> {
    await replaceTableData(this.storageService.db?.catObstacleTypes, entities);
  }
}
