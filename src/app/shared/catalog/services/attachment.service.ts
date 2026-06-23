/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject, filter, merge, of, shareReplay, Subject, switchMap, take, tap } from 'rxjs';
import { CatalogAttachmentEntity, CatalogSupportAttachmentEntity } from '@infrastructure/database';
import { v4 as uuidv4 } from 'uuid';
import { SupportNameEntry } from './attachment.interfaces';
import { toLegacyEntity } from './attachment.helpers';
import { CsvImportClientService } from '@shared/catalog/csv-import';
import { truncateNumberToOneDecimal } from '@shared/helpers/truncateDecimals';

/**
 * Support fields derived from a catalog attachment, shared by the supports
 * table (inline attachment-set edit / copy column) and the attachment-set
 * modal. Centralizes the mapping rules — notably truncating the arm length to
 * one decimal — so both call sites stay consistent.
 */
export interface DerivedSupportAttachmentFields {
  towerModel: string | undefined;
  armLength: number | undefined;
  heightBelowConsole: number | undefined;
}

/**
 * Service for managing attachment point catalog data.
 *
 * @remarks
 * The AttachmentService stores and queries attachment-point catalog data
 * grouped by `support_name` (one IndexedDB row per support). The heavy CSV
 * import runs in a dedicated Web Worker that streams the file through
 * PapaParse and writes grouped entities chunk-by-chunk, keeping main-thread
 * memory and CPU usage negligible.
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  /** BehaviorSubject indicating whether the service is ready to use. */
  public readonly ready = new BehaviorSubject<boolean>(false);

  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);
  private readonly csvImportClient = inject(CsvImportClientService);

  /** Internal trigger to re-read catSupportAttachments after any write. */
  private readonly _refresh$ = new Subject<void>();

  private static readonly SUPPORT_NAMES_CACHE_KEY = 'catalog:distinct_support_names';

  /**
   * Observable of distinct support names from the catalog.
   * Emits cached names from localStorage immediately, then refreshes from IndexedDB.
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
   * Retrieve the distinct support names from the catalog, sorted alphabetically.
   *
   * @returns Promise resolving to a sorted array of unique support name strings
   */
  async getDistinctSupportNames(): Promise<string[]> {
    const keys = await this.storageService.db?.catSupportAttachments.orderBy('support_name').primaryKeys();
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
   * @param supportName - The support name to filter by
   * @returns Promise resolving to an array of matching attachment entities (legacy flat shape)
   */
  async getAttachmentsBySupportName(supportName: string): Promise<CatalogAttachmentEntity[]> {
    const group = await this.storageService.db?.catSupportAttachments.get(supportName);
    if (!group) return [];
    return group.attachments.map((item) => toLegacyEntity(group, item));
  }

  /**
   * Retrieve the first attachment matching both a support name and an attachment set number.
   *
   * @param supportName - The support name to filter by
   * @param attachmentSet - The attachment set number to filter by
   * @returns Promise resolving to the matching attachment entity, or undefined if not found
   */
  async getAttachmentDetails(supportName: string, attachmentSet: number): Promise<CatalogAttachmentEntity | undefined> {
    const group = await this.storageService.db?.catSupportAttachments.get(supportName);
    const item = group?.attachments.find((a) => a.attachment_set === attachmentSet);
    return item && group ? toLegacyEntity(group, item) : undefined;
  }

  /**
   * Resolve the support fields derived from a catalog attachment for a
   * (support name, attachment set) pair.
   *
   * @param supportName - The support name to look up
   * @param attachmentSet - The attachment set number to look up
   * @returns the derived fields, or `undefined` when the pair has no catalog match
   */
  async getDerivedSupportFields(
    supportName: string,
    attachmentSet: number
  ): Promise<DerivedSupportAttachmentFields | undefined> {
    const details = await this.getAttachmentDetails(supportName, attachmentSet);
    if (!details) return undefined;
    return {
      towerModel: details.support_tower,
      armLength: details.cross_arm_length == null ? undefined : truncateNumberToOneDecimal(details.cross_arm_length),
      heightBelowConsole: details.attachment_altitude
    };
  }

  /**
   * Import attachment catalog data from the `/data/attachments.csv` file.
   *
   * @remarks
   * Delegates to `CsvImportClientService`, which spawns the generic
   * CSV import Web Worker. The worker streams the CSV through PapaParse and
   * writes grouped `CatalogSupportAttachmentEntity` rows to IndexedDB
   * incrementally. The main thread never holds the raw CSV in memory.
   *
   * Errors are logged via `LoggerService` but **not** rethrown: this method
   * is invoked at app bootstrap from `AppComponent` (not by an explicit user
   * action), so a rejection would abort the whole catalog import flow.
   * Consumers that trigger imports interactively must catch failures
   * themselves and notify the user.
   *
   * @returns Promise that resolves when import is complete (or has failed)
   */
  async importFromFile(): Promise<void> {
    try {
      await this.csvImportClient.importCsv('attachments');
      this._refresh$.next();
    } catch (error) {
      this.logger.error('Error importing attachments', error);
    }
  }

  /**
   * Adds support name entries to the catalog if they are not already present.
   *
   * @remarks
   * Reads only the candidate keys via `bulkGet` (no full-table scan) and inserts
   * only the missing entries with an empty attachment list. Entries with empty
   * or missing supportName are silently ignored.
   *
   * @param entries - List of support name entries to persist if absent
   */
  async addSupportNamesIfAbsent(entries: SupportNameEntry[]): Promise<void> {
    const db = this.storageService.db;
    if (!db || entries.length === 0) {
      return;
    }

    const validEntries = entries.filter((e) => !!e.supportName);
    const uniqueEntries = [...new Map(validEntries.map((e) => [e.supportName, e])).values()];
    if (uniqueEntries.length === 0) {
      return;
    }

    const keys = uniqueEntries.map((e) => e.supportName);
    const existing = await db.catSupportAttachments.bulkGet(keys);

    const now = new Date().toISOString();
    const toAdd: CatalogSupportAttachmentEntity[] = uniqueEntries
      .map((e, i) => ({ entry: e, exists: !!existing[i] }))
      .filter((x) => !x.exists)
      .map((x) => ({
        uuid: uuidv4(),
        created_at: now,
        updated_at: now,
        support_name: x.entry.supportName,
        support_tower: x.entry.supportTower ?? '',
        attachments: []
      }));

    if (toAdd.length === 0) {
      return;
    }

    await db.catSupportAttachments.bulkAdd(toAdd);
    this._refresh$.next();
  }
}
