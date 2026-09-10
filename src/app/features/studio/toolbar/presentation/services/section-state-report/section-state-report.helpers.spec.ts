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

import { buildSpanRows, buildSupportRows, drawCartoucheSection, maxOf } from './section-state-report.helpers';
import { SectionReportLabels, SectionStateReportData } from './section-state-report.interfaces';

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

/** Collects every string argument passed to doc.text across all calls. */
function textCalls(doc: ReturnType<typeof createMockDoc>): string[] {
  return doc.text.mock.calls.flatMap((call) => {
    const first = call[0];
    return Array.isArray(first) ? (first as string[]) : [String(first)];
  });
}

const CARTOUCHE_LABELS: SectionReportLabels = {
  reportTitle: 'Report',
  cartoucheTitle: 'Study and section',
  author: 'Author',
  study: 'Study',
  studyDescription: 'Description',
  section: 'Section',
  sectionComment: 'Comment',
  initialCondition: 'Initial condition',
  chargeName: 'Load case',
  chargeDescription: 'Load case description',
  sectionStateTitle: 'Section state',
  maxParameter: 'Max parameter',
  maxStressRate: 'Max stress rate',
  spansTitle: 'Spans',
  supportsTitle: 'Supports',
  pageLabel: 'Page'
};

function createCartoucheData(overrides: Partial<SectionStateReportData> = {}): SectionStateReportData {
  return {
    author: 'a@b.com',
    date: '2026-05-20',
    studyTitle: 'My study',
    studyDescription: 'Study desc',
    sectionName: 'Section A',
    sectionComment: 'A comment',
    icName: 'IC 1',
    chargeName: 'Charge 1',
    chargeDescription: 'Charge desc',
    maxParameter: 1500,
    maxStressRate: 60,
    spans: [],
    supports: [],
    ...overrides
  };
}

describe('section-state-report.helpers', () => {
  describe('drawCartoucheSection', () => {
    it('draws the title, every metadata label with its value, and a separator', () => {
      const doc = createMockDoc();
      const y = drawCartoucheSection(doc as unknown as jsPDF, createCartoucheData(), CARTOUCHE_LABELS, 20);
      const texts = textCalls(doc);

      expect(texts).toContain('Study and section');
      for (const label of ['Author', 'Study', 'Description', 'Section', 'Comment', 'Initial condition', 'Load case']) {
        expect(texts.some((t) => t.includes(label))).toBe(true);
      }
      for (const value of [
        'a@b.com',
        'My study',
        'Study desc',
        'Section A',
        'A comment',
        'IC 1',
        'Charge 1',
        'Charge desc'
      ]) {
        expect(texts).toContain(value);
      }
      expect(doc.line).toHaveBeenCalled();
      expect(y).toBeGreaterThan(20);
    });

    it('wraps exactly the 4 long rows (study, description, comment, charge description)', () => {
      const doc = createMockDoc();
      drawCartoucheSection(doc as unknown as jsPDF, createCartoucheData(), CARTOUCHE_LABELS, 20);
      expect(doc.splitTextToSize).toHaveBeenCalledTimes(4);
    });

    it('falls back to "-" for empty metadata values', () => {
      const doc = createMockDoc();
      drawCartoucheSection(
        doc as unknown as jsPDF,
        createCartoucheData({
          author: '',
          studyTitle: '',
          studyDescription: '',
          sectionName: '',
          sectionComment: '',
          icName: '',
          chargeName: '',
          chargeDescription: ''
        }),
        CARTOUCHE_LABELS,
        20
      );
      expect(textCalls(doc)).toContain('-');
    });
  });

  describe('maxOf', () => {
    it('should return the maximum value of the array', () => {
      expect(maxOf([1, 9, 3])).toBe(9);
    });

    it('should return null for an empty or missing array', () => {
      expect(maxOf([])).toBeNull();
      expect(maxOf(undefined)).toBeNull();
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
});
