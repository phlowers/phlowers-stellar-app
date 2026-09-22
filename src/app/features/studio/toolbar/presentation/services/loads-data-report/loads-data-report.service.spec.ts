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

import { LoadsReportService } from './loads-data-report.service';
import {
  CABLE_MODIF_METRICS,
  LOADS_METRICS,
  PDF_LOADS_LABEL_KEYS,
  SPAN_MANIP_METRICS,
  SUPPORT_MANIP_METRICS
} from './loads-data-report.constantes';
import {
  CableModifReportRow,
  LoadsReportData,
  SpanLoadReportRow,
  SpanManipReportRow,
  SupportManipReportRow
} from './loads-data-report.interfaces';
import { SymmetryType } from '@shared/domain/models/charge.model';

const MOCK_TRANSLATIONS: Record<string, string> = {
  'studio.loads-report.title': 'Rapport des charges',
  'studio.loads-report.page-label': 'Page',
  'studio.loads-report.report-generated-success': 'Report generated successfully',
  'studio.loads-report.report-generation-failed': 'Failed to generate report',
  'common.symmetric': 'Symmetric',
  'common.dis-symmetric': 'Dissymmetric',
  'common.yes': 'Oui',
  'common.no': 'Non'
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

function createSpanLoad(index: number): SpanLoadReportRow {
  return {
    spanLabel: `S${index} - S${index + 1}`,
    referenceSupport: `S${index}`,
    type: 'Punctual charge',
    loadWeight: 120,
    loadPosition: 15.5
  };
}

function createCableModif(index: number): CableModifReportRow {
  return {
    spanLabel: `S${index} - S${index + 1}`,
    referenceSupport: `S${index}`,
    modificationType: 'Lengthening',
    modifiedLengthCable: 2.5,
    distanceSupportRef: 10
  };
}

function createSupportManip(index: number): SupportManipReportRow {
  return {
    displayIndex: String(index),
    supportLabel: `S${index}`,
    type: 'Crane handling',
    shiftingClampLength: null,
    vertDisplacement: 3.2,
    anchoring: 'With chain',
    lateralDistance: 1.1,
    ropeLength: null,
    chainName: 'Chain A',
    chainLength: 4,
    chainWeight: 120,
    chainSurface: 0.5,
    counterWeight: 50
  };
}

function createSpanManip(index: number): SpanManipReportRow {
  return {
    spanLabel: `S${index} - S${index + 1}`,
    referenceSupport: `S${index}`,
    distanceToRefSupport: 12,
    cableManipType: 'With a crane',
    cableManipMethod: 'Clamp',
    longitudinalDistance: 5,
    lateralDistance: 1.5,
    altitude: 200,
    anchoring: 'With sling',
    slingLength: 3,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainSurface: null,
    counterWeight: null
  };
}

function createMockReportData(overrides: Partial<LoadsReportData> = {}): LoadsReportData {
  return {
    date: '2026-05-20 14:30',
    author: 'test@example.com',
    studyTitle: 'Test Study',
    studyDescription: 'Description',
    cantonName: 'Canton A',
    cantonComment: 'Canton comment',
    icName: 'IC 1',
    chargeName: 'Charge 1',
    chargeDescription: 'Charge description',
    personnelPresence: true,
    climate: {
      windPressure: 480,
      cableTemperature: 15,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: 2,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    },
    frontierSupportLabel: null,
    spanLoads: [createSpanLoad(1)],
    cableModifications: [createCableModif(1)],
    supportManipulations: [createSupportManip(1)],
    spanManipulations: [createSpanManip(1)],
    ...overrides
  };
}

describe('LoadsReportService', () => {
  let service: LoadsReportService;
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
        LoadsReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });

    service = TestBed.inject(LoadsReportService);
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

    it('should resolve labels via the transloco service', async () => {
      await service.generateReport(createMockReportData());
      expect(mockTranslocoService.translate).toHaveBeenCalledWith('studio.loads-report.title');
      expect(mockTranslocoService.translate).toHaveBeenCalledWith('common.yes');
      expect(mockTranslocoService.translate).toHaveBeenCalledWith('common.no');
    });

    it('should name the file with report title, canton, charge name and date', async () => {
      await service.generateReport(createMockReportData());

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('Rapport des charges_Canton A_Charge 1_2026-05-20 14-30.pdf');
    });

    it('should render personnel presence as Non when false', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { text: ReturnType<typeof vi.fn> } };
      __mockDoc.text.mockClear();

      await service.generateReport(createMockReportData({ personnelPresence: false }));

      expect(__mockDoc.text).toHaveBeenCalledWith('Non', expect.any(Number), expect.any(Number));
    });

    it('should render the dis-symmetric climate variant when a frontier support is set', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { text: ReturnType<typeof vi.fn> } };
      __mockDoc.text.mockClear();

      await service.generateReport(
        createMockReportData({
          climate: {
            windPressure: 480,
            cableTemperature: 15,
            symmetryType: SymmetryType.DIS_SYMMETRIC,
            iceThickness: null,
            frontierSupportNumber: 3,
            iceThicknessBefore: 1,
            iceThicknessAfter: 2
          },
          frontierSupportLabel: 'AC3'
        })
      );

      expect(__mockDoc.text).toHaveBeenCalledWith('AC3', expect.any(Number), expect.any(Number));
    });

    it('should render the symmetric climate variant even when a stale frontierSupportNumber is present', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { text: ReturnType<typeof vi.fn> } };
      __mockDoc.text.mockClear();

      await service.generateReport(
        createMockReportData({
          climate: {
            windPressure: 480,
            cableTemperature: 15,
            symmetryType: SymmetryType.SYMMETRIC,
            iceThickness: 12,
            frontierSupportNumber: 2,
            iceThicknessBefore: null,
            iceThicknessAfter: null
          },
          frontierSupportLabel: 'AC2'
        })
      );

      expect(__mockDoc.text).not.toHaveBeenCalledWith('AC2', expect.any(Number), expect.any(Number));
      expect(__mockDoc.text).toHaveBeenCalledWith('12 cm', expect.any(Number), expect.any(Number));
    });

    it('should skip result table sections when all data sets are empty', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: { addPage: ReturnType<typeof vi.fn> };
      };
      __mockDoc.addPage.mockClear();

      await service.generateReport(
        createMockReportData({
          spanLoads: [],
          cableModifications: [],
          supportManipulations: [],
          spanManipulations: []
        })
      );

      expect(mockNotificationService.success).toHaveBeenCalled();
      expect(__mockDoc.addPage).not.toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should add landscape pages for the result tables when data is present', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: { addPage: ReturnType<typeof vi.fn> };
      };
      __mockDoc.addPage.mockClear();

      await service.generateReport(createMockReportData());

      expect(__mockDoc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should stack result table sections instead of forcing one landscape page per section', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: { addPage: ReturnType<typeof vi.fn> };
      };
      __mockDoc.addPage.mockClear();

      await service.generateReport(createMockReportData());

      // 4 non-empty sections used to force at least 4 landscape pages (one per section);
      // stacking must now fit them onto fewer pages.
      expect(__mockDoc.addPage.mock.calls.length).toBeLessThan(4);
      expect(__mockDoc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should label result table rows with the metric label keys', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { text: ReturnType<typeof vi.fn> } };
      __mockDoc.text.mockClear();

      await service.generateReport(createMockReportData());

      const drawnTexts = __mockDoc.text.mock.calls.map((call) => call[0]);
      const expectedLabels = [
        ...LOADS_METRICS.map((metric) => metric.labelKey),
        ...CABLE_MODIF_METRICS.map((metric) => metric.labelKey),
        ...SUPPORT_MANIP_METRICS.map((metric) => metric.labelKey),
        ...SPAN_MANIP_METRICS.map((metric) => metric.labelKey)
      ];
      expectedLabels.forEach((labelKey) => expect(drawnTexts).toContain(labelKey));
    });

    it('should draw the four result section titles when data is present', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { text: ReturnType<typeof vi.fn> } };
      __mockDoc.text.mockClear();

      await service.generateReport(createMockReportData());

      [
        PDF_LOADS_LABEL_KEYS.loadsTitle,
        PDF_LOADS_LABEL_KEYS.cableModifTitle,
        PDF_LOADS_LABEL_KEYS.supportManipTitle,
        PDF_LOADS_LABEL_KEYS.spanManipTitle
      ].forEach((title) => expect(__mockDoc.text).toHaveBeenCalledWith(title, expect.any(Number), expect.any(Number)));
    });

    it('should render the chain surface metric with the square meter unit', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { text: ReturnType<typeof vi.fn> } };
      __mockDoc.text.mockClear();

      await service.generateReport(createMockReportData());

      expect(__mockDoc.text).toHaveBeenCalledWith('0.50 m\u00B2', expect.any(Number), expect.any(Number));
    });

    it('should paginate a table into groups of 5 columns', async () => {
      const { __mockDoc } = (await import('jspdf')) as unknown as {
        __mockDoc: { addPage: ReturnType<typeof vi.fn> };
      };
      __mockDoc.addPage.mockClear();

      const manySpanLoads = Array.from({ length: 12 }, (_, i) => createSpanLoad(i + 1));
      await service.generateReport(createMockReportData({ spanLoads: manySpanLoads }));

      // 12 rows chunked by 5 columns per table => several landscape result table pages
      expect(__mockDoc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    });

    it('should add a computed footer on every page, using landscape from page 2', async () => {
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

    it('should sanitize illegal filename characters (slashes and colons in localized datetime)', async () => {
      await service.generateReport(createMockReportData({ date: '20/05/2026 14:30' }));

      const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
      expect(__mockDoc.save).toHaveBeenCalledWith('Rapport des charges_Canton A_Charge 1_20-05-2026 14-30.pdf');
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
