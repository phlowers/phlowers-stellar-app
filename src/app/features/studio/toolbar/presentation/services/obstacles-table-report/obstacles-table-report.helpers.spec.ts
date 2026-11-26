/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import {
  buildObstaclesReportFilename,
  drawObstaclesReportPage1,
  drawStudyAndCantonSection
} from './obstacles-table-report.helpers';
import { ObstaclesTableReportData, ObstaclesTableReportLabels } from './obstacles-table-report.interfaces';

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

// Collects every string argument passed to doc.text across all calls
function textCalls(doc: ReturnType<typeof createMockDoc>): string[] {
  return doc.text.mock.calls.flatMap((call) => {
    const first = call[0];
    return Array.isArray(first) ? (first as string[]) : [String(first)];
  });
}

const LABELS: ObstaclesTableReportLabels = {
  reportTitle: 'Obstacles report',
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
  obstaclesTitle: 'Obstacle points'
};

function createData(overrides: Partial<ObstaclesTableReportData> = {}): ObstaclesTableReportData {
  return {
    date: '22/10/2026',
    time: '14:35',
    author: 'author@example.test',
    studyTitle: 'Fake study',
    studyDescription: 'Fake description',
    cantonName: 'Fake canton',
    cantonComment: 'Fake comment',
    icName: 'Fake IC',
    chargeName: 'Fake load case',
    chargeDescription: 'Fake load description',
    rows: [],
    ...overrides
  };
}

describe('obstacles-table-report.helpers', () => {
  describe('buildObstaclesReportFilename', () => {
    it('joins title, canton, load case, date and time', () => {
      expect(buildObstaclesReportFilename('Obstacles report', createData())).toBe(
        'Obstacles report_Fake canton_Fake load case_22-10-2026 14-35.pdf'
      );
    });

    it('strips the characters illegal in a file name from every part', () => {
      const data = createData({ cantonName: 'A/B:C', chargeName: 'Load*case?', date: '10/22/2026', time: '09:05' });

      expect(buildObstaclesReportFilename('Report', data)).toBe('Report_A-B-C_Load-case-_10-22-2026 09-05.pdf');
    });
  });

  describe('drawStudyAndCantonSection', () => {
    it('draws the cartouche labels with their values, "-" for the empty ones', () => {
      const doc = createMockDoc();
      drawStudyAndCantonSection(
        doc as unknown as jsPDF,
        createData({ cantonComment: '', chargeDescription: '' }),
        LABELS,
        20
      );
      const texts = textCalls(doc);

      expect(texts).toContain('Study and canton');
      expect(texts).toContain('• Author : ');
      expect(texts).toContain('author@example.test');
      expect(texts).toContain('Fake canton');
      expect(texts).toContain('Fake IC');
      expect(texts).toContain('Fake load case');
      expect(texts.filter((text) => text === '-')).toHaveLength(2);
    });
  });

  describe('drawObstaclesReportPage1', () => {
    it('draws the header title, date and the cartouche', () => {
      const doc = createMockDoc();
      drawObstaclesReportPage1(doc as unknown as jsPDF, createData(), LABELS);
      const texts = textCalls(doc);

      expect(texts).toContain('Obstacles report');
      expect(texts).toContain('22/10/2026');
      expect(texts).toContain('Study and canton');
    });

    it('falls back to "-" in the header when the date is empty', () => {
      const doc = createMockDoc();
      drawObstaclesReportPage1(doc as unknown as jsPDF, createData({ date: '' }), LABELS);

      expect(textCalls(doc)).toContain('-');
    });
  });
});
