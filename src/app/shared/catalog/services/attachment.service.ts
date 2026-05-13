/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, filter, merge, of, Subject, switchMap, take } from 'rxjs';
import Papa from 'papaparse';
import { CatalogAttachmentEntity } from '@infrastructure/database';
import { AttachmentCsvDto } from '@infrastructure/dto';
import { v4 as uuidv4 } from 'uuid';
import { replaceTableData } from '@services/storage/replace-table-data.helper';
import Dexie from 'dexie';
import { SupportNameEntry } from './attachment.interfaces';
import { mapAttachmentCsvToEntities } from './attachment.helpers';

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
  private readonly logger = inject(LoggerService);

  /** Internal trigger to re-read catAttachments after any write. */
  private readonly _refresh$ = new Subject<void>();

  /**
   * Observable of all attachment entities.
   * Re-emits after any write to catAttachments via this service (addSupportNamesIfAbsent, importFromFile).
   * Only starts emitting after the storage service signals readiness.
   */
  readonly allAttachments$ = this.storageService.ready$.pipe(
    filter((ready): ready is true => ready),
    take(1),
    switchMap(() =>
      merge(of(undefined as void), this._refresh$).pipe(switchMap(async () => (await this.getAttachments()) ?? []))
    )
  );

  /**
   * Observable of distinct support names from the catalog, sorted alphabetically.
   * Re-emits after any write to catAttachments via this service.
   * Only starts emitting after the storage service signals readiness.
   * Uses `uniqueKeys()` on the `support_name` index — O(distinct values), not O(total rows).
   */
  readonly distinctSupportNames$ = this.storageService.ready$.pipe(
    filter((ready): ready is true => ready),
    take(1),
    switchMap(() =>
      merge(of(undefined as void), this._refresh$).pipe(switchMap(async () => await this.getDistinctSupportNames()))
    )
  );

  constructor() {
    this.storageService.ready$.pipe(takeUntilDestroyed()).subscribe((value) => {
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
   * Retrieve the distinct support names from the catalog, sorted alphabetically.
   *
   * @returns Promise resolving to a sorted array of unique support name strings
   */
  async getDistinctSupportNames(): Promise<string[]> {
    const keys = await this.storageService.db?.catAttachments.orderBy('support_name').uniqueKeys();
    return (keys ?? []).filter((key): key is string => typeof key === 'string' && key.length > 0);
  }

  /**
   * Retrieve all attachments for a given support name, sorted by attachment set number.
   *
   * Uses the compound index `[support_name+attachment_set]` so IndexedDB handles
   * both filtering and ordering without an in-memory sort.
   *
   * @param supportName - The support name to filter by
   * @returns Promise resolving to an array of matching attachment entities
   */
  async getAttachmentsBySupportName(supportName: string): Promise<CatalogAttachmentEntity[]> {
    const result = await this.storageService.db?.catAttachments
      .where('[support_name+attachment_set]')
      .between([supportName, Dexie.minKey], [supportName, Dexie.maxKey])
      .toArray();
    return result ?? [];
  }

  /**
   * Retrieve the first attachment matching both a support name and an attachment set number.
   *
   * @param supportName - The support name to filter by
   * @param attachmentSet - The attachment set number to filter by
   * @returns Promise resolving to the matching attachment entity, or undefined if not found
   */
  async getAttachmentDetails(supportName: string, attachmentSet: number): Promise<CatalogAttachmentEntity | undefined> {
    return this.storageService.db?.catAttachments
      .where('[support_name+attachment_set]')
      .equals([supportName, attachmentSet])
      .first();
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
  private static readonly CSV_PARSE_TIMEOUT_MS = 60_000;

  async importFromFile() {
    await this.parseCsvAndStore();
  }

  private async parseCsvAndStore(): Promise<void> {
    let rawData: AttachmentCsvDto[];
    try {
      rawData = await this.parseCsvFromUrl(`${globalThis.location.origin}/data/attachments.csv`);
    } catch (error) {
      this.logger.error('Error importing attachments', error);
      return;
    }
    if (!rawData.length) {
      return;
    }
    const attachmentsTable: CatalogAttachmentEntity[] = mapAttachmentCsvToEntities(rawData);
    await replaceTableData(this.storageService.db?.catAttachments, attachmentsTable);
    this._refresh$.next();
  }

  private parseCsvFromUrl(url: string): Promise<AttachmentCsvDto[]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error('CSV parse timeout')),
        AttachmentService.CSV_PARSE_TIMEOUT_MS
      );
      Papa.parse<AttachmentCsvDto>(url, {
        download: true,
        worker: true,
        header: true,
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
   * Adds support name entries to the catalog if they are not already present.
   *
   * @remarks
   * Performs a full table scan (toArray) then inserts only the missing entries.
   * The table is small (~500 rows), making this approach acceptable without schema changes.
   * Entries with empty or missing supportName are silently ignored.
   *
   * @param entries - List of support name entries to persist if absent
   * @returns Promise that resolves when all missing entries have been added
   */
  async addSupportNamesIfAbsent(entries: SupportNameEntry[]): Promise<void> {
    const db = this.storageService.db;
    if (!db || entries.length === 0) {
      return;
    }

    // Deduplicate input by supportName
    const validEntries = entries.filter((e) => !!e.supportName);
    const uniqueEntries = [...new Map(validEntries.map((e) => [e.supportName, e])).values()];
    if (uniqueEntries.length === 0) {
      return;
    }

    const existingNames = new Set(await this.getDistinctSupportNames());

    const toAdd: CatalogAttachmentEntity[] = uniqueEntries
      .filter((e) => !existingNames.has(e.supportName))
      .map((e) => ({
        uuid: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        support_name: e.supportName,
        support_tower: e.supportTower ?? ''
      }));

    if (toAdd.length === 0) {
      return;
    }

    await db.catAttachments.bulkAdd(toAdd);
    this._refresh$.next();
  }
}
