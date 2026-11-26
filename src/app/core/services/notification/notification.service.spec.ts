/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { vi, type Mock } from 'vitest';
import { NotificationService } from './notification.service';
import { DEFAULT_LIFE, LIFE_ERROR, LIFE_WARNING } from './notification.constantes';

import { TranslocoTestingModule } from '@jsverse/transloco';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockMessageService: { add: Mock };

  beforeEach(() => {
    mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [NotificationService, { provide: MessageService, useValue: mockMessageService }]
    });

    service = TestBed.inject(NotificationService);
  });

  describe('success', () => {
    it('should call MessageService.add with severity success and provided detail', () => {
      service.success('Operation completed');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: 'Operation completed',
        life: DEFAULT_LIFE
      });
    });

    it('should use custom summary when provided', () => {
      service.success('Done', 'Custom Title');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Custom Title',
        detail: 'Done',
        life: DEFAULT_LIFE
      });
    });

    it('should use custom life duration when provided', () => {
      service.success('Done', undefined, 5000);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: 'Done',
        life: 5000
      });
    });
  });

  describe('error', () => {
    it('should call MessageService.add with severity error and provided detail', () => {
      service.error('Something went wrong');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: expect.any(String),
        detail: 'Something went wrong',
        life: LIFE_ERROR
      });
    });

    it('should use custom summary when provided', () => {
      service.error('Failed', 'Critical Error');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Critical Error',
        detail: 'Failed',
        life: LIFE_ERROR
      });
    });

    it('should use custom life duration when provided', () => {
      service.error('Failed', undefined, 6000);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: expect.any(String),
        detail: 'Failed',
        life: 6000
      });
    });
  });

  describe('info', () => {
    it('should call MessageService.add with severity info and provided detail', () => {
      service.info('For your information');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        key: 'bottom-right',
        severity: 'info',
        summary: expect.any(String),
        detail: 'For your information',
        life: DEFAULT_LIFE
      });
    });

    it('should use custom summary when provided', () => {
      service.info('Note', 'FYI');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        key: 'bottom-right',
        severity: 'info',
        summary: 'FYI',
        detail: 'Note',
        life: DEFAULT_LIFE
      });
    });
  });

  describe('warning', () => {
    it('should call MessageService.add with severity warn and provided detail', () => {
      service.warning('Proceed with caution');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        key: 'bottom-right',
        severity: 'warn',
        summary: expect.any(String),
        detail: 'Proceed with caution',
        life: LIFE_WARNING
      });
    });

    it('should use custom summary when provided', () => {
      service.warning('Be careful', 'Attention');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        key: 'bottom-right',
        severity: 'warn',
        summary: 'Attention',
        detail: 'Be careful',
        life: LIFE_WARNING
      });
    });
  });

  describe('deduplication', () => {
    it('should not display the same warning twice while it is still shown', () => {
      service.warning('Same');
      service.warning('Same');

      expect(mockMessageService.add).toHaveBeenCalledTimes(1);
    });

    it('should not display the same info twice while it is still shown', () => {
      service.info('Same');
      service.info('Same');

      expect(mockMessageService.add).toHaveBeenCalledTimes(1);
    });

    it('should display different messages', () => {
      service.warning('One');
      service.warning('Two');

      expect(mockMessageService.add).toHaveBeenCalledTimes(2);
    });

    it('should display the message again once its toast has been released', () => {
      service.warning('Same');
      const added = mockMessageService.add.mock.calls[0][0];
      service.release(added);
      service.warning('Same');

      expect(mockMessageService.add).toHaveBeenCalledTimes(2);
    });

    it('should display a warning list again once its toast has been released', () => {
      service.warningList(['a']);
      service.release(mockMessageService.add.mock.calls[0][0]);
      service.warningList(['a']);

      expect(mockMessageService.add).toHaveBeenCalledTimes(2);
    });

    it('should not merge an info and a warning with the same text', () => {
      service.info('Same', 'T');
      service.warning('Same', 'T');

      expect(mockMessageService.add).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate warning lists on the bottom-right key', () => {
      service.warningList(['a', 'b']);
      service.warningList(['a', 'b']);

      expect(mockMessageService.add).toHaveBeenCalledTimes(1);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'bottom-right', data: { warnings: ['a', 'b'] } })
      );
    });

    it('should never deduplicate success and error toasts', () => {
      service.success('Same');
      service.success('Same');
      service.error('Same');
      service.error('Same');

      expect(mockMessageService.add).toHaveBeenCalledTimes(4);
    });
  });
});
