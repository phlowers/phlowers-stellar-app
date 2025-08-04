/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { WorkerPythonService } from './worker-python.service';
import { Task } from './tasks/types';
import { firstValueFrom } from 'rxjs';

describe('WorkerService', () => {
  let service: WorkerPythonService;
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
    service = TestBed.inject(WorkerPythonService);

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

  describe('setup', () => {
    it('should create a new worker', () => {
      service.setup();
      expect(global.Worker).toHaveBeenCalled();
      expect(service.worker).toBeDefined();
    });

    it('should set up onmessage handler', () => {
      service.setup();
      expect(mockWorker.onmessage).toBeDefined();
    });

    it('should handle loadTime message', () => {
      service.setup();

      // Simulate worker message with loadTime
      mockWorker.onmessage({ data: { loadTime: 100 } });

      expect(service.times().loadTime).toBe(100);
      // @ts-expect-error - We are testing the private property
      expect(service._ready.getValue()).toBeFalsy(); // Should not change ready state
    });

    it('should handle importTime message and set ready to true', () => {
      service.setup();

      // Simulate worker message with importTime
      mockWorker.onmessage({ data: { importTime: 200 } });

      expect(service.times().importTime).toBe(200);
      // @ts-expect-error - We are testing the private property
      expect(service._ready.getValue()).toBeTruthy();
    });

    it('should handle runTime message', () => {
      service.setup();

      // Simulate worker message with runTime
      mockWorker.onmessage({ data: { runTime: 300 } });

      expect(service.times().runTime).toBe(300);
      // @ts-expect-error - We are testing the private property
      expect(service._ready.getValue()).toBeFalsy(); // Should not change ready state
    });

    // it('should handle result message and set ready to true', () => {
    //   service.setup();

    //   // Simulate worker message with result
    //   mockWorker.onmessage({ data: { result: 'some result' } });
    //   // @ts-expect-error - We are testing the private property
    //   expect(service._ready.getValue()).toBeTruthy();
    // });
  });

  describe('runTask', () => {
    it('should post message to worker with task and data', async () => {
      service.setup();

      const task = Task.runTests; // Replace with an actual Task enum value

      await service.runTask(task, undefined);

      expect(postMessageSpy).toHaveBeenCalledWith({ task, inputs: undefined });
    });

    it('should not throw if worker is undefined', async () => {
      service.worker = undefined;

      const task = Task.runTests; // Replace with an actual Task enum value

      await expect(service.runTask(task, undefined)).resolves.not.toThrow();
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
