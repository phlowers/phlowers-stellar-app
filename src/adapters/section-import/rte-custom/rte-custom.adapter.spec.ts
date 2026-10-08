/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger/logger.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { buildImportSource } from '@shared/import/section-adapter/section-import-adapter';
import fakeCanton from './fixtures/fake-canton.json';
import { RteCustomAdapter } from './rte-custom.adapter';

const sourceOf = (json: unknown) => buildImportSource('canton.json', JSON.stringify(json));

describe('RteCustomAdapter', () => {
  let adapter: RteCustomAdapter;
  let attachmentServiceMock: {
    addSupportNamesIfAbsent: ReturnType<typeof vi.fn>;
    resolveCatalogAttachment: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    attachmentServiceMock = {
      addSupportNamesIfAbsent: vi.fn().mockResolvedValue(undefined),
      resolveCatalogAttachment: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        RteCustomAdapter,
        { provide: MaintenanceService, useValue: { getMaintenance: vi.fn().mockResolvedValue([]) } },
        { provide: AttachmentService, useValue: attachmentServiceMock },
        { provide: ChainsService, useValue: { getChains: vi.fn().mockResolvedValue([]) } },
        { provide: LinesService, useValue: { getLines: vi.fn().mockResolvedValue([]) } },
        { provide: LoggerService, useValue: { warn: vi.fn(), error: vi.fn() } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key, selectTranslate: (key: string) => of(key) }
        }
      ]
    });
    adapter = TestBed.inject(RteCustomAdapter);
  });

  it('should declare its identity and accepted extensions', () => {
    expect(adapter.id).toBe('rte_custom');
    expect(adapter.extensions).toEqual(['.json']);
  });

  it('should handle files with a cantons array only', () => {
    expect(adapter.canHandle(sourceOf(fakeCanton))).toBe(true);
    expect(adapter.canHandle(sourceOf({ uuid: 'a', supports: [] }))).toBe(false);
  });

  it('should extract the trimmed CANTON_CUR as uuid', () => {
    expect(adapter.extractUuid(sourceOf(fakeCanton))).toBe('FAKE-CANTON-0001');
  });

  it('should map the fixture and hand Lambert93 foot coordinates to the core', async () => {
    const payload = await adapter.import(sourceOf(fakeCanton));

    expect(payload.section.uuid).toBe('FAKE-CANTON-0001');
    expect(payload.coordinates?.crs).toBe('LAMBERT93');
    expect(payload.coordinates?.x).toHaveLength(payload.section.supports.length);
    expect(payload.coordinates?.y).toHaveLength(payload.section.supports.length);
    expect(payload.section.start_latitude).toBeNull();
    expect(payload.skipSectionValidation).toBe(true);
  });

  it('should add one localized warning when a support is missing from the catalog', async () => {
    const payload = await adapter.import(sourceOf(fakeCanton));

    expect(payload.notices).toEqual([{ severity: 'warning', message: 'catalog-missing-warning' }]);
  });

  it('should fail with an adapter format error when the first canton is malformed', async () => {
    await expect(adapter.import(sourceOf({ cantons: [{ general: {} }] }))).rejects.toMatchObject({
      code: 'RTE_CUSTOM_FORMAT_ERROR',
      stage: 'VALIDATION',
      message: 'format-error'
    });
  });

  it('should fail before touching any catalog when required fields are missing', async () => {
    const invalid = structuredClone(fakeCanton);
    invalid.cantons[0].general.CABLE_ADR = null as unknown as string;

    await expect(adapter.import(sourceOf(invalid))).rejects.toMatchObject({
      code: 'RTE_CUSTOM_REQUIRED_FIELDS',
      message: expect.stringContaining('CABLE_ADR: null')
    });
    expect(attachmentServiceMock.addSupportNamesIfAbsent).not.toHaveBeenCalled();
  });
});
