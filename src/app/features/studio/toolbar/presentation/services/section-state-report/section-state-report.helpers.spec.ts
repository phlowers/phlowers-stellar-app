/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import { Support } from '@shared/domain';
import { SectionOutputParameters } from '@core/services/worker_python/tasks/types';

import { SPAN_METRICS, SUPPORT_METRICS } from './section-state-report.constantes';
import {
  buildSpanRows,
  buildSupportRows,
  buildTables,
  chunk,
  computeLabelColWidth,
  drawResultTablesSection,
  drawTable,
  formatCell,
  maxOf
} from './section-state-report.helpers';
import { PdfTableModel, SpanReportRow } from './section-state-report.interfaces';

function createMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(20),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text])
  };
}

function createMockSupport(number: string | null): Support {
  return { number } as Support;
}

function createMockParams(): SectionOutputParameters {
  return {
    span_length: [100, 200, 300],
    elevation: [1, 2, 3],
    parameter: [1500, 1600, 1700],
    T_h: [10, 20, 30],
    tension_sup: [11, 21, 31],
    tension_inf: [9, 19, 29],
    sag: [5, 6, 7],
    sag_s2: [5.5, 6.5, 7.5],
    horizontal_distance: [99, 199, 299],
    L0: [101, 201, 301],
    arc_length: [102, 202, 302],
    slope_left: [1.1, 1.2, 1.3],
    slope_right: [2.1, 2.2, 2.3],
    utilization_rate: [40, 55, 70],
    line_angle: [0, 5, 10],
    // Axis-major: [V-per-support, H-per-support, L-per-support]. Four supports so tests can
    // assert values beyond index 2 (the range that was silently dropped by the old bug).
    vtl_under_chain: [
      [1, 2, 3, 4],
      [11, 12, 13, 14],
      [21, 22, 23, 24]
    ],
    vtl_under_console: [
      [100, 200, 300, 400],
      [110, 210, 310, 410],
      [120, 220, 320, 420]
    ],
    r_under_chain: [31, 32, 33, 34],
    r_under_console: [130, 230, 330, 430],
    displacement: [
      [1.0, 0.12, 0.41, 0.65],
      [-0.47, -0.56, -0.08, -1.6],
      [-0.11, -1.25, -1.31, -1.21]
    ],
    ground_altitude: [500, 501, 502, 503],
    load_angle: [0.1, 0.2, 0.3, 0.4]
  } as unknown as SectionOutputParameters;
}

describe('section-state-report.helpers', () => {
  describe('maxOf', () => {
    it('should return the maximum value of the array', () => {
      expect(maxOf([1, 9, 3])).toBe(9);
    });

    it('should return null for an empty or missing array', () => {
      expect(maxOf([])).toBeNull();
      expect(maxOf(undefined)).toBeNull();
    });
  });

  describe('chunk', () => {
    it('should split an array into chunks of the given size', () => {
      expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([
        [1, 2, 3, 4, 5],
        [6, 7]
      ]);
    });
  });

  describe('formatCell', () => {
    const row: SpanReportRow = {
      spanNumber: '1 - 2',
      spanLength: 100,
      elevation: null,
      parameter: 1500,
      horizontalTension: null,
      tensionSup: null,
      tensionInf: null,
      sagF1: null,
      sagF2: null,
      horizontalDistance: null,
      naturalLength: null,
      arcLength: null,
      slopeLeft: null,
      slopeRight: null,
      utilizationRate: null
    };

    it('should return the raw string for the identifier row (unit null)', () => {
      expect(formatCell(row, SPAN_METRICS[0])).toBe('1 - 2');
    });

    it('should format numeric values with their unit', () => {
      expect(formatCell(row, SPAN_METRICS[1])).toBe('100.00 m');
    });

    it('should return a dash for null numeric values', () => {
      expect(formatCell(row, SPAN_METRICS[2])).toBe('-');
    });
  });

  describe('buildSpanRows', () => {
    it('should map span arrays for the [start, end - 1] index range', () => {
      const supports = [createMockSupport('1'), createMockSupport('2'), createMockSupport('3'), createMockSupport('4')];
      const rows = buildSpanRows(createMockParams(), supports, 0, 2);

      expect(rows).toHaveLength(2);
      expect(rows[0].spanNumber).toBe('1 - 2');
      expect(rows[1].spanNumber).toBe('2 - 3');
      expect(rows[0].spanLength).toBe(100);
      expect(rows[0].horizontalTension).toBe(10);
      expect(rows[1].utilizationRate).toBe(55);
    });

    it('should use a dash for missing support numbers', () => {
      const supports = [createMockSupport(null), createMockSupport(null)];
      const rows = buildSpanRows(createMockParams(), supports, 0, 1);
      expect(rows[0].spanNumber).toBe('- - -');
    });
  });

  describe('buildSupportRows', () => {
    it('should map support and vtl arrays for the [start, end] index range', () => {
      const supports = [createMockSupport('10'), createMockSupport('20'), createMockSupport('30')];
      const rows = buildSupportRows(createMockParams(), supports, 0, 2);

      expect(rows).toHaveLength(3);
      expect(rows[0].supportNumber).toBe('10');
      // Axis-major read: vChain = V[0], hChain = H[0], lChain = L[0], rChain = r_under_chain[0].
      expect(rows[0].vChain).toBe(1);
      expect(rows[0].hChain).toBe(11);
      expect(rows[0].lChain).toBe(21);
      expect(rows[0].rChain).toBe(31);
      expect(rows[0].vConsole).toBe(100);
      expect(rows[0].hConsole).toBe(110);
      expect(rows[0].lConsole).toBe(120);
      expect(rows[0].rConsole).toBe(130);
      expect(rows[0].displacementX).toBe(1.0);
      expect(rows[0].displacementY).toBe(-0.47);
      expect(rows[0].displacementZ).toBe(-0.11);
      expect(rows[2].loadAngle).toBe(0.3);
    });

    it('should populate displacement/chain/console values for supports beyond index 2 (axis-major regression)', () => {
      const supports = [
        createMockSupport('10'),
        createMockSupport('20'),
        createMockSupport('30'),
        createMockSupport('40')
      ];
      const rows = buildSupportRows(createMockParams(), supports, 0, 3);

      expect(rows).toHaveLength(4);
      expect(rows[3].supportNumber).toBe('40');
      expect(rows[3].vChain).toBe(4);
      expect(rows[3].hChain).toBe(14);
      expect(rows[3].lChain).toBe(24);
      expect(rows[3].rChain).toBe(34);
      expect(rows[3].vConsole).toBe(400);
      expect(rows[3].hConsole).toBe(410);
      expect(rows[3].lConsole).toBe(420);
      expect(rows[3].rConsole).toBe(430);
      expect(rows[3].displacementX).toBe(0.65);
      expect(rows[3].displacementY).toBe(-1.6);
      expect(rows[3].displacementZ).toBe(-1.21);
    });
  });

  describe('buildTables', () => {
    it('should build one table per chunk of 5 columns with a row per metric', () => {
      const supports = Array.from({ length: 7 }, (_, i) => createMockSupport(String(i + 1)));
      const spanRows = buildSpanRows(createMockParams(), supports, 0, 6);
      const tables = buildTables(spanRows, SPAN_METRICS, (key) => key);

      expect(tables).toHaveLength(2);
      expect(tables[0].rows).toHaveLength(SPAN_METRICS.length);
      expect(tables[0].rows[0].values).toHaveLength(5);
      expect(tables[1].rows[0].values).toHaveLength(1);
    });

    it('should build support tables with one row per support metric', () => {
      const supports = [createMockSupport('1'), createMockSupport('2'), createMockSupport('3')];
      const supportRows = buildSupportRows(createMockParams(), supports, 0, 2);
      const tables = buildTables(supportRows, SUPPORT_METRICS, (key) => key);

      expect(tables).toHaveLength(1);
      expect(tables[0].rows).toHaveLength(SUPPORT_METRICS.length);
      expect(tables[0].rows[0].values).toHaveLength(3);
    });
  });

  describe('computeLabelColWidth', () => {
    it('should size the column to the widest label across all given tables', () => {
      const doc = createMockDoc();
      doc.getTextWidth = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(40).mockReturnValueOnce(15);
      const tables: PdfTableModel[] = [
        { rows: [{ label: 'Short', values: ['1'] }] },
        {
          rows: [
            { label: 'Angle balancement', values: ['2'] },
            { label: 'Also short', values: ['3'] }
          ]
        }
      ];

      const width = computeLabelColWidth(doc as unknown as jsPDF, tables);

      expect(width).toBe(40 + 2 * 1.5);
    });
  });

  describe('drawTable', () => {
    it('should draw a cell per metric row and return an increased Y position', () => {
      const doc = createMockDoc();
      const table: PdfTableModel = {
        rows: [
          { label: 'A', values: ['1', '2'] },
          { label: 'B', values: ['3', '4'] }
        ]
      };

      const endY = drawTable(doc as unknown as jsPDF, table, 30, 297, 62);

      expect(endY).toBeGreaterThan(30);
      expect(doc.rect).toHaveBeenCalled();
    });
  });

  describe('drawResultTablesSection', () => {
    it('should add a landscape page for every group of two tables', () => {
      const doc = createMockDoc();
      const tables: PdfTableModel[] = [
        { rows: [{ label: 'A', values: ['1'] }] },
        { rows: [{ label: 'A', values: ['2'] }] },
        { rows: [{ label: 'A', values: ['3'] }] }
      ];

      drawResultTablesSection(doc as unknown as jsPDF, '2026-05-20', 'Report', 'Section', tables, 62);

      // 3 tables → 2 pages (indices 0 and 2 start a new page)
      expect(doc.addPage).toHaveBeenCalledTimes(2);
      expect(doc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should do nothing when there are no tables', () => {
      const doc = createMockDoc();
      drawResultTablesSection(doc as unknown as jsPDF, '2026-05-20', 'Report', 'Section', [], 62);
      expect(doc.addPage).not.toHaveBeenCalled();
    });
  });
});
