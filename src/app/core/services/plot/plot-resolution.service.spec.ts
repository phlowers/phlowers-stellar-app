/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { PlotResolutionService } from './plot-resolution.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';

interface MockWorkerPythonService {
  readonly ready: boolean;
  readonly ready$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
  runTask: ReturnType<typeof vi.fn>;
  setReady: (value: boolean) => void;
}

const buildMockWorker = (): MockWorkerPythonService => {
  let readyValue = false;
  const readySubject = new BehaviorSubject<boolean>(false);
  return {
    get ready() {
      return readyValue;
    },
    get ready$() {
      return readySubject.asObservable();
    },
    runTask: vi.fn(),
    setReady: (value: boolean) => {
      readyValue = value;
      readySubject.next(value);
    }
  };
};

describe('PlotResolutionService', () => {
  let service: PlotResolutionService;
  let mockWorkerPythonService: MockWorkerPythonService;

  beforeEach(() => {
    globalThis.localStorage.clear();
    mockWorkerPythonService = buildMockWorker();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlotResolutionService,
        { provide: WorkerPythonService, useValue: mockWorkerPythonService as unknown as WorkerPythonService }
      ]
    });

    service = TestBed.inject(PlotResolutionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize resolution to 100 by default', () => {
      expect(service.resolution()).toBe(100);
    });

    it('should initialize appliedResolution to null', () => {
      expect(service.appliedResolution()).toBeNull();
    });

    it('should initialize defaultResolution to 100', () => {
      expect(service.defaultResolution()).toBe(100);
    });
  });

  describe('localStorage restore', () => {
    const buildFreshService = (worker: MockWorkerPythonService) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          PlotResolutionService,
          { provide: WorkerPythonService, useValue: worker as unknown as WorkerPythonService }
        ]
      });
      return TestBed.inject(PlotResolutionService);
    };

    it('should restore resolution from localStorage if valid', () => {
      globalThis.localStorage.setItem('plotResolution', '75');
      const freshService = buildFreshService(mockWorkerPythonService);
      expect(freshService.resolution()).toBe(75);
    });

    it('should not restore resolution from localStorage if below minimum (25)', () => {
      globalThis.localStorage.setItem('plotResolution', '10');
      const freshService = buildFreshService(mockWorkerPythonService);
      expect(freshService.resolution()).toBe(100);
    });

    it('should not restore resolution from localStorage if non-finite', () => {
      globalThis.localStorage.setItem('plotResolution', 'invalid');
      const freshService = buildFreshService(mockWorkerPythonService);
      expect(freshService.resolution()).toBe(100);
    });
  });

  describe('worker ready — getConfig effect', () => {
    it('should update defaultResolution when worker becomes ready', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({ result: { resolution: 200 }, error: null });
      mockWorkerPythonService.setReady(true);
      TestBed.flushEffects();
      await mockWorkerPythonService.runTask.mock.results[0]?.value;
      expect(service.defaultResolution()).toBe(200);
    });

    it('should clamp resolution to defaultResolution when it exceeds loaded config', async () => {
      service.resolution.set(150);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: { resolution: 100 }, error: null });
      mockWorkerPythonService.setReady(true);
      TestBed.flushEffects();
      await mockWorkerPythonService.runTask.mock.results[0]?.value;
      expect(service.resolution()).toBe(100);
    });

    it('should not call getConfig task when worker is not ready', () => {
      TestBed.flushEffects();
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should not update defaultResolution when result has no resolution field', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({ result: {}, error: null });
      mockWorkerPythonService.setReady(true);
      TestBed.flushEffects();
      await mockWorkerPythonService.runTask.mock.results[0]?.value;
      expect(service.defaultResolution()).toBe(100);
    });
  });

  describe('setResolution', () => {
    it('should update resolution signal and localStorage', () => {
      service.setResolution(75);
      expect(service.resolution()).toBe(75);
      expect(globalThis.localStorage.getItem('plotResolution')).toBe('75');
    });

    it('should clamp value to minimum (25)', () => {
      service.setResolution(5);
      expect(service.resolution()).toBe(25);
    });

    it('should clamp to defaultResolution when exceeding max', () => {
      service.defaultResolution.set(100);
      service.setResolution(999);
      expect(service.resolution()).toBe(100);
    });

    it('should not update if value is unchanged', () => {
      service.setResolution(75);
      const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
      service.setResolution(75);
      expect(storageSpy).not.toHaveBeenCalled();
      storageSpy.mockRestore();
    });

    it('should normalize non-finite value to defaultResolution', () => {
      service.setResolution(NaN);
      expect(Number.isFinite(service.resolution())).toBe(true);
    });
  });

  describe('applyResolution', () => {
    it('should do nothing when worker is not ready', async () => {
      await service.applyResolution(75);
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should do nothing when resolution is already applied', async () => {
      mockWorkerPythonService.setReady(true);
      service.appliedResolution.set(75);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: null });
      await service.applyResolution(75);
      const setResolutionCalls = mockWorkerPythonService.runTask.mock.calls.filter(
        (call: unknown[]) => call[0] === Task.setResolution
      );
      expect(setResolutionCalls.length).toBe(0);
    });

    it('should run task and update appliedResolution when successful', async () => {
      mockWorkerPythonService.setReady(true);
      service.appliedResolution.set(null);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: null });
      await service.applyResolution(75);
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.setResolution, { resolution: 75 });
      expect(service.appliedResolution()).toBe(75);
    });

    it('should not update appliedResolution when task returns error', async () => {
      mockWorkerPythonService.setReady(true);
      service.appliedResolution.set(null);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: TaskError.CALCULATION_ERROR });
      await service.applyResolution(75);
      expect(service.appliedResolution()).toBeNull();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe on destroy', () => {
      const unsubscribeSpy = vi.fn();
      (service as unknown as { subscription: { unsubscribe: () => void } | null }).subscription = {
        unsubscribe: unsubscribeSpy
      };
      service.ngOnDestroy();
      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
