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

    it('should handle task result message with id', () => {
      service.setup();

      const mockId = 'test-id-123';
      const mockResult = { test: 'data' };

      // Set up a handler for the test id
      service.handlerMap[mockId] = jest.fn();

      // Simulate worker message with id and result
      mockWorker.onmessage({ data: { id: mockId, result: mockResult } });

      expect(service.handlerMap[mockId]).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('runTask', () => {
    it('should post message to worker with task, inputs and id', async () => {
      service.setup();

      const task = Task.runTests;
      const inputs = undefined;

      const promise = service.runTask(task, inputs);

      // Verify the message was posted with the expected structure
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          task,
          inputs,
          id: expect.any(String)
        })
      );

      // Simulate the response to resolve the promise
      const messageCall = postMessageSpy.mock.calls[0][0];
      const id = messageCall.id;
      mockWorker.onmessage({ data: { id, result: undefined } });

      await promise;
    });

    it('should post message to worker with getLit task', async () => {
      service.setup();

      const task = Task.getLit;
      const inputs = undefined;

      const promise = service.runTask(task, inputs);

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          task,
          inputs,
          id: expect.any(String)
        })
      );

      // Simulate the response to resolve the promise
      const messageCall = postMessageSpy.mock.calls[0][0];
      const id = messageCall.id;
      const mockResult = {
        x: {},
        y: {},
        z: {},
        support: {},
        type: {},
        section: {},
        color_select: {}
      };
      mockWorker.onmessage({ data: { id, result: mockResult } });

      const result = await promise;
      expect(result).toEqual(mockResult);
    });

    it('should generate unique id for each task', async () => {
      service.setup();

      const task = Task.runTests;
      const promise1 = service.runTask(task, undefined);
      const promise2 = service.runTask(task, undefined);

      const call1 = postMessageSpy.mock.calls[0][0];
      const call2 = postMessageSpy.mock.calls[1][0];

      expect(call1.id).not.toBe(call2.id);

      // Resolve both promises
      mockWorker.onmessage({ data: { id: call1.id, result: undefined } });
      mockWorker.onmessage({ data: { id: call2.id, result: undefined } });

      await Promise.all([promise1, promise2]);
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

  describe('ready getter', () => {
    it('should return current ready state', () => {
      expect(service.ready).toBeFalsy();

      // @ts-expect-error - We are testing the private property
      service._ready.next(true);

      expect(service.ready).toBeTruthy();
    });
  });
});
