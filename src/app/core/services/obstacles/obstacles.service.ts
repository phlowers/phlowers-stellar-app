/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, catchError, firstValueFrom, of } from 'rxjs';
import { CatalogObstacleTypeEntity } from '@infrastructure/database';
import { ObstacleTypeCsvDto } from '@infrastructure/dto';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
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

  /** Index of the currently selected obstacle point. */
  currentPointIndex = signal<number>(0);

  private readonly storageService = inject(StorageService);
  private readonly http = inject(HttpClient);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /** Sets the current obstacle point index. */
  setCurrentPointIndex(index: number): void {
    this.currentPointIndex.set(index);
  }

  /** Resets the current obstacle point index to zero. */
  resetCurrentPointIndex(): void {
    this.currentPointIndex.set(0);
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
  async importFromFile() {
    const csvContent = await this.fetchCsvFile();
    if (!csvContent) {
      return;
    }
    const parsedData = await this.parseCsv(csvContent);
    if (!parsedData || parsedData.length === 0) {
      return;
    }
    const entities = this.mapToEntities(parsedData);
    await this.storeInDatabase(entities);
  }

  /**
   * Fetch the obstacle type CSV file from the server.
   *
   * @returns Promise resolving to the CSV content string, or empty string on error
   */
  private async fetchCsvFile(): Promise<string> {
    return firstValueFrom(
      this.http
        .get(`${window.location.origin}/data/obstacle_type_rte.csv`, {
          responseType: 'text'
        })
        .pipe(
          catchError((error) => {
            console.error('Error importing obstacle types', error);
            return of('');
          })
        )
    );
  }

  /**
   * Parse CSV content into an array of ObstacleTypeCsvDto.
   *
   * @param csvContent - Raw CSV string with semicolon delimiters
   * @returns Promise resolving to the parsed data array
   */
  private parseCsv(csvContent: string): Promise<ObstacleTypeCsvDto[]> {
    return new Promise((resolve) => {
      Papa.parse<ObstacleTypeCsvDto>(csvContent, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
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
