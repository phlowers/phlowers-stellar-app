/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '@services/auth/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('authGuard', () => {
  let authServiceMock: { currentUser: vi.Mock; tryRestoreFromCache: vi.Mock };
  let routerMock: { createUrlTree: vi.Mock };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      currentUser: vi.fn(),
      tryRestoreFromCache: vi.fn().mockResolvedValue(false)
    };

    routerMock = {
      createUrlTree: vi.fn().mockReturnValue('/login')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('should allow navigation when a user is authenticated', async () => {
    authServiceMock.currentUser.mockReturnValue({ email: 'test@example.com' });

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
    expect(authServiceMock.tryRestoreFromCache).not.toHaveBeenCalled();
  });

  it('should try to restore from cache when currentUser is null', async () => {
    authServiceMock.currentUser.mockReturnValue(null);
    authServiceMock.tryRestoreFromCache.mockResolvedValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
    expect(authServiceMock.tryRestoreFromCache).toHaveBeenCalledTimes(1);
  });

  it('should redirect to /login when no user and cache restore fails', async () => {
    authServiceMock.currentUser.mockReturnValue(null);
    authServiceMock.tryRestoreFromCache.mockResolvedValue(false);

    await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
