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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { UpdateService, type PendingPwaAction } from '@services/worker_update/worker_update.service';
import { AuthService } from '@services/auth/auth.service';
import { User } from '@shared/domain';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
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
  let mockUpdateService: UpdateService;
  let mockMaintenanceService: MaintenanceService;
  let mockLinesService: LinesService;
  let mockCablesService: CablesService;
  let mockChainsService: ChainsService;
  let mockAttachmentService: AttachmentService;
  let mockObstaclesService: ObstaclesService;

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

    mockUpdateService = {
      checkForUpdateOnce: vi.fn().mockResolvedValue(undefined),
      getLatestAssetList: vi.fn().mockResolvedValue(null),
      pendingAction: signal<PendingPwaAction>('none'),
      needUpdate: signal(false),
      isFirstLaunch: signal(false),
      updateLoading: vi.fn().mockReturnValue(false),
      latestVersion: vi.fn().mockReturnValue(null),
      update: vi.fn(),
      install: vi.fn().mockResolvedValue(true)
    } as unknown as UpdateService;

    mockMaintenanceService = {
      importFromFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as MaintenanceService;

    mockLinesService = {
      importFromFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as LinesService;

    mockCablesService = {
      importFromFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as CablesService;

    mockChainsService = {
      importFromFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as ChainsService;

    mockAttachmentService = {
      importFromFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as AttachmentService;

    mockObstaclesService = {
      importFromFile: vi.fn().mockResolvedValue(undefined)
    } as unknown as ObstaclesService;

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        AppComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'app.installFailed': 'Install failed',
              'app.update': 'Update',
              'app.newVersionAvailable': 'New version available',
              'app.version': 'Version',
              'app.hash': 'Hash'
            }
          },
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
    TestBed.overrideProvider(StorageService, {
      useValue: {
        setPersistentStorage: vi.fn().mockResolvedValue(undefined),
        createDatabase: vi.fn().mockResolvedValue(undefined),
        ready$: new BehaviorSubject<boolean>(true),
        db: mockDb
      }
    });
    TestBed.overrideProvider(StorageService, { useValue: mockStorageService });
    TestBed.overrideProvider(NotificationService, { useValue: mockNotificationService });
    TestBed.overrideProvider(UpdateService, { useValue: mockUpdateService });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser: signal<User | null>(null) } });
    TestBed.overrideProvider(MaintenanceService, { useValue: mockMaintenanceService });
    TestBed.overrideProvider(LinesService, { useValue: mockLinesService });
    TestBed.overrideProvider(CablesService, { useValue: mockCablesService });
    TestBed.overrideProvider(ChainsService, { useValue: mockChainsService });
    TestBed.overrideProvider(AttachmentService, { useValue: mockAttachmentService });
    TestBed.overrideProvider(ObstaclesService, { useValue: mockObstaclesService });
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

  it('should never call users.clear() in any scenario', async () => {
    await component.setupData();
    expect(mockDb.users.clear).not.toHaveBeenCalled();
  });

  describe('setupData', () => {
    it('should skip import when stored hash matches latest hash', async () => {
      // @ts-expect-error vitest mock on service method
      mockUpdateService.getLatestAssetList.mockResolvedValue({
        data_hashes: { 'lines.csv': 'hash-1' }
      });
      mockDb.metadata.get.mockResolvedValue({ value: 'hash-1' });

      await component.setupData();

      expect(mockDb.metadata.get).toHaveBeenCalledWith('catalog_hash:lines.csv');
      expect(mockLinesService.importFromFile).not.toHaveBeenCalled();
    });

    it('should import and update metadata when hash changes', async () => {
      // @ts-expect-error vitest mock on service method
      mockUpdateService.getLatestAssetList.mockResolvedValue({
        data_hashes: { 'lines.csv': 'new-hash' }
      });
      mockDb.metadata.get.mockResolvedValue({ value: 'old-hash' });

      await component.setupData();

      expect(mockLinesService.importFromFile).toHaveBeenCalledTimes(1);
      expect(mockDb.metadata.put).toHaveBeenCalledWith({
        key: 'catalog_hash:lines.csv',
        value: 'new-hash',
        updated_at: expect.any(String)
      });
    });

    it('should import all catalogs when manifest has no data_hashes', async () => {
      // @ts-expect-error vitest mock on service method
      mockUpdateService.getLatestAssetList.mockResolvedValue({});

      await component.setupData();

      expect(mockMaintenanceService.importFromFile).toHaveBeenCalledTimes(1);
      expect(mockLinesService.importFromFile).toHaveBeenCalledTimes(1);
      expect(mockCablesService.importFromFile).toHaveBeenCalledTimes(1);
      expect(mockChainsService.importFromFile).toHaveBeenCalledTimes(1);
      expect(mockAttachmentService.importFromFile).toHaveBeenCalledTimes(1);
      expect(mockObstaclesService.importFromFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('ngOnInit — deferred startup work', () => {
    it('should call workerService.setup() once the browser is idle', async () => {
      const setupDataSpy = vi.spyOn(component, 'setupData').mockResolvedValue(undefined);

      component.ngOnInit();
      // Heavy startup work (Pyodide worker + catalog import) is deferred via
      // requestIdleCallback (falls back to setTimeout(0) under jsdom) so it
      // never competes with the critical rendering path — flush it here.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWorkerService.setup).toHaveBeenCalledTimes(1);
      expect(setupDataSpy).toHaveBeenCalledTimes(1);
    });

    it('should call workerService.setup() even if setupData() fails', async () => {
      vi.spyOn(component, 'setupData').mockRejectedValue(new Error('setup failed'));

      component.ngOnInit();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

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
        NoopAnimationsModule,
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
    TestBed.overrideProvider(UpdateService, {
      useValue: {
        checkForUpdateOnce: vi.fn().mockResolvedValue(undefined),
        getLatestAssetList: vi.fn().mockResolvedValue(null),
        pendingAction: signal<PendingPwaAction>('none'),
        needUpdate: signal(false),
        isFirstLaunch: signal(false),
        updateLoading: vi.fn().mockReturnValue(false),
        latestVersion: vi.fn().mockReturnValue(null),
        update: vi.fn(),
        install: vi.fn().mockResolvedValue(true)
      }
    });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser: signal<User | null>(null) } });
    TestBed.overrideProvider(MaintenanceService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(LinesService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(CablesService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(ChainsService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(AttachmentService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(ObstaclesService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('should render app-toast', () => {
    const el = getByTestId('app-toast');
    expect(el).toBeTruthy();
  });

  it('should render update-dialog', () => {
    const el = getByTestId('update-dialog');
    expect(el).toBeTruthy();
  });

  describe('HTML rendering - login dialog removed', () => {
    it('should NOT render user-login-dialog', () => {
      const el = getByTestId('user-login-dialog');
      expect(el).toBeNull();
    });

    it('should NOT render email-input', () => {
      const el = getByTestId('email-input');
      expect(el).toBeNull();
    });

    it('should NOT render user-save-btn', () => {
      const el = getByTestId('user-save-btn');
      expect(el).toBeNull();
    });
  });
});

describe('AppComponent - auth-gated PWA flow', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let pendingAction: ReturnType<typeof signal<PendingPwaAction>>;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let installSpy: ReturnType<typeof vi.fn>;

  const setup = async () => {
    pendingAction = signal<PendingPwaAction>('none');
    currentUser = signal<User | null>(null);
    installSpy = vi.fn().mockResolvedValue(true);

    // @ts-expect-error worker
    globalThis.Worker = Worker;

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
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
    TestBed.overrideProvider(UpdateService, {
      useValue: {
        checkForUpdateOnce: vi.fn().mockResolvedValue(undefined),
        getLatestAssetList: vi.fn().mockResolvedValue(null),
        pendingAction,
        needUpdate: signal(false),
        isFirstLaunch: signal(false),
        updateLoading: () => false,
        latestVersion: () => null,
        update: vi.fn(),
        install: installSpy
      }
    });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser } });
    TestBed.overrideProvider(MaintenanceService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(LinesService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(CablesService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(ChainsService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(AttachmentService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(ObstaclesService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideComponent(AppComponent, { set: { template: '' } });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setup();
  });

  it('should keep dialog closed and not auto-install when user is not authenticated (first-install pending)', async () => {
    pendingAction.set('first-install');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isUpdateDialogOpen()).toBe(false);
    expect(installSpy).not.toHaveBeenCalled();
  });

  it('should keep dialog closed and not surface update when user is not authenticated (update-available pending)', async () => {
    pendingAction.set('update-available');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isUpdateDialogOpen()).toBe(false);
    expect(installSpy).not.toHaveBeenCalled();
  });

  it('should auto-trigger install and keep dialog closed when authenticated user has first-install pending', async () => {
    pendingAction.set('first-install');
    currentUser.set({ email: 'user@example.com' } as User);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(installSpy).toHaveBeenCalledTimes(1);
    expect(component.isUpdateDialogOpen()).toBe(false);
  });

  it('should auto-trigger install only once across re-renders', async () => {
    pendingAction.set('first-install');
    currentUser.set({ email: 'user@example.com' } as User);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(installSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the update dialog when authenticated user has update-available pending', async () => {
    currentUser.set({ email: 'user@example.com' } as User);
    pendingAction.set('update-available');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(installSpy).not.toHaveBeenCalled();
    expect(component.isUpdateDialogOpen()).toBe(true);
  });

  it('should defer auto-install until authentication completes (delayed login)', async () => {
    pendingAction.set('first-install');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(installSpy).not.toHaveBeenCalled();

    currentUser.set({ email: 'user@example.com' } as User);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(installSpy).toHaveBeenCalledTimes(1);
    expect(component.isUpdateDialogOpen()).toBe(false);
  });
});

describe('AppComponent - automatic first-install resilience', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let pendingAction: ReturnType<typeof signal<PendingPwaAction>>;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let installSpy: ReturnType<typeof vi.fn>;
  let notificationError: ReturnType<typeof vi.fn>;
  let loggerError: ReturnType<typeof vi.fn>;
  let loggerWarn: ReturnType<typeof vi.fn>;
  let originalServiceWorker: PropertyDescriptor | undefined;

  interface ResilienceOptions {
    serviceWorkerSupported?: boolean;
    swReadyResult?: 'resolve' | 'reject';
    install?: ReturnType<typeof vi.fn>;
  }

  const setup = async ({
    serviceWorkerSupported = true,
    swReadyResult = 'resolve',
    install
  }: ResilienceOptions = {}) => {
    pendingAction = signal<PendingPwaAction>('first-install');
    currentUser = signal<User | null>({ email: 'user@example.com' } as User);
    installSpy = install ?? vi.fn().mockResolvedValue(true);
    notificationError = vi.fn();
    loggerError = vi.fn();
    loggerWarn = vi.fn();

    // @ts-expect-error worker
    globalThis.Worker = Worker;

    // Stub navigator.serviceWorker.ready to deterministically resolve/reject.
    originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready:
          swReadyResult === 'resolve'
            ? Promise.resolve({ active: { postMessage: vi.fn() } })
            : Promise.reject(new Error('SW never ready')),
        getRegistration: vi.fn(),
        addEventListener: vi.fn()
      }
    });

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
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
          users: { toArray: vi.fn().mockResolvedValue([]) },
          metadata: { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) }
        }
      }
    });
    TestBed.overrideProvider(NotificationService, {
      useValue: { success: vi.fn(), error: notificationError, info: vi.fn(), warning: vi.fn() }
    });
    TestBed.overrideProvider(UpdateService, {
      useValue: {
        checkForUpdateOnce: vi.fn().mockResolvedValue(undefined),
        getLatestAssetList: vi.fn().mockResolvedValue(null),
        pendingAction,
        needUpdate: signal(false),
        isFirstLaunch: signal(false),
        updateLoading: () => false,
        latestVersion: () => null,
        update: vi.fn(),
        install: installSpy,
        serviceWorkerSupported
      }
    });
    TestBed.overrideProvider(AuthService, { useValue: { currentUser } });
    TestBed.overrideProvider(MaintenanceService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(LinesService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(CablesService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(ChainsService, { useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) } });
    TestBed.overrideProvider(AttachmentService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });
    TestBed.overrideProvider(ObstaclesService, {
      useValue: { importFromFile: vi.fn().mockResolvedValue(undefined) }
    });

    // Patch the LoggerService used by AppComponent via DI override.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LoggerService } = await import('@core/services/logger/logger.service');
    TestBed.overrideProvider(LoggerService, {
      useValue: { error: loggerError, warn: loggerWarn, info: vi.fn(), debug: vi.fn() }
    });

    TestBed.overrideComponent(AppComponent, { set: { template: '' } });
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  };

  afterEach(() => {
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
    } else {
      // @ts-expect-error cleanup
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    }
  });

  it('should retry install once Service Worker becomes ready (deferred happy path)', async () => {
    const install = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await setup({ serviceWorkerSupported: true, swReadyResult: 'resolve', install });

    fixture.detectChanges();
    // Allow chained microtasks (install → SW.ready → retry install) to settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(install).toHaveBeenCalledTimes(2);
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('deferred'));
    expect(notificationError).not.toHaveBeenCalled();
  });

  it('should reset guard and notify user when retry install also fails to start', async () => {
    const install = vi.fn().mockResolvedValue(false);
    await setup({ serviceWorkerSupported: true, swReadyResult: 'resolve', install });

    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(install).toHaveBeenCalledTimes(2);
    expect(notificationError).toHaveBeenCalledTimes(1);
    expect(component['autoInstallTriggered']()).toBe(false);
  });

  it('should reset guard and notify user when serviceWorker.ready rejects', async () => {
    const install = vi.fn().mockResolvedValue(false);
    await setup({ serviceWorkerSupported: true, swReadyResult: 'reject', install });

    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Service Worker never became ready'),
      expect.any(Error)
    );
    expect(notificationError).toHaveBeenCalledTimes(1);
    expect(component['autoInstallTriggered']()).toBe(false);
  });

  it('should reset guard and notify user when install rejects', async () => {
    const install = vi.fn().mockRejectedValue(new Error('postMessage failed'));
    await setup({ serviceWorkerSupported: true, swReadyResult: 'resolve', install });

    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Automatic first-install failed'),
      expect.any(Error)
    );
    expect(notificationError).toHaveBeenCalledTimes(1);
    expect(component['autoInstallTriggered']()).toBe(false);
  });

  it('should reset guard without notifying when Service Worker API is unavailable', async () => {
    const install = vi.fn().mockResolvedValue(false);
    await setup({ serviceWorkerSupported: false, swReadyResult: 'resolve', install });

    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(install).toHaveBeenCalledTimes(1);
    expect(notificationError).not.toHaveBeenCalled();
    expect(component['autoInstallTriggered']()).toBe(false);
  });

  it('should abort retry path on component destroy without notifying', async () => {
    const install = vi.fn().mockResolvedValue(false);
    await setup({ serviceWorkerSupported: true, swReadyResult: 'resolve', install });

    fixture.detectChanges();
    fixture.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(notificationError).not.toHaveBeenCalled();
  });
});
