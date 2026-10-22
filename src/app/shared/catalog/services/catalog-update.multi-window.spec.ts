/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injector } from '@angular/core';
import { signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@services/auth/auth.service';
import { StorageService } from '@services/storage/storage.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { CatalogUpdateService } from './catalog-update.service';
import { CatalogLockService } from './catalog-lock.service';
import { CATALOG_LOCK_MANAGER } from './catalog-update.constantes';
import { FakeLockHub } from './fake-lock-hub.mock';

const ORIGIN = globalThis.location.origin;
const OLD_HASHES: Record<string, string> = {
  'maintenance-teams.csv': 'h1',
  'lines.csv': 'h2',
  'cables.csv': 'OLD',
  'chains.csv': 'h4',
  'attachments.csv': 'h5',
  'obstacle_configuration.json': 'h6'
};
const versioned = (fileName: string, hash: string): string => `${ORIGIN}/data/${fileName}?v=${hash}`;
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

describe('CatalogUpdateService — two windows sharing the same IndexedDB', () => {
  let hub: FakeLockHub;
  /** Shared by every window, like the real IndexedDB: hash stored per catalog file. */
  let storedHashes: Record<string, string>;
  /** Version a window reading the live cables table (`CablesService.getCable()`) would see right now. */
  let liveCables: string;
  let cachedUrls: Set<string>;
  let manifest: Record<string, string>;
  let controller: { postMessage: ReturnType<typeof vi.fn> } | null;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let cablesImportGate: Promise<void>;
  let cablesImport: ReturnType<typeof vi.fn>;

  const openWindow = (id: string): { service: CatalogUpdateService; close: () => void } => {
    const noop = vi.fn().mockResolvedValue(undefined);
    const injector = Injector.create({
      providers: [
        { provide: CATALOG_LOCK_MANAGER, useValue: hub.managerFor(id) },
        { provide: CatalogLockService, useClass: CatalogLockService, deps: [] },
        { provide: CatalogUpdateService, useClass: CatalogUpdateService, deps: [] },
        { provide: AuthService, useValue: { currentUser: signal({ email: 'user@example.com' }) } },
        {
          provide: StorageService,
          useValue: {
            db: {
              metadata: {
                get: async (key: string) => {
                  const value = storedHashes[key.replace('catalog_hash:', '')];
                  return value === undefined ? undefined : { value };
                }
              }
            }
          }
        },
        { provide: LoggerService, useValue: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } },
        { provide: NotificationService, useValue: { warning: vi.fn() } },
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        { provide: MaintenanceService, useValue: { importFromFile: noop } },
        { provide: LinesService, useValue: { importFromFile: noop } },
        { provide: ChainsService, useValue: { importFromFile: noop } },
        { provide: AttachmentService, useValue: { importFromFile: noop } },
        { provide: ObstaclesService, useValue: { importFromFile: noop } },
        { provide: CablesService, useValue: { importFromFile: cablesImport } }
      ]
    });
    return { service: injector.get(CatalogUpdateService), close: () => hub.closeWindow(id) };
  };

  beforeEach(() => {
    hub = new FakeLockHub();
    storedHashes = { ...OLD_HASHES };
    liveCables = 'OLD';
    cachedUrls = new Set();
    manifest = { ...OLD_HASHES };
    controller = { postMessage: vi.fn() };
    cablesImportGate = Promise.resolve();
    cablesImport = vi.fn(async (hash: string) => {
      await cablesImportGate;
      liveCables = hash;
      storedHashes['cables.csv'] = hash;
    });
    Object.defineProperty(globalThis, 'caches', {
      value: {
        open: vi.fn(async () => ({
          match: vi.fn(async (url: string) => (cachedUrls.has(url) ? new Response('csv') : undefined)),
          delete: vi.fn()
        }))
      },
      configurable: true,
      writable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', { get: () => ({ controller }), configurable: true });
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ app_version: {}, data_hashes: manifest })));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete (navigator as unknown as Record<string, unknown>)['serviceWorker'];
  });

  const publishNewCables = (cached: boolean): void => {
    manifest = { ...OLD_HASHES, 'cables.csv': 'NEW' };
    if (cached) {
      cachedUrls.add(versioned('cables.csv', 'NEW'));
    }
  };

  it('does not switch the live catalog under a window that is working, whatever the window that opens later', async () => {
    const windowA = openWindow('A');
    await windowA.service.updateCatalogsIfNeeded();
    publishNewCables(true);

    const windowB = openWindow('B');
    await windowB.service.updateCatalogsIfNeeded();

    expect(cablesImport).not.toHaveBeenCalled();
    expect(liveCables).toBe('OLD');
    expect(storedHashes['cables.csv']).toBe('OLD');
  });

  it('keeps deferring while any other window is still working, even if the first one closed', async () => {
    const windowA = openWindow('A');
    await windowA.service.updateCatalogsIfNeeded();
    publishNewCables(true);
    const windowB = openWindow('B');
    await windowB.service.updateCatalogsIfNeeded();
    windowA.close();

    await openWindow('C').service.updateCatalogsIfNeeded();

    expect(cablesImport).not.toHaveBeenCalled();
    expect(liveCables).toBe('OLD');
    windowB.close();
  });

  it('promotes the new version at the first start with no other window open', async () => {
    const windowA = openWindow('A');
    await windowA.service.updateCatalogsIfNeeded();
    publishNewCables(true);
    const windowB = openWindow('B');
    await windowB.service.updateCatalogsIfNeeded();
    windowA.close();
    windowB.close();

    await openWindow('C').service.updateCatalogsIfNeeded();

    expect(cablesImport).toHaveBeenCalledTimes(1);
    expect(cablesImport).toHaveBeenCalledWith('NEW');
    expect(liveCables).toBe('NEW');
  });

  it('still counts as working when the manifest is unreachable (offline start)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('offline'));
    const windowA = openWindow('A');
    await windowA.service.updateCatalogsIfNeeded();
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ app_version: {}, data_hashes: manifest })));
    publishNewCables(true);

    await openWindow('B').service.updateCatalogsIfNeeded();

    expect(liveCables).toBe('OLD');
  });

  it('prefetches the deferred version for a later start when it is not cached yet', async () => {
    const windowA = openWindow('A');
    await windowA.service.updateCatalogsIfNeeded();
    publishNewCables(false);

    await openWindow('B').service.updateCatalogsIfNeeded();

    expect(cablesImport).not.toHaveBeenCalled();
    expect(controller!.postMessage).toHaveBeenCalledWith(
      { type: 'PREFETCH_CATALOGS', urls: [versioned('cables.csv', 'NEW')], force: false },
      [expect.any(MessagePort)]
    );
  });

  it('never defers the first import of a catalog, even while another window is working', async () => {
    const windowA = openWindow('A');
    await windowA.service.updateCatalogsIfNeeded();
    delete storedHashes['cables.csv'];

    await openWindow('B').service.updateCatalogsIfNeeded();

    expect(cablesImport).toHaveBeenCalledWith('OLD');
  });

  it('makes a window opened during a promotion wait for it, so it never reads a half-replaced catalog', async () => {
    let release!: () => void;
    cablesImportGate = new Promise<void>((resolve) => (release = resolve));
    publishNewCables(true);
    const windowA = openWindow('A');
    const promotionInA = windowA.service.updateCatalogsIfNeeded();
    await flush();
    expect(cablesImport).toHaveBeenCalledTimes(1);

    const windowB = openWindow('B');
    let bSettled = false;
    const startInB = windowB.service.updateCatalogsIfNeeded().then(() => (bSettled = true));
    await flush();
    expect(bSettled).toBe(false);

    release();
    await Promise.all([promotionInA, startInB]);

    expect(cablesImport).toHaveBeenCalledTimes(1);
    expect(liveCables).toBe('NEW');
  });

  it('lets two windows opened together import the same version only once', async () => {
    publishNewCables(true);

    await Promise.all([
      openWindow('A').service.updateCatalogsIfNeeded(),
      openWindow('B').service.updateCatalogsIfNeeded()
    ]);

    expect(cablesImport).toHaveBeenCalledTimes(1);
    expect(liveCables).toBe('NEW');
  });
});
