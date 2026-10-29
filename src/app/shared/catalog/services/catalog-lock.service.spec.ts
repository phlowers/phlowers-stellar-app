/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { LoggerService } from '@core/services/logger/logger.service';
import { CatalogLockService } from './catalog-lock.service';
import { CATALOG_LOCK_MANAGER, CATALOG_WORKING_SESSION_LOCK } from './catalog-update.constantes';
import { FakeLockHub } from './fake-lock-hub.mock';

describe('CatalogLockService', () => {
  let logger: { warn: ReturnType<typeof vi.fn> };

  const create = (lockManager: LockManager | undefined): CatalogLockService => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: logger },
        { provide: CATALOG_LOCK_MANAGER, useValue: lockManager }
      ]
    });
    return TestBed.inject(CatalogLockService);
  };

  beforeEach(() => {
    logger = { warn: vi.fn() };
  });

  describe('with the Web Locks API', () => {
    it('serializes tasks', async () => {
      const service = create(new FakeLockHub().managerFor('A'));
      const order: string[] = [];
      let release!: () => void;
      const first = service.runSerialized(async () => {
        order.push('first:start');
        await new Promise<void>((resolve) => (release = resolve));
        order.push('first:end');
      });
      const second = service.runSerialized(async () => {
        order.push('second');
      });
      await Promise.resolve();

      release();
      await Promise.all([first, second]);

      expect(order).toEqual(['first:start', 'first:end', 'second']);
    });

    it('runs the promotion task when no window is working', async () => {
      const service = create(new FakeLockHub().managerFor('A'));

      await expect(service.runIfNoWorkingSession(async () => 42)).resolves.toEqual({ granted: true, value: 42 });
    });

    it('refuses the promotion without waiting when another window is working', async () => {
      const hub = new FakeLockHub();
      void hub
        .managerFor('B')
        .request(CATALOG_WORKING_SESSION_LOCK, { mode: 'shared' }, () => new Promise<void>(() => undefined));
      await Promise.resolve();
      const task = vi.fn().mockResolvedValue(1);

      await expect(create(hub.managerFor('A')).runIfNoWorkingSession(task)).resolves.toEqual({ granted: false });
      expect(task).not.toHaveBeenCalled();
    });

    it('refuses the promotion once this very window has joined the working session', async () => {
      const service = create(new FakeLockHub().managerFor('A'));
      await service.joinWorkingSession();

      await expect(service.runIfNoWorkingSession(async () => 1)).resolves.toEqual({ granted: false });
    });

    it('joins the working session only once', async () => {
      const manager = new FakeLockHub().managerFor('A');
      const request = vi.spyOn(manager, 'request');
      const service = create(manager);

      await service.joinWorkingSession();
      await service.joinWorkingSession();

      expect(request).toHaveBeenCalledTimes(1);
    });

    it('does not block the window when the lock request is rejected', async () => {
      const manager = { request: vi.fn().mockRejectedValue(new Error('SecurityError')) } as unknown as LockManager;

      await expect(create(manager).joinWorkingSession()).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith('Catalog working-session lock unavailable', expect.any(Error));
    });
  });

  describe('without the Web Locks API', () => {
    it('runs every task immediately and warns once', async () => {
      const service = create(undefined);

      await expect(service.runSerialized(async () => 'done')).resolves.toBe('done');
      await expect(service.runIfNoWorkingSession(async () => 'promoted')).resolves.toEqual({
        granted: true,
        value: 'promoted'
      });
      await expect(service.joinWorkingSession()).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
