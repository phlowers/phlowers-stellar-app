/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NotificationService } from '@services/notification/notification.service';
import { OnlineService } from '@services/online/online.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from '@services/user/user.service';
import { AppUpdateOrchestratorService } from '@services/worker_update/app-update-orchestrator.service';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';

class MockWorker implements Partial<Worker> {
  url: string;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => unknown) | null = null;
  onmessage: ((this: Worker, ev: MessageEvent) => unknown) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => unknown) | null = null;

  constructor(stringUrl: string | URL) {
    this.url = String(stringUrl);
  }

  postMessage(message: string): void {
    this.onmessage?.call(this as Worker, new MessageEvent<string>('message', { data: message }));
  }

  dispatchEvent(): boolean {
    return true;
  }
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockStorageService: StorageService;
  let mockWorkerService: WorkerPythonService;
  let mockOnlineService: OnlineService;
  let mockUpdateService: UpdateService;
  let mockAppUpdateOrchestratorService: AppUpdateOrchestratorService;
  let mockMaintenanceService: MaintenanceService;
  let mockLinesService: LinesService;
  let mockCablesService: CablesService;
  let mockChainsService: ChainsService;
  let mockAttachmentService: AttachmentService;
  let mockObstaclesService: ObstaclesService;
  let workerReadySubject: BehaviorSubject<boolean>;

  const mockDb = {
    users: {
      count: vi.fn(),
      toArray: vi.fn(),
      add: vi.fn(),
      clear: vi.fn()
    },
    studies: {
      count: vi.fn()
    },
    maintenance: {
      toArray: vi.fn(),
      clear: vi.fn(),
      bulkAdd: vi.fn()
    },
    lines: {
      count: vi.fn(),
      toArray: vi.fn(),
      bulkAdd: vi.fn()
    },
    metadata: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    }
  };

  beforeEach(async () => {
    mockDb.users.count = vi.fn().mockResolvedValue(1);
    vi.clearAllMocks();
    mockDb.studies.count = vi.fn().mockResolvedValue(2);
    globalThis.Worker = MockWorker as typeof Worker;
    workerReadySubject = new BehaviorSubject<boolean>(true);

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
      ready$: new BehaviorSubject<boolean>(true),
      assertProtectedTablesUnchanged: vi.fn(async (operation: () => Promise<void>) => operation()),
      db: mockDb
    } as unknown as StorageService;

    mockWorkerService = {
      setup: vi.fn(),
      ready$: workerReadySubject
    } as unknown as WorkerPythonService;

    mockOnlineService = {
      online$: new BehaviorSubject<boolean>(true)
    } as unknown as OnlineService;

    mockUpdateService = {
      checkAppVersion: vi.fn(),
      getLatestAssetList: vi.fn().mockResolvedValue(null),
      needUpdate$: new BehaviorSubject<boolean>(false)
    } as unknown as UpdateService;

    mockAppUpdateOrchestratorService = {
      initiateStartupCheck: vi.fn().mockResolvedValue(undefined),
      acceptUpdate: vi.fn()
    } as unknown as AppUpdateOrchestratorService;

    mockMaintenanceService = {
      getMaintenance: vi.fn().mockResolvedValue([]),
      importFromFile: vi.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as MaintenanceService;

    mockLinesService = {
      getLinesCount: vi.fn().mockResolvedValue(0),
      getLines: vi.fn().mockResolvedValue([]),
      importFromFile: vi.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
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
      imports: [NoopAnimationsModule, AppComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    TestBed.overrideProvider(WorkerPythonService, {
      useValue: mockWorkerService
    });
    TestBed.overrideProvider(StorageService, { useValue: mockStorageService });
    TestBed.overrideProvider(OnlineService, { useValue: mockOnlineService });
    TestBed.overrideProvider(MessageService, { useValue: mockMessageService });
    TestBed.overrideProvider(UserService, {
      useValue: {
        getUser: vi.fn().mockResolvedValue(null),
        createUser: vi.fn().mockResolvedValue(undefined),
        user$: new BehaviorSubject(null)
      }
    });
    TestBed.overrideProvider(UpdateService, { useValue: mockUpdateService });
    TestBed.overrideProvider(AppUpdateOrchestratorService, { useValue: mockAppUpdateOrchestratorService });
    TestBed.overrideProvider(MaintenanceService, {
      useValue: mockMaintenanceService
    });
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

  describe('ngOnInit', () => {
    it('should setup worker on init', () => {
      component.ngOnInit();
      expect(mockWorkerService.setup).toHaveBeenCalled();
    });
  });

  describe('setupData', () => {
    it('should skip import when stored hash matches latest hash', async () => {
      // @ts-expect-error vitest mock on service method
      mockUpdateService.getLatestAssetList.mockResolvedValue({
        data_hashes: {
          'lines.csv': 'hash-1'
        }
      });
      mockDb.metadata.get.mockResolvedValue({ value: 'hash-1' });

      await component.setupData();

      expect(mockDb.metadata.get).toHaveBeenCalledWith('catalog_hash:lines.csv');
      expect(mockLinesService.importFromFile).not.toHaveBeenCalled();
      expect(mockDb.metadata.put).not.toHaveBeenCalled();
    });

    it('should import and update metadata when hash changes', async () => {
      // @ts-expect-error vitest mock on service method
      mockUpdateService.getLatestAssetList.mockResolvedValue({
        data_hashes: {
          'lines.csv': 'new-hash'
        }
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
      expect(mockDb.metadata.put).not.toHaveBeenCalled();
    });

    it('should delegate protected table integrity assertion to StorageService', async () => {
      // @ts-expect-error vitest mock on service method
      mockUpdateService.getLatestAssetList.mockResolvedValue({});

      await component.setupData();

      expect(component.submitted()).toBe(true);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'test@example.com'
      });
      expect(component.userDialog()).toBe(false);
      expect(mockNotificationService.success).toHaveBeenCalledWith('User info set');
    });

    it('should throw when StorageService detects protected data changes during catalog sync', async () => {
      const integrityError = new Error('Protected data integrity check failed after catalog synchronization');
      (
        mockStorageService as unknown as { assertProtectedTablesUnchanged: ReturnType<typeof vi.fn> }
      ).assertProtectedTablesUnchanged.mockRejectedValue(integrityError);

      await expect(component.setupData()).rejects.toThrow(
        'Protected data integrity check failed after catalog synchronization'
      );
    });
  });
});

describe('AppComponent - HTML rendering', () => {
  let fixture: ComponentFixture<AppComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    globalThis.Worker = MockWorker as typeof Worker;

    const workerReadySubject = new BehaviorSubject<boolean>(true);

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AppComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
    TestBed.overrideProvider(WorkerPythonService, {
      useValue: { setup: vi.fn(), ready$: workerReadySubject }
    });
    TestBed.overrideProvider(StorageService, {
      useValue: {
        setPersistentStorage: vi.fn().mockResolvedValue(undefined),
        createDatabase: vi.fn().mockResolvedValue(undefined),
        ready$: new BehaviorSubject<boolean>(true),
        assertProtectedTablesUnchanged: vi.fn(async (operation: () => Promise<void>) => operation()),
        db: {
          users: {
            count: vi.fn().mockResolvedValue(0),
            toArray: vi.fn().mockResolvedValue([]),
            add: vi.fn(),
            clear: vi.fn()
          },
          studies: { count: vi.fn().mockResolvedValue(0) },
          maintenance: { toArray: vi.fn(), clear: vi.fn(), bulkAdd: vi.fn() },
          lines: { count: vi.fn(), toArray: vi.fn(), bulkAdd: vi.fn() },
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
    TestBed.overrideProvider(UserService, {
      useValue: {
        getUser: vi.fn().mockResolvedValue(null),
        createUser: vi.fn().mockResolvedValue(undefined),
        user$: new BehaviorSubject(null)
      }
    });
    TestBed.overrideProvider(AppUpdateOrchestratorService, {
      useValue: { initiateStartupCheck: vi.fn().mockResolvedValue(undefined), acceptUpdate: vi.fn() }
    });
    TestBed.overrideProvider(UpdateService, {
      useValue: {
        checkAppVersion: vi.fn(),
        getLatestAssetList: vi.fn().mockResolvedValue(null),
        needUpdate$: new BehaviorSubject<boolean>(false),
        updateLoading: vi.fn().mockReturnValue(false),
        latestVersion: vi.fn().mockReturnValue(null)
      }
    });
    TestBed.overrideProvider(MaintenanceService, {
      useValue: {
        getMaintenance: vi.fn().mockResolvedValue([]),
        importFromFile: vi.fn().mockResolvedValue(undefined),
        ready: new BehaviorSubject<boolean>(true)
      }
    });
    TestBed.overrideProvider(LinesService, {
      useValue: {
        getLinesCount: vi.fn().mockResolvedValue(0),
        getLines: vi.fn().mockResolvedValue([]),
        importFromFile: vi.fn().mockResolvedValue(undefined),
        ready: new BehaviorSubject<boolean>(true)
      }
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
});
