/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';

import { ChargesReportService } from './charges-data-report.service';

describe('ChargesReportService', () => {
  let service: ChargesReportService;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockTranslocoService: jasmine.SpyObj<TranslocoService>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['add']);
    mockTranslocoService = jasmine.createSpyObj('TranslocoService', ['translate']);
    mockLoggerService = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']);

    TestBed.configureTestingModule({
      providers: [
        ChargesReportService,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslocoService, useValue: mockTranslocoService },
        { provide: LoggerService, useValue: mockLoggerService }
      ]
    });

    service = TestBed.inject(ChargesReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // TODO: Add tests for generateReport() once the implementation is finalized
  // - Test PDF structure
  // - Test translation key resolution
  // - Test file download behavior
  // - Test edge cases (empty tables, large datasets, etc.)
});
