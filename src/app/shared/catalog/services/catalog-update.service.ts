/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { AuthService } from '@services/auth/auth.service';
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { TranslocoService } from '@jsverse/transloco';
import { CATALOG_CACHE_NAME, PREFETCH_CATALOGS_MESSAGE_TYPE } from '@services/app-update/sw-messages.constantes';
import type { PrefetchCatalogsMessage, PrefetchCatalogsResult } from '@services/app-update/sw-messages.interfaces';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { catalogDataUrl } from '@shared/catalog/csv-import/csv-import.client.helpers';
import { CatalogIntegrityError } from '@shared/catalog/csv-import/csv-import.errors';
import { CATALOG_MANIFEST_TIMEOUT_MS, CATALOG_MANIFEST_URL } from './catalog-update.constantes';
import { fetchCatalogManifest, planStaleCatalog } from './catalog-update.helpers';
import { CatalogLockService } from './catalog-lock.service';
import { CatalogImporter, StaleCatalog, StaleCatalogsOutcome } from './catalog-update.interfaces';

/**
 * Orchestrates catalog CSV/JSON updates independently of the application
 * update flow.
 *
 * @remarks
 * Runs once per start, after authentication and before the user works: a new catalog version already in the
 * service worker catalog cache (`/data/<file>?v=<sha>`) is imported immediately; a missing one is prefetched in
 * the background (subject to the network rule) and imported at the next start, so catalogs never change while the
 * user is working. A catalog never imported yet is downloaded and imported right away whatever the network: the
 * application is unusable without it. Only a changed catalog is ever fetched.
 *
 * The live tables are shared by every Stellar window and read on each call, so a new version of an already imported
 * catalog is only promoted when no other window is working (see `CatalogLockService`): otherwise it is left in the
 * cache (or prefetched) and promoted at the first start with no other window open. First imports are never deferred.
 * Once its update has settled, every window declares itself as working until it closes.
 *
 * Each catalog service's `importFromFile(expectedHash)` propagates failures: the Web Worker verifies the SHA-256
 * hash and atomically promotes staging to live only on success, so a rejection always leaves the stored hash
 * untouched. One catalog failing is logged and never blocks the others.
 *
 * @category Services
 */
@Injectable({ providedIn: 'root' })
export class CatalogUpdateService {
  /** Read-only: catalogs must never be fetched for an unauthenticated user. */
  private readonly authService = inject(AuthService);
  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly transloco = inject(TranslocoService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly catalogLocks = inject(CatalogLockService);

  private readonly importers: Record<string, CatalogImporter>;

  constructor() {
    this.importers = {
      'maintenance-teams.csv': (expectedHash) => this.maintenanceService.importFromFile(expectedHash),
      'lines.csv': (expectedHash) => this.linesService.importFromFile(expectedHash),
      'cables.csv': (expectedHash) => this.cablesService.importFromFile(expectedHash),
      'chains.csv': (expectedHash) => this.chainsService.importFromFile(expectedHash),
      'attachments.csv': (expectedHash) => this.attachmentService.importFromFile(expectedHash),
      'obstacle_configuration.json': (expectedHash) => this.obstaclesService.importFromFile(expectedHash)
    };
  }

  /** Shared in-flight/settled startup run: every caller (app component, route guard) awaits the same imports. */
  private startupUpdate: Promise<void> | null = null;

  /**
   * Updates every catalog whose hash differs from what is currently stored, once per start.
   *
   * @remarks
   * The run is shared: concurrent and later callers get the same promise, so the route guard can wait for the
   * imports triggered by the app component. A rejection clears the shared run so a later call can retry.
   * Background prefetch is only requested here, never awaited.
   * No-ops entirely when the user is not authenticated (no network call, no import) or when
   * `/catalog-manifest.json` is unreachable (the catalogs already imported keep working offline).
   */
  updateCatalogsIfNeeded(): Promise<void> {
    if (!this.authService.currentUser()) {
      return Promise.resolve();
    }
    this.startupUpdate ??= this.runStartupUpdate().catch((error: unknown) => {
      this.startupUpdate = null;
      throw error;
    });
    return this.startupUpdate;
  }

  private async runStartupUpdate(): Promise<void> {
    try {
      await this.updateCatalogs();
    } finally {
      // Whatever the outcome (offline, failure), this window now works with the catalogs it has.
      await this.catalogLocks.joinWorkingSession();
    }
  }

  private async updateCatalogs(): Promise<void> {
    const manifest = await fetchCatalogManifest(CATALOG_MANIFEST_URL, CATALOG_MANIFEST_TIMEOUT_MS);
    if (!manifest) {
      this.logger.warn('Catalog manifest unavailable: catalogs are left as they are');
      return;
    }

    const dataHashes = manifest.hashes;

    // Serialized across windows; the stale list is read inside so an import done meanwhile by another window is seen.
    const outcome = await this.catalogLocks.runSerialized(async () => {
      const staleCatalogs = await this.findStaleCatalogs(dataHashes);
      if (staleCatalogs.length === 0) {
        return null;
      }
      const promotion = await this.catalogLocks.runIfNoWorkingSession(() =>
        this.processStaleCatalogs(staleCatalogs, true)
      );
      return promotion.granted ? promotion.value : this.processStaleCatalogs(staleCatalogs, false);
    });
    if (!outcome) {
      return;
    }
    this.notifyCatalogFailures(outcome.failedCatalogs);
    if (outcome.toPrefetch.length > 0) {
      this.requestPrefetch(outcome.toPrefetch, this.sizesByUrl(outcome.toPrefetch, manifest.hashes, manifest.sizes));
    }
  }

  /**
   * Imports what can be imported right now and lists the catalogs to prefetch in the background.
   *
   * @param mayReplaceLive - false when another window works: a catalog already imported is then left untouched.
   */
  private async processStaleCatalogs(
    staleCatalogs: StaleCatalog[],
    mayReplaceLive: boolean
  ): Promise<StaleCatalogsOutcome> {
    const cache = await this.openCatalogCache();
    const prefetchAvailable = Boolean(navigator.serviceWorker?.controller);
    const failedCatalogs: string[] = [];
    const toPrefetch: string[] = [];
    for (const catalog of staleCatalogs) {
      const url = catalogDataUrl(globalThis.location.origin, catalog.fileName, catalog.latestHash);
      const cached = await this.isCached(cache, url); //NOSONAR — one catalog at a time
      const plan = planStaleCatalog(catalog, { cached, mayReplaceLive, prefetchAvailable });
      if (plan.deferred) {
        this.logger.info(`Catalog '${catalog.fileName}' update deferred: another window is working`);
      }
      if (plan.importNow) {
        const imported = await this.importCatalog(catalog, cached ? cache : null, url); //NOSONAR — one at a time
        if (!imported) {
          failedCatalogs.push(catalog.fileName);
        }
      } else if (plan.prefetch) {
        toPrefetch.push(url);
      }
    }
    return { failedCatalogs, toPrefetch };
  }

  /** Catalogs listed in the manifest whose stored hash is missing or differs from the latest one. */
  private async findStaleCatalogs(dataHashes: Record<string, string>): Promise<StaleCatalog[]> {
    const candidates = Object.entries(this.importers).flatMap(([fileName, importFn]) => {
      const latestHash = dataHashes[fileName];
      return latestHash ? [{ fileName, latestHash, importFn }] : [];
    });
    const storedHashes = await Promise.all(
      candidates.map(({ fileName }) => this.storageService.db?.metadata.get(`catalog_hash:${fileName}`))
    );
    return candidates
      .map((candidate, index) => ({ ...candidate, storedHash: storedHashes[index]?.value as string | undefined }))
      .filter((candidate) => candidate.storedHash !== candidate.latestHash);
  }

  /**
   * Imports one catalog; a cached copy that fails its integrity check is evicted and downloaded once more from
   * the network (the immutable URL would otherwise keep serving the corrupted entry).
   *
   * @remarks
   * Any other failure (worker, parsing, IndexedDB quota, ...) is not fixed by a new download, so the cached
   * response is kept for a later start.
   */
  private async importCatalog(catalog: StaleCatalog, cache: Cache | null, url: string): Promise<boolean> {
    try {
      await catalog.importFn(catalog.latestHash);
      return true;
    } catch (error) {
      if (!cache || !(error instanceof CatalogIntegrityError)) {
        this.logger.error(`Error updating catalog '${catalog.fileName}'`, error);
        return false;
      }
      this.logger.warn(`Cached catalog '${catalog.fileName}' failed its integrity check, downloading it again`, error);
    }
    try {
      await cache.delete(url);
      await catalog.importFn(catalog.latestHash);
      return true;
    } catch (error) {
      this.logger.error(`Error updating catalog '${catalog.fileName}'`, error);
      return false;
    }
  }

  /** A cache read failure is treated as a miss: the catalog is then imported from the network or prefetched. */
  private async isCached(cache: Cache | null, url: string): Promise<boolean> {
    if (!cache) {
      return false;
    }
    try {
      return (await cache.match(url)) !== undefined;
    } catch (error) {
      this.logger.warn(`Catalog cache read failed for '${url}'`, error);
      return false;
    }
  }

  private async openCatalogCache(): Promise<Cache | null> {
    try {
      return typeof caches === 'undefined' ? null : await caches.open(CATALOG_CACHE_NAME);
    } catch (error) {
      this.logger.warn('Catalog cache unavailable', error);
      return null;
    }
  }

  /** Known manifest sizes of the given versioned URLs, for the service worker storage reserve check. */
  private sizesByUrl(
    urls: string[],
    hashes: Record<string, string>,
    sizes: Record<string, number>
  ): Record<string, number> {
    const sizeOfUrl = new Map(
      Object.entries(sizes).flatMap(([fileName, size]) =>
        hashes[fileName]
          ? [[catalogDataUrl(globalThis.location.origin, fileName, hashes[fileName]), size] as const]
          : []
      )
    );
    return Object.fromEntries(urls.flatMap((url) => (sizeOfUrl.has(url) ? [[url, sizeOfUrl.get(url)!]] : [])));
  }

  /** Background download for the next start; the service worker applies the network rule. */
  private requestPrefetch(urls: string[], sizes: Record<string, number>): void {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }: MessageEvent<PrefetchCatalogsResult>) => {
      this.logger.info('Catalog prefetch result', data);
      channel.port1.close();
    };
    const message: PrefetchCatalogsMessage = {
      type: PREFETCH_CATALOGS_MESSAGE_TYPE,
      urls,
      force: false,
      ...(Object.keys(sizes).length > 0 && { sizes })
    };
    controller.postMessage(message, [channel.port2]);
  }

  private notifyCatalogFailures(failedCatalogs: string[]): void {
    if (failedCatalogs.length === 0) {
      return;
    }

    this.notificationService.warning(
      this.transloco.translate('shared.catalog-update-service.import-failed', {
        catalogs: failedCatalogs.join(', ')
      })
    );
  }
}
