/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { type Mock } from 'vitest';
import Plotly, { Data, Layout } from 'plotly.js-dist-min';
import { createConformityPlot, CONFORMITY_PLOT_ID, purgeConformityPlot } from './createConformityPlot';
import { ConformityPlotResponse } from '../conformity-plot.model';
import { ObstacleConformityType } from '@infrastructure/database/entities/catalog-obstacle-configuration.entity';

vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    react: vi.fn(),
    purge: vi.fn()
  }
}));

describe('createConformityPlot', () => {
  let mockElement: HTMLDivElement;
  let mockDocument: Document;

  const mockResponse: ConformityPlotResponse = {
    obstacle: {
      name: 'obstacle-1',
      points: [{ x: 20, y: 30 }]
    },
    conformity: {
      RULE_1: {
        zonePlot: {
          zonePoints: [
            { LowerLeft: { x: 9, y: 47 } },
            { LowerRight: { x: 12, y: 47 } },
            { UpperRight: { x: 12, y: 51 } },
            { UpperLeft: { x: 9, y: 51 } }
          ],
          zoneBorder: [
            { x: 9, y: 51 },
            { x: 9, y: 47 },
            { x: 12, y: 47 },
            { x: 12, y: 51 }
          ]
        },
        points: [{ x: 11, y: 49, radius: 1 }]
      },
      RULE_2: {
        zonePlot: {
          zonePoints: [
            { LowerLeft: { x: 8, y: 46 } },
            { LowerRight: { x: 13, y: 46 } },
            { UpperRight: { x: 13, y: 51 } },
            { UpperLeft: { x: 8, y: 51 } }
          ],
          zoneBorder: [
            { x: 8, y: 51 },
            { x: 8, y: 46 },
            { x: 13, y: 46 },
            { x: 13, y: 51 }
          ]
        },
        points: [{ x: 10, y: 48, radius: 1 }]
      }
    }
  };

  const defaultOptions = {
    selectedRuleTypes: ['RULE_1', 'RULE_2'],
    ruleColors: { RULE_1: '#017aa3', RULE_2: '#ff0000' },
    conformityType: 'overhang' as ObstacleConformityType
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockElement = document.createElement('div');
    mockElement.id = CONFORMITY_PLOT_ID;

    mockDocument = {
      getElementById: vi.fn((id: string) => (id === CONFORMITY_PLOT_ID ? mockElement : null))
    } as unknown as Document;
  });

  describe('DOM guard', () => {
    it('should not call Plotly.react when the plot div is absent', () => {
      const missingDocument = { getElementById: vi.fn(() => null) } as unknown as Document;

      createConformityPlot(missingDocument, mockResponse, defaultOptions);

      expect(Plotly.react).not.toHaveBeenCalled();
    });

    it('should call Plotly.react with the plot id when the div is present', () => {
      createConformityPlot(mockDocument, mockResponse, defaultOptions);

      expect(Plotly.react).toHaveBeenCalledWith(
        CONFORMITY_PLOT_ID,
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('rule selection', () => {
    it('should only draw traces for selected rule types', () => {
      createConformityPlot(mockDocument, mockResponse, { ...defaultOptions, selectedRuleTypes: ['RULE_1'] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      // RULE_1: zone fill + border + points = 3 traces, plus the obstacle trace = 4.
      expect(traces).toHaveLength(4);
    });

    it('should draw nothing but the obstacle when no rule is selected', () => {
      createConformityPlot(mockDocument, mockResponse, { ...defaultOptions, selectedRuleTypes: [] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      expect(traces).toHaveLength(1);
    });
  });

  describe('overhang / vegetation styling', () => {
    it('should draw a zone fill and border trace per selected rule, plus a cable-points trace', () => {
      createConformityPlot(mockDocument, mockResponse, defaultOptions);

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      // 2 rules * (fill + border) = 4, + 2 rules * points = 2, + 1 obstacle = 7.
      expect(traces).toHaveLength(7);
    });

    it('should close the zone fill polygon by repeating the first point', () => {
      createConformityPlot(mockDocument, mockResponse, { ...defaultOptions, selectedRuleTypes: ['RULE_1'] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const fillTrace = traces[0] as { x: number[]; y: number[]; fill: string };
      expect(fillTrace.fill).toBe('toself');
      expect(fillTrace.x[0]).toBe(fillTrace.x[fillTrace.x.length - 1]);
      expect(fillTrace.y[0]).toBe(fillTrace.y[fillTrace.y.length - 1]);
    });

    it('should convert the rule hex color to an rgba fill with the fixed opacity', () => {
      createConformityPlot(mockDocument, mockResponse, { ...defaultOptions, selectedRuleTypes: ['RULE_1'] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const fillTrace = traces[0] as { fillcolor: string };
      expect(fillTrace.fillcolor).toBe('rgba(1, 122, 163, 0.2)');
    });

    it('should trace the zone border along the provided zoneBorder polyline in the rule color', () => {
      createConformityPlot(mockDocument, mockResponse, { ...defaultOptions, selectedRuleTypes: ['RULE_1'] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const borderTrace = traces[1] as { x: number[]; y: number[]; line: { color: string } };
      expect(borderTrace.x).toEqual([9, 9, 12, 12]);
      expect(borderTrace.y).toEqual([51, 47, 47, 51]);
      expect(borderTrace.line.color).toBe('#017aa3');
    });

    it('should draw cable candidate points in the shared cable point color, not the rule color', () => {
      createConformityPlot(mockDocument, mockResponse, {
        ...defaultOptions,
        selectedRuleTypes: ['RULE_1'],
        ruleColors: { ...defaultOptions.ruleColors, RULE_1: '#ff0000' }
      });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const pointsTrace = traces[2] as { marker: { color: string } };
      expect(pointsTrace.marker.color).toBe('#017aa3');
    });

    it('should stack the first rule key on top by drawing zones in reverse key order', () => {
      createConformityPlot(mockDocument, mockResponse, defaultOptions);

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      // RULE_2's fill is pushed first (bottom), RULE_1's fill is pushed after it (on top).
      const firstFill = traces[0] as { fillcolor: string };
      const secondFill = traces[2] as { fillcolor: string };
      expect(firstFill.fillcolor).toBe('rgba(255, 0, 0, 0.2)'); // RULE_2
      expect(secondFill.fillcolor).toBe('rgba(1, 122, 163, 0.2)'); // RULE_1
    });

    it('should not add any shapes for overhang / vegetation styling', () => {
      createConformityPlot(mockDocument, mockResponse, defaultOptions);

      const layout = (Plotly.react as Mock).mock.calls[0][2] as Partial<Layout>;
      expect(layout.shapes).toEqual([]);
    });

    it('should fall back to the default zone color when a rule has no catalog color', () => {
      createConformityPlot(mockDocument, mockResponse, {
        ...defaultOptions,
        selectedRuleTypes: ['RULE_1'],
        ruleColors: {}
      });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const borderTrace = traces[1] as { line: { color: string } };
      expect(borderTrace.line.color).toBe('#888888');
    });
  });

  describe('cable_track styling', () => {
    const cableTrackOptions = { ...defaultOptions, conformityType: 'cable_track' as ObstacleConformityType };

    it('should draw disks as shapes instead of zone fill/border traces', () => {
      createConformityPlot(mockDocument, mockResponse, { ...cableTrackOptions, selectedRuleTypes: ['RULE_1'] });

      const layout = (Plotly.react as Mock).mock.calls[0][2] as Partial<Layout>;
      expect(layout.shapes?.length).toBe(1);
      expect(layout.shapes?.[0].type).toBe('circle');

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      // 1 disk-center trace + 1 obstacle trace, no zone fill/border.
      expect(traces).toHaveLength(2);
    });

    it('should size the disk shape from the point radius', () => {
      createConformityPlot(mockDocument, mockResponse, { ...cableTrackOptions, selectedRuleTypes: ['RULE_1'] });

      const layout = (Plotly.react as Mock).mock.calls[0][2] as Partial<Layout>;
      const disk = layout.shapes?.[0] as { x0: number; x1: number; y0: number; y1: number };
      expect(disk.x0).toBe(10); // 11 - radius(1)
      expect(disk.x1).toBe(12); // 11 + radius(1)
      expect(disk.y0).toBe(48); // 49 - radius(1)
      expect(disk.y1).toBe(50); // 49 + radius(1)
    });

    it('should color disk centers with the shared cable point color, not the rule color', () => {
      createConformityPlot(mockDocument, mockResponse, { ...cableTrackOptions, selectedRuleTypes: ['RULE_2'] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const centersTrace = traces[0] as { marker: { color: string } };
      // RULE_2's catalog color is '#ff0000', but disk centers always use the shared cable point color.
      expect(centersTrace.marker.color).toBe('#017aa3');
    });
  });

  describe('obstacle trace', () => {
    it('should always draw the obstacle on top, using its name in the hover template', () => {
      createConformityPlot(mockDocument, mockResponse, { ...defaultOptions, selectedRuleTypes: [] });

      const traces = (Plotly.react as Mock).mock.calls[0][1] as Data[];
      const obstacleTrace = traces[0] as { x: number[]; y: number[]; hovertemplate: string };
      expect(obstacleTrace.x).toEqual([20]);
      expect(obstacleTrace.y).toEqual([30]);
      expect(obstacleTrace.hovertemplate).toContain('obstacle-1');
    });
  });

  describe('layout', () => {
    it('should configure 1:1 scaled axes that allow zooming', () => {
      createConformityPlot(mockDocument, mockResponse, defaultOptions);

      const layout = (Plotly.react as Mock).mock.calls[0][2] as Partial<Layout>;
      expect(layout.dragmode).toBe('zoom');
      expect(layout.xaxis?.fixedrange).toBeUndefined();
      expect(layout.yaxis?.fixedrange).toBeUndefined();
      expect(layout.yaxis?.scaleanchor).toBe('x');
      expect(layout.yaxis?.scaleratio).toBe(1);
    });

    it('should enable the mode bar and scroll zoom in the config', () => {
      createConformityPlot(mockDocument, mockResponse, defaultOptions);

      const config = (Plotly.react as Mock).mock.calls[0][3] as { displayModeBar: boolean; scrollZoom: boolean };
      expect(config.displayModeBar).toBe(true);
      expect(config.scrollZoom).toBe(true);
    });
  });
});

describe('purgeConformityPlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should purge the plot when the div is present', () => {
    const mockElement = document.createElement('div');
    mockElement.id = CONFORMITY_PLOT_ID;
    const mockDocument = {
      getElementById: vi.fn((id: string) => (id === CONFORMITY_PLOT_ID ? mockElement : null))
    } as unknown as Document;

    purgeConformityPlot(mockDocument);

    expect(Plotly.purge).toHaveBeenCalledWith(CONFORMITY_PLOT_ID);
  });

  it('should not purge when the div is absent', () => {
    const mockDocument = { getElementById: vi.fn(() => null) } as unknown as Document;

    purgeConformityPlot(mockDocument);

    expect(Plotly.purge).not.toHaveBeenCalled();
  });
});
