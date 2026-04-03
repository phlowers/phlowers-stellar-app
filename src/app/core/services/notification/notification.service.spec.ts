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

describe('NotificationService', () => {
  let service: NotificationService;
  let mockMessageService: { add: Mock };

  beforeEach(() => {
    mockMessageService = { add: vi.fn() };

    TestBed.configureTestingModule({
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
        life: 3000
      });
    });

    it('should use custom summary when provided', () => {
      service.success('Done', 'Custom Title');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Custom Title',
        detail: 'Done',
        life: 3000
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
        life: 3000
      });
    });

    it('should use custom summary when provided', () => {
      service.error('Failed', 'Critical Error');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Critical Error',
        detail: 'Failed',
        life: 3000
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
        severity: 'info',
        summary: expect.any(String),
        detail: 'For your information',
        life: 3000
      });
    });

    it('should use custom summary when provided', () => {
      service.info('Note', 'FYI');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'FYI',
        detail: 'Note',
        life: 3000
      });
    });
  });

  describe('warning', () => {
    it('should call MessageService.add with severity warn and provided detail', () => {
      service.warning('Proceed with caution');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: expect.any(String),
        detail: 'Proceed with caution',
        life: 3000
      });
    });

    it('should use custom summary when provided', () => {
      service.warning('Be careful', 'Attention');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Attention',
        detail: 'Be careful',
        life: 3000
      });
    });
  });
});
