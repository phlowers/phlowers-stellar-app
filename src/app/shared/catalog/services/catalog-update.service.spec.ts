/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CatalogUpdateService } from './catalog-update.service';
import { AuthService } from '@services/auth/auth.service';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { User } from '@shared/domain';

describe('CatalogUpdateService', () => {
  let service: CatalogUpdateService;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let getLatestAssetList: vi.Mock;
  let metadataGet: vi.Mock;
  let logger: { error: vi.Mock; warn: vi.Mock };
  let maintenanceImport: vi.Mock;
  let linesImport: vi.Mock;
  let cablesImport: vi.Mock;
  let chainsImport: vi.Mock;
  let attachmentImport: vi.Mock;
  let obstaclesImport: vi.Mock;

  const mockManifest = (dataHashes: Record<string, string>) => ({
    app_version: { git_hash: 'h', version: '1.0.0', build_datetime_utc: '2024-01-01T00:00:00Z' },
    files: [],
    data_hashes: dataHashes
  });

  beforeEach(() => {
    currentUser = signal<User | null>({ email: 'user@example.com' } as User);
    getLatestAssetList = vi.fn().mockResolvedValue(mockManifest({}));
    metadataGet = vi.fn().mockResolvedValue(undefined);
    logger = { error: vi.fn(), warn: vi.fn() };
    maintenanceImport = vi.fn().mockResolvedValue(undefined);
    linesImport = vi.fn().mockResolvedValue(undefined);
    cablesImport = vi.fn().mockResolvedValue(undefined);
    chainsImport = vi.fn().mockResolvedValue(undefined);
    attachmentImport = vi.fn().mockResolvedValue(undefined);
    obstaclesImport = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        CatalogUpdateService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: UpdateService, useValue: { getLatestAssetList } },
        { provide: StorageService, useValue: { db: { metadata: { get: metadataGet } } } },
        { provide: LoggerService, useValue: logger },
        { provide: MaintenanceService, useValue: { importFromFile: maintenanceImport } },
        { provide: LinesService, useValue: { importFromFile: linesImport } },
        { provide: CablesService, useValue: { importFromFile: cablesImport } },
        { provide: ChainsService, useValue: { importFromFile: chainsImport } },
        { provide: AttachmentService, useValue: { importFromFile: attachmentImport } },
        { provide: ObstaclesService, useValue: { importFromFile: obstaclesImport } }
      ]
    });
    service = TestBed.inject(CatalogUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('never fetches the manifest nor imports anything when the user is not authenticated', async () => {
    currentUser.set(null);

    await service.updateCatalogsIfNeeded();

    expect(getLatestAssetList).not.toHaveBeenCalled();
    expect(cablesImport).not.toHaveBeenCalled();
  });

  it('imports nothing when every stored hash already matches the manifest', async () => {
    getLatestAssetList.mockResolvedValue(
      mockManifest({
        'maintenance-teams.csv': 'h1',
        'lines.csv': 'h2',
        'cables.csv': 'h3',
        'chains.csv': 'h4',
        'attachments.csv': 'h5',
        'obstacle_configuration.json': 'h6'
      })
    );
    metadataGet.mockImplementation(async (key: string) => ({
      value: {
        'catalog_hash:maintenance-teams.csv': 'h1',
        'catalog_hash:lines.csv': 'h2',
        'catalog_hash:cables.csv': 'h3',
        'catalog_hash:chains.csv': 'h4',
        'catalog_hash:attachments.csv': 'h5',
        'catalog_hash:obstacle_configuration.json': 'h6'
      }[key]
    }));

    await service.updateCatalogsIfNeeded();

    expect(maintenanceImport).not.toHaveBeenCalled();
    expect(linesImport).not.toHaveBeenCalled();
    expect(cablesImport).not.toHaveBeenCalled();
    expect(chainsImport).not.toHaveBeenCalled();
    expect(attachmentImport).not.toHaveBeenCalled();
    expect(obstaclesImport).not.toHaveBeenCalled();
  });

  it('imports only the single catalog whose hash changed, with the new hash', async () => {
    getLatestAssetList.mockResolvedValue(
      mockManifest({
        'maintenance-teams.csv': 'h1',
        'cables.csv': 'NEW-HASH'
      })
    );
    metadataGet.mockImplementation(async (key: string) => {
      if (key === 'catalog_hash:maintenance-teams.csv') return { value: 'h1' };
      if (key === 'catalog_hash:cables.csv') return { value: 'OLD-HASH' };
      return undefined;
    });

    await service.updateCatalogsIfNeeded();

    expect(maintenanceImport).not.toHaveBeenCalled();
    expect(cablesImport).toHaveBeenCalledTimes(1);
    expect(cablesImport).toHaveBeenCalledWith('NEW-HASH');
    expect(linesImport).not.toHaveBeenCalled();
  });

  it('imports a catalog with no stored hash at all (first time seen)', async () => {
    getLatestAssetList.mockResolvedValue(mockManifest({ 'chains.csv': 'h4' }));
    metadataGet.mockResolvedValue(undefined);

    await service.updateCatalogsIfNeeded();

    expect(chainsImport).toHaveBeenCalledWith('h4');
  });

  it('continues with other catalogs and logs when one catalog import fails', async () => {
    getLatestAssetList.mockResolvedValue(
      mockManifest({
        'cables.csv': 'NEW-CABLES',
        'chains.csv': 'NEW-CHAINS'
      })
    );
    metadataGet.mockResolvedValue(undefined);
    cablesImport.mockRejectedValue(new Error('worker boom'));

    await expect(service.updateCatalogsIfNeeded()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('cables.csv'), expect.any(Error));
    expect(chainsImport).toHaveBeenCalledWith('NEW-CHAINS');
  });

  it('imports every catalog unconditionally when the manifest has no data_hashes (legacy fallback)', async () => {
    getLatestAssetList.mockResolvedValue({ app_version: {}, files: [], data_hashes: {} });

    await service.updateCatalogsIfNeeded();

    expect(maintenanceImport).toHaveBeenCalledTimes(1);
    expect(linesImport).toHaveBeenCalledTimes(1);
    expect(cablesImport).toHaveBeenCalledTimes(1);
    expect(chainsImport).toHaveBeenCalledTimes(1);
    expect(attachmentImport).toHaveBeenCalledTimes(1);
    expect(obstaclesImport).toHaveBeenCalledTimes(1);
    expect(metadataGet).not.toHaveBeenCalled();
  });

  it('continues the legacy fallback import even when one catalog fails', async () => {
    getLatestAssetList.mockResolvedValue({ app_version: {}, files: [], data_hashes: {} });
    linesImport.mockRejectedValue(new Error('worker boom'));

    await expect(service.updateCatalogsIfNeeded()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
    expect(cablesImport).toHaveBeenCalledTimes(1);
  });

  it('falls back to importing everything when the manifest fetch itself fails', async () => {
    getLatestAssetList.mockRejectedValue(new Error('network down'));

    await service.updateCatalogsIfNeeded();

    expect(logger.warn).toHaveBeenCalled();
    expect(cablesImport).toHaveBeenCalledTimes(1);
  });
});
