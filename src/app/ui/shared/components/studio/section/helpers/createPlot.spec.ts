/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createPlot } from './createPlot';
import Plotly, { Data } from 'plotly.js-dist-min';

// Mock Plotly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn()
}));

describe('createPlot', () => {
  let mockElement: HTMLDivElement;
  let originalGetElementById: typeof document.getElementById;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock DOM element
    mockElement = document.createElement('div');
    mockElement.id = 'test-plot-id';

    // Mock document.getElementById
    originalGetElementById = document.getElementById;
    document.getElementById = jest.fn((id: string) => {
      if (id === 'test-plot-id') {
        return mockElement;
      }
      return null;
    });

    // Mock Plotly.newPlot to return a resolved promise
    (Plotly.newPlot as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore original getElementById
    document.getElementById = originalGetElementById;
  });

  const mockData: Data[] = [
    {
      x: [1, 2, 3],
      y: [10, 20, 30],
      type: 'scatter',
      mode: 'lines'
    }
  ];

  describe('basic functionality', () => {
    it('should call Plotly.newPlot when element exists', () => {
      createPlot('test-plot-id', mockData, false, false);

      expect(document.getElementById).toHaveBeenCalledWith('test-plot-id');
      expect(Plotly.newPlot).toHaveBeenCalled();
    });

    it('should pass the correct plotId to Plotly.newPlot', () => {
      createPlot('test-plot-id', mockData, false, false);

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'test-plot-id',
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should pass the data to Plotly.newPlot', () => {
      createPlot('test-plot-id', mockData, false, false);

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        expect.any(String),
        mockData,
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('scene configuration', () => {
    it('should configure scene with manual aspectmode', () => {
      createPlot('test-plot-id', mockData, false, false);

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectmode).toBe('manual');
    });

    it('should configure scene with correct aspectratio', () => {
      createPlot('test-plot-id', mockData, false, false);

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectratio).toEqual({
        x: 3,
        y: 0.2,
        z: 0.5
      });
    });
  });
});
