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
      createPlot('test-plot-id', mockData, false, false, '3d', null, 'profile');

      expect(document.getElementById).toHaveBeenCalledWith('test-plot-id');
      expect(Plotly.newPlot).toHaveBeenCalled();
    });

    it('should pass the correct plotId to Plotly.newPlot', () => {
      createPlot('test-plot-id', mockData, false, false, '3d', null, 'profile');

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'test-plot-id',
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should pass the data to Plotly.newPlot', () => {
      createPlot('test-plot-id', mockData, false, false, '3d', null, 'profile');

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        expect.any(String),
        mockData,
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('scene configuration', () => {
    it('should configure scene with data aspectmode', () => {
      createPlot('test-plot-id', mockData, false, false, '3d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectmode).toBe('data');
    });

    it('should configure scene with correct aspectratio', () => {
      createPlot('test-plot-id', mockData, false, false, '3d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectratio).toEqual(undefined);
    });
  });

  describe('layout2d configuration', () => {
    it('should have basic layout properties', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.showlegend).toBe(false);
      expect(layoutArg.plot_bgcolor).toBe('gainsboro');
    });

    it('should have correct margin configuration', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.margin).toEqual({
        l: 50,
        r: 0,
        t: 20,
        b: 20
      });
    });

    it('should configure xaxis with autorange true for profile side', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.autorange).toBe(true);
    });

    it('should configure xaxis with autorange false for face side', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'face');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.autorange).toBe(false);
    });

    it('should configure xaxis with common properties', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.backgroundcolor).toBe('gainsboro');
      expect(layoutArg.xaxis.gridcolor).toBe('dimgray');
      expect(layoutArg.xaxis.showbackground).toBe(true);
      expect(layoutArg.xaxis.showticklabels).toBe(true);
      expect(layoutArg.xaxis.showgrid).toBe(true);
      expect(layoutArg.xaxis.showline).toBe(true);
    });

    it('should configure yaxis with scaleratio and scaleanchor for face side', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'face');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBe(0.2);
      expect(layoutArg.yaxis.scaleanchor).toBe('x');
    });

    it('should configure yaxis without scaleratio and scaleanchor for profile side', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBeUndefined();
      expect(layoutArg.yaxis.scaleanchor).toBeUndefined();
    });

    it('should configure yaxis with common properties', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.backgroundcolor).toBe('gainsboro');
      expect(layoutArg.yaxis.gridcolor).toBe('dimgray');
      expect(layoutArg.yaxis.showbackground).toBe(true);
      expect(layoutArg.yaxis.showticklabels).toBe(true);
      expect(layoutArg.yaxis.showgrid).toBe(true);
      expect(layoutArg.yaxis.showline).toBe(true);
    });

    it('should not have scene property in 2d layout', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene).toBeUndefined();
    });

    it('should work with different data arrays', () => {
      const differentData: Data[] = [
        {
          x: [10, 20, 30, 40],
          y: [100, 200, 300, 400],
          type: 'scatter',
          mode: 'markers'
        }
      ];

      createPlot(
        'test-plot-id',
        differentData,
        false,
        false,
        '2d',
        null,
        'face'
      );

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(false);
      expect(layoutArg.yaxis.scaleratio).toBe(0.2);
    });

    it('should work with invert parameter set to true', () => {
      createPlot('test-plot-id', mockData, false, true, '2d', null, 'profile');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(true);
    });

    it('should work with invert parameter set to false', () => {
      createPlot('test-plot-id', mockData, false, false, '2d', null, 'face');

      const layoutArg = (Plotly.newPlot as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(false);
    });
  });
});
