/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
import { CatalogAttachmentEntity } from '@infrastructure/database';
import { AttachmentCsvDto } from '@infrastructure/dto';
import { v4 as uuidv4 } from 'uuid';
import { toNumber } from 'lodash';
import { replaceTableData } from '@services/storage/replace-table-data.helper';

/**
 * Service for managing attachment point catalog data.
 *
 * @remarks
 * The AttachmentService handles loading, storing, and querying attachment
 * point data from CSV files into the IndexedDB database. Attachments
 * represent the physical connection points on support structures where
 * conductors are attached.
 *
 * @example
 * ```typescript
 * // Get all available attachments
 * const attachments = await this.attachmentService.getAttachments();
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  /**
   * BehaviorSubject indicating whether the service is ready to use.
   * Becomes true when the storage service is initialized.
   */
  public readonly ready = new BehaviorSubject<boolean>(false);

  private readonly storageService = inject(StorageService);
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  constructor() {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /**
   * Retrieve all attachment points from the catalog.
   *
   * @returns Promise resolving to an array of all attachment entities
   */
  async getAttachments() {
    return this.storageService.db?.catAttachments.toArray();
  }

  /**
   * Import attachment catalog data from a CSV file.
   *
   * @remarks
   * This method fetches the attachments.csv file from the server, parses it,
   * transforms the data into the appropriate entity format, and stores
   * the results in the IndexedDB database.
   *
   * The CSV should contain columns: support_adr, position, X, Y, Z, L,
   * support_tower representing the 3D coordinates and physical properties
   * of each attachment point.
   *
   * @returns Promise that resolves when import is complete
   */
  async importFromFile() {
    const attachments = this.http
      .get(`${globalThis.location.origin}/data/attachments.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          this.logger.error('Error importing attachments', error);
          return of('');
        })
      );

    const mapData = (data: AttachmentCsvDto[]): CatalogAttachmentEntity[] => {
      return data
        .filter((item) => item.support_adr)
        .map((item) => ({
          uuid: uuidv4(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          support_name: item.support_adr,
          attachment_set: toNumber(item.position),
          attachment_altitude: parseFloat(item.Z),
          cross_arm_length: parseFloat(item.L),
          attachment_set_x: parseFloat(item.X),
          attachment_set_y: parseFloat(item.Y),
          attachment_set_z: parseFloat(item.Z),
          support_tower: item.support_tower
        }));
    };

    await new Promise<void>((resolve) => {
      attachments.subscribe(async (attachments) => {
        Papa.parse(attachments, {
          header: true,
          skipEmptyLines: true,
          complete: (async (jsonResults: Papa.ParseResult<AttachmentCsvDto>) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            const attachmentsTable: CatalogAttachmentEntity[] = mapData(data);
            await replaceTableData(this.storageService.db?.catAttachments, attachmentsTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<AttachmentCsvDto>) => void
        });
      });
    });
  }
}
