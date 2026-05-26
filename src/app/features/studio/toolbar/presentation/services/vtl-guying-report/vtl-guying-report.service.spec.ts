import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { VtlGuyingReportService } from './vtl-guying-report.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { VtlGuyingReportData } from './vtl-guying-report.interfaces';

vi.mock('jspdf', () => {
  const mockSave = vi.fn();
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setLineWidth: vi.fn(),
    setDrawColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addImage: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    save: mockSave
  };
  const mockJsPDF = vi.fn().mockImplementation(() => mockDoc);
  return {
    default: mockJsPDF,
    jsPDF: mockJsPDF,
    __mockDoc: mockDoc
  };
});

function createMockReportData(): VtlGuyingReportData {
  return {
    author: 'test@example.com',
    date: '2026-05-20',
    studyTitle: 'Test Study',
    studyDescription: 'Description',
    sectionName: 'Section A',
    sectionComment: 'Comment',
    chargeName: 'Charge 1',
    chargeDescription: 'Charge desc',
    guyingSpan: '42 - 43',
    referenceSupport: '42',
    supportType: 'Suspension',
    altitude: 150,
    horizontalDistance: 25,
    hasPulley: false,
    vtlChargeV: 1234.567,
    vtlChargeH: 987.654,
    vtlChargeL: 456.789,
    vtlResultant: 1500.123,
    tensionInGuy: 2000.456,
    guyAngle: 35.789,
    chargeVUnderConsole: 1100.234,
    chargeHUnderConsole: 800.567,
    chargeLIfPulley: null,
    comment: 'Test comment',
    diagramImageBase64: 'data:image/png;base64,iVBORw0KGgo='
  };
}

describe('VtlGuyingReportService', () => {
  let service: VtlGuyingReportService;
  let mockLogger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      log: vi.fn()
    };

    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        VtlGuyingReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(VtlGuyingReportService);
  });

  describe('generateReport', () => {
    it('should generate and save a PDF with the given data', async () => {
      const data = createMockReportData();
      await service.generateReport(data);

      expect(mockNotificationService.success).toHaveBeenCalled();
    });

    it('should name the file with the report date', async () => {
      const data = createMockReportData();
      await service.generateReport(data);

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('rapport-vhl-haubanage-2026-05-20.pdf');
    });

    it('should notify error when PDF generation fails', async () => {
      const jsPDFModule = (await import('jspdf')) as unknown as { default: ReturnType<typeof vi.fn> };
      jsPDFModule.default.mockImplementationOnce(() => {
        throw new Error('PDF error');
      });

      const data = createMockReportData();
      await service.generateReport(data);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalled();
    });
  });

  describe('getDiagramImageBase64', () => {
    it('should fetch and cache the diagram image', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.getDiagramImageBase64();

      expect(globalThis.fetch).toHaveBeenCalledWith('img/VHL-Haubanage-Suspension-Droite.png');
      expect(result).toContain('data:');
    });

    it('should return cached image on second call without fetching again', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      await service.getDiagramImageBase64();
      fetchSpy.mockClear();

      await service.getDiagramImageBase64();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return empty string when image loading fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Not found'));

      const result = await service.getDiagramImageBase64();

      expect(result).toBe('');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('preloadDiagramImage', () => {
    it('should not fetch again if image is already cached', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      await service.preloadDiagramImage();
      fetchSpy.mockClear();

      await service.preloadDiagramImage();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
