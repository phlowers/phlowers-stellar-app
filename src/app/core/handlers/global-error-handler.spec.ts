/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler';
import { LoggerService } from '@services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let loggerMock: { error: vi.Mock; warn: vi.Mock; info: vi.Mock; log: vi.Mock };
  let notificationMock: { error: vi.Mock };

  beforeEach(() => {
    loggerMock = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() };
    notificationMock = { error: vi.fn() };

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [
        GlobalErrorHandler,
        { provide: LoggerService, useValue: loggerMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    });

    handler = TestBed.inject(GlobalErrorHandler);
  });

  it('should be created', () => {
    expect(handler).toBeTruthy();
  });

  it('should log the error through LoggerService', () => {
    const error = new Error('boom');

    handler.handleError(error);

    expect(loggerMock.error).toHaveBeenCalledWith('Unhandled application error', error);
  });

  it('should show a single user notification for an error', () => {
    handler.handleError(new Error('boom'));

    expect(notificationMock.error).toHaveBeenCalledTimes(1);
  });

  it('should throttle repeated notifications while still logging every error', () => {
    handler.handleError(new Error('first'));
    handler.handleError(new Error('second'));

    expect(loggerMock.error).toHaveBeenCalledTimes(2);
    expect(notificationMock.error).toHaveBeenCalledTimes(1);
  });
});
