import { vi } from 'vitest';
import jsPDF from 'jspdf';

import {
  formatValue,
  drawHeader,
  drawFooter,
  drawStudySection,
  drawVtlWithoutGuyingSection,
  drawGuyingSection,
  drawVtlWithGuyingSection,
  loadImageAsBase64
} from './vtl-guying-report.helpers';
import { VtlGuyingReportData } from './vtl-guying-report.interfaces';
import { APP_NAME, PAGE_SIZE, PDF_LABELS } from './vtl-guying-report.constantes';

function createMockDoc(): jsPDF {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    setDrawColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addImage: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text])
  } as unknown as jsPDF;
}

function createMockReportData(overrides: Partial<VtlGuyingReportData> = {}): VtlGuyingReportData {
  return {
    author: 'test@example.com',
    date: '20/05/2026',
    studyTitle: 'Test Study',
    studyDescription: 'A test study description',
    sectionName: 'Section A-B',
    sectionComment: 'Test section comment',
    chargeName: 'Charge 1',
    chargeDescription: 'Test charge description',
    guyingSpan: '42 - 43',
    referenceSupport: '42',
    supportType: 'Suspension',
    altitude: 150,
    horizontalDistance: 25,
    hasPulley: false,
    vtlChargeV: 1234.5678,
    vtlChargeH: 987.654,
    vtlChargeL: 456.789,
    vtlResultant: 1500.123,
    tensionInGuy: 2000.456,
    guyAngle: 35.789,
    chargeVUnderConsole: 1100.234,
    chargeHUnderConsole: 800.567,
    chargeLIfPulley: null,
    comment: 'Test comment',
    diagramImageBase64: 'data:image/png;base64,iVBORw0KGgo=',
    ...overrides
  };
}

describe('vtl-guying-report helpers', () => {
  describe('formatValue', () => {
    it('should format a positive number with 3 decimals and unit', () => {
      expect(formatValue(123.456789, 'daN')).toBe('123.457 daN');
    });

    it('should format zero with 3 decimals and unit', () => {
      expect(formatValue(0, 'daN')).toBe('0.000 daN');
    });

    it('should format a negative number with 3 decimals and unit', () => {
      expect(formatValue(-42.1, 'm')).toBe('-42.100 m');
    });

    it('should return "-" when value is null', () => {
      expect(formatValue(null, 'daN')).toBe('-');
    });

    it('should return "-" when value is undefined', () => {
      expect(formatValue(undefined, '°')).toBe('-');
    });
  });

  describe('drawHeader', () => {
    it('should draw the app name and report title', () => {
      const doc = createMockDoc();
      const nextY = drawHeader(doc);

      expect(doc.setFont).toHaveBeenCalledWith('Nunito', 'bold');
      expect(doc.text).toHaveBeenCalledWith(APP_NAME, expect.any(Number), expect.any(Number), { align: 'right' });
      expect(doc.text).toHaveBeenCalledWith(PDF_LABELS.reportTitle, expect.any(Number), expect.any(Number));
      expect(doc.line).toHaveBeenCalled();
      expect(nextY).toBeGreaterThan(0);
    });

    it('should return a Y position greater than the starting margin', () => {
      const doc = createMockDoc();
      const nextY = drawHeader(doc);
      expect(nextY).toBeGreaterThan(15);
    });
  });

  describe('drawFooter', () => {
    it('should draw the page number at bottom right', () => {
      const doc = createMockDoc();
      drawFooter(doc);

      expect(doc.setFont).toHaveBeenCalledWith('Nunito', 'bold');
      expect(doc.text).toHaveBeenCalledWith(PDF_LABELS.pageFooter, expect.any(Number), expect.any(Number), {
        align: 'right'
      });
    });
  });

  describe('drawStudySection', () => {
    it('should draw the section title with underline', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      const nextY = drawStudySection(doc, data, 40);

      expect(doc.text).toHaveBeenCalledWith(PDF_LABELS.studySectionTitle, expect.any(Number), expect.any(Number));
      expect(doc.line).toHaveBeenCalled();
      expect(nextY).toBeGreaterThan(40);
    });

    it('should draw a separator line after the section', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawStudySection(doc, data, 40);

      expect(doc.rect).not.toHaveBeenCalled();
      expect(doc.line).toHaveBeenCalled();
    });

    it('should handle empty description gracefully', () => {
      const doc = createMockDoc();
      const data = createMockReportData({ studyDescription: '' });
      const nextY = drawStudySection(doc, data, 40);

      expect(nextY).toBeGreaterThan(40);
    });

    it('should use splitTextToSize for long descriptions', () => {
      const doc = createMockDoc();
      const data = createMockReportData({
        studyDescription: 'A very long description that should be wrapped across multiple lines in the PDF document'
      });
      drawStudySection(doc, data, 40);

      expect(doc.splitTextToSize).toHaveBeenCalled();
    });

    it('should wrap a long study title without overflowing Canton column', () => {
      const doc = createMockDoc();
      (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockReturnValueOnce(['line1', 'line2']);
      const data = createMockReportData({ studyTitle: 'A'.repeat(100) });
      const nextY = drawStudySection(doc, data, 40);

      expect(doc.splitTextToSize).toHaveBeenCalled();
      expect(nextY).toBeGreaterThan(40);
    });

    it('should compute date position from right margin (right-aligned)', () => {
      const doc = createMockDoc();
      const data = createMockReportData({ date: '20/05/2026' });
      drawStudySection(doc, data, 40);

      // getTextWidth is called with the date label to compute right-aligned X position
      expect(doc.getTextWidth).toHaveBeenCalledWith(expect.stringContaining(PDF_LABELS.date));
      // Date value is measured to contribute to the computed X position
      expect(doc.getTextWidth).toHaveBeenCalledWith(data.date);
      // Date value is drawn with positional args only (no { align: 'right' } option)
      const textCalls = (doc.text as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const dateCalls = textCalls.filter((call) => call[0] === data.date);
      expect(dateCalls).toHaveLength(1);
      expect(dateCalls[0]).toHaveLength(3); // [text, x, y] — no options argument
    });
  });

  describe('drawVtlWithoutGuyingSection', () => {
    it('should draw the section title', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithoutGuyingSection(doc, data, 80);

      expect(doc.text).toHaveBeenCalledWith(PDF_LABELS.vtlWithoutGuyingTitle, expect.any(Number), expect.any(Number));
    });

    it('should draw separator line at the end', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithoutGuyingSection(doc, data, 80);

      expect(doc.line).toHaveBeenCalled();
    });

    it('should return Y position greater than start', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      const nextY = drawVtlWithoutGuyingSection(doc, data, 80);

      expect(nextY).toBeGreaterThan(80);
    });

    it('should handle null values gracefully', () => {
      const doc = createMockDoc();
      const data = createMockReportData({
        vtlChargeV: null,
        vtlChargeH: null,
        vtlChargeL: null,
        vtlResultant: null
      });
      const nextY = drawVtlWithoutGuyingSection(doc, data, 80);

      expect(nextY).toBeGreaterThan(80);
    });

    it('should render Résultante value in bold', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithoutGuyingSection(doc, data, 80);

      // chargeV, chargeH, chargeL each contribute 1 'normal' call for their value
      // Résultante uses boldValue=true, so it contributes 0 'normal' calls
      const calls = (doc.setFont as unknown as { mock: { calls: string[][] } }).mock.calls;
      const normalCount = calls.filter(([, style]) => style === 'normal').length;
      expect(normalCount).toBe(3);
    });
  });

  describe('drawGuyingSection', () => {
    it('should draw the section title', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawGuyingSection(doc, data, 110);

      expect(doc.text).toHaveBeenCalledWith(PDF_LABELS.guyingTitle, expect.any(Number), expect.any(Number));
    });

    it('should add the diagram image when base64 is provided', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawGuyingSection(doc, data, 110);

      expect(doc.addImage).toHaveBeenCalledWith(
        data.diagramImageBase64,
        'PNG',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should not add image when diagramImageBase64 is empty', () => {
      const doc = createMockDoc();
      const data = createMockReportData({ diagramImageBase64: '' });
      drawGuyingSection(doc, data, 110);

      expect(doc.addImage).not.toHaveBeenCalled();
    });

    it('should add diagram image centered on the page with width 52.5 mm', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawGuyingSection(doc, data, 110);

      const expectedImgWidth = 52.5;
      const expectedImgX = PAGE_SIZE.width / 2 - expectedImgWidth / 2;
      expect(doc.addImage).toHaveBeenCalledWith(
        data.diagramImageBase64,
        'PNG',
        expectedImgX,
        expect.any(Number),
        expectedImgWidth,
        expect.any(Number)
      );
    });

    it('should draw separator line at the end', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawGuyingSection(doc, data, 110);

      expect(doc.line).toHaveBeenCalled();
    });
  });

  describe('drawVtlWithGuyingSection', () => {
    it('should draw the section title', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithGuyingSection(doc, data, 180);

      expect(doc.text).toHaveBeenCalledWith(PDF_LABELS.vtlWithGuyingTitle, expect.any(Number), expect.any(Number));
    });

    it('should draw explanatory text in italic', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithGuyingSection(doc, data, 180);

      expect(doc.setFont).toHaveBeenCalledWith('Nunito', 'italic');
    });

    it('should use splitTextToSize for explanatory text', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithGuyingSection(doc, data, 180);

      expect(doc.splitTextToSize).toHaveBeenCalledWith(PDF_LABELS.vtlWithGuyingExplanation1, expect.any(Number));
      expect(doc.splitTextToSize).toHaveBeenCalledWith(PDF_LABELS.vtlWithGuyingExplanation2, expect.any(Number));
    });

    it('should handle null results gracefully', () => {
      const doc = createMockDoc();
      const data = createMockReportData({
        tensionInGuy: null,
        guyAngle: null,
        chargeVUnderConsole: null,
        chargeHUnderConsole: null,
        chargeLIfPulley: null
      });
      const nextY = drawVtlWithGuyingSection(doc, data, 180);

      expect(nextY).toBeGreaterThan(180);
    });

    it('should draw comment section', () => {
      const doc = createMockDoc();
      const data = createMockReportData({ comment: 'Important note' });
      drawVtlWithGuyingSection(doc, data, 180);

      expect(doc.splitTextToSize).toHaveBeenCalledWith('Important note', expect.any(Number));
    });

    it('should handle empty comment with fallback', () => {
      const doc = createMockDoc();
      const data = createMockReportData({ comment: '' });
      drawVtlWithGuyingSection(doc, data, 180);

      expect(doc.splitTextToSize).toHaveBeenCalledWith('-', expect.any(Number));
    });

    it('should render all result values (tension, angles, charges) in bold', () => {
      const doc = createMockDoc();
      const data = createMockReportData();
      drawVtlWithGuyingSection(doc, data, 180);

      // 5 result values use boldValue=true; only the comment wrapping helper uses 'normal' once
      const calls = (doc.setFont as unknown as { mock: { calls: string[][] } }).mock.calls;
      const normalCount = calls.filter(([, style]) => style === 'normal').length;
      expect(normalCount).toBe(1);
    });
  });

  describe('loadImageAsBase64', () => {
    it('should fetch the image and convert to base64', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await loadImageAsBase64('img/test.png');

      expect(globalThis.fetch).toHaveBeenCalledWith('img/test.png');
      expect(result).toContain('data:');
    });

    it('should reject when fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      await expect(loadImageAsBase64('img/missing.png')).rejects.toThrow('Network error');
    });
  });
});
