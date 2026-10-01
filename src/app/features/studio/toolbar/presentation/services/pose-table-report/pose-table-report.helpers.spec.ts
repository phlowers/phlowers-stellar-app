/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import {
  buildPoseTableRows,
  drawPoseCalculationSection,
  drawPoseTableReportPage1,
  drawStudyAndCantonSection,
  formatTemperature,
  getReportDateLocale
} from './pose-table-report.helpers';
import { PoseTableReportData, PoseTableReportLabels } from './pose-table-report.interfaces';

function createMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(10),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text])
  };
}

/** Collects every string argument passed to doc.text across all calls. */
function textCalls(doc: ReturnType<typeof createMockDoc>): string[] {
  return doc.text.mock.calls.flatMap((call) => {
    const first = call[0];
    return Array.isArray(first) ? (first as string[]) : [String(first)];
  });
}

const LABELS: PoseTableReportLabels = {
  reportTitle: 'Pose report',
  pageLabel: 'Page',
  cartoucheTitle: 'Study and canton',
  author: 'Author',
  study: 'Study',
  studyDescription: 'Study description',
  canton: 'Canton',
  cantonComment: 'Comment',
  initialCondition: 'IC',
  chargeName: 'Load case',
  chargeDescription: 'Description',
  poseCalculationTitle: 'Pose calculation',
  baseParameter: 'Base parameter',
  baseTemperature: 'Base temperature',
  equivalentSpan: 'Equivalent span',
  lowestTemperature: 'Lowest temperature',
  computingStep: 'Computing step',
  resultsTitle: 'Results'
};

function createData(overrides: Partial<PoseTableReportData> = {}): PoseTableReportData {
  return {
    date: '30/09/2026',
    author: 'author@example.test',
    studyTitle: 'Fake study',
    studyDescription: 'Fake description',
    cantonName: 'Fake canton',
    cantonComment: 'Fake comment',
    icName: 'Fake IC',
    chargeName: 'Fake load case',
    chargeDescription: 'Fake load description',
    baseParameter: 1500.456,
    baseTemperature: 15.25,
    equivalentSpan: 312.34,
    lowestTemp: -10.5,
    computingStep: 5,
    results: { temperatures: [-10, -5], poseParams: [1200, 1300], horizontalTensions: [2000, 2100] },
    ...overrides
  };
}

describe('pose-table-report.helpers', () => {
  describe('formatTemperature', () => {
    it('keeps the raw value without rounding', () => {
      expect(formatTemperature(-10.25)).toBe('-10.25 °C');
      expect(formatTemperature(5)).toBe('5 °C');
    });
  });

  describe('getReportDateLocale', () => {
    it('maps en to en-US and any other language to fr-FR', () => {
      expect(getReportDateLocale('en')).toBe('en-US');
      expect(getReportDateLocale('fr')).toBe('fr-FR');
    });
  });

  describe('buildPoseTableRows', () => {
    it('pairs each temperature with its pose parameter and tension, preserving order', () => {
      const rows = buildPoseTableRows(createData().results);
      expect(rows).toEqual([
        { temperature: '-10 °C', poseParam: 1200, horizontalTension: 2000 },
        { temperature: '-5 °C', poseParam: 1300, horizontalTension: 2100 }
      ]);
    });

    it('falls back to null when a value is missing for a temperature', () => {
      const rows = buildPoseTableRows({ temperatures: [0], poseParams: [], horizontalTensions: [] });
      expect(rows).toEqual([{ temperature: '0 °C', poseParam: null, horizontalTension: null }]);
    });

    it('returns no rows for empty results', () => {
      expect(buildPoseTableRows({ temperatures: [], poseParams: [], horizontalTensions: [] })).toEqual([]);
    });
  });

  describe('drawStudyAndCantonSection', () => {
    it('draws the title, every label and value, and a separator', () => {
      const doc = createMockDoc();
      const y = drawStudyAndCantonSection(doc as unknown as jsPDF, createData(), LABELS, 20);
      const texts = textCalls(doc);

      expect(texts).toContain('Study and canton');
      for (const value of [
        'author@example.test',
        'Fake study',
        'Fake description',
        'Fake canton',
        'Fake comment',
        'Fake IC',
        'Fake load case',
        'Fake load description',
        'Fake load case',
        'Fake load description'
      ]) {
        expect(texts).toContain(value);
      }
      expect(doc.line).toHaveBeenCalled();
      expect(y).toBeGreaterThan(20);
    });

    it('falls back to "-" for empty metadata values', () => {
      const doc = createMockDoc();
      drawStudyAndCantonSection(
        doc as unknown as jsPDF,
        createData({ author: '', cantonComment: '', icName: '' }),
        LABELS,
        20
      );
      expect(textCalls(doc)).toContain('-');
    });
  });

  describe('drawPoseCalculationSection', () => {
    it('formats values with their units and precisions', () => {
      const doc = createMockDoc();
      drawPoseCalculationSection(doc as unknown as jsPDF, createData(), LABELS, 20);
      const texts = textCalls(doc);

      expect(texts).toContain('Pose calculation');
      expect(texts).toContain('1500.46 m');
      expect(texts).toContain('15.3 °C');
      expect(texts).toContain('312.3 m');
      expect(texts).toContain('-10.5 °C');
      expect(texts).toContain('5 °C');
    });

    it('renders "-" for missing base values and equivalent span', () => {
      const doc = createMockDoc();
      drawPoseCalculationSection(
        doc as unknown as jsPDF,
        createData({ baseParameter: null, baseTemperature: null, equivalentSpan: null }),
        LABELS,
        20
      );
      expect(textCalls(doc).filter((text) => text === '-')).toHaveLength(3);
    });
  });

  describe('drawPoseTableReportPage1', () => {
    it('draws the header title, date and both section titles, and returns the next Y', () => {
      const doc = createMockDoc();
      const y = drawPoseTableReportPage1(doc as unknown as jsPDF, createData(), LABELS);
      const texts = textCalls(doc);

      expect(texts).toContain('Pose report');
      expect(texts).toContain('30/09/2026');
      expect(texts).toContain('Study and canton');
      expect(texts).toContain('Pose calculation');
      expect(y).toBeGreaterThan(0);
    });
  });
});
