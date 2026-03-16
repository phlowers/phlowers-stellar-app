/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createShadowPlotData } from './createShadowPlotData';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { PlotOptions } from '@shared/types/plot.types';

describe('createShadowPlotData', () => {
  const mockSectionOutput: GetSectionOutput = {
    spans: [[[1, 2, 3]], [[4, 5, 6]]],
    supports: [[[7, 8, 9]], [[10, 11, 12]], [[13, 14, 15]]],
    insulators: [[[16, 17, 18]], [[19, 20, 21]], [[22, 23, 24]]],
    L0: [],
    elevation: [],
    line_angle: [],
    vtl_under_chain: [],
    vtl_under_console: [],
    r_under_chain: [],
    r_under_console: [],
    ground_altitude: [],
    load_angle: [],
    displacement: [],
    span_length: [],
    loads_coords: {},
    parameter: [],
    tension_sup: [],
    tension_inf: [],
    horizontal_distance: [],
    arc_length: [],
    T_h: []
  };

  const defaultPlotOptions: PlotOptions = {
    view: '3d',
    side: 'profile',
    startSupport: 0,
    endSupport: 2,
    invert: false
  };

  it('should return flattened array of shadow data objects', () => {
    const result = createShadowPlotData(mockSectionOutput, defaultPlotOptions);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include shadow data for spans, supports, and insulators', () => {
    const result = createShadowPlotData(mockSectionOutput, defaultPlotOptions);

    // We expect: spans (2) + supports (3) + insulators (3) = 8 traces
    // for startSupport=0, endSupport=2:
    // - spans: 2 traces (0 to 2, exclusive end = 2 traces)
    // - supports: 3 traces (0 to 2+1 = 3 traces)
    // - insulators: 3 traces (0 to 2+1 = 3 traces)
    expect(result.length).toBe(8);
  });

  it('should respect start and end support for slicing', () => {
    const options: PlotOptions = {
      ...defaultPlotOptions,
      startSupport: 1,
      endSupport: 2
    };

    const result = createShadowPlotData(mockSectionOutput, options);

    // spans: 1 trace (1 to 2)
    // supports: 2 traces (1 to 3)
    // insulators: 2 traces (1 to 3)
    expect(result.length).toBe(5);
  });

  it('should use correct plot type for 3d view', () => {
    const result = createShadowPlotData(mockSectionOutput, defaultPlotOptions);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result[0] as any).type).toBe('scatter3d');
  });

  it('should use correct plot type for 2d view', () => {
    const options: PlotOptions = {
      ...defaultPlotOptions,
      view: '2d'
    };

    const result = createShadowPlotData(mockSectionOutput, options);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result[0] as any).type).toBe('scatter');
  });

  it('should set hoverinfo to skip for all shadow traces', () => {
    const result = createShadowPlotData(mockSectionOutput, defaultPlotOptions);

    result.forEach((trace) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((trace as any).hoverinfo).toBe('skip');
    });
  });

  it('should set showlegend to false for all shadow traces', () => {
    const result = createShadowPlotData(mockSectionOutput, defaultPlotOptions);

    result.forEach((trace) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((trace as any).showlegend).toBe(false);
    });
  });

  it('should use solid line style for shadow traces', () => {
    const result = createShadowPlotData(mockSectionOutput, defaultPlotOptions);

    result.forEach((trace) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((trace as any).line.dash).toBe('solid');
    });
  });
});
