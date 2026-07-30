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
import { Subject } from 'rxjs';
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
  Object.assign(globalThis, { ResizeObserver: MockResizeObserver });
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

// Ensure `'serviceWorker' in navigator` is truthy at module-load time so services
// that capture this check in a static field (e.g. UpdateService) initialize
// correctly under happy-dom. Individual tests may still override this property.
if (!('serviceWorker' in navigator)) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      addEventListener: vi.fn(),
      getRegistration: vi.fn().mockResolvedValue(null),
      ready: Promise.resolve({})
    },
    writable: true,
    configurable: true
  });
}

// jsdom does not implement Blob.prototype.text; capture the real FileReader before any test
// can override globalThis.FileReader, then polyfill so file.text() works in tests.
const _OriginalFileReader = (globalThis as unknown as { FileReader: typeof FileReader }).FileReader;
if (typeof Blob !== 'undefined' && !('text' in Blob.prototype)) {
  Object.defineProperty(Blob.prototype, 'text', {
    value: function (this: Blob): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const reader = new _OriginalFileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => {
          const error = reader.error instanceof Error ? reader.error : new Error(String(reader.error));
          reject(error);
        };
        reader.readAsText(this);
      });
    },
    writable: true,
    configurable: true
  });
}

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
  add: vi.fn(),
  messageObserver: new Subject(),
  clearObserver: new Subject()
};

export const globalTestSetup = {
  providers: [{ provide: MessageService, useValue: mockMessageService }]
};

beforeEach(() => {
  TestBed.configureTestingModule(globalTestSetup);
});
