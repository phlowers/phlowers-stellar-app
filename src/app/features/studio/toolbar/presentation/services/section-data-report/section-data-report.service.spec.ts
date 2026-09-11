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

import { SectionDataReportService } from './section-data-report.service';
import { CantonReportData, CantonSupportRow } from './section-data-report.interfaces';

const MOCK_TRANSLATIONS: Record<string, string> = {
  'studio.canton-report.title': 'Rapport Données du canton',
  'studio.canton-report.page-label': 'Page',
  'studio.canton-report.report-generated-success': 'Report generated successfully',
  'studio.canton-report.report-generation-failed': 'Failed to generate report'
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

function createSupportRow(index: number): CantonSupportRow {
  return {
    supportNumber: String(index),
    attachmentHeight: 25,
    spanAngle: 5,
    chainName: 'Chain A',
    chainLength: 4,
    chainWeight: 120,
    supportName: `Support ${index}`,
    attachmentSet: '2',
    armLength: 3,
    chainV: 'Oui',
    counterWeight: 50,
    supportFootAltitude: 200,
    attachmentPosition: 'center',
    towerModel: 'tower.txt'
  };
}

function createMockReportData(): CantonReportData {
  return {
    date: '2026-05-20 14:30',
    author: 'test@example.com',
    studyTitle: 'Test Study',
    studyDescription: 'Description',
    cantonName: 'Canton A',
    comment: 'Comment',
    icName: 'IC 1',
    chargeName: 'Charge 1',
    chargeDescription: 'Charge desc',
    type: 'phase',
    cableName: 'Cable 1',
    maintenanceCenter: 'Center 1',
    litName: 'LIT 1',
    supportsCount: 3,
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
    supports: Array.from({ length: 3 }, (_, i) => createSupportRow(i + 1))
  };
}

describe('SectionDataReportService', () => {
  let service: SectionDataReportService;
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
        SectionDataReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });

    service = TestBed.inject(SectionDataReportService);
  });

  afterEach(() => {
    const fetchMock = vi.mocked(globalThis.fetch);
    if (typeof fetchMock?.mockRestore === 'function') {
      fetchMock.mockRestore();
    }
  });

  describe('generateReport', () => {
    it('should generate and save a PDF and notify success', async () => {
      await service.generateReport(createMockReportData());
      expect(mockNotificationService.success).toHaveBeenCalled();
    });

    it('should add landscape pages for the supports tables', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: { addPage: ReturnType<typeof vi.fn> };
      };
      __mockDoc.addPage.mockClear();

      await service.generateReport(createMockReportData());

      expect(__mockDoc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should still generate the report when there is no initial condition', async () => {
      const data = { ...createMockReportData(), initialCondition: null };
      await service.generateReport(data);
      expect(mockNotificationService.success).toHaveBeenCalled();
    });

    it('should add a computed footer on every page', async () => {
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

      await service.generateReport(createMockReportData());

      expect(__mockDoc.setPage).toHaveBeenNthCalledWith(1, 1);
      expect(__mockDoc.setPage).toHaveBeenNthCalledWith(2, 2);
      expect(__mockDoc.text).toHaveBeenCalledWith('Page 1 / 2', expect.any(Number), expect.any(Number), {
        align: 'right'
      });
      expect(__mockDoc.text).toHaveBeenCalledWith('Page 2 / 2', expect.any(Number), expect.any(Number), {
        align: 'right'
      });
    });

    it('should name the file with report title, canton, IC and date', async () => {
      await service.generateReport(createMockReportData());

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('Rapport Données du canton_Canton A_IC 1_2026-05-20 14-30.pdf');
    });

    it('should sanitize illegal filename characters (slashes and colons in localized datetime)', async () => {
      const data = { ...createMockReportData(), date: '20/05/2026 14:30' };
      await service.generateReport(data);

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('Rapport Données du canton_Canton A_IC 1_20-05-2026 14-30.pdf');
    });

    it('should log and notify error when PDF generation fails', async () => {
      const jsPDFModule = (await import('jspdf')) as unknown as { default: ReturnType<typeof vi.fn> };
      jsPDFModule.default.mockImplementationOnce(() => {
        throw new Error('PDF error');
      });

      await service.generateReport(createMockReportData());

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockNotificationService.error).toHaveBeenCalled();
    });
  });
});
