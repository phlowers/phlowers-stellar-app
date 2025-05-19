/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { WorkerService } from './worker.service';
import { Task } from './tasks';
import { firstValueFrom } from 'rxjs';

describe('WorkerService', () => {
  let service: WorkerService;
  let mockWorker: any;
  let postMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock the Worker class
    mockWorker = {
      postMessage: jest.fn(),
      onmessage: null
    };

    // Mock the Worker constructor
    (global as any).Worker = jest.fn().mockImplementation(() => mockWorker);

    // Mock URL constructor
    (global as any).URL = jest.fn().mockImplementation(() => 'mocked-url');

    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkerService);

    // Spy on worker's postMessage
    postMessageSpy = jest.spyOn(mockWorker, 'postMessage');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with ready state as false', () => {
    // @ts-expect-error - We are testing the private property
    expect(service._ready.getValue()).toBeFalsy();
  });

  describe('setupWorker', () => {
    it('should create a new worker', () => {
      service.setupWorker();
      expect(global.Worker).toHaveBeenCalled();
      expect(service.worker).toBeDefined();
    });

    it('should set up onmessage handler', () => {
      service.setupWorker();
      expect(mockWorker.onmessage).toBeDefined();
    });

    it('should handle loadTime message', () => {
      service.setupWorker();

      // Simulate worker message with loadTime
      mockWorker.onmessage({ data: { loadTime: 100 } });

      expect(service.loadTime).toBe(100);
      // @ts-expect-error - We are testing the private property
      expect(service._ready.getValue()).toBeFalsy(); // Should not change ready state
    });

    it('should handle importTime message and set ready to true', () => {
      service.setupWorker();

      // Simulate worker message with importTime
      mockWorker.onmessage({ data: { importTime: 200 } });

      expect(service.importTime).toBe(200);
      // @ts-expect-error - We are testing the private property
      expect(service._ready.getValue()).toBeTruthy();
    });

    it('should handle runTime message', () => {
      service.setupWorker();

      // Simulate worker message with runTime
      mockWorker.onmessage({ data: { runTime: 300 } });

      expect(service.runTime).toBe(300);
      // @ts-expect-error - We are testing the private property
      expect(service._ready.getValue()).toBeFalsy(); // Should not change ready state
    });

    // it('should handle result message and set ready to true', () => {
    //   service.setupWorker();

    //   // Simulate worker message with result
    //   mockWorker.onmessage({ data: { result: 'some result' } });
    //   // @ts-expect-error - We are testing the private property
    //   expect(service._ready.getValue()).toBeTruthy();
    // });
  });

  describe('runTask', () => {
    it('should post message to worker with task and data', async () => {
      service.setupWorker();

      const task = Task.runTests; // Replace with an actual Task enum value
      const data = { someKey: 'someValue' };

      await service.runTask(task, data);

      expect(postMessageSpy).toHaveBeenCalledWith({ task, data });
    });

    it('should not throw if worker is undefined', async () => {
      service.worker = undefined;

      const task = Task.runPython; // Replace with an actual Task enum value
      const data = { someKey: 'someValue' };

      await expect(service.runTask(task, data)).resolves.not.toThrow();
    });
  });

  describe('ready$', () => {
    it('should emit current ready state', async () => {
      const readyState = await firstValueFrom(service.ready$);
      expect(readyState).toBeFalsy();

      // @ts-expect-error - We are testing the private property
      service._ready.next(true);

      const updatedReadyState = await firstValueFrom(service.ready$);
      expect(updatedReadyState).toBeTruthy();
    });
  });
});
