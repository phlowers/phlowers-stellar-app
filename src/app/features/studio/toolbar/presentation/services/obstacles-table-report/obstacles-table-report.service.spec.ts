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
import { PAGE_MARGIN } from '@shared/pdf/pdf-layout.constantes';
import { TABLE_ROW_HEIGHT } from '@shared/pdf/pdf-table.constantes';

import { OBSTACLES_TABLE_METRICS, OBSTACLES_TABLES_VERTICAL_GAP } from './obstacles-table-report.constantes';
import { ObstacleTableRow } from '@features/studio/toolbar/presentation/components/obstacles-table/obstacles-table.interfaces';

import { ObstaclesTableReportData } from './obstacles-table-report.interfaces';
import { ObstaclesTableReportService } from './obstacles-table-report.service';

const MOCK_TRANSLATIONS: Record<string, string> = {
  'studio.obstacles-report.title': 'Rapport Tableau des obstacles',
  'studio.obstacles-report.obstacles-title': 'Points d obstacles',
  'common.page-label': 'Page',
  'common.report-generated-successfully-label': 'Report generated successfully',
  'common.failed-to-generate-report': 'Failed to generate report'
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
    getNumberOfPages: vi.fn().mockReturnValue(2),
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
  rect: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

async function getMockDoc(): Promise<MockDoc> {
  const { __mockDoc } = (await import('jspdf')) as unknown as { __mockDoc: MockDoc };
  return __mockDoc;
}

function createRow(index: number): ObstacleTableRow {
  return {
    obstacleName: `Obstacle ${index}`,
    obstacleType: `Type ${index}`,
    spanLabel: `S${index} - S${index + 1}`,
    referenceSupportLabel: `S${index}`,
    altitudeTypeLabel: 'Absolute (NGF)',
    lateralDistanceTypeLabel: 'Span axis',
    pointNumber: index,
    altitude: 100 + index + 0.123,
    distanceToRefSupport: 10 + index,
    distanceToLineAxis: 5 + index,
    oblique: 2 + index,
    vertical: 1 + index,
    horizontal: 0.5 + index
  };
}

function createData(overrides: Partial<ObstaclesTableReportData> = {}): ObstaclesTableReportData {
  return {
    date: '22/10/2026',
    time: '14:35',
    author: 'author@example.test',
    studyTitle: 'Fake study',
    studyDescription: 'Fake description',
    cantonName: 'Fake canton',
    cantonComment: 'Fake comment',
    icName: 'Fake IC',
    chargeName: 'Fake load case',
    chargeDescription: 'Fake load description',
    rows: [createRow(1), createRow(2)],
    ...overrides
  };
}

describe('ObstaclesTableReportService', () => {
  let service: ObstaclesTableReportService;
  let mockLogger: { error: ReturnType<typeof vi.fn>; log: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockTranslocoService: { translate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockLogger = { error: vi.fn(), log: vi.fn() };
    mockNotificationService = { success: vi.fn(), error: vi.fn() };
    mockTranslocoService = { translate: vi.fn((key: string) => MOCK_TRANSLATIONS[key] ?? key) };

    TestBed.configureTestingModule({
      providers: [
        ObstaclesTableReportService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });

    service = TestBed.inject(ObstaclesTableReportService);

    const doc = await getMockDoc();
    doc.addPage.mockClear();
    doc.rect.mockClear();
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
    expect(mockTranslocoService.translate).toHaveBeenCalledWith('studio.obstacles-report.title');
  });

  it('should name the file with title, canton, load case, date and time', async () => {
    await service.generateReport(createData());

    const doc = await getMockDoc();
    expect(doc.save).toHaveBeenCalledWith(
      'Rapport Tableau des obstacles_Fake canton_Fake load case_22-10-2026 14-35.pdf'
    );
  });

  it('should draw the obstacle points on a landscape page after the portrait cartouche page', async () => {
    await service.generateReport(createData());

    const doc = await getMockDoc();
    const texts = doc.text.mock.calls.map((call) => call[0]);
    expect(doc.addPage).toHaveBeenCalledTimes(1);
    expect(doc.addPage).toHaveBeenCalledWith('a4', 'landscape');
    expect(texts).toContain('Points d obstacles');
    OBSTACLES_TABLE_METRICS.forEach((metric) => expect(texts).toContain(metric.labelKey));
  });

  it('should draw the span label and the distances in metres with two decimals', async () => {
    await service.generateReport(createData());

    const doc = await getMockDoc();
    const texts = doc.text.mock.calls.map((call) => call[0]);
    expect(texts).toContain('S1 - S2');
    expect(texts).toContain('S2 - S3');
    expect(texts).toContain('101.12 m');
    expect(texts).toContain('11.00 m');
    expect(texts).toContain('1.50 m');
  });

  it('should draw what identifies each obstacle point and how its distances are referenced', async () => {
    await service.generateReport(createData());

    const doc = await getMockDoc();
    const texts = doc.text.mock.calls.map((call) => call[0]);
    ['Obstacle 1', 'Obstacle 2', 'Type 1', 'Type 2', 'S1', 'S2', 'Absolute (NGF)', 'Span axis', '1', '2'].forEach(
      (text) => expect(texts).toContain(text)
    );
  });

  it('should draw "-" for the distances that could not be computed', async () => {
    await service.generateReport(
      createData({ rows: [{ ...createRow(1), oblique: null, vertical: null, horizontal: null }] })
    );

    const doc = await getMockDoc();
    const texts = doc.text.mock.calls.map((call) => call[0]);
    expect(texts.filter((text) => text === '-')).toHaveLength(3);
  });

  it('should stack the tables of 5 points on the same landscape page', async () => {
    const rows = Array.from({ length: 7 }, (_, index) => createRow(index + 1));
    await service.generateReport(createData({ rows }));

    const doc = await getMockDoc();
    const spanLabelCalls = doc.text.mock.calls.filter((call) => call[0] === 'common.span-label');
    expect(spanLabelCalls).toHaveLength(2);
    expect(doc.addPage).toHaveBeenCalledTimes(1);
  });

  it('should keep the two tables of 5 points per landscape page and move a third one to the next page', async () => {
    const rows = Array.from({ length: 11 }, (_, index) => createRow(index + 1));
    await service.generateReport(createData({ rows }));

    const doc = await getMockDoc();
    const spanLabelCalls = doc.text.mock.calls.filter((call) => call[0] === 'common.span-label');
    expect(spanLabelCalls).toHaveLength(3);
    expect(doc.addPage).toHaveBeenCalledTimes(2);
  });

  it('should only draw the report title and date on the first page, not on the landscape pages', async () => {
    const rows = Array.from({ length: 11 }, (_, index) => createRow(index + 1));
    await service.generateReport(createData({ rows }));

    const doc = await getMockDoc();
    const texts = doc.text.mock.calls.map((call) => call[0]);
    expect(texts.filter((text) => text === 'Rapport Tableau des obstacles')).toHaveLength(1);
    expect(texts.filter((text) => text === '22/10/2026')).toHaveLength(1);
  });

  it('should space the two tables of a page by the obstacles tables gap', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => createRow(index + 1));
    await service.generateReport(createData({ rows }));

    const doc = await getMockDoc();
    // Only the obstacle tables draw cells: the label cell of each row sits at the left margin
    const labelCellYs = doc.rect.mock.calls.filter((call) => call[0] === PAGE_MARGIN.left).map((call) => call[1]);
    const rowsPerTable = OBSTACLES_TABLE_METRICS.length;
    expect(labelCellYs).toHaveLength(2 * rowsPerTable);
    const gap = labelCellYs[rowsPerTable] - (labelCellYs[rowsPerTable - 1] + TABLE_ROW_HEIGHT);
    expect(gap).toBeCloseTo(OBSTACLES_TABLES_VERTICAL_GAP);
  });

  it('should only generate the cartouche page when the table has no obstacle point', async () => {
    await service.generateReport(createData({ rows: [] }));

    const doc = await getMockDoc();
    expect(doc.addPage).not.toHaveBeenCalled();
    expect(doc.text.mock.calls.map((call) => call[0])).not.toContain('Points d obstacles');
    expect(mockNotificationService.success).toHaveBeenCalled();
  });

  it('should log and notify error when PDF generation fails', async () => {
    const jsPDFModule = (await import('jspdf')) as unknown as { default: ReturnType<typeof vi.fn> };
    jsPDFModule.default.mockImplementationOnce(() => {
      throw new Error('PDF error');
    });

    await service.generateReport(createData());

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate obstacles table report', expect.any(Error));
    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to generate report');
  });
});
