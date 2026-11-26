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

import { FieldMeasureReportService } from './field-measure-report.service';
import { FieldMeasureReportData } from './field-measure-report.interfaces';

const MOCK_TRANSLATIONS: Record<string, string> = {
  'field-measuring.report.title': 'Rapport Mesure de terrain',
  'common.page-label': 'Page',
  'common.report-generated-successfully-label': 'Report generated successfully',
  'common.failed-to-generate-report': 'Failed to generate report'
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
    addPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    internal: { pageSize: { getWidth: vi.fn().mockReturnValue(210), getHeight: vi.fn().mockReturnValue(297) } },
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    save: mockSave
  };
  const mockJsPDF = vi.fn(function () {
    return mockDoc;
  });
  return { default: mockJsPDF, jsPDF: mockJsPDF, __mockDoc: mockDoc };
});

const createReportData = (): FieldMeasureReportData => ({
  date: '06/11/2026',
  fileDate: '2026-11-06 14-39',
  measureName: 'Measure 1',
  sectionName: 'Section A',
  cartouche: {
    author: 'author@example.test',
    studyTitle: 'Study 1',
    studyDescription: 'Study description',
    cantonName: 'Section A',
    comment: 'Comment',
    icName: 'IC 1',
    chargeName: 'Load 1',
    chargeDescription: 'Load description'
  },
  sections: [
    { title: 'Terrain data', rows: [[{ label: 'Name', value: 'Measure 1' }, null]] },
    { title: 'Parameter', rows: [[{ label: 'Criterion', value: 'Yes', status: true }, null]] }
  ]
});

describe('FieldMeasureReportService', () => {
  let service: FieldMeasureReportService;
  let mockLogger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockLogger = { error: vi.fn(), log: vi.fn() };
    mockNotificationService = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FieldMeasureReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: { translate: vi.fn((key: string) => MOCK_TRANSLATIONS[key] ?? key) } }
      ]
    });

    service = TestBed.inject(FieldMeasureReportService);
  });

  afterEach(() => {
    const fetchMock = vi.mocked(globalThis.fetch);
    if (typeof fetchMock?.mockRestore === 'function') {
      fetchMock.mockRestore();
    }
  });

  it('should generate the PDF with the header, the paragraphs and the footers, and notify success', async () => {
    const { __mockDoc } = (await import('jspdf')) as unknown as {
      __mockDoc: { text: ReturnType<typeof vi.fn>; setPage: ReturnType<typeof vi.fn> };
    };
    __mockDoc.text.mockClear();

    await service.generateReport(createReportData());

    const texts = __mockDoc.text.mock.calls.map((call) => call[0]);
    expect(texts).toContain('Rapport Mesure de terrain');
    expect(texts).toContain('06/11/2026');
    expect(texts).toContain('Terrain data');
    expect(texts).toContain('Parameter');
    expect(texts).toContain('Page 1 / 1');
    expect(mockNotificationService.success).toHaveBeenCalledWith('Report generated successfully');
  });

  it('should name the file with the report title, measure, canton and generation date and time', async () => {
    await service.generateReport(createReportData());

    const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: { save: ReturnType<typeof vi.fn> } };
    expect(__mockDoc.save).toHaveBeenCalledWith('Rapport Mesure de terrain_Measure 1_Section A_2026-11-06 14-39.pdf');
  });

  it('should log and notify an error when the PDF generation fails', async () => {
    const jsPDFModule = (await import('jspdf')) as unknown as { default: ReturnType<typeof vi.fn> };
    jsPDFModule.default.mockImplementationOnce(() => {
      throw new Error('PDF error');
    });

    await service.generateReport(createReportData());

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to generate report');
  });
});
