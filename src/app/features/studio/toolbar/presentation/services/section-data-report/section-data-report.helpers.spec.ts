/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import { Support } from '@shared/domain';

import {
  buildSupportRows,
  drawCantonReportPage1,
  drawCantonSection,
  drawInitialConditionSection,
  drawStudyAndCantonSection
} from './section-data-report.helpers';
import { CantonReportData, CantonReportLabels } from './section-data-report.interfaces';

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

function createSupport(overrides: Partial<Support> = {}): Support {
  return {
    uuid: 'u1',
    number: '10',
    name: 'Support 10',
    spanLength: 300,
    spanAngle: 5,
    attachmentSet: 2,
    attachmentHeight: 25,
    heightBelowConsole: null,
    towerModel: 'tower.txt',
    cableType: null,
    armLength: 3,
    chainName: 'Chain A',
    chainLength: 4,
    chainWeight: 120,
    chainV: true,
    counterWeight: 50,
    supportFootAltitude: 200,
    attachmentPosition: 'center',
    chainSurface: null,
    spanAzimut: null,
    footLongitude: null,
    footLatitude: null,
    ...overrides
  };
}

const LABELS: CantonReportLabels = {
  reportTitle: 'Report',
  studyCantonTitle: 'Study and canton',
  cantonTitle: 'Canton',
  initialConditionTitle: 'Initial condition',
  supportsTitle: 'Supports',
  pageLabel: 'Page',
  author: 'Author',
  study: 'Study',
  studyDescription: 'Study description',
  canton: 'Canton label',
  comment: 'Comment',
  initialCondition: 'IC',
  chargeName: 'Charge',
  chargeDescription: 'Charge description',
  type: 'Type',
  cableName: 'Cable',
  maintenanceCenter: 'CM',
  lit: 'LIT',
  supportsCount: 'Supports count',
  supportsDescription: 'Supports description',
  phaseNumber: 'Phase number',
  cablesAmount: 'Cables amount',
  maintenanceTeam: 'EEL',
  branch: 'Branch',
  baseParameter: 'Base parameter',
  cablePretension: 'Pretension',
  maxWindPressure: 'Wind',
  baseTemperature: 'Base temperature',
  minTemperature: 'Min temperature',
  maxFrostWidth: 'Frost'
};

function createData(overrides: Partial<CantonReportData> = {}): CantonReportData {
  return {
    date: '04/09/2026 14:30',
    author: 'a@b.com',
    studyTitle: 'My study',
    studyDescription: 'Desc',
    cantonName: 'Canton X',
    comment: 'A comment',
    icName: 'IC 1',
    chargeName: 'CC 1',
    chargeDescription: 'Charge desc',
    type: 'phase',
    cableName: 'Cable 1',
    maintenanceCenter: 'Center 1',
    litName: 'LIT 1',
    supportsCount: 2,
    supportsDescription: 'Supports comment',
    isPhase: true,
    phaseNumber: 3,
    cablesAmount: 1,
    maintenanceTeam: 'Team 1',
    branchName: 'Branch 1',
    initialCondition: {
      baseParameter: 1500,
      baseTemperature: 15,
      cablePretension: 12,
      minTemperature: -20,
      maxWindPressure: 480,
      maxFrostWidth: 2
    },
    isNonLinear: true,
    supports: [],
    ...overrides
  };
}

describe('section-data-report.helpers', () => {
  describe('buildSupportRows', () => {
    it('maps support fields and formats chainV as Yes when true', () => {
      const rows = buildSupportRows([createSupport({ chainV: true })], 'Oui', 'Non');
      expect(rows[0]).toEqual({
        supportNumber: '10',
        attachmentHeight: 25,
        spanAngle: 5,
        chainName: 'Chain A',
        chainLength: 4,
        chainWeight: 120,
        supportName: 'Support 10',
        attachmentSet: '2',
        armLength: 3,
        chainV: 'Oui',
        counterWeight: 50,
        supportFootAltitude: 200,
        attachmentPosition: 'center',
        towerModel: 'tower.txt'
      });
    });

    it('formats chainV as No when false and dash when null', () => {
      const [falseRow] = buildSupportRows([createSupport({ chainV: false })], 'Oui', 'Non');
      const [nullRow] = buildSupportRows([createSupport({ chainV: null })], 'Oui', 'Non');
      expect(falseRow.chainV).toBe('Non');
      expect(nullRow.chainV).toBe('-');
    });

    it('falls back to dash for missing string/number fields', () => {
      const rows = buildSupportRows(
        [
          createSupport({
            number: null,
            name: null,
            chainName: null,
            attachmentSet: null,
            attachmentPosition: null,
            towerModel: null
          })
        ],
        'Oui',
        'Non'
      );
      expect(rows[0].supportNumber).toBe('-');
      expect(rows[0].supportName).toBe('-');
      expect(rows[0].chainName).toBe('-');
      expect(rows[0].attachmentSet).toBe('-');
      expect(rows[0].attachmentPosition).toBe('-');
      expect(rows[0].towerModel).toBe('-');
    });
  });

  describe('drawStudyAndCantonSection', () => {
    it('draws the title, every label with its value, and a separator', () => {
      const doc = createMockDoc();
      const y = drawStudyAndCantonSection(doc as unknown as jsPDF, createData(), LABELS, 20);
      const texts = textCalls(doc);

      expect(texts).toContain('Study and canton');
      for (const label of [
        'Author',
        'Study',
        'Study description',
        'Canton label',
        'Comment',
        'IC',
        'Charge',
        'Charge description'
      ]) {
        expect(texts.some((t) => t.includes(label))).toBe(true);
      }
      for (const value of ['a@b.com', 'My study', 'Desc', 'Canton X', 'A comment', 'IC 1', 'CC 1', 'Charge desc']) {
        expect(texts).toContain(value);
      }
      expect(doc.line).toHaveBeenCalled();
      expect(y).toBeGreaterThan(20);
    });

    it('wraps all 8 metadata rows', () => {
      const doc = createMockDoc();
      drawStudyAndCantonSection(doc as unknown as jsPDF, createData(), LABELS, 20);
      expect(doc.splitTextToSize).toHaveBeenCalledTimes(8);
    });

    it('falls back to "-" for empty metadata values', () => {
      const doc = createMockDoc();
      drawStudyAndCantonSection(
        doc as unknown as jsPDF,
        createData({
          author: '',
          studyTitle: '',
          studyDescription: '',
          cantonName: '',
          comment: '',
          icName: '',
          chargeName: '',
          chargeDescription: ''
        }),
        LABELS,
        20
      );
      expect(textCalls(doc)).toContain('-');
    });
  });

  describe('drawCantonSection', () => {
    it('includes the phase number row when the section is a phase', () => {
      const doc = createMockDoc();
      drawCantonSection(doc as unknown as jsPDF, createData({ isPhase: true }), LABELS, 20);
      const texts = textCalls(doc);
      expect(texts.some((t) => t.includes('Phase number'))).toBe(true);
    });

    it('omits the phase number row when the section is not a phase', () => {
      const doc = createMockDoc();
      drawCantonSection(doc as unknown as jsPDF, createData({ isPhase: false }), LABELS, 20);
      const texts = textCalls(doc);
      expect(texts.some((t) => t.includes('Phase number'))).toBe(false);
    });

    it('keeps cables amount aligned with cable name (row 2) when the section is not a phase', () => {
      const doc = createMockDoc();
      drawCantonSection(doc as unknown as jsPDF, createData({ isPhase: false }), LABELS, 20);
      const calls = (doc.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const cableNameCall = calls.find((c) => String(c[0]).includes('Cable :'));
      const cablesAmountCall = calls.find((c) => String(c[0]).includes('Cables amount'));
      expect(cableNameCall?.[2]).toBe(cablesAmountCall?.[2]);
    });

    it('shows the phase number as "0" (not blank/hidden) when the section is a phase with an unset phase number', () => {
      const doc = createMockDoc();
      drawCantonSection(doc as unknown as jsPDF, createData({ isPhase: true, phaseNumber: 0 }), LABELS, 20);
      const texts = textCalls(doc);
      expect(texts.some((t) => t.includes('Phase number'))).toBe(true);
      expect(texts.some((t) => t.includes('0'))).toBe(true);
      expect(texts.some((t) => t.includes('Cables amount'))).toBe(true);
    });
  });

  describe('drawInitialConditionSection', () => {
    it('returns startY unchanged and draws nothing when there is no initial condition', () => {
      const doc = createMockDoc();
      const y = drawInitialConditionSection(doc as unknown as jsPDF, createData({ initialCondition: null }), LABELS, 42);
      expect(y).toBe(42);
      expect(doc.text).not.toHaveBeenCalled();
    });

    it('draws only base rows for a linear cable', () => {
      const doc = createMockDoc();
      drawInitialConditionSection(doc as unknown as jsPDF, createData({ isNonLinear: false }), LABELS, 20);
      const texts = textCalls(doc);
      expect(texts.some((t) => t.includes('Base parameter'))).toBe(true);
      expect(texts.some((t) => t.includes('Base temperature'))).toBe(true);
      expect(texts.some((t) => t.includes('Pretension'))).toBe(false);
      expect(texts.some((t) => t.includes('Frost'))).toBe(false);
    });

    it('draws the extra rows for a non-linear cable', () => {
      const doc = createMockDoc();
      drawInitialConditionSection(doc as unknown as jsPDF, createData({ isNonLinear: true }), LABELS, 20);
      const texts = textCalls(doc);
      expect(texts.some((t) => t.includes('Pretension'))).toBe(true);
      expect(texts.some((t) => t.includes('Wind'))).toBe(true);
      expect(texts.some((t) => t.includes('Min temperature'))).toBe(true);
      expect(texts.some((t) => t.includes('Frost'))).toBe(true);
    });
  });

  describe('drawCantonReportPage1', () => {
    it('draws the header title and all three section titles', () => {
      const doc = createMockDoc();
      drawCantonReportPage1(doc as unknown as jsPDF, createData(), LABELS);
      const texts = textCalls(doc);
      expect(texts).toContain('Report');
      expect(texts).toContain('Study and canton');
      expect(texts).toContain('Canton');
      expect(texts).toContain('Initial condition');
    });
  });
});
