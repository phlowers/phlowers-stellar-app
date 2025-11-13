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
import { Section } from '@core/data/database/interfaces/section';
import { Cable } from '@core/data/database/interfaces/cable';
import { Support } from '@core/data/database/interfaces/support';
import { InitialCondition } from '@core/data/database/interfaces/initialCondition';

describe('WorkerService', () => {
  let service: WorkerPythonService;
  let mockWorker: any;
  let postMessageSpy: jest.SpyInstance;

  // Mock data creation functions
  const createMockSupport = (): Support => ({
    uuid: 'support-uuid-1',
    number: 1,
    name: 'Support 1',
    spanLength: 100,
    spanAngle: 0,
    attachmentSet: 'set1',
    attachmentHeight: 10,
    heightBelowConsole: 5,
    cableType: 'type1',
    armLength: 2,
    chainName: 'chain1',
    chainLength: 1,
    chainWeight: 0.5,
    chainV: true,
    counterWeight: 10,
    supportFootAltitude: 100,
    attachmentPosition: 'top',
    chainSurface: 0.1
  });

  const createMockInitialCondition = (): InitialCondition => ({
    uuid: 'ic-uuid-1',
    name: 'Initial Condition 1',
    base_parameters: 1,
    base_temperature: 20,
    cable_pretension: 1000,
    min_temperature: -10,
    max_wind_pressure: 50,
    max_frost_width: 5
  });

  const createMockSection = (): Section => ({
    uuid: 'section-uuid-1',
    internal_id: 'internal-1',
    name: 'Test Section',
    short_name: 'TS',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    internal_catalog_id: 'catalog-1',
    type: 'test-type',
    electric_phase_number: 3,
    cable_name: 'Test Cable',
    cable_short_name: 'TC',
    cables_amount: 1,
    optical_fibers_amount: 0,
    spans_amount: 1,
    begin_span_name: 'span1',
    last_span_name: 'span1',
    first_support_number: 1,
    last_support_number: 2,
    first_attachment_set: 'set1',
    last_attachment_set: 'set1',
    regional_maintenance_center_names: ['center1'],
    maintenance_center_names: ['center1'],
    gmr: 'gmr1',
    eel: 'eel1',
    cm: 'cm1',
    link_name: 'link1',
    lit: 'lit1',
    branch_name: 'branch1',
    electric_tension_level: '400kV',
    comment: 'Test comment',
    supports_comment: 'Test supports comment',
    supports: [createMockSupport()],
    initial_conditions: [createMockInitialCondition()],
    selected_initial_condition_uuid: 'ic-uuid-1'
  });

  const createMockCable = (): Cable => ({
    name: 'Test Cable',
    data_source: 'test-source',
    section: 100,
    diameter: 10,
    young_modulus: 200000,
    linear_mass: 0.5,
    dilatation_coefficient: 0.000012,
    temperature_reference: 20,
    stress_strain_a0: 0.1,
    stress_strain_a1: 0.2,
    stress_strain_a2: 0.3,
    stress_strain_a3: 0.4,
    stress_strain_a4: 0.5,
    stress_strain_b0: 0.6,
    stress_strain_b1: 0.7,
    stress_strain_b2: 0.8,
    stress_strain_b3: 0.9,
    stress_strain_b4: 1.0,
    is_narcisse: false
  });

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

      expect(service.handlerMap[mockId]).toHaveBeenCalledWith(
        mockResult,
        undefined
      );
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

      const response = await promise;
      expect(response.result).toBeUndefined();
      expect(response.error).toBeUndefined();
    });

    it('should post message to worker with getLit task', async () => {
      service.setup();

      const task = Task.getLit;
      const inputs = {
        section: createMockSection(),
        cable: createMockCable()
      };

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

      const response = await promise;
      expect(response.result).toEqual(mockResult);
      expect(response.error).toBeUndefined();
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

      const [response1, response2] = await Promise.all([promise1, promise2]);
      expect(response1.result).toBeUndefined();
      expect(response1.error).toBeUndefined();
      expect(response2.result).toBeUndefined();
      expect(response2.error).toBeUndefined();
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
