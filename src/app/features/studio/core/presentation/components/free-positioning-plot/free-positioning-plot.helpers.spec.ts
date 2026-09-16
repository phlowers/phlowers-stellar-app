/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it, vi } from 'vitest';
import Plotly, { PlotlyHTMLElement } from 'plotly.js-dist-min';
import { applySharedYRange, computePaddedYRange, extractYValues } from './free-positioning-plot.helpers';

describe('free-positioning-plot.helpers', () => {
  describe('extractYValues', () => {
    it('should extract finite numbers from scatter traces', () => {
      const mockPlot = {
        data: [
          { y: [10, 20, null, Number.NaN, 30] },
          { y: [40, Infinity, 50] },
          {}
        ]
      } as unknown as PlotlyHTMLElement;

      const result = extractYValues(mockPlot);
      expect(result).toEqual([10, 20, 30, 40, 50]);
    });

    it('should return empty array when data has no y values', () => {
      const mockPlot = { data: [{}] } as unknown as PlotlyHTMLElement;
      expect(extractYValues(mockPlot)).toEqual([]);
    });
  });

  describe('computePaddedYRange', () => {
    it('should return null for empty values', () => {
      expect(computePaddedYRange([])).toBeNull();
    });

    it('should compute padded min and max', () => {
      const result = computePaddedYRange([100, 200]);
      // delta = 100, padding = 5
      expect(result).toEqual([95, 205]);
    });

    it('should ensure minimum padding of 1 when delta is small or zero', () => {
      const result = computePaddedYRange([50, 50]);
      expect(result).toEqual([49, 51]);
    });
  });

  describe('applySharedYRange', () => {
    it('should call Plotly.relayout on each plot', () => {
      const relayoutSpy = vi.spyOn(Plotly, 'relayout').mockResolvedValue(undefined as never);
      const mockPlots = [{} as PlotlyHTMLElement, {} as PlotlyHTMLElement];

      applySharedYRange(mockPlots, [10, 90]);

      expect(relayoutSpy).toHaveBeenCalledTimes(2);
      expect(relayoutSpy).toHaveBeenCalledWith(mockPlots[0], { 'yaxis.range': [10, 90], 'yaxis.autorange': false });
      expect(relayoutSpy).toHaveBeenCalledWith(mockPlots[1], { 'yaxis.range': [10, 90], 'yaxis.autorange': false });

      relayoutSpy.mockRestore();
    });
  });
});
