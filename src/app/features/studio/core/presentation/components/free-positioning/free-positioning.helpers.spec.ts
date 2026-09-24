/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { vi } from 'vitest';
import {
  attachPlotEventListeners,
  getPixelOffset,
  isOutsidePlotBounds,
  toMousePosition
} from './free-positioning.helpers';
import { PlotElement, PlotLayout } from './free-positioning.interfaces';

const layout: PlotLayout = {
  margin: { l: 10, r: 5, t: 20, b: 5 },
  xaxis: { p2c: (value: number) => value / 2, c2p: (value: number) => value * 2 },
  yaxis: { p2c: (value: number) => value / 4, c2p: (value: number) => value * 4 }
};

describe('free-positioning.helpers', () => {
  describe('getPixelOffset', () => {
    it('should subtract the layout margin from the mouse event position', () => {
      const evt = { layerX: 110, layerY: 70 } as MouseEvent;

      expect(getPixelOffset(evt, layout)).toEqual({ x: 100, y: 50 });
    });
  });

  describe('isOutsidePlotBounds', () => {
    const plotElement = { clientWidth: 210, clientHeight: 110 } as PlotElement;

    it('should be false for a point inside the drawing area', () => {
      expect(isOutsidePlotBounds(100, 50, layout, plotElement)).toBe(false);
    });

    it('should be true when x is negative', () => {
      expect(isOutsidePlotBounds(-1, 50, layout, plotElement)).toBe(true);
    });

    it('should be true when x exceeds the plot width', () => {
      expect(isOutsidePlotBounds(196, 50, layout, plotElement)).toBe(true);
    });

    it('should be true when y is negative', () => {
      expect(isOutsidePlotBounds(100, -1, layout, plotElement)).toBe(true);
    });

    it('should be true when y exceeds the plot height', () => {
      expect(isOutsidePlotBounds(100, 86, layout, plotElement)).toBe(true);
    });

    it('should be false when clientWidth/clientHeight are missing, matching legacy permissive behavior', () => {
      // NaN comparisons are always false, so an incomplete plot element (e.g. in tests) is
      // treated as "not outside" rather than rejected — this mirrors the pre-extraction code.
      const incompletePlotElement = {} as PlotElement;

      expect(isOutsidePlotBounds(100, 50, layout, incompletePlotElement)).toBe(false);
    });
  });

  describe('toMousePosition', () => {
    it('should convert a pixel offset to formatted data coordinates', () => {
      expect(toMousePosition(layout, 100, 40)).toEqual({ x: '50.00', z: '10.00' });
    });
  });

  describe('attachPlotEventListeners', () => {
    it('should attach mousemove and click listeners to the plot element', () => {
      const plotElement = document.createElement('div') as unknown as PlotElement;
      const addEventListener = vi.spyOn(plotElement, 'addEventListener');
      const onMouseMove = vi.fn();
      const onClick = vi.fn();

      attachPlotEventListeners(plotElement, { onMouseMove, onClick });

      expect(addEventListener).toHaveBeenCalledWith('mousemove', onMouseMove);
      expect(addEventListener).toHaveBeenCalledWith('click', onClick);
    });

    it('should return a disposer that removes both listeners', () => {
      const plotElement = document.createElement('div') as unknown as PlotElement;
      const removeEventListener = vi.spyOn(plotElement, 'removeEventListener');
      const onMouseMove = vi.fn();
      const onClick = vi.fn();

      const detach = attachPlotEventListeners(plotElement, { onMouseMove, onClick });
      detach();

      expect(removeEventListener).toHaveBeenCalledWith('mousemove', onMouseMove);
      expect(removeEventListener).toHaveBeenCalledWith('click', onClick);
    });
  });
});
