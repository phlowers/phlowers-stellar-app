/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoggerService } from '@core/services/logger/logger.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { Section } from '@shared/domain';
import { createEmptySection } from '@shared/domain/helpers/sections.helpers';
import { LineCorrectionService } from './line-correction.service';

describe('LineCorrectionService', () => {
  let service: LineCorrectionService;
  let linesServiceMock: { getLines: ReturnType<typeof vi.fn> };
  let loggerMock: { warn: ReturnType<typeof vi.fn> };

  const buildSection = (overrides: Partial<Section> = {}): Section => ({
    ...createEmptySection(),
    voltage_idr: '225kV',
    voltage_adr: '225 KV',
    ...overrides
  });

  beforeEach(() => {
    linesServiceMock = { getLines: vi.fn().mockResolvedValue([{ voltage_idr: '225 KV' }, { voltage_idr: '400 KV' }]) };
    loggerMock = { warn: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: LinesService, useValue: linesServiceMock },
        { provide: LoggerService, useValue: loggerMock }
      ]
    });
    service = TestBed.inject(LineCorrectionService);
  });

  it('should store the catalog voltage matching voltage_idr regardless of spacing and casing', async () => {
    const result = await service.correctVoltage(buildSection());

    expect(result.voltage_idr).toBe('225 KV');
  });

  it('should fall back to voltage_adr when voltage_idr has no catalog match', async () => {
    const result = await service.correctVoltage(buildSection({ voltage_idr: 'unknown-format' }));

    expect(result.voltage_idr).toBe('225 KV');
  });

  it('should leave voltage_idr undefined and warn when no candidate matches', async () => {
    linesServiceMock.getLines.mockResolvedValue([{ voltage_idr: '63 KV' }]);

    const result = await service.correctVoltage(buildSection());

    expect(result.voltage_idr).toBeUndefined();
    expect(result.voltage_adr).toBe('225 KV');
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it('should leave voltage_idr undefined when the line catalog is empty', async () => {
    linesServiceMock.getLines.mockResolvedValue([]);

    expect((await service.correctVoltage(buildSection())).voltage_idr).toBeUndefined();
  });

  it('should leave voltage_idr undefined and warn when the line catalog cannot be read', async () => {
    linesServiceMock.getLines.mockRejectedValue(new Error('db down'));

    expect((await service.correctVoltage(buildSection())).voltage_idr).toBeUndefined();
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it('should not read the catalog when the section has no voltage', async () => {
    const section = buildSection({ voltage_idr: undefined, voltage_adr: undefined });

    expect(await service.correctVoltage(section)).toBe(section);
    expect(linesServiceMock.getLines).not.toHaveBeenCalled();
  });
});
