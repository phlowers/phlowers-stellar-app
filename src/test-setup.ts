/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import '@angular/localize/init';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn()
  }));

Object.defineProperty(document, 'fonts', {
  value: {
    check: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined)
  },
  writable: true
});

setupZoneTestEnv();

// Mock URL.createObjectURL
Object.defineProperty(globalThis.URL, 'createObjectURL', {
  value: jest.fn().mockReturnValue('mock-url')
});

// Mock Plotly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({}),
  relayout: jest.fn().mockResolvedValue({}),
  Data: jest.fn()
}));

const mockMessageService = {
  add: jest.fn()
} as unknown as MessageService;

export const globalTestSetup = {
  providers: [{ provide: MessageService, useValue: mockMessageService }]
};

// Configure TestBed globally before each test
beforeEach(() => {
  TestBed.configureTestingModule(globalTestSetup);
});
