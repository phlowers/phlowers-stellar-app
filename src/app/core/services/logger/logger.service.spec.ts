/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoggerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should call console.log with the provided message', () => {
      const spy = vi.spyOn(console, 'log').mockReturnValue(undefined);
      service.log('test message');
      expect(spy).toHaveBeenCalledWith('test message');
    });

    it('should forward extra arguments to console.log', () => {
      const spy = vi.spyOn(console, 'log').mockReturnValue(undefined);
      service.log('msg', { key: 'value' }, 42);
      expect(spy).toHaveBeenCalledWith('msg', { key: 'value' }, 42);
    });
  });

  describe('error', () => {
    it('should call console.error with the provided message', () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      service.error('error message');
      expect(spy).toHaveBeenCalledWith('error message');
    });

    it('should forward extra arguments to console.error', () => {
      const spy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      const err = new Error('oops');
      service.error('failed', err);
      expect(spy).toHaveBeenCalledWith('failed', err);
    });
  });

  describe('warn', () => {
    it('should call console.warn with the provided message', () => {
      const spy = vi.spyOn(console, 'warn').mockReturnValue(undefined);
      service.warn('warn message');
      expect(spy).toHaveBeenCalledWith('warn message');
    });

    it('should forward extra arguments to console.warn', () => {
      const spy = vi.spyOn(console, 'warn').mockReturnValue(undefined);
      service.warn('warning', 'extra', true);
      expect(spy).toHaveBeenCalledWith('warning', 'extra', true);
    });
  });

  describe('info', () => {
    it('should call console.info with the provided message', () => {
      const spy = vi.spyOn(console, 'info').mockReturnValue(undefined);
      service.info('info message');
      expect(spy).toHaveBeenCalledWith('info message');
    });

    it('should forward extra arguments to console.info', () => {
      const spy = vi.spyOn(console, 'info').mockReturnValue(undefined);
      service.info('details', { id: 1 });
      expect(spy).toHaveBeenCalledWith('details', { id: 1 });
    });
  });
});
