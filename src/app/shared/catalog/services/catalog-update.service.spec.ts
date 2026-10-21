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
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { TranslocoService } from '@jsverse/transloco';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { User } from '@shared/domain';
import { CatalogIntegrityError } from '@shared/catalog/csv-import/csv-import.errors';
import { CATALOG_LOCK_MANAGER } from './catalog-update.constantes';
import { FakeLockHub } from './fake-lock-hub.mock';

describe('CatalogUpdateService', () => {
  const ORIGIN = globalThis.location.origin;
  const ALL_HASHES = {
    'maintenance-teams.csv': 'h1',
    'lines.csv': 'h2',
    'cables.csv': 'h3',
    'chains.csv': 'h4',
    'attachments.csv': 'h5',
    'obstacle_configuration.json': 'h6'
  };

  let service: CatalogUpdateService;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let storedHashes: Record<string, string>;
  let cachedUrls: Set<string>;
  let cache: { match: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let controller: { postMessage: ReturnType<typeof vi.fn> } | null;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let logger: { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  let notificationService: { warning: ReturnType<typeof vi.fn> };
  let importers: Record<string, ReturnType<typeof vi.fn>>;

  const serveManifest = (dataHashes: Record<string, string>): void => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ app_version: {}, data_hashes: dataHashes })));
  };
  const versioned = (fileName: string, hash: string): string => `${ORIGIN}/data/${fileName}?v=${hash}`;

  beforeEach(() => {
    currentUser = signal<User | null>({ email: 'user@example.com' } as User);
    storedHashes = { ...ALL_HASHES };
    cachedUrls = new Set();
    cache = {
      match: vi.fn(async (url: string) => (cachedUrls.has(url) ? new Response('csv') : undefined)),
      delete: vi.fn(async (url: string) => cachedUrls.delete(url))
    };
    Object.defineProperty(globalThis, 'caches', {
      value: { open: vi.fn(async () => cache) },
      configurable: true,
      writable: true
    });
    controller = { postMessage: vi.fn() };
    Object.defineProperty(navigator, 'serviceWorker', {
      get: () => ({ controller }),
      configurable: true
    });
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    serveManifest(ALL_HASHES);
    logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    notificationService = { warning: vi.fn() };
    importers = {
      'maintenance-teams.csv': vi.fn().mockResolvedValue(undefined),
      'lines.csv': vi.fn().mockResolvedValue(undefined),
      'cables.csv': vi.fn().mockResolvedValue(undefined),
      'chains.csv': vi.fn().mockResolvedValue(undefined),
      'attachments.csv': vi.fn().mockResolvedValue(undefined),
      'obstacle_configuration.json': vi.fn().mockResolvedValue(undefined)
    };
    const metadataGet = vi.fn(async (key: string) => {
      const value = storedHashes[key.replace('catalog_hash:', '')];
      return value === undefined ? undefined : { value };
    });

    TestBed.configureTestingModule({
      providers: [
        CatalogUpdateService,
        // Fresh lock state per test: a real navigator.locks would keep the working-session lock across tests.
        { provide: CATALOG_LOCK_MANAGER, useFactory: () => new FakeLockHub().managerFor('window') },
        { provide: AuthService, useValue: { currentUser } },
        { provide: StorageService, useValue: { db: { metadata: { get: metadataGet } } } },
        { provide: LoggerService, useValue: logger },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string, params?: Record<string, unknown>) => `${key}:${params?.['catalogs']}` }
        },
        { provide: MaintenanceService, useValue: { importFromFile: importers['maintenance-teams.csv'] } },
        { provide: LinesService, useValue: { importFromFile: importers['lines.csv'] } },
        { provide: CablesService, useValue: { importFromFile: importers['cables.csv'] } },
        { provide: ChainsService, useValue: { importFromFile: importers['chains.csv'] } },
        { provide: AttachmentService, useValue: { importFromFile: importers['attachments.csv'] } },
        { provide: ObstaclesService, useValue: { importFromFile: importers['obstacle_configuration.json'] } }
      ]
    });
    service = TestBed.inject(CatalogUpdateService);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete (navigator as unknown as Record<string, unknown>)['serviceWorker'];
  });

  const importedFiles = (): string[] =>
    Object.entries(importers)
      .filter(([, importFn]) => importFn.mock.calls.length > 0)
      .map(([fileName]) => fileName);

  it('never fetches the manifest nor imports anything when the user is not authenticated', async () => {
    currentUser.set(null);

    await service.updateCatalogsIfNeeded();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(importedFiles()).toEqual([]);
  });

  it('reads the catalog hashes from /catalog-manifest.json, network only', async () => {
    await service.updateCatalogsIfNeeded();

    expect(fetchSpy).toHaveBeenCalledWith('/catalog-manifest.json', expect.objectContaining({ cache: 'no-store' }));
  });

  it('imports nothing when every stored hash already matches the manifest', async () => {
    await service.updateCatalogsIfNeeded();

    expect(importedFiles()).toEqual([]);
    expect(controller!.postMessage).not.toHaveBeenCalled();
  });

  it('leaves the catalogs as they are when the manifest is unreachable', async () => {
    fetchSpy.mockRejectedValue(new TypeError('offline'));

    await service.updateCatalogsIfNeeded();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Catalog manifest unavailable'));
    expect(importedFiles()).toEqual([]);
  });

  it('imports immediately a new version already in the cache, without prefetching it', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });
    cachedUrls.add(versioned('cables.csv', 'NEW'));

    await service.updateCatalogsIfNeeded();

    expect(importedFiles()).toEqual(['cables.csv']);
    expect(importers['cables.csv']).toHaveBeenCalledWith('NEW');
    expect(controller!.postMessage).not.toHaveBeenCalled();
  });

  it('prefetches a new version absent from the cache for the next start, without importing it', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });

    await service.updateCatalogsIfNeeded();

    expect(importedFiles()).toEqual([]);
    expect(controller!.postMessage).toHaveBeenCalledWith(
      { type: 'PREFETCH_CATALOGS', urls: [versioned('cables.csv', 'NEW')], force: false },
      [expect.any(MessagePort)]
    );
  });

  it('sends the manifest size of the catalogs to prefetch so the service worker can protect the reserve', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ data_hashes: { ...ALL_HASHES, 'cables.csv': 'NEW' }, data_sizes: { 'cables.csv': 1234 } })
      )
    );

    await service.updateCatalogsIfNeeded();

    expect(controller!.postMessage).toHaveBeenCalledWith(
      {
        type: 'PREFETCH_CATALOGS',
        urls: [versioned('cables.csv', 'NEW')],
        force: false,
        sizes: { [versioned('cables.csv', 'NEW')]: 1234 }
      },
      [expect.any(MessagePort)]
    );
  });

  it('logs the prefetch result posted back by the service worker', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });
    await service.updateCatalogsIfNeeded();
    const port = controller!.postMessage.mock.calls[0][1][0] as MessagePort;

    port.postMessage({ refused: 'downlink-below-threshold', cached: [], failed: [] });
    await vi.waitFor(() =>
      expect(logger.info).toHaveBeenCalledWith('Catalog prefetch result', {
        refused: 'downlink-below-threshold',
        cached: [],
        failed: []
      })
    );
  });

  it('imports right away, whatever the network, a catalog never imported yet', async () => {
    delete storedHashes['chains.csv'];

    await service.updateCatalogsIfNeeded();

    expect(importedFiles()).toEqual(['chains.csv']);
    expect(importers['chains.csv']).toHaveBeenCalledWith('h4');
    expect(controller!.postMessage).not.toHaveBeenCalled();
  });

  it('imports directly when no service worker controls the page (nothing to prefetch with)', async () => {
    controller = null;
    serveManifest({ ...ALL_HASHES, 'lines.csv': 'NEW' });

    await service.updateCatalogsIfNeeded();

    expect(importers['lines.csv']).toHaveBeenCalledWith('NEW');
  });

  it('evicts a cached copy that fails verification and retries once from the network', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });
    cachedUrls.add(versioned('cables.csv', 'NEW'));
    importers['cables.csv']
      .mockRejectedValueOnce(new CatalogIntegrityError('hash mismatch'))
      .mockResolvedValueOnce(undefined);

    await service.updateCatalogsIfNeeded();

    expect(cache.delete).toHaveBeenCalledWith(versioned('cables.csv', 'NEW'));
    expect(importers['cables.csv']).toHaveBeenCalledTimes(2);
    expect(notificationService.warning).not.toHaveBeenCalled();
  });

  it('keeps the cached copy and does not retry when the failure is not an integrity error', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });
    cachedUrls.add(versioned('cables.csv', 'NEW'));
    importers['cables.csv'].mockRejectedValue(new DOMException('quota', 'QuotaExceededError'));

    await service.updateCatalogsIfNeeded();

    expect(cache.delete).not.toHaveBeenCalled();
    expect(cachedUrls.has(versioned('cables.csv', 'NEW'))).toBe(true);
    expect(importers['cables.csv']).toHaveBeenCalledTimes(1);
    expect(notificationService.warning).toHaveBeenCalledWith(expect.stringContaining('cables.csv'));
  });

  it('reports the catalog as failed when the retry fails too', async () => {
    serveManifest({ ...ALL_HASHES, 'cables.csv': 'NEW' });
    cachedUrls.add(versioned('cables.csv', 'NEW'));
    importers['cables.csv'].mockRejectedValue(new CatalogIntegrityError('hash mismatch'));

    await service.updateCatalogsIfNeeded();

    expect(importers['cables.csv']).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('cables.csv'), expect.any(Error));
    expect(notificationService.warning).toHaveBeenCalledWith(expect.stringContaining('cables.csv'));
  });

  it('continues with other catalogs and notifies once when imports fail', async () => {
    delete storedHashes['cables.csv'];
    delete storedHashes['chains.csv'];
    importers['cables.csv'].mockRejectedValue(new Error('worker boom'));
    importers['chains.csv'].mockRejectedValue(new Error('worker boom'));

    await expect(service.updateCatalogsIfNeeded()).resolves.toBeUndefined();

    expect(importers['cables.csv']).toHaveBeenCalledTimes(1);
    expect(importers['chains.csv']).toHaveBeenCalledTimes(1);
    expect(notificationService.warning).toHaveBeenCalledTimes(1);
    expect(notificationService.warning).toHaveBeenCalledWith(expect.stringContaining('cables.csv, chains.csv'));
  });

  it('still imports never-imported catalogs when Cache Storage is unavailable', async () => {
    Object.defineProperty(globalThis, 'caches', {
      value: { open: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
      writable: true
    });
    delete storedHashes['lines.csv'];

    await service.updateCatalogsIfNeeded();

    expect(importers['lines.csv']).toHaveBeenCalledWith('h2');
    expect(logger.warn).toHaveBeenCalledWith('Catalog cache unavailable', expect.any(Error));
  });

  describe('shared startup run', () => {
    it('shares one run between concurrent callers and does not rerun once settled', async () => {
      delete storedHashes['lines.csv'];

      await Promise.all([service.updateCatalogsIfNeeded(), service.updateCatalogsIfNeeded()]);
      await service.updateCatalogsIfNeeded();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(importers['lines.csv']).toHaveBeenCalledTimes(1);
    });

    it('stays pending while a delayed import is running and settles once it completes', async () => {
      delete storedHashes['cables.csv'];
      let finishImport!: () => void;
      importers['cables.csv'].mockReturnValue(new Promise<void>((resolve) => (finishImport = resolve)));

      let settled = false;
      const run = service.updateCatalogsIfNeeded().then(() => (settled = true));
      const secondCaller = service.updateCatalogsIfNeeded();
      await vi.waitFor(() => expect(importers['cables.csv']).toHaveBeenCalled());
      await Promise.resolve();

      expect(settled).toBe(false);

      finishImport();
      await Promise.all([run, secondCaller]);

      expect(settled).toBe(true);
    });

    it('lets a later call retry after the run rejected', async () => {
      delete storedHashes['lines.csv'];
      // A Response body can only be read once: serve a fresh manifest to each run.
      fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ data_hashes: ALL_HASHES })));
      const metadataGet = TestBed.inject(StorageService).db!.metadata.get as unknown as ReturnType<typeof vi.fn>;
      metadataGet.mockRejectedValueOnce(new Error('db down'));

      await expect(service.updateCatalogsIfNeeded()).rejects.toThrow('db down');
      await expect(service.updateCatalogsIfNeeded()).resolves.toBeUndefined();

      expect(importers['lines.csv']).toHaveBeenCalledTimes(1);
    });
  });
});
