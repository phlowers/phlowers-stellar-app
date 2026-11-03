/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import jsPDF from 'jspdf';

import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';

import {
  buildReportLabels,
  drawBulletItem,
  drawBulletList,
  drawCompactHeader,
  drawFooter,
  drawHeader,
  drawPageFooters,
  drawSectionTitle,
  drawSeparator,
  drawStudyCartoucheSection,
  drawTitledBulletSection,
  drawTitledTwoColumnBullets,
  drawTwoColumnBulletSection,
  drawTwoColumnBullets,
  drawWrappingBulletItem,
  formatValue,
  generatePdfReport,
  loadFileAsBase64,
  loadImageAsBase64,
  registerNunitoFont
} from './pdf-primitives.helpers';
import {
  APP_NAME,
  BULLET,
  CONTENT_BOTTOM,
  CONTENT_WIDTH,
  LANDSCAPE_PAGE,
  LINE_HEIGHT,
  PAGE_MARGIN,
  PAGE_SIZE,
  SECTION_TITLE_HEIGHT,
  SEPARATOR_HEIGHT,
  SEPARATOR_MARGIN_Y,
  VALUE_LINE_SPACING
} from './pdf-layout.constantes';

vi.mock('jspdf');

function createMockDoc(): jsPDF {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    addFileToVFS: vi.fn(),
    addFont: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(20),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
    addPage: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(PAGE_SIZE.width),
        getHeight: vi.fn().mockReturnValue(PAGE_SIZE.height)
      }
    },
    save: vi.fn()
  } as unknown as jsPDF;
}

function getTextCalls(doc: jsPDF): unknown[][] {
  return (doc.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
}

// Baseline of the lowest line of every text drawn: jsPDF draws the lines of an array VALUE_LINE_SPACING apart
function getLowestTextBaseline(doc: jsPDF): number {
  return Math.max(
    ...getTextCalls(doc).map(
      ([text, , y]) => (y as number) + (Array.isArray(text) ? Math.max(text.length - 1, 0) : 0) * VALUE_LINE_SPACING
    )
  );
}

const COMPACT_HEADER_Y = drawCompactHeader(createMockDoc());

describe('pdf-primitives helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatValue', () => {
    it('should format a number with decimals and unit', () => {
      expect(formatValue(1234.5678, 'daN')).toBe('1234.568 daN');
    });

    it('should return "-" for null', () => {
      expect(formatValue(null, 'daN')).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(formatValue(undefined, 'm')).toBe('-');
    });

    it('should format zero correctly', () => {
      expect(formatValue(0, '°')).toBe('0.000 °');
    });

    it('should omit the unit and its separator when the unit is empty', () => {
      expect(formatValue(1234.56, '', 1)).toBe('1234.6');
    });
  });

  describe('loadFileAsBase64', () => {
    it('should fetch and return base64 string without data URL prefix', async () => {
      const fakeBuffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer)
      } as unknown as Response);

      const result = await loadFileAsBase64('fonts/test.ttf');

      expect(globalThis.fetch).toHaveBeenCalledWith('fonts/test.ttf');
      expect(typeof result).toBe('string');
      expect(result).not.toContain('data:');
    });

    it('should throw when fetch response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404
      } as unknown as Response);

      await expect(loadFileAsBase64('fonts/missing.ttf')).rejects.toThrow('HTTP error 404');
    });
  });

  describe('loadImageAsBase64', () => {
    it('should fetch and return a data URL', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob)
      } as unknown as Response);

      const result = await loadImageAsBase64('img/test.png');

      expect(globalThis.fetch).toHaveBeenCalledWith('img/test.png');
      expect(result).toContain('data:');
    });

    it('should throw when fetch response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500
      } as unknown as Response);

      await expect(loadImageAsBase64('img/error.png')).rejects.toThrow('HTTP error 500');
    });
  });

  describe('registerNunitoFont', () => {
    it('should register all three Nunito variants in the jsPDF document', () => {
      const doc = createMockDoc();
      registerNunitoFont(doc, 'regularB64', 'boldB64', 'italicB64');

      expect(doc.addFileToVFS).toHaveBeenCalledWith('Nunito-Regular.ttf', 'regularB64');
      expect(doc.addFont).toHaveBeenCalledWith('Nunito-Regular.ttf', 'Nunito', 'normal');
      expect(doc.addFileToVFS).toHaveBeenCalledWith('Nunito-Bold.ttf', 'boldB64');
      expect(doc.addFont).toHaveBeenCalledWith('Nunito-Bold.ttf', 'Nunito', 'bold');
      expect(doc.addFileToVFS).toHaveBeenCalledWith('Nunito-Italic.ttf', 'italicB64');
      expect(doc.addFont).toHaveBeenCalledWith('Nunito-Italic.ttf', 'Nunito', 'italic');
    });
  });

  describe('drawBulletItem', () => {
    it('should draw label in bold and value in normal', () => {
      const doc = createMockDoc();
      drawBulletItem(doc, 'Auteur', 'Alice', 15, 30);

      const fontCalls = (doc.setFont as unknown as { mock: { calls: string[][] } }).mock.calls;
      expect(fontCalls.some(([, style]) => style === 'bold')).toBe(true);
      expect(fontCalls.some(([, style]) => style === 'normal')).toBe(true);
    });

    it('should draw value in bold when boldValue is true', () => {
      const doc = createMockDoc();
      drawBulletItem(doc, 'Résultante', '1500 daN', 15, 30, true);

      const fontCalls = (doc.setFont as unknown as { mock: { calls: string[][] } }).mock.calls;
      const normalCalls = fontCalls.filter(([, style]) => style === 'normal');
      expect(normalCalls).toHaveLength(0);
    });

    it('should call doc.text for label and value', () => {
      const doc = createMockDoc();
      drawBulletItem(doc, 'Tension', '2000 daN', 15, 30);

      expect(doc.text).toHaveBeenCalledTimes(2);
    });
  });

  describe('drawWrappingBulletItem', () => {
    it('should return the Y one LINE_HEIGHT below a single-line value', () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(['short value']);
      const nextY = drawWrappingBulletItem(doc, 'Label', 'short value', 15, 30, 100);

      expect(nextY).toBe(30 + LINE_HEIGHT);
    });

    it('should return the Y one LINE_HEIGHT below the last of N wrapped lines', () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(['line1', 'line2', 'line3']);
      const nextY = drawWrappingBulletItem(doc, 'Label', 'long value', 15, 30, 100);

      expect(nextY).toBe(30 + 2 * VALUE_LINE_SPACING + LINE_HEIGHT);
    });

    it('should use "-" fallback for empty value', () => {
      const doc = createMockDoc();
      drawWrappingBulletItem(doc, 'Label', '', 15, 30, 100);

      expect(doc.splitTextToSize).toHaveBeenCalledWith('-', expect.any(Number));
    });

    it('should continue the value lines passing the bottom margin on a new portrait page, under the value', () => {
      const doc = createMockDoc();
      const lines = Array.from({ length: 60 }, (_, index) => `line ${index + 1}`);
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(lines);
      const valueX = 15 + 20;

      const nextY = drawWrappingBulletItem(doc, 'Label', 'long value', 15, 240, 100);

      const valueCalls = getTextCalls(doc).filter(([text]) => Array.isArray(text));
      const firstPageCount = (valueCalls[0][0] as string[]).length;
      expect(doc.addPage).toHaveBeenCalledExactlyOnceWith('a4', 'portrait');
      expect(doc.text).toHaveBeenCalledWith(`${BULLET} Label : `, 15, 240);
      expect(valueCalls.map(([, x, y]) => [x, y])).toEqual([
        [valueX, 240],
        [valueX, COMPACT_HEADER_Y]
      ]);
      expect(valueCalls.flatMap(([text]) => text as string[])).toEqual(lines);
      // The first page takes every line whose baseline stays above the bottom margin
      expect(240 + (firstPageCount - 1) * VALUE_LINE_SPACING).toBeLessThanOrEqual(CONTENT_BOTTOM);
      expect(240 + firstPageCount * VALUE_LINE_SPACING).toBeGreaterThan(CONTENT_BOTTOM);
      expect(nextY).toBe(COMPACT_HEADER_Y + (lines.length - firstPageCount - 1) * VALUE_LINE_SPACING + LINE_HEIGHT);
    });

    it('should move the label with the first line to a new portrait page when that line would pass the bottom margin', () => {
      const doc = createMockDoc();

      drawWrappingBulletItem(doc, 'Label', 'value', 15, CONTENT_BOTTOM + 1, 100);

      expect(doc.addPage).toHaveBeenCalledExactlyOnceWith('a4', 'portrait');
      expect(doc.text).toHaveBeenCalledWith(`${BULLET} Label : `, 15, COMPACT_HEADER_Y);
      expect(doc.text).toHaveBeenCalledWith(['value'], 15 + 20, COMPACT_HEADER_Y);
    });
  });

  describe('drawSectionTitle', () => {
    it('should draw the title at the page margin and return an advanced Y', () => {
      const doc = createMockDoc();
      const nextY = drawSectionTitle(doc, 'My section', 40);

      expect(doc.text).toHaveBeenCalledWith('My section', PAGE_MARGIN.left, 40);
      expect(doc.line).toHaveBeenCalled();
      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT);
    });
  });

  describe('drawBulletList', () => {
    it('should advance non-wrapping items by one LINE_HEIGHT each', () => {
      const doc = createMockDoc();
      const endY = drawBulletList(
        doc,
        [
          { label: 'A', value: '1' },
          { label: 'B', value: '2' }
        ],
        30,
        15,
        100
      );

      expect(endY).toBe(30 + 2 * LINE_HEIGHT);
      expect(doc.splitTextToSize).not.toHaveBeenCalled();
    });

    it('should advance wrapping items below their last line', () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(['l1', 'l2']);
      const endY = drawBulletList(doc, [{ label: 'A', value: 'long', wrap: true }], 30, 15, 100);

      expect(endY).toBe(30 + VALUE_LINE_SPACING + LINE_HEIGHT);
      expect(doc.splitTextToSize).toHaveBeenCalledTimes(1);
    });

    it('should return startY unchanged for an empty list', () => {
      const doc = createMockDoc();
      expect(drawBulletList(doc, [], 42, 15, 100)).toBe(42);
    });

    it('should move a non-wrapping item passing the bottom margin to a new portrait page', () => {
      const doc = createMockDoc();
      const endY = drawBulletList(
        doc,
        [
          { label: 'A', value: '1' },
          { label: 'B', value: '2' }
        ],
        CONTENT_BOTTOM,
        15,
        100
      );

      expect(doc.addPage).toHaveBeenCalledExactlyOnceWith('a4', 'portrait');
      expect(doc.text).toHaveBeenCalledWith('1', 15 + 20, CONTENT_BOTTOM);
      expect(doc.text).toHaveBeenCalledWith('2', 15 + 20, COMPACT_HEADER_Y);
      expect(endY).toBe(COMPACT_HEADER_Y + LINE_HEIGHT);
    });
  });

  describe('drawHeader', () => {
    it('should draw the app name right-aligned at top', () => {
      const doc = createMockDoc();
      drawHeader(doc, '20/05/2026', 'Rapport VHL & Haubanage');

      expect(doc.text).toHaveBeenCalledWith(APP_NAME, PAGE_SIZE.width - PAGE_MARGIN.right, expect.any(Number), {
        align: 'right'
      });
    });

    it('should draw the report title left-aligned', () => {
      const doc = createMockDoc();
      drawHeader(doc, '20/05/2026', 'Rapport VHL & Haubanage');

      expect(doc.text).toHaveBeenCalledWith('Rapport VHL & Haubanage', PAGE_MARGIN.left, expect.any(Number));
    });

    it('should draw the date right-aligned on the title line', () => {
      const doc = createMockDoc();
      drawHeader(doc, '20/05/2026', 'Mon rapport');

      expect(doc.text).toHaveBeenCalledWith('20/05/2026', PAGE_SIZE.width - PAGE_MARGIN.right, expect.any(Number), {
        align: 'right'
      });
    });

    it('should draw a separator line', () => {
      const doc = createMockDoc();
      drawHeader(doc, '20/05/2026', 'Mon rapport');

      expect(doc.line).toHaveBeenCalled();
    });

    it('should return a Y position greater than PAGE_MARGIN.top', () => {
      const doc = createMockDoc();
      const nextY = drawHeader(doc, '20/05/2026', 'Mon rapport');

      expect(nextY).toBeGreaterThan(PAGE_MARGIN.top);
    });
  });

  describe('drawCompactHeader', () => {
    it('should draw the app name right-aligned at top', () => {
      const doc = createMockDoc();
      drawCompactHeader(doc);

      expect(doc.text).toHaveBeenCalledWith(APP_NAME, PAGE_SIZE.width - PAGE_MARGIN.right, PAGE_MARGIN.top, {
        align: 'right'
      });
    });

    it('should draw nothing but the app name (no report title, no date)', () => {
      const doc = createMockDoc();
      drawCompactHeader(doc);

      expect(doc.text).toHaveBeenCalledTimes(1);
    });

    it('should draw a separator line across the content width', () => {
      const doc = createMockDoc();
      drawCompactHeader(doc, LANDSCAPE_PAGE.width);

      expect(doc.line).toHaveBeenCalledTimes(1);
      expect(doc.line).toHaveBeenCalledWith(
        PAGE_MARGIN.left,
        expect.any(Number),
        LANDSCAPE_PAGE.width - PAGE_MARGIN.right,
        expect.any(Number)
      );
    });

    it('should leave more room for the content than the full header', () => {
      const compactY = drawCompactHeader(createMockDoc());
      const fullY = drawHeader(createMockDoc(), '20/05/2026', 'Mon rapport');

      expect(compactY).toBeGreaterThan(PAGE_MARGIN.top);
      expect(compactY).toBeLessThan(fullY);
    });
  });

  describe('drawFooter', () => {
    it('should draw the footer text right-aligned at bottom', () => {
      const doc = createMockDoc();
      drawFooter(doc, 'Page 1 / 1');

      expect(doc.text).toHaveBeenCalledWith('Page 1 / 1', PAGE_SIZE.width - PAGE_MARGIN.right, expect.any(Number), {
        align: 'right'
      });
    });

    it('should draw at fixed Y position near page bottom', () => {
      const doc = createMockDoc();
      drawFooter(doc, 'Page 1 / 1');

      const textCalls = (doc.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const footerCall = textCalls.find((call) => call[0] === 'Page 1 / 1');
      expect(footerCall).toBeDefined();
      const footerY = footerCall![2] as number;
      expect(footerY).toBeGreaterThan(PAGE_SIZE.height - 20);
      expect(footerY).toBeLessThan(PAGE_SIZE.height);
    });
  });

  describe('drawSeparator', () => {
    it('should draw an inset line spanning the content width and return the advanced Y', () => {
      const doc = createMockDoc();
      const nextY = drawSeparator(doc, 40);
      const lineY = 40 + SEPARATOR_MARGIN_Y;

      expect(doc.line).toHaveBeenCalledWith(PAGE_MARGIN.left, lineY, PAGE_MARGIN.left + CONTENT_WIDTH, lineY);
      expect(nextY).toBe(40 + SEPARATOR_HEIGHT);
    });

    it('should draw a line spanning a custom width when provided', () => {
      const doc = createMockDoc();
      const nextY = drawSeparator(doc, 40, 267);
      const lineY = 40 + SEPARATOR_MARGIN_Y;

      expect(doc.line).toHaveBeenCalledWith(PAGE_MARGIN.left, lineY, PAGE_MARGIN.left + 267, lineY);
      expect(nextY).toBe(40 + SEPARATOR_HEIGHT);
    });
  });

  describe('drawTitledBulletSection', () => {
    it('should draw the title, the bullet items, and a separator, returning the advanced Y', () => {
      const doc = createMockDoc();
      const nextY = drawTitledBulletSection(
        doc,
        'My section',
        [
          { label: 'A', value: '1' },
          { label: 'B', value: '2' }
        ],
        40
      );

      expect(doc.text).toHaveBeenCalledWith('My section', PAGE_MARGIN.left, 40);
      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT + 2 * LINE_HEIGHT + SEPARATOR_HEIGHT);
    });

    it('should return the section title Y plus separator height for an empty list', () => {
      const doc = createMockDoc();
      const nextY = drawTitledBulletSection(doc, 'Empty', [], 40);

      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT + SEPARATOR_HEIGHT);
    });

    it('should move the title to a new portrait page with its first item when they do not both fit', () => {
      const doc = createMockDoc();
      drawTitledBulletSection(
        doc,
        'My section',
        [{ label: 'A', value: '1' }],
        CONTENT_BOTTOM - SECTION_TITLE_HEIGHT + 1
      );

      expect(doc.addPage).toHaveBeenCalledExactlyOnceWith('a4', 'portrait');
      expect(doc.text).toHaveBeenCalledWith('My section', PAGE_MARGIN.left, COMPACT_HEADER_Y);
      expect(doc.text).toHaveBeenCalledWith('1', expect.any(Number), COMPACT_HEADER_Y + SECTION_TITLE_HEIGHT);
    });

    it('should leave the separator out when its line would pass the bottom margin', () => {
      const doc = createMockDoc();
      // The last item ends on the bottom margin
      const startY = CONTENT_BOTTOM - SECTION_TITLE_HEIGHT - LINE_HEIGHT;
      const nextY = drawTitledBulletSection(doc, 'My section', [{ label: 'A', value: '1' }], startY);

      expect(doc.addPage).not.toHaveBeenCalled();
      // Only the title underline
      expect(doc.line).toHaveBeenCalledTimes(1);
      expect(nextY).toBe(CONTENT_BOTTOM);
    });
  });

  describe('drawStudyCartoucheSection', () => {
    const labels = {
      author: 'Author',
      study: 'Study',
      studyDescription: 'Study description',
      canton: 'Canton',
      comment: 'Comment',
      initialCondition: 'Initial condition',
      chargeName: 'Load case',
      chargeDescription: 'Load description'
    };
    const data = {
      author: 'author@example.test',
      studyTitle: 'Study title',
      studyDescription: 'Study desc',
      cantonName: 'Canton A',
      comment: 'Some comment',
      icName: 'IC 1',
      chargeName: 'Load 1',
      chargeDescription: 'Load desc'
    };

    it('should draw the title and one wrapped bullet per metadata field, then a separator', () => {
      const doc = createMockDoc();
      const nextY = drawStudyCartoucheSection(doc, 'Cartouche', labels, data, 40);

      expect(doc.text).toHaveBeenCalledWith('Cartouche', PAGE_MARGIN.left, 40);
      expect(doc.splitTextToSize).toHaveBeenCalledTimes(8);
      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT + 8 * LINE_HEIGHT + SEPARATOR_HEIGHT);
    });

    it('should fall back to "-" for empty values', () => {
      const doc = createMockDoc();
      drawStudyCartoucheSection(doc, 'Cartouche', labels, { ...data, author: '', comment: '' }, 40);

      expect(doc.splitTextToSize).toHaveBeenCalledWith('-', expect.any(Number));
    });

    it('should continue a multiline study description and the fields below it on portrait pages', () => {
      const doc = createMockDoc();
      // jsPDF starts a new line at each line break
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockImplementation((text: string) => text.split('\n'));
      // 120 one-character lines: 239 characters, within the 240 the study form accepts
      const studyDescription = Array.from({ length: 120 }, () => 'a').join('\n');

      drawStudyCartoucheSection(doc, 'Cartouche', labels, { ...data, studyDescription }, drawHeader(doc, '-', '-'));

      const drawnTexts = getTextCalls(doc).flatMap(([text]) => (Array.isArray(text) ? text : [text]));
      expect(doc.addPage).toHaveBeenCalledWith('a4', 'portrait');
      expect(drawnTexts.filter((text) => text === 'a')).toHaveLength(120);
      Object.values(labels).forEach((label) => expect(drawnTexts).toContain(`${BULLET} ${label} : `));
      expect(drawnTexts).toContain('Load desc');
      expect(getLowestTextBaseline(doc)).toBeLessThanOrEqual(CONTENT_BOTTOM);
    });
  });

  describe('drawTwoColumnBullets', () => {
    it('should advance each column independently and return the Y below the taller column', () => {
      const doc = createMockDoc();
      const nextY = drawTwoColumnBullets(
        doc,
        [{ label: 'L1', value: '1' }],
        [
          { label: 'R1', value: '1' },
          { label: 'R2', value: '2' }
        ],
        40
      );

      expect(nextY).toBe(40 + 2 * LINE_HEIGHT);
    });

    it('should skip drawing an item whose label is empty', () => {
      const doc = createMockDoc();
      drawTwoColumnBullets(doc, [{ label: '', value: 'hidden' }], [], 40);

      const calls = (doc.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      expect(calls.some((call) => call[0] === 'hidden')).toBe(false);
    });
  });

  describe('drawTwoColumnBulletSection', () => {
    it('should draw the title, both columns, and a separator, returning the advanced Y', () => {
      const doc = createMockDoc();
      const nextY = drawTwoColumnBulletSection(
        doc,
        'Two columns',
        [{ label: 'L1', value: '1' }],
        [{ label: 'R1', value: '1' }],
        40
      );

      expect(doc.text).toHaveBeenCalledWith('Two columns', PAGE_MARGIN.left, 40);
      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT + LINE_HEIGHT + SEPARATOR_HEIGHT);
    });

    it('should move the title and both columns to a new portrait page when the taller column would pass the bottom margin', () => {
      const doc = createMockDoc();
      const left = [
        { label: 'L1', value: '1' },
        { label: 'L2', value: '2' },
        { label: 'L3', value: '3' }
      ];
      // The title and the first two rows would fit, not the third one
      const startY = CONTENT_BOTTOM - SECTION_TITLE_HEIGHT - LINE_HEIGHT;
      const nextY = drawTwoColumnBulletSection(doc, 'Two columns', left, [{ label: 'R1', value: '1' }], startY);

      expect(doc.addPage).toHaveBeenCalledExactlyOnceWith('a4', 'portrait');
      expect(doc.text).toHaveBeenCalledWith('Two columns', PAGE_MARGIN.left, COMPACT_HEADER_Y);
      expect(nextY).toBe(COMPACT_HEADER_Y + SECTION_TITLE_HEIGHT + 3 * LINE_HEIGHT + SEPARATOR_HEIGHT);
    });
  });

  describe('drawTitledTwoColumnBullets', () => {
    it('should draw the title and both columns without a separator, returning the Y below the taller column', () => {
      const doc = createMockDoc();
      const nextY = drawTitledTwoColumnBullets(
        doc,
        'Two columns',
        [{ label: 'L1', value: '1' }],
        [
          { label: 'R1', value: '1' },
          { label: 'R2', value: '2' }
        ],
        40
      );

      expect(doc.text).toHaveBeenCalledWith('Two columns', PAGE_MARGIN.left, 40);
      // Only the title underline
      expect(doc.line).toHaveBeenCalledTimes(1);
      expect(nextY).toBe(40 + SECTION_TITLE_HEIGHT + 2 * LINE_HEIGHT);
    });
  });

  describe('drawPageFooters', () => {
    it('should draw one footer per page in portrait mode', () => {
      const doc = createMockDoc();
      (doc.getNumberOfPages as ReturnType<typeof vi.fn>).mockReturnValue(2);

      drawPageFooters(doc, 'Page');

      expect(doc.setPage).toHaveBeenCalledWith(1);
      expect(doc.setPage).toHaveBeenCalledWith(2);
      expect(doc.text).toHaveBeenCalledWith('Page 1 / 2', PAGE_SIZE.width - PAGE_MARGIN.right, expect.any(Number), {
        align: 'right'
      });
      expect(doc.text).toHaveBeenCalledWith('Page 2 / 2', PAGE_SIZE.width - PAGE_MARGIN.right, expect.any(Number), {
        align: 'right'
      });
    });

    it('should place each footer for its own page orientation, portrait continuation pages included', () => {
      const doc = createMockDoc();
      const pageSizes = [PAGE_SIZE, PAGE_SIZE, LANDSCAPE_PAGE];
      let currentPage = 1;
      (doc.getNumberOfPages as ReturnType<typeof vi.fn>).mockReturnValue(pageSizes.length);
      (doc.setPage as ReturnType<typeof vi.fn>).mockImplementation((pageNumber: number) => (currentPage = pageNumber));
      (doc.internal.pageSize.getWidth as ReturnType<typeof vi.fn>).mockImplementation(
        () => pageSizes[currentPage - 1].width
      );
      (doc.internal.pageSize.getHeight as ReturnType<typeof vi.fn>).mockImplementation(
        () => pageSizes[currentPage - 1].height
      );

      drawPageFooters(doc, 'Page');

      const footerY = (footer: string): number => getTextCalls(doc).find(([text]) => text === footer)![2] as number;
      expect(doc.text).toHaveBeenCalledWith('Page 2 / 3', PAGE_SIZE.width - PAGE_MARGIN.right, expect.any(Number), {
        align: 'right'
      });
      expect(doc.text).toHaveBeenCalledWith(
        'Page 3 / 3',
        LANDSCAPE_PAGE.width - PAGE_MARGIN.right,
        expect.any(Number),
        { align: 'right' }
      );
      // At the bottom of the portrait page 2, below the landscape page height
      expect(footerY('Page 2 / 3')).toBeGreaterThan(LANDSCAPE_PAGE.height);
      expect(footerY('Page 2 / 3')).toBeLessThan(PAGE_SIZE.height);
      expect(footerY('Page 3 / 3')).toBeLessThan(LANDSCAPE_PAGE.height);
    });
  });

  describe('buildReportLabels', () => {
    it('should translate every key and preserve the field names', () => {
      const translate = vi.fn((key: string) => `translated:${key}`);
      const labels = buildReportLabels<{ title: string; author: string }>(translate, {
        title: 'report.title',
        author: 'report.author'
      });

      expect(translate).toHaveBeenCalledWith('report.title');
      expect(translate).toHaveBeenCalledWith('report.author');
      expect(labels).toEqual({ title: 'translated:report.title', author: 'translated:report.author' });
    });
  });

  describe('generatePdfReport', () => {
    function createMockLogger(): LoggerService {
      return { error: vi.fn() } as unknown as LoggerService;
    }

    function createMockNotificationService(): NotificationService {
      return { success: vi.fn(), error: vi.fn() } as unknown as NotificationService;
    }

    it('should save the built document and notify success', async () => {
      const doc = createMockDoc();
      const logger = createMockLogger();
      const notificationService = createMockNotificationService();
      const translate = vi.fn((key: string) => `translated:${key}`);

      await generatePdfReport({
        logger,
        notificationService,
        translate,
        errorLogMessage: 'Failed to build report',
        successKey: 'report.success',
        errorKey: 'report.error',
        build: () => Promise.resolve({ doc, filename: 'report.pdf' })
      });

      expect(doc.save).toHaveBeenCalledWith('report.pdf');
      expect(notificationService.success).toHaveBeenCalledWith('translated:report.success');
      expect(notificationService.error).not.toHaveBeenCalled();
    });

    it('should log and notify an error when build rejects', async () => {
      const logger = createMockLogger();
      const notificationService = createMockNotificationService();
      const translate = vi.fn((key: string) => `translated:${key}`);
      const buildError = new Error('boom');

      await generatePdfReport({
        logger,
        notificationService,
        translate,
        errorLogMessage: 'Failed to build report',
        successKey: 'report.success',
        errorKey: 'report.error',
        build: () => Promise.reject(buildError)
      });

      expect(logger.error).toHaveBeenCalledWith('Failed to build report', buildError);
      expect(notificationService.error).toHaveBeenCalledWith('translated:report.error');
      expect(notificationService.success).not.toHaveBeenCalled();
    });
  });
});
