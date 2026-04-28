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
import { UpdateService } from '@services/worker_update/worker_update.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';

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
      needUpdate: signal(false),
      isFirstLaunch: signal(false),
      updateLoading: vi.fn().mockReturnValue(false),
      latestVersion: vi.fn().mockReturnValue(null),
      update: vi.fn()
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
      imports: [NoopAnimationsModule, AppComponent],
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

  describe('ngOnInit — V2 startup sequence', () => {
    it('should call workerService.setup() even if setupData() fails', async () => {
      vi.spyOn(component, 'setupData').mockRejectedValue(new Error('setup failed'));

      component.ngOnInit();
      await fixture.whenStable();

      expect(mockWorkerService.setup).toHaveBeenCalled();
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
      imports: [NoopAnimationsModule, AppComponent],
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
        needUpdate: signal(false),
        isFirstLaunch: signal(false),
        updateLoading: vi.fn().mockReturnValue(false),
        latestVersion: vi.fn().mockReturnValue(null),
        update: vi.fn()
      }
    });
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
