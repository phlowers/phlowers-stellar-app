/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { PlotOptionsService } from './plot-options.service';
import { AxesNorms, PlotOptions } from '@shared/types/plot.types';
import { Camera } from 'plotly.js-dist-min';
import { vi } from 'vitest';

describe('PlotOptionsService', () => {
  let service: PlotOptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlotOptionsService, { provide: DOCUMENT, useValue: document }]
    });
    service = TestBed.inject(PlotOptionsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize plotOptions with default values', () => {
      const opts = service.plotOptions();
      expect(opts.view).toBe('3d');
      expect(opts.side).toBe('profile');
      expect(opts.startSupport).toBe(0);
      expect(opts.endSupport).toBe(1);
      expect(opts.invert).toBe(false);
    });

    it('should initialize selectedDisplayOptions with default values', () => {
      const opts = service.selectedDisplayOptions();
      expect(opts.loads).toBe(true);
      expect(opts.baseState).toBe(false);
    });

    it('should initialize axesNorms with default values', () => {
      const norms = service.axesNorms();
      expect(norms).toEqual({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    });

    it('should initialize baseScaleFactors with default values', () => {
      const factors = service.baseScaleFactors();
      expect(factors).toEqual({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    });

    it('should initialize camera to null', () => {
      expect(service.camera()).toBeNull();
    });

    it('should initialize isFreePositioningMode to false', () => {
      expect(service.isFreePositioningMode()).toBe(false);
    });
  });

  describe('setAxesNorms', () => {
    it('should update the axesNorms signal', () => {
      const newNorms: AxesNorms = { x: 2, y: 3, z: 4, aspectMode: 'cube' };
      service.setAxesNorms(newNorms);
      expect(service.axesNorms()).toEqual(newNorms);
    });

    it('should replace previous norms entirely', () => {
      service.setAxesNorms({ x: 5, y: 5, z: 5, aspectMode: 'cube' });
      service.setAxesNorms({ x: 1, y: 1, z: 1, aspectMode: 'data' });
      expect(service.axesNorms()).toEqual({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    });
  });

  describe('setBaseScaleFactors', () => {
    it('should update the baseScaleFactors signal', () => {
      const newFactors: AxesNorms = { x: 0.2, y: 1, z: 1, aspectMode: 'manual' };
      service.setBaseScaleFactors(newFactors);
      expect(service.baseScaleFactors()).toEqual(newFactors);
    });

    it('should not affect axesNorms', () => {
      service.setBaseScaleFactors({ x: 0.2, y: 1, z: 1, aspectMode: 'manual' });
      expect(service.axesNorms()).toEqual({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    });
  });

  describe('getCamera', () => {
    it('should return null when there is no DOM element with the plot id', () => {
      document.getElementById = vi.fn().mockReturnValue(null);
      expect(service.getCamera()).toBeNull();
    });

    it('should return the camera when the element has a _fullLayout with camera', () => {
      const mockCamera: Camera = { eye: { x: 1, y: 1, z: 1 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
      document.getElementById = vi.fn().mockReturnValue({ _fullLayout: { scene: { camera: mockCamera } } });
      expect(service.getCamera()).toEqual(mockCamera);
    });

    it('should return null when the element has no _fullLayout', () => {
      document.getElementById = vi.fn().mockReturnValue({});
      expect(service.getCamera()).toBeNull();
    });

    it('should return null when _fullLayout has no scene', () => {
      document.getElementById = vi.fn().mockReturnValue({ _fullLayout: {} });
      expect(service.getCamera()).toBeNull();
    });
  });

  describe('refreshCamera', () => {
    it('should update camera signal when value differs from current', () => {
      service.camera.set(null);
      const mockCamera: Camera = { eye: { x: 2, y: 2, z: 2 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
      document.getElementById = vi.fn().mockReturnValue({ _fullLayout: { scene: { camera: mockCamera } } });

      service.refreshCamera();

      expect(service.camera()).toEqual(mockCamera);
    });

    it('should not update camera signal when value is already equal', () => {
      const mockCamera: Camera = { eye: { x: 2, y: 2, z: 2 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
      service.camera.set(mockCamera);
      document.getElementById = vi.fn().mockReturnValue({ _fullLayout: { scene: { camera: mockCamera } } });
      const setCameraSpy = vi.spyOn(service.camera, 'set');

      service.refreshCamera();

      expect(setCameraSpy).not.toHaveBeenCalled();
    });

    it('should return the current camera value', () => {
      const mockCamera: Camera = { eye: { x: 3, y: 3, z: 3 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
      document.getElementById = vi.fn().mockReturnValue({ _fullLayout: { scene: { camera: mockCamera } } });

      const result = service.refreshCamera();

      expect(result).toEqual(mockCamera);
    });
  });

  describe('plotOptionsChange', () => {
    const loadingFalse = () => false;
    const loadingTrue = () => true;

    beforeEach(() => {
      // prevent real DOM lookups for camera
      document.getElementById = vi.fn().mockReturnValue(null);
    });

    it('should update plotOptions with given partial values', () => {
      service.plotOptionsChange({ view: '2d' }, loadingFalse);
      expect(service.plotOptions().view).toBe('2d');
      expect(service.plotOptions().side).toBe('profile');
    });

    it('should merge partial values without overwriting unchanged fields', () => {
      service.plotOptionsChange({ side: 'face' }, loadingFalse);
      expect(service.plotOptions().side).toBe('face');
      expect(service.plotOptions().view).toBe('3d');
    });

    it('should call onProjectionNeeded when view changes and not loading', () => {
      const onProjectionNeeded = vi.fn();
      service.plotOptionsChange({ view: '2d' }, loadingFalse, onProjectionNeeded);
      expect(onProjectionNeeded).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onProjectionNeeded when loading is true', () => {
      const onProjectionNeeded = vi.fn();
      service.plotOptionsChange({ view: '2d' }, loadingTrue, onProjectionNeeded);
      expect(onProjectionNeeded).not.toHaveBeenCalled();
    });

    it('should NOT call onProjectionNeeded when only invert changes', () => {
      const onProjectionNeeded = vi.fn();
      service.plotOptionsChange({ invert: true }, loadingFalse, onProjectionNeeded);
      expect(onProjectionNeeded).not.toHaveBeenCalled();
    });

    it('should call onProjectionNeeded when side changes in 3d view', () => {
      const onProjectionNeeded = vi.fn();
      service.plotOptionsChange({ side: 'face' }, loadingFalse, onProjectionNeeded);
      expect(onProjectionNeeded).toHaveBeenCalledTimes(1);
    });

    it('should work without onProjectionNeeded callback', () => {
      expect(() => service.plotOptionsChange({ view: '2d' }, loadingFalse)).not.toThrow();
    });

    it('should not call refreshCamera on plotOptionsChange', () => {
      const refreshCameraSpy = vi.spyOn(service, 'refreshCamera');
      service.plotOptionsChange({ view: '2d' }, loadingFalse);
      expect(refreshCameraSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset plotOptions to defaults', () => {
      service.plotOptions.set({ view: '2d', side: 'face', startSupport: 5, endSupport: 10, invert: true });
      service.reset();
      const opts = service.plotOptions();
      expect(opts.view).toBe('3d');
      expect(opts.side).toBe('profile');
      expect(opts.startSupport).toBe(0);
      expect(opts.endSupport).toBe(1);
      expect(opts.invert).toBe(false);
    });

    it('should reset camera to null', () => {
      const mockCamera: Camera = { eye: { x: 1, y: 1, z: 1 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
      service.camera.set(mockCamera);
      service.reset();
      expect(service.camera()).toBeNull();
    });

    it('should reset isFreePositioningMode to false', () => {
      service.isFreePositioningMode.set(true);
      service.reset();
      expect(service.isFreePositioningMode()).toBe(false);
    });

    it('should reset axesNorms to defaults', () => {
      service.axesNorms.set({ x: 5, y: 5, z: 5, aspectMode: 'cube' });
      service.reset();
      expect(service.axesNorms()).toEqual({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    });

    it('should reset baseScaleFactors to defaults', () => {
      service.setBaseScaleFactors({ x: 0.2, y: 1, z: 1, aspectMode: 'manual' });
      service.reset();
      expect(service.baseScaleFactors()).toEqual({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    });

    it('should reset plotOptions even when called multiple times', () => {
      const opts: PlotOptions = { view: '2d', side: 'face', startSupport: 5, endSupport: 10, invert: true };
      service.plotOptions.set(opts);
      service.reset();
      service.plotOptions.set(opts);
      service.reset();
      expect(service.plotOptions().view).toBe('3d');
    });
  });
});
