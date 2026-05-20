/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, catchError, filter, merge, of, shareReplay, Subject, switchMap, take, tap } from 'rxjs';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
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
  private readonly http = inject(HttpClient);
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

  private static readonly SUPPORT_NAMES_CACHE_KEY = 'catalog:distinct_support_names';

  /**
   * Observable of distinct support names from the catalog.
   * Emits cached names from localStorage immediately (instant), then updates
   * with fresh data from IndexedDB once available.
   * Re-emits after any write to catAttachments via this service.
   */
  readonly distinctSupportNames$ = merge(
    of(this.getCachedSupportNames()).pipe(filter((names) => names.length > 0)),
    this.storageService.ready$.pipe(
      filter((ready): ready is true => ready),
      take(1),
      switchMap(() =>
        merge(of(undefined as void), this._refresh$).pipe(
          switchMap(() => this.getDistinctSupportNames()),
          tap((names) => this.cacheSupportNames(names))
        )
      )
    )
  ).pipe(shareReplay(1));

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
   * Retrieve the distinct support names from the catalog, sorted alphabetically.
   *
   * @returns Promise resolving to a sorted array of unique support name strings
   */
  async getDistinctSupportNames(): Promise<string[]> {
    const keys = await this.storageService.db?.catAttachments.orderBy('support_name').uniqueKeys();
    return (keys ?? []).filter((key): key is string => typeof key === 'string' && key.length > 0);
  }

  private getCachedSupportNames(): string[] {
    try {
      const cached = globalThis.localStorage.getItem(AttachmentService.SUPPORT_NAMES_CACHE_KEY);
      if (!cached) return [];

      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    } catch (error) {
      this.logger.warn('Failed to retrieve cached support names from localStorage', error);
      return [];
    }
  }

  private cacheSupportNames(names: string[]): void {
    try {
      globalThis.localStorage.setItem(AttachmentService.SUPPORT_NAMES_CACHE_KEY, JSON.stringify(names));
    } catch (error) {
      this.logger.warn('Failed to cache support names in localStorage', error);
    }
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
  async importFromFile() {
    await new Promise<void>((resolve) => {
      this.fetchCsv().subscribe(async (csv) => {
        await this.parseCsvAndStore(csv);
        resolve();
      });
    });
  }

  private fetchCsv() {
    return this.http.get(`${globalThis.location.origin}/data/attachments.csv`, { responseType: 'text' }).pipe(
      catchError((error) => {
        this.logger.error('Error importing attachments', error);
        return of('');
      })
    );
  }

  private async parseCsvAndStore(csv: string): Promise<void> {
    await new Promise<void>((resolve) => {
      Papa.parse<AttachmentCsvDto>(csv, {
        header: true,
        skipEmptyLines: true,
        complete: async (jsonResults) => {
          const data = jsonResults.data;
          if (!data || data.length === 0) {
            resolve();
            return;
          }
          const attachmentsTable: CatalogAttachmentEntity[] = mapAttachmentCsvToEntities(data);
          await replaceTableData(this.storageService.db?.catAttachments, attachmentsTable);
          this._refresh$.next();
          resolve();
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

    const existing = await db.catAttachments.toArray();
    const existingNames = new Set(existing.map((a) => a.support_name).filter((n): n is string => !!n));

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
