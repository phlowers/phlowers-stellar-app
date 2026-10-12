/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { NotificationService } from '@services/notification/notification.service';
import { OnlineService } from '@services/online/online.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '@services/auth/auth.service';
import { LoggerService } from '@services/logger/logger.service';
import { User } from '@shared/domain';
import { CatalogUpdateService } from '@shared/catalog/services/catalog-update.service';
import { TranslocoTestingModule } from '@jsverse/transloco';

class Worker {
  url: string;
  onmessage: (msg: string) => void;
  constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = () => {
      // Mock worker message handler - no-op for tests
    };
  }

  postMessage(msg: string) {
    this.onmessage(msg);
  }
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockStorageService: StorageService;
  let mockWorkerService: WorkerPythonService;
  let mockCatalogUpdateService: { updateCatalogsIfNeeded: ReturnType<typeof vi.fn> };

  const mockDb = {
    users: {
      toArray: vi.fn(),
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
      add: vi.fn()
    },
    metadata: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // @ts-expect-error worker
    globalThis.Worker = Worker;

    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockDb.users.toArray = vi.fn().mockResolvedValue([]);
    mockDb.users.add = vi.fn();
    mockDb.users.clear = vi.fn();

    mockStorageService = {
      setPersistentStorage: vi.fn().mockResolvedValue(undefined),
      createDatabase: vi.fn().mockResolvedValue(undefined),
      ready$: new BehaviorSubject<boolean>(false),
      db: mockDb
    } as unknown as StorageService;

    mockWorkerService = {
      setup: vi.fn()
    } as unknown as WorkerPythonService;

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en'
          },
          preloadLangs: true
        })
      ],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    TestBed.overrideProvider(WorkerPythonService, { useValue: mockWorkerService });
    TestBed.overrideProvider(StorageService, { useValue: mockStorageService });
    TestBed.overrideProvider(NotificationService, { useValue: mockNotificationService });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser: signal<User | null>(null) } });
    mockCatalogUpdateService = { updateCatalogsIfNeeded: vi.fn().mockResolvedValue(undefined) };
    TestBed.overrideProvider(CatalogUpdateService, { useValue: mockCatalogUpdateService });
    TestBed.overrideComponent(AppComponent, { set: { template: '' } });
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have the correct title', () => {
    expect(component.title).toEqual('phlowers-stellar-app');
  });

  describe('ngOnInit — deferred startup work', () => {
    it('should call workerService.setup() once the browser is idle', async () => {
      component.ngOnInit();
      // Heavy startup work (Pyodide worker) is deferred via
      // requestIdleCallback (falls back to setTimeout(0) under jsdom) so it
      // never competes with the critical rendering path — flush it here.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWorkerService.setup).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AppComponent - HTML rendering', () => {
  let fixture: ComponentFixture<AppComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    // @ts-expect-error worker
    globalThis.Worker = Worker;

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    TestBed.overrideProvider(WorkerPythonService, {
      useValue: { setup: vi.fn() }
    });
    TestBed.overrideProvider(StorageService, {
      useValue: {
        setPersistentStorage: vi.fn().mockResolvedValue(undefined),
        createDatabase: vi.fn().mockResolvedValue(undefined),
        ready$: new BehaviorSubject<boolean>(true),
        db: {
          users: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(undefined),
            put: vi.fn(),
            clear: vi.fn()
          },
          metadata: { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) }
        }
      }
    });
    TestBed.overrideProvider(OnlineService, {
      useValue: { online$: new BehaviorSubject<boolean>(true) }
    });
    TestBed.overrideProvider(NotificationService, {
      useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
    });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser: signal<User | null>(null) } });
    TestBed.overrideProvider(CatalogUpdateService, {
      useValue: { updateCatalogsIfNeeded: vi.fn().mockResolvedValue(undefined) }
    });

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('should render app-toast', () => {
    const el = getByTestId('app-toast');
    expect(el).toBeTruthy();
  });

  it.each([['update-dialog'], ['update-now-btn'], ['update-later-btn']])(
    'should never render the former update modal element %s',
    (testId: string) => {
      expect(getByTestId(testId)).toBeNull();
      expect(fixture.nativeElement.querySelector('p-dialog, p-progressbar')).toBeNull();
    }
  );

  describe('HTML rendering - login dialog removed', () => {
    it.each([['user-login-dialog'], ['email-input'], ['user-save-btn']])('should NOT render %s', (testId: string) => {
      const el = getByTestId(testId);
      expect(el).toBeNull();
    });
  });
});

describe('AppComponent - catalog updates after authentication', () => {
  let fixture: ComponentFixture<AppComponent>;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let mockCatalogUpdateService: { updateCatalogsIfNeeded: ReturnType<typeof vi.fn> };
  let loggerError: ReturnType<typeof vi.fn>;

  const setup = async () => {
    currentUser = signal<User | null>(null);
    loggerError = vi.fn();

    // @ts-expect-error worker
    globalThis.Worker = Worker;

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    TestBed.overrideProvider(WorkerPythonService, { useValue: { setup: vi.fn() } });
    TestBed.overrideProvider(StorageService, {
      useValue: {
        setPersistentStorage: vi.fn().mockResolvedValue(undefined),
        createDatabase: vi.fn().mockResolvedValue(undefined),
        ready$: new BehaviorSubject<boolean>(true),
        db: {
          users: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(undefined),
            put: vi.fn(),
            clear: vi.fn()
          },
          metadata: { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) }
        }
      }
    });
    TestBed.overrideProvider(NotificationService, {
      useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
    });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser } });
    TestBed.overrideProvider(LoggerService, { useValue: { error: loggerError, warn: vi.fn(), info: vi.fn() } });
    mockCatalogUpdateService = { updateCatalogsIfNeeded: vi.fn().mockResolvedValue(undefined) };
    TestBed.overrideProvider(CatalogUpdateService, { useValue: mockCatalogUpdateService });
    TestBed.overrideComponent(AppComponent, { set: { template: '' } });

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setup();
  });

  it('should never trigger catalog updates while the user is not authenticated', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockCatalogUpdateService.updateCatalogsIfNeeded).not.toHaveBeenCalled();
  });

  it('should trigger catalog updates exactly once when the user becomes authenticated', async () => {
    currentUser.set({ email: 'user@example.com' } as User);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockCatalogUpdateService.updateCatalogsIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('should log a failed catalog update and retry on the next authentication change', async () => {
    mockCatalogUpdateService.updateCatalogsIfNeeded.mockRejectedValueOnce(new Error('offline'));
    currentUser.set({ email: 'user@example.com' } as User);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loggerError).toHaveBeenCalledWith('Catalog update failed', expect.any(Error));

    currentUser.set({ email: 'other@example.com' } as User);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockCatalogUpdateService.updateCatalogsIfNeeded).toHaveBeenCalledTimes(2);
  });
});
