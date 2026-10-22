/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger/logger.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { LinesService } from '@shared/catalog/services/lines.service';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { StellarJsonAdapter } from '@adapters/section-import/stellar-json/stellar-json.adapter';
import { SECTION_IMPORT_ADAPTERS } from './section-import-adapter.constantes';
import { SECTION_IMPORT_ADAPTER_PROVIDERS } from './section-import-adapters.providers';

describe('SECTION_IMPORT_ADAPTER_PROVIDERS', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...SECTION_IMPORT_ADAPTER_PROVIDERS,
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
        { provide: LoggerService, useValue: { warn: vi.fn(), error: vi.fn() } },
        { provide: MaintenanceService, useValue: {} },
        { provide: AttachmentService, useValue: {} },
        { provide: ChainsService, useValue: {} },
        { provide: LinesService, useValue: {} }
      ]
    });
  });

  it('should always register the mandatory stellar_json adapter first', () => {
    const adapters = TestBed.inject(SECTION_IMPORT_ADAPTERS);

    expect(adapters[0]).toBeInstanceOf(StellarJsonAdapter);
    expect(adapters[0].id).toBe('stellar_json');
  });

  it('should register adapters with unique ids', () => {
    const ids = TestBed.inject(SECTION_IMPORT_ADAPTERS).map((adapter) => adapter.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should declare at least one extension per adapter', () => {
    for (const adapter of TestBed.inject(SECTION_IMPORT_ADAPTERS)) {
      expect(adapter.extensions.length).toBeGreaterThan(0);
    }
  });
});
