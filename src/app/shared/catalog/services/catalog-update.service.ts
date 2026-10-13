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
import { CATALOG_MANIFEST_TIMEOUT_MS, CATALOG_MANIFEST_URL } from './catalog-update.constantes';
import { fetchCatalogHashes } from './catalog-update.helpers';
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

  /**
   * Updates every catalog whose hash differs from what is currently stored.
   *
   * @remarks
   * No-ops entirely when the user is not authenticated (no network call, no import) or when
   * `/catalog-manifest.json` is unreachable (the catalogs already imported keep working offline).
   */
  async updateCatalogsIfNeeded(): Promise<void> {
    if (!this.authService.currentUser()) {
      return;
    }

    const dataHashes = await fetchCatalogHashes(CATALOG_MANIFEST_URL, CATALOG_MANIFEST_TIMEOUT_MS);
    if (!dataHashes) {
      this.logger.warn('Catalog manifest unavailable: catalogs are left as they are');
      return;
    }

    const staleCatalogs = await this.findStaleCatalogs(dataHashes);
    if (staleCatalogs.length === 0) {
      return;
    }
    const { failedCatalogs, toPrefetch } = await this.processStaleCatalogs(staleCatalogs);
    this.notifyCatalogFailures(failedCatalogs);
    if (toPrefetch.length > 0) {
      this.requestPrefetch(toPrefetch);
    }
  }

  /** Imports what can be imported right now and lists the catalogs to prefetch in the background. */
  private async processStaleCatalogs(staleCatalogs: StaleCatalog[]): Promise<StaleCatalogsOutcome> {
    const cache = await this.openCatalogCache();
    const prefetchAvailable = Boolean(navigator.serviceWorker?.controller);
    const failedCatalogs: string[] = [];
    const toPrefetch: string[] = [];
    for (const catalog of staleCatalogs) {
      const url = catalogDataUrl(globalThis.location.origin, catalog.fileName, catalog.latestHash);
      const cached = cache ? (await cache.match(url)) !== undefined : false; //NOSONAR — one catalog at a time
      if (cached || catalog.storedHash === undefined || !prefetchAvailable) {
        const imported = await this.importCatalog(catalog, cached ? cache : null, url); //NOSONAR — one at a time
        if (!imported) {
          failedCatalogs.push(catalog.fileName);
        }
      } else {
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
   * Imports one catalog; a cached copy that fails verification is evicted and downloaded once more from the
   * network (the immutable URL would otherwise keep serving the corrupted entry).
   */
  private async importCatalog(catalog: StaleCatalog, cache: Cache | null, url: string): Promise<boolean> {
    try {
      await catalog.importFn(catalog.latestHash);
      return true;
    } catch (error) {
      if (!cache) {
        this.logger.error(`Error updating catalog '${catalog.fileName}'`, error);
        return false;
      }
      this.logger.warn(`Cached catalog '${catalog.fileName}' rejected, downloading it again`, error);
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

  private async openCatalogCache(): Promise<Cache | null> {
    try {
      return typeof caches === 'undefined' ? null : await caches.open(CATALOG_CACHE_NAME);
    } catch (error) {
      this.logger.warn('Catalog cache unavailable', error);
      return null;
    }
  }

  /** Background download for the next start; the service worker applies the network rule. */
  private requestPrefetch(urls: string[]): void {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }: MessageEvent<PrefetchCatalogsResult>) => {
      this.logger.info('Catalog prefetch result', data);
      channel.port1.close();
    };
    const message: PrefetchCatalogsMessage = { type: PREFETCH_CATALOGS_MESSAGE_TYPE, urls, force: false };
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
