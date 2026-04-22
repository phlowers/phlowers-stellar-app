/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createPlot } from './createPlot';
import Plotly from 'plotly.js-dist-min';
import { SpanLoad } from '@shared/domain';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';
import { DataObject } from './createPlotDataObject';
import { type Mock } from 'vitest';

// Mock Plotly
vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    react: vi.fn()
  },
  react: vi.fn()
}));

describe('createPlot', () => {
  let mockElement: HTMLDivElement;
  let originalGetElementById: typeof document.getElementById;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock DOM element
    mockElement = document.createElement('div');
    mockElement.id = 'test-plot-id';

    // Mock document.getElementById
    originalGetElementById = document.getElementById;
    document.getElementById = vi.fn((id: string) => {
      if (id === 'test-plot-id') {
        return mockElement;
      }
      return null;
    });

    // Mock Plotly.react to return a resolved promise
    (Plotly.react as Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore original getElementById
    document.getElementById = originalGetElementById;
  });

  const mockData: DataObject[] = [
    {
      x: [1, 2, 3],
      y: [10, 20, 30],
      type: 'scatter',
      mode: 'lines',
      supportUuid: 's0'
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

  const defaultParams = {
    plotId: 'test-plot-id',
    data: mockData,
    invert: false,
    view: '3d' as const,
    camera: null,
    side: 'profile' as const,
    spanLoads: mockSpanLoads,
    litData: mockLitData,
    startSupport: 0,
    endSupport: 0,
    obstacles: [],
    currentObstacleUuid: null,
    currentObstaclePointIndex: 0,
    supports: [],
    distances: [],
    distanceType: 'oblique' as const
  };

  describe('basic functionality', () => {
    it('should call Plotly.react when element exists', () => {
      createPlot({ ...defaultParams });

      expect(document.getElementById).toHaveBeenCalledWith('test-plot-id');
      expect(Plotly.react).toHaveBeenCalled();
    });

    it('should pass the correct plotId to Plotly.react', () => {
      createPlot({ ...defaultParams });

      expect(Plotly.react).toHaveBeenCalledWith(
        'test-plot-id',
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should pass the data to Plotly.react', () => {
      createPlot({ ...defaultParams });

      expect(Plotly.react).toHaveBeenCalledWith(expect.any(String), mockData, expect.any(Object), expect.any(Object));
    });
  });

  describe('scene configuration', () => {
    it('should configure scene with data aspectmode', () => {
      createPlot({ ...defaultParams });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectmode).toBe('manual');
    });

    it('should configure scene with correct aspectratio', () => {
      createPlot({ ...defaultParams });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.scene.aspectratio).toEqual({ x: 3, y: 0.2, z: 0.5 });
    });
  });

  describe('layout2d configuration', () => {
    it('should have basic layout properties', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.showlegend).toBe(false);
      expect(layoutArg.plot_bgcolor).toBe('gainsboro');
    });

    it('should have correct margin configuration', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.margin).toEqual({
        l: 50,
        r: 0,
        t: 20,
        b: 20
      });
    });

    it('should configure xaxis with autorange true for profile side', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.autorange).toBe(true);
    });

    it('should configure xaxis with autorange true for face side', () => {
      createPlot({ ...defaultParams, view: '2d', side: 'face' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.autorange).toBe(true);
    });

    it('should configure xaxis with common properties', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.xaxis.backgroundcolor).toBe('gainsboro');
      expect(layoutArg.xaxis.gridcolor).toBe('dimgray');
      expect(layoutArg.xaxis.showbackground).toBe(true);
      expect(layoutArg.xaxis.showticklabels).toBe(true);
      expect(layoutArg.xaxis.showgrid).toBe(true);
      expect(layoutArg.xaxis.showline).toBe(true);
    });

    it('should configure yaxis with scaleratio and scaleanchor for face side', () => {
      createPlot({ ...defaultParams, view: '2d', side: 'face' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBe(0.2);
      expect(layoutArg.yaxis.scaleanchor).toBe('x');
    });

    it('should configure yaxis with scaleratio from axesNorms for face side', () => {
      createPlot({ ...defaultParams, view: '2d', side: 'face', axesNorms: { x: 1, y: 2, z: 4, aspectMode: 'manual' } });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBe(2); // z / y = 4 / 2
      expect(layoutArg.yaxis.scaleanchor).toBe('x');
    });

    it('should configure yaxis without scaleratio and scaleanchor for profile side', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBeUndefined();
      expect(layoutArg.yaxis.scaleanchor).toBeUndefined();
    });

    it('should configure yaxis without scaleratio and scaleanchor for profile side even when axesNorms is provided', () => {
      createPlot({
        ...defaultParams,
        view: '2d',
        side: 'profile',
        axesNorms: { x: 1, y: 1, z: 30, aspectMode: 'manual' }
      });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.scaleratio).toBeUndefined();
      expect(layoutArg.yaxis.scaleanchor).toBeUndefined();
    });

    it('should configure yaxis with common properties', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.yaxis.backgroundcolor).toBe('gainsboro');
      expect(layoutArg.yaxis.gridcolor).toBe('dimgray');
      expect(layoutArg.yaxis.showbackground).toBe(true);
      expect(layoutArg.yaxis.showticklabels).toBe(true);
      expect(layoutArg.yaxis.showgrid).toBe(true);
      expect(layoutArg.yaxis.showline).toBe(true);
    });

    it('should not have scene property in 2d layout', () => {
      createPlot({ ...defaultParams, view: '2d' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.scene).toBeUndefined();
    });

    it('should work with different data arrays', () => {
      const differentData: DataObject[] = [
        {
          x: [10, 20, 30, 40],
          y: [100, 200, 300, 400],
          type: 'scatter',
          mode: 'markers',
          supportUuid: 's1'
        }
      ];

      createPlot({
        ...defaultParams,
        data: differentData,
        view: '2d',
        side: 'face'
      });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(true);
      expect(layoutArg.yaxis.scaleratio).toBe(0.2);
    });

    it('should work with invert parameter set to true', () => {
      createPlot({ ...defaultParams, view: '2d', invert: true });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe('reversed');
    });

    it('should work with invert parameter set to false', () => {
      createPlot({ ...defaultParams, view: '2d', side: 'face' });

      const layoutArg = (Plotly.react as Mock).mock.calls[0][2];
      expect(layoutArg.autosize).toBe(true);
      expect(layoutArg.xaxis.autorange).toBe(true);
    });
  });

  describe('3D invert camera behaviour', () => {
    it('should set camera eye.y positive when invert is true and camera is null', () => {
      createPlot({ ...defaultParams, view: '3d', invert: true, camera: null });

      const layoutArg = (Plotly.react as vi.Mock).mock.calls[0][2];
      expect(layoutArg.scene.camera.eye.y).toBeGreaterThan(0);
    });

    it('should set camera eye.y negative when invert is false and camera is null', () => {
      createPlot({ ...defaultParams, view: '3d', invert: false, camera: null });

      const layoutArg = (Plotly.react as vi.Mock).mock.calls[0][2];
      expect(layoutArg.scene.camera.eye.y).toBeLessThan(0);
    });

    it('should set camera eye.y positive when invert is true and camera is provided', () => {
      const inputCamera = { center: { x: 0, y: 0, z: 0 }, eye: { x: 0.02, y: -3.5, z: 0.2 }, up: { x: 0, y: 0, z: 1 } };
      createPlot({ ...defaultParams, view: '3d', invert: true, camera: inputCamera });

      const layoutArg = (Plotly.react as vi.Mock).mock.calls[0][2];
      expect(layoutArg.scene.camera.eye.y).toBeGreaterThan(0);
    });

    it('should set camera eye.y negative when invert is false and camera is provided', () => {
      const inputCamera = { center: { x: 0, y: 0, z: 0 }, eye: { x: 0.02, y: 3.5, z: 0.2 }, up: { x: 0, y: 0, z: 1 } };
      createPlot({ ...defaultParams, view: '3d', invert: false, camera: inputCamera });

      const layoutArg = (Plotly.react as vi.Mock).mock.calls[0][2];
      expect(layoutArg.scene.camera.eye.y).toBeLessThan(0);
    });

    it('should not mutate the original camera object', () => {
      const inputCamera = { center: { x: 0, y: 0, z: 0 }, eye: { x: 0.02, y: -3.5, z: 0.2 }, up: { x: 0, y: 0, z: 1 } };
      const originalY = inputCamera.eye.y;
      createPlot({ ...defaultParams, view: '3d', invert: true, camera: inputCamera });

      expect(inputCamera.eye.y).toBe(originalY);
    });
  });
});
