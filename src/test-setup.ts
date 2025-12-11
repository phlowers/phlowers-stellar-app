/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import '@angular/localize/init';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

window.ResizeObserver =
  window.ResizeObserver ||
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
Object.defineProperty(window.URL, 'createObjectURL', {
  value: jest.fn().mockReturnValue('mock-url')
});

// Mock Plotly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({}),
  relayout: jest.fn().mockResolvedValue({}),
  Data: jest.fn()
}));
