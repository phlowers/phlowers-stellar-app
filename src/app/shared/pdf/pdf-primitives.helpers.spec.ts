/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import jsPDF from 'jspdf';

import {
  drawBulletItem,
  drawFooter,
  drawHeader,
  drawWrappingBulletItem,
  formatValue,
  loadFileAsBase64,
  loadImageAsBase64,
  registerNunitoFont
} from './pdf-primitives.helpers';
import { APP_NAME, LINE_HEIGHT, PAGE_MARGIN, PAGE_SIZE } from './pdf-layout.constantes';

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
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text])
  } as unknown as jsPDF;
}

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
    it('should return LINE_HEIGHT for a single-line value', () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(['short value']);
      const height = drawWrappingBulletItem(doc, 'Label', 'short value', 15, 30, 100);

      expect(height).toBe(LINE_HEIGHT);
    });

    it('should return N × LINE_HEIGHT for N wrapped lines', () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(['line1', 'line2', 'line3']);
      const height = drawWrappingBulletItem(doc, 'Label', 'long value', 15, 30, 100);

      expect(height).toBe(3 * LINE_HEIGHT);
    });

    it('should use "-" fallback for empty value', () => {
      const doc = createMockDoc();
      drawWrappingBulletItem(doc, 'Label', '', 15, 30, 100);

      expect(doc.splitTextToSize).toHaveBeenCalledWith('-', expect.any(Number));
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
});
