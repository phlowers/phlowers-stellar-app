/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createPlot } from './createPlot';
import Plotly, { Data } from 'plotly.js-dist-min';
import { SpanLoad } from '@core/domain';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';

// Mock Plotly
jest.mock('plotly.js-dist-min', () => ({
  react: jest.fn()
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

    // Mock Plotly.react to return a resolved promise
    (Plotly.react as jest.Mock).mockResolvedValue(undefined);
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

  const mockLitData: GetSectionOutput = {
    spans: [[[1, 2, 3]]],
    insulators: [[[1, 2, 3]]],
    supports: [[[1, 2, 3]]],
    L0: [1, 2, 3],
    elevation: [1, 2, 3],
    line_angle: [1, 2, 3],
    vtl_under_chain: [[1, 2, 3]],
    vtl_under_console: [[1, 2, 3]],
    r_under_chain: [1, 2, 3],
    r_under_console: [1, 2, 3],
    ground_altitude: [1, 2, 3],
    load_angle: [1, 2, 3],
    displacement: [[1, 2, 3]],
    span_length: [1, 2, 3],
    loads_coords: { 0: [1, 2, 3] },
    parameter: [1, 2, 3],
    tension_sup: [1, 2, 3],
    tension_inf: [1, 2, 3],
    horizontal_distance: [1, 2, 3],
    arc_length: [1, 2, 3],
    T_h: [1, 2, 3]
  };

  const mockSpanLoads: (SpanLoad | null)[] = [];

  describe('basic functionality', () => {
    it('should call Plotly.react when element exists', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '3d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      expect(document.getElementById).toHaveBeenCalledWith('test-plot-id');
      expect(Plotly.react).toHaveBeenCalled();
    });

    it('should pass the correct plotId to Plotly.react', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '3d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      expect(Plotly.react).toHaveBeenCalledWith(
        'test-plot-id',
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should pass the data to Plotly.react', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '3d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      expect(Plotly.react).toHaveBeenCalledWith(expect.any(String), mockData, expect.any(Object), expect.any(Object));
    });
  });

  describe('scene configuration', () => {
    it('should configure scene with data aspectmode', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '3d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectmode).toBe('manual');
    });

    it('should configure scene with correct aspectratio', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '3d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectratio).toEqual({ x: 3, y: 0.2, z: 0.5 });
    });
  });

  describe('layout2d configuration', () => {
    it('should have basic layout properties', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.showlegend).toBe(false);
      expect(layoutArg.plot_bgcolor).toBe('gainsboro');
    });

    it('should have correct margin configuration', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.margin).toEqual({
        l: 50,
        r: 0,
        t: 20,
        b: 20
      });
    });

    it('should configure xaxis with autorange true for profile side', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.autorange).toBe(true);
    });

    it('should configure xaxis with autorange true for face side', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'face',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.autorange).toBe(true);
    });

    it('should configure xaxis with common properties', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.backgroundcolor).toBe('gainsboro');
      expect(layoutArg.xaxis.gridcolor).toBe('dimgray');
      expect(layoutArg.xaxis.showbackground).toBe(true);
      expect(layoutArg.xaxis.showticklabels).toBe(true);
      expect(layoutArg.xaxis.showgrid).toBe(true);
      expect(layoutArg.xaxis.showline).toBe(true);
    });

    it('should configure yaxis with scaleratio and scaleanchor for face side', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'face',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBe(0.2);
      expect(layoutArg.yaxis.scaleanchor).toBe('x');
    });

    it('should configure yaxis without scaleratio and scaleanchor for profile side', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBeUndefined();
      expect(layoutArg.yaxis.scaleanchor).toBeUndefined();
    });

    it('should configure yaxis with common properties', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.backgroundcolor).toBe('gainsboro');
      expect(layoutArg.yaxis.gridcolor).toBe('dimgray');
      expect(layoutArg.yaxis.showbackground).toBe(true);
      expect(layoutArg.yaxis.showticklabels).toBe(true);
      expect(layoutArg.yaxis.showgrid).toBe(true);
      expect(layoutArg.yaxis.showline).toBe(true);
    });

    it('should not have scene property in 2d layout', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
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

      createPlot({
        plotId: 'test-plot-id',
        data: differentData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'face',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(true);
      expect(layoutArg.yaxis.scaleratio).toBe(0.2);
    });

    it('should work with invert parameter set to true', () => {
      createPlot({
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: true,
        view: '2d',
        camera: null,
        side: 'profile',
        spanLoads: mockSpanLoads,
        litData: mockLitData,
        startSupport: 0,
        endSupport: 0
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe('reversed');
    });

    it('should work with invert parameter set to false', () => {
      createPlot({
        startSupport: 0,
        endSupport: 0,
        plotId: 'test-plot-id',
        data: mockData,
        isSupportZoom: false,
        invert: false,
        view: '2d',
        camera: null,
        side: 'face',
        spanLoads: mockSpanLoads,
        litData: mockLitData
      });

      const layoutArg = (Plotly.react as jest.Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(true);
    });
  });
});
