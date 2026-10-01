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

import { HangingTableReportService } from './hanging-table-report.service';
import { HANGING_TABLE_METRICS } from './hanging-table-report.constantes';
import { HangingTableReportData } from './hanging-table-report.interfaces';

const MOCK_TRANSLATIONS: Record<string, string> = {
  'studio.hanging-table-report.title': 'Rapport Tableau de pose',
  'studio.hanging-table-report.page-label': 'Page',
  'studio.hanging-table-report.results-title': 'Résultats',
  'studio.hanging-table-report.report-generated-success': 'Report generated successfully',
  'studio.hanging-table-report.report-generation-failed': 'Failed to generate report'
};

vi.mock('jspdf', () => {
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setPage: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    save: vi.fn()
  };
  const mockJsPDF = vi.fn(function () {
    return mockDoc;
  });
  return { default: mockJsPDF, jsPDF: mockJsPDF, __mockDoc: mockDoc };
});

interface MockDoc {
  addPage: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

async function getMockDoc(): Promise<MockDoc> {
  const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: MockDoc };
  return __mockDoc;
}

function createData(overrides: Partial<HangingTableReportData> = {}): HangingTableReportData {
  return {
    date: '2026-09-30',
    author: 'author@example.test',
    studyTitle: 'Fake study',
    studyDescription: 'Fake description',
    cantonName: 'Fake canton',
    cantonComment: 'Fake comment',
    icName: 'Fake IC',
    chargeName: 'Fake load case',
    chargeDescription: 'Fake load description',
    baseParameter: 1500,
    baseTemperature: 15,
    equivalentSpan: 300,
    lowestTemp: -10,
    computingStep: 5,
    results: {
      temperatures: [-10, -5, 0],
      poseParams: [1200.123, 1300, 1400],
      horizontalTensions: [2000, 2100.5, 2200]
    },
    ...overrides
  };
}

describe('HangingTableReportService', () => {
  let service: HangingTableReportService;
  let mockLogger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockTranslocoService: { translate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockLogger = { error: vi.fn(), log: vi.fn() };
    mockNotificationService = { success: vi.fn(), error: vi.fn() };
    mockTranslocoService = { translate: vi.fn((key: string) => MOCK_TRANSLATIONS[key] ?? key) };

    TestBed.configureTestingModule({
      providers: [
        HangingTableReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });

    service = TestBed.inject(HangingTableReportService);

    const doc = await getMockDoc();
    doc.addPage.mockClear();
    doc.text.mockClear();
    doc.save.mockClear();
  });

  afterEach(() => {
    const fetchMock = vi.mocked(globalThis.fetch);
    if (typeof fetchMock?.mockRestore === 'function') {
      fetchMock.mockRestore();
    }
  });

  it('should save the PDF and notify success with the translated message', async () => {
    await service.generateReport(createData());

    expect(mockNotificationService.success).toHaveBeenCalledWith('Report generated successfully');
    expect(mockTranslocoService.translate).toHaveBeenCalledWith('studio.hanging-table-report.title');
  });

  it('should name the file with report title, canton, initial condition and sanitized date', async () => {
    await service.generateReport(createData({ date: '30/09/2026' }));

    const doc = await getMockDoc();
    expect(doc.save).toHaveBeenCalledWith('Rapport Tableau de pose_Fake canton_Fake IC_30-09-2026.pdf');
  });

  it('should draw the results on the single portrait page with bare one-decimal values', async () => {
    await service.generateReport(createData());

    const doc = await getMockDoc();
    const texts = doc.text.mock.calls.map((call) => call[0]);
    expect(doc.addPage).not.toHaveBeenCalled();
    expect(texts).toContain('Résultats');
    HANGING_TABLE_METRICS.forEach((metric) => expect(texts).toContain(metric.labelKey));
    expect(texts).toContain('-10 °C');
    expect(texts).toContain('1200.1');
    expect(texts).toContain('2100.5');
  });

  it('should not draw a results section when there are no results', async () => {
    await service.generateReport(createData({ results: { temperatures: [], poseParams: [], horizontalTensions: [] } }));

    const doc = await getMockDoc();
    expect(doc.text.mock.calls.map((call) => call[0])).not.toContain('Résultats');
    expect(mockNotificationService.success).toHaveBeenCalled();
  });

  it('should keep every temperature on a single row, without chunking', async () => {
    const values = Array.from({ length: 8 }, (_, i) => i);
    await service.generateReport(
      createData({ results: { temperatures: values, poseParams: values, horizontalTensions: values } })
    );

    const doc = await getMockDoc();
    const temperatureLabelCalls = doc.text.mock.calls.filter(
      (call) => call[0] === 'studio.conformity.temperature-label'
    );
    expect(temperatureLabelCalls).toHaveLength(1);
    expect(doc.addPage).not.toHaveBeenCalled();
  });

  it('should log and notify error when PDF generation fails', async () => {
    const jsPDFModule = (await import('jspdf')) as unknown as { default: ReturnType<typeof vi.fn> };
    jsPDFModule.default.mockImplementationOnce(() => {
      throw new Error('PDF error');
    });

    await service.generateReport(createData());

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to generate report');
  });
});
