/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import {
  buildTables,
  chunk,
  computeLabelColWidth,
  drawResultTablesFlow,
  drawResultTablesSection,
  drawTable,
  formatCell
} from './pdf-table.helpers';
import { MetricDescriptor, PdfResultSection, PdfTableModel } from './pdf-table.interfaces';

function createMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    setDrawColor: vi.fn(),
    setPage: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(20),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text])
  };
}

interface TestRow {
  id: string;
  value: number | null;
}

const TEST_METRICS: MetricDescriptor<TestRow>[] = [
  { labelKey: 'id-label', unit: null, decimals: 0, field: 'id' },
  { labelKey: 'value-label', unit: 'm', decimals: 2, field: 'value' }
];

describe('pdf-table.helpers', () => {
  describe('chunk', () => {
    it('should split an array into chunks of the given size', () => {
      expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([
        [1, 2, 3, 4, 5],
        [6, 7]
      ]);
    });
  });

  describe('formatCell', () => {
    const row: TestRow = { id: '1 - 2', value: 100 };

    it('should return the raw string for the identifier row (unit null)', () => {
      expect(formatCell(row, TEST_METRICS[0])).toBe('1 - 2');
    });

    it('should format numeric values with their unit', () => {
      expect(formatCell(row, TEST_METRICS[1])).toBe('100.00 m');
    });

    it('should return a dash for null numeric values', () => {
      expect(formatCell({ id: '1', value: null }, TEST_METRICS[1])).toBe('-');
    });
  });

  describe('buildTables', () => {
    it('should build one table per chunk of 5 columns with a row per metric', () => {
      const rows: TestRow[] = Array.from({ length: 7 }, (_, i) => ({ id: String(i + 1), value: i }));
      const tables = buildTables(rows, TEST_METRICS, (key) => key);

      expect(tables).toHaveLength(2);
      expect(tables[0].rows).toHaveLength(TEST_METRICS.length);
      expect(tables[0].rows[0].values).toHaveLength(5);
      expect(tables[1].rows[0].values).toHaveLength(2);
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

  describe('drawResultTablesFlow', () => {
    it('should stack several small sections on the same landscape page without extra addPage calls', () => {
      const doc = createMockDoc();
      const sections: PdfResultSection[] = [
        {
          title: 'Section A',
          tables: [
            {
              rows: [
                { label: 'A1', values: ['1'] },
                { label: 'A2', values: ['2'] }
              ]
            }
          ]
        },
        {
          title: 'Section B',
          tables: [
            {
              rows: [
                { label: 'B1', values: ['3'] },
                { label: 'B2', values: ['4'] }
              ]
            }
          ]
        }
      ];

      drawResultTablesFlow(doc as unknown as jsPDF, '2026-05-20', 'Report', sections, 62);

      expect(doc.addPage).toHaveBeenCalledTimes(1);
      expect(doc.addPage).toHaveBeenCalledWith('a4', 'landscape');
      expect(doc.text).toHaveBeenCalledWith('Section A', expect.any(Number), expect.any(Number));
      expect(doc.text).toHaveBeenCalledWith('Section B', expect.any(Number), expect.any(Number));
    });

    it('should start a new page once the cumulative height exceeds the remaining space', () => {
      const doc = createMockDoc();
      const manyRows = Array.from({ length: 40 }, (_, i) => ({ label: `R${i}`, values: [String(i)] }));
      const sections: PdfResultSection[] = [
        { title: 'Section A', tables: [{ rows: [{ label: 'A1', values: ['1'] }] }] },
        { title: 'Section B', tables: [{ rows: manyRows }] }
      ];

      drawResultTablesFlow(doc as unknown as jsPDF, '2026-05-20', 'Report', sections, 62);

      // Section A fits on the first page; Section B's oversized table forces a second page.
      expect(doc.addPage).toHaveBeenCalledTimes(2);
    });

    it('should silently skip a section with no tables', () => {
      const doc = createMockDoc();
      const sections: PdfResultSection[] = [
        { title: 'Empty section', tables: [] },
        { title: 'Section A', tables: [{ rows: [{ label: 'A1', values: ['1'] }] }] }
      ];

      drawResultTablesFlow(doc as unknown as jsPDF, '2026-05-20', 'Report', sections, 62);

      expect(doc.addPage).toHaveBeenCalledTimes(1);
      expect(doc.text).not.toHaveBeenCalledWith('Empty section', expect.any(Number), expect.any(Number));
      expect(doc.text).toHaveBeenCalledWith('Section A', expect.any(Number), expect.any(Number));
    });

    it('should stack a second chunk of the same section directly below the first when space allows', () => {
      const doc = createMockDoc();
      const sections: PdfResultSection[] = [
        {
          title: 'Section A',
          tables: [{ rows: [{ label: 'A1', values: ['1', '2', '3', '4', '5'] }] }, { rows: [{ label: 'A1', values: ['6', '7'] }] }]
        }
      ];

      drawResultTablesFlow(doc as unknown as jsPDF, '2026-05-20', 'Report', sections, 62);

      expect(doc.addPage).toHaveBeenCalledTimes(1);
      expect(doc.text).toHaveBeenCalledWith('Section A', expect.any(Number), expect.any(Number));
    });

    it('should draw a full-width separator line below every table', () => {
      const doc = createMockDoc();
      const sections: PdfResultSection[] = [
        { title: 'Section A', tables: [{ rows: [{ label: 'A1', values: ['1'] }] }] }
      ];

      drawResultTablesFlow(doc as unknown as jsPDF, '2026-05-20', 'Report', sections, 62);

      // contentWidth = LANDSCAPE_PAGE.width(297) - PAGE_MARGIN.left(15) - PAGE_MARGIN.right(15) = 267
      expect(doc.line).toHaveBeenCalledWith(15, expect.any(Number), 15 + 267, expect.any(Number));
    });

    it('should never draw a section title without its first table following on the same page', () => {
      const doc = createMockDoc();
      const sectionARows = Array.from({ length: 26 }, (_, i) => ({ label: `A${i}`, values: [String(i)] }));
      const sectionBRows = Array.from({ length: 3 }, (_, i) => ({ label: `B${i}`, values: [String(i)] }));
      const sections: PdfResultSection[] = [
        { title: 'Section A', tables: [{ rows: sectionARows }] },
        { title: 'Section B', tables: [{ rows: sectionBRows }] }
      ];

      drawResultTablesFlow(doc as unknown as jsPDF, '2026-05-20', 'Report', sections, 62);

      // Section B's title + first table don't fit what's left of page 1, so both must move
      // together to page 2 — the title must be drawn exactly once, never orphaned on page 1.
      const sectionBTitleCalls = doc.text.mock.calls.filter((call) => call[0] === 'Section B');
      expect(sectionBTitleCalls).toHaveLength(1);
      expect(doc.addPage).toHaveBeenCalledTimes(2);
    });
  });
});
