/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';

import { CantonStateReportService } from './canton-state-report.service';
import { CantonStateReportData, SpanReportRow, SupportReportRow } from './canton-state-report.interfaces';

const MOCK_TRANSLATIONS: Record<string, string> = {
  'studio.canton-state-report.page-label': 'Page',
  'studio.canton-state-report.report-generated-success': 'Report generated successfully',
  'studio.canton-state-report.report-generation-failed': 'Failed to generate report'
};

vi.mock('jspdf', () => {
  const mockSave = vi.fn();
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setPage: vi.fn(),
    setLineWidth: vi.fn(),
    setDrawColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    save: mockSave
  };
  const mockJsPDF = vi.fn(function () {
    return mockDoc;
  });
  return {
    default: mockJsPDF,
    jsPDF: mockJsPDF,
    __mockDoc: mockDoc
  };
});

function createSpanRow(index: number): SpanReportRow {
  return {
    spanNumber: `${index} - ${index + 1}`,
    spanLength: 100 + index,
    elevation: index,
    parameter: 1500,
    horizontalTension: 10,
    tensionSup: 11,
    tensionInf: 9,
    sagF1: 5,
    sagF2: 5.5,
    horizontalDistance: 99,
    naturalLength: 101,
    arcLength: 102,
    slopeLeft: 1.1,
    slopeRight: 2.1,
    utilizationRate: 40
  };
}

function createSupportRow(index: number): SupportReportRow {
  return {
    supportNumber: String(index),
    vChain: 1,
    hChain: 2,
    lChain: 3,
    rChain: 4,
    lineAngle: 0,
    vConsole: 100,
    hConsole: 200,
    lConsole: 300,
    rConsole: 400,
    footAltitude: 500,
    displacementX: 1,
    displacementY: 2,
    displacementZ: 3,
    loadAngle: 0.1
  };
}

function createMockReportData(): CantonStateReportData {
  return {
    author: 'test@example.com',
    date: '2026-05-20',
    studyTitle: 'Test Study',
    studyDescription: 'Description',
    cantonName: 'Section A',
    cantonComment: 'Comment',
    icName: 'IC 1',
    chargeName: 'Charge 1',
    chargeDescription: 'Charge desc',
    maxParameter: 1700,
    maxStressRate: 72.5,
    spans: Array.from({ length: 6 }, (_, i) => createSpanRow(i + 1)),
    supports: Array.from({ length: 7 }, (_, i) => createSupportRow(i + 1))
  };
}

describe('CantonStateReportService', () => {
  let service: CantonStateReportService;
  let mockLogger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockTranslocoService: { translate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockLogger = { error: vi.fn(), log: vi.fn() };
    mockNotificationService = { success: vi.fn(), error: vi.fn() };
    mockTranslocoService = {
      translate: vi.fn((key: string) => MOCK_TRANSLATIONS[key] ?? key)
    };

    TestBed.configureTestingModule({
      providers: [
        CantonStateReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });

    service = TestBed.inject(CantonStateReportService);
  });

  afterEach(() => {
    const fetchMock = vi.mocked(globalThis.fetch);
    if (typeof fetchMock?.mockRestore === 'function') {
      fetchMock.mockRestore();
    }
  });

  describe('generateReport', () => {
    it('should generate and save a PDF and notify success', async () => {
      const data = createMockReportData();
      await service.generateReport(data);

      expect(mockNotificationService.success).toHaveBeenCalled();
    });

    it('should add landscape pages for the result tables', async () => {
      const data = createMockReportData();
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: { addPage: ReturnType<typeof vi.fn> };
      };
      __mockDoc.addPage.mockClear();

      await service.generateReport(data);

      expect(__mockDoc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should add a computed footer on every page', async () => {
      const data = createMockReportData();
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: {
          getNumberOfPages: ReturnType<typeof vi.fn>;
          setPage: ReturnType<typeof vi.fn>;
          text: ReturnType<typeof vi.fn>;
        };
      };
      __mockDoc.setPage.mockClear();
      __mockDoc.text.mockClear();
      __mockDoc.getNumberOfPages.mockReturnValue(2);

      await service.generateReport(data);

      expect(__mockDoc.setPage).toHaveBeenNthCalledWith(1, 1);
      expect(__mockDoc.setPage).toHaveBeenNthCalledWith(2, 2);
      expect(__mockDoc.text).toHaveBeenCalledWith('Page 1 / 2', expect.any(Number), expect.any(Number), {
        align: 'right'
      });
      expect(__mockDoc.text).toHaveBeenCalledWith('Page 2 / 2', expect.any(Number), expect.any(Number), {
        align: 'right'
      });
    });

    it('should name the file with canton, charge and date', async () => {
      const data = createMockReportData();
      await service.generateReport(data);

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('Rapport Etat de canton_Section A_Charge 1_2026-05-20.pdf');
    });

    it('should sanitize illegal filename characters (slashes in localized date)', async () => {
      const data = { ...createMockReportData(), date: '20/05/2026' };
      await service.generateReport(data);

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('Rapport Etat de canton_Section A_Charge 1_20-05-2026.pdf');
    });

    it('should log and notify error when PDF generation fails', async () => {
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
});
