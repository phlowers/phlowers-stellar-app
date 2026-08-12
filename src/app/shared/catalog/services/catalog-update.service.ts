/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { AuthService } from '@services/auth/auth.service';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import type { AssetManifest } from '@services/worker_update/service-worker.interfaces';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';

/**
 * Orchestrates catalog CSV/JSON updates independently of the application
 * update flow.
 *
 * @remarks
 * Separate from `UpdateService` on purpose: catalogs must keep refreshing
 * even when the user has not yet accepted (or has explicitly refused) an
 * application update, so users are never stuck on stale reference data
 * while waiting for a large application bundle to download. Never runs
 * before authentication, and never downloads a catalog whose hash already
 * matches what is stored — only a changed catalog is fetched and imported.
 *
 * Each catalog service's `importFromFile(expectedHash)` now propagates
 * failures instead of swallowing them (see Étape 4.2/4.3): the underlying
 * Web Worker verifies the SHA-256 hash and atomically promotes staging to
 * live (recording the hash) only on success, so a rejected promise here
 * always means the catalog's stored hash was correctly left untouched.
 * One catalog failing is logged and never blocks the others.
 *
 * @category Services
 */
@Injectable({ providedIn: 'root' })
export class CatalogUpdateService {
  /** Read-only: catalogs must never be fetched for an unauthenticated user. */
  private readonly authService = inject(AuthService);
  private readonly updateService = inject(UpdateService);
  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly linesService = inject(LinesService);
  private readonly cablesService = inject(CablesService);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly obstaclesService = inject(ObstaclesService);

  private readonly importers: Record<string, (expectedHash?: string) => Promise<void>>;

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
   * No-ops entirely when the user is not authenticated (no network call, no
   * import). Compares `data_hashes` from the latest asset manifest against
   * `metadata.get('catalog_hash:<file>')`; only mismatching (or missing)
   * catalogs are downloaded and imported, one at a time. A failure on one
   * catalog is logged and never prevents the others from updating.
   */
  async updateCatalogsIfNeeded(): Promise<void> {
    if (!this.authService.currentUser()) {
      return;
    }

    const manifest = await this.fetchLatestManifestSafe();
    const dataHashes = manifest?.data_hashes ?? {};
    const hashEntries = Object.entries(dataHashes);

    if (hashEntries.length === 0) {
      // Legacy fallback for a manifest without per-file hashes: import everything.
      await this.importAllCatalogs();
      return;
    }

    for (const [fileName, importFn] of Object.entries(this.importers)) {
      const latestHash = dataHashes[fileName];
      if (!latestHash) {
        continue;
      }

      const metadataKey = `catalog_hash:${fileName}`;
      const storedHash = await this.storageService.db?.metadata.get(metadataKey);
      if (storedHash?.value === latestHash) {
        continue;
      }

      try {
        await importFn(latestHash);
      } catch (error) {
        this.logger.error(`Error updating catalog '${fileName}'`, error);
      }
    }
  }

  private async fetchLatestManifestSafe(): Promise<AssetManifest | null> {
    try {
      return await this.updateService.getLatestAssetList();
    } catch (error) {
      this.logger.warn('Unable to fetch latest asset manifest, using full catalog import fallback', error);
      return null;
    }
  }

  private async importAllCatalogs(): Promise<void> {
    for (const [fileName, importFn] of Object.entries(this.importers)) {
      try {
        await importFn();
      } catch (error) {
        this.logger.error(`Error importing catalog '${fileName}' (legacy fallback, no hash)`, error);
      }
    }
  }
}
