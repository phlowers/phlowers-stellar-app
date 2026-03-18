/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import '@angular/localize/init';
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { MessageService } from 'primeng/api';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
}

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

Object.defineProperty(document, 'fonts', {
  value: {
    check: vi.fn().mockReturnValue(true),
    load: vi.fn().mockResolvedValue(undefined)
  },
  writable: true
});

Object.defineProperty(globalThis.URL, 'createObjectURL', {
  value: vi.fn().mockReturnValue('mock-url'),
  configurable: true,
  writable: true
});

vi.mock('plotly.js-dist-min', () => {
  const plotlyMock = {
    newPlot: vi.fn().mockResolvedValue({}),
    react: vi.fn().mockResolvedValue({}),
    relayout: vi.fn().mockResolvedValue({}),
    purge: vi.fn(),
    Data: vi.fn()
  };

  return {
    __esModule: true,
    default: plotlyMock,
    ...plotlyMock
  };
});

const mockMessageService = {
  add: vi.fn()
};

export const globalTestSetup = {
  providers: [{ provide: MessageService, useValue: mockMessageService }]
};

beforeEach(() => {
  TestBed.configureTestingModule(globalTestSetup);
});
