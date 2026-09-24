/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import type jsPDF from 'jspdf';

import { SymmetryType } from '@shared/domain/models/charge.model';
import {
  APP_NAME,
  BULLET,
  LINE_HEIGHT,
  PAGE_MARGIN,
  SECTION_TITLE_HEIGHT,
  SEPARATOR_HEIGHT
} from '@shared/pdf/pdf-layout.constantes';

import { PDF_LOADS_LABEL_KEYS } from './loads-data-report.constantes';
import { drawClimateSection, drawLoadsReportPage1, drawStudyAndCantonSection } from './loads-data-report.helpers';
import { LoadsReportData, LoadsReportLabels } from './loads-data-report.interfaces';

function createMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(20),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text])
  };
}

type MockDoc = ReturnType<typeof createMockDoc>;

const asPdf = (doc: MockDoc): jsPDF => doc as unknown as jsPDF;

/** Mirrors `buildReportLabels`: every label resolves to a marker derived from its translation key. */
const LABELS = Object.fromEntries(
  Object.entries(PDF_LOADS_LABEL_KEYS).map(([field, key]) => [field, `T:${key}`])
) as unknown as LoadsReportLabels;

/** Y returned by `drawHeader` for a portrait page. */
const HEADER_END_Y = PAGE_MARGIN.top + 2 + LINE_HEIGHT + 3 + LINE_HEIGHT;

function createData(overrides: Partial<LoadsReportData> = {}): LoadsReportData {
  return {
    date: '01/01/2026 08:00',
    author: 'test.author@example.invalid',
    studyTitle: 'Test study',
    studyDescription: 'Test study description',
    sectionName: 'Test canton',
    cantonComment: 'Test canton comment',
    icName: 'Test initial condition',
    chargeName: 'Test charge',
    chargeDescription: 'Test charge description',
    personnelPresence: true,
    climate: {
      windPressure: 120,
      cableTemperature: 15,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: 2,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    },
    frontierSupportLabel: null,
    spanLoads: [],
    cableModifications: [],
    supportManipulations: [],
    spanManipulations: [],
    ...overrides
  };
}

/** Extracts the bullet labels drawn on the document, in draw order. */
function drawnBulletLabels(doc: MockDoc): string[] {
  return doc.text.mock.calls
    .map((call) => call[0])
    .filter((text): text is string => typeof text === 'string' && text.startsWith(BULLET));
}

describe('loads-data-report.helpers', () => {
  describe('drawStudyAndCantonSection', () => {
    it('should draw the cartouche title then the eight metadata bullets in order', () => {
      const doc = createMockDoc();

      drawStudyAndCantonSection(asPdf(doc), createData(), LABELS, 40);

      expect(doc.text).toHaveBeenCalledWith(LABELS.cartoucheTitle, PAGE_MARGIN.left, 40);
      expect(drawnBulletLabels(doc)).toEqual([
        `${BULLET} ${LABELS.author} : `,
        `${BULLET} ${LABELS.study} : `,
        `${BULLET} ${LABELS.studyDescription} : `,
        `${BULLET} ${LABELS.canton} : `,
        `${BULLET} ${LABELS.cantonComment} : `,
        `${BULLET} ${LABELS.initialCondition} : `,
        `${BULLET} ${LABELS.chargeName} : `,
        `${BULLET} ${LABELS.chargeDescription} : `
      ]);
    });

    it('should fall back to a dash for empty metadata values', () => {
      const doc = createMockDoc();

      drawStudyAndCantonSection(asPdf(doc), createData({ author: '', cantonComment: '' }), LABELS, 40);

      expect(doc.text).toHaveBeenCalledWith(['-'], expect.any(Number), expect.any(Number));
    });

    it('should return the Y below the closing separator', () => {
      const doc = createMockDoc();

      const nextY = drawStudyAndCantonSection(asPdf(doc), createData(), LABELS, 40);

      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT + 8 * LINE_HEIGHT + SEPARATOR_HEIGHT);
    });
  });

  describe('drawClimateSection', () => {
    it('should draw the symmetric variant with a single ice thickness bullet', () => {
      const doc = createMockDoc();

      drawClimateSection(asPdf(doc), createData(), LABELS, 40);

      expect(doc.text).toHaveBeenCalledWith(LABELS.climateTitle, PAGE_MARGIN.left, 40);
      expect(drawnBulletLabels(doc)).toEqual([
        `${BULLET} ${LABELS.windPressure} : `,
        `${BULLET} ${LABELS.cableTemperature} : `,
        `${BULLET} ${LABELS.personnelPresence} : `,
        `${BULLET} ${LABELS.iceIndicator} : `,
        `${BULLET} ${LABELS.iceThickness} : `
      ]);
      expect(doc.text).toHaveBeenCalledWith(LABELS.symmetric, expect.any(Number), expect.any(Number));
    });

    it('should draw the dis-symmetric variant with frontier support and before/after thicknesses', () => {
      const doc = createMockDoc();
      const data = createData({
        climate: {
          windPressure: 120,
          cableTemperature: 15,
          symmetryType: SymmetryType.DIS_SYMMETRIC,
          iceThickness: null,
          frontierSupportNumber: 3,
          iceThicknessBefore: 1,
          iceThicknessAfter: 4
        },
        frontierSupportLabel: 'AC3'
      });

      drawClimateSection(asPdf(doc), data, LABELS, 40);

      expect(drawnBulletLabels(doc)).toEqual([
        `${BULLET} ${LABELS.windPressure} : `,
        `${BULLET} ${LABELS.cableTemperature} : `,
        `${BULLET} ${LABELS.personnelPresence} : `,
        `${BULLET} ${LABELS.iceIndicator} : `,
        `${BULLET} ${LABELS.frontierSupport} : `,
        `${BULLET} ${LABELS.iceThicknessBefore} : `,
        `${BULLET} ${LABELS.iceThicknessAfter} : `
      ]);
      expect(doc.text).toHaveBeenCalledWith(LABELS.disSymmetric, expect.any(Number), expect.any(Number));
    });

    it('should render personnel presence as yes or no', () => {
      const presentDoc = createMockDoc();
      drawClimateSection(asPdf(presentDoc), createData({ personnelPresence: true }), LABELS, 40);
      expect(presentDoc.text).toHaveBeenCalledWith(LABELS.yes, expect.any(Number), expect.any(Number));

      const absentDoc = createMockDoc();
      drawClimateSection(asPdf(absentDoc), createData({ personnelPresence: false }), LABELS, 40);
      expect(absentDoc.text).toHaveBeenCalledWith(LABELS.no, expect.any(Number), expect.any(Number));
    });

    it('should return the Y below the closing separator for each variant', () => {
      const symmetricDoc = createMockDoc();
      const symmetricY = drawClimateSection(asPdf(symmetricDoc), createData(), LABELS, 40);
      expect(symmetricY).toBe(40 + SECTION_TITLE_HEIGHT + 5 * LINE_HEIGHT + SEPARATOR_HEIGHT);

      const disSymmetricDoc = createMockDoc();
      const disSymmetricY = drawClimateSection(
        asPdf(disSymmetricDoc),
        createData({
          climate: {
            windPressure: 120,
            cableTemperature: 15,
            symmetryType: SymmetryType.DIS_SYMMETRIC,
            iceThickness: null,
            frontierSupportNumber: 3,
            iceThicknessBefore: 1,
            iceThicknessAfter: 4
          },
          frontierSupportLabel: 'AC3'
        }),
        LABELS,
        40
      );
      expect(disSymmetricY).toBe(40 + SECTION_TITLE_HEIGHT + 7 * LINE_HEIGHT + SEPARATOR_HEIGHT);
    });
  });

  describe('drawLoadsReportPage1', () => {
    it('should draw the header, then chain the cartouche and climate sections on the returned Y', () => {
      const doc = createMockDoc();

      drawLoadsReportPage1(asPdf(doc), createData(), LABELS);

      expect(doc.text).toHaveBeenCalledWith(APP_NAME, expect.any(Number), PAGE_MARGIN.top, { align: 'right' });
      expect(doc.text).toHaveBeenCalledWith(LABELS.cartoucheTitle, PAGE_MARGIN.left, HEADER_END_Y);
      expect(doc.text).toHaveBeenCalledWith(
        LABELS.climateTitle,
        PAGE_MARGIN.left,
        HEADER_END_Y + SECTION_TITLE_HEIGHT + 8 * LINE_HEIGHT + SEPARATOR_HEIGHT
      );
    });

    it('should fall back to a dash when the report date is empty', () => {
      const doc = createMockDoc();

      drawLoadsReportPage1(asPdf(doc), createData({ date: '' }), LABELS);

      expect(doc.text).toHaveBeenCalledWith('-', expect.any(Number), expect.any(Number), { align: 'right' });
    });
  });
});
