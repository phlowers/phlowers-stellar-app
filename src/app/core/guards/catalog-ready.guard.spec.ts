/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { catalogReadyGuard } from './catalog-ready.guard';
import { CatalogUpdateService } from '@shared/catalog/services/catalog-update.service';
import { LoggerService } from '@core/services/logger/logger.service';

describe('catalogReadyGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  let updateCatalogsIfNeeded: ReturnType<typeof vi.fn>;
  let logger: { error: ReturnType<typeof vi.fn> };

  const runGuard = () => TestBed.runInInjectionContext(() => catalogReadyGuard(route, state)) as Promise<boolean>;

  beforeEach(() => {
    updateCatalogsIfNeeded = vi.fn().mockResolvedValue(undefined);
    logger = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: CatalogUpdateService, useValue: { updateCatalogsIfNeeded } },
        { provide: LoggerService, useValue: logger }
      ]
    });
  });

  it('holds navigation while a delayed catalog import is running, then allows it', async () => {
    let finishImport!: () => void;
    updateCatalogsIfNeeded.mockReturnValue(new Promise<void>((resolve) => (finishImport = resolve)));

    let result: boolean | undefined;
    const pending = runGuard().then((value) => (result = value));
    await Promise.resolve();
    await Promise.resolve();

    expect(result).toBeUndefined();

    finishImport();
    await pending;

    expect(result).toBe(true);
  });

  it('allows navigation and logs when the catalog update fails', async () => {
    updateCatalogsIfNeeded.mockRejectedValue(new Error('offline'));

    await expect(runGuard()).resolves.toBe(true);

    expect(logger.error).toHaveBeenCalledWith('Catalog update failed', expect.any(Error));
  });
});
