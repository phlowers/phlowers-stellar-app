/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin';
import { UpdateService } from '@core/services/worker_update/worker_update.service';
import { MessageService } from 'primeng/api';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { StorageService } from '@src/app/core/services/storage/storage.service';
import { ConfirmationService } from 'primeng/api';
import { BehaviorSubject, Subject } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/atoms/button/button.component';
import { OnlineService } from '@src/app/core/services/online/online.service';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let updateServiceMock: jest.Mocked<UpdateService>;
  let messageServiceMock: jest.Mocked<MessageService>;
  let studiesServiceMock: jest.Mocked<StudiesService>;
  let storageServiceMock: jest.Mocked<StorageService>;
  let confirmationServiceMock: jest.Mocked<ConfirmationService>;
  let onlineServiceMock: jest.Mocked<OnlineService>;

  const mockCurrentVersion = {
    git_hash: 'abc123',
    build_datetime_utc: '2024-01-01T00:00:00Z',
    version: '1.0.0'
  };

  const mockLatestVersion = {
    git_hash: 'def456',
    build_datetime_utc: '2024-01-02T00:00:00Z',
    version: '1.1.0'
  };

  beforeEach(async () => {
    updateServiceMock = {
      currentVersion: mockCurrentVersion,
      latestVersion: mockLatestVersion,
      needUpdate: false,
      update: jest.fn(),
      sucessFullUpdate: new Subject<void>()
    } as unknown as jest.Mocked<UpdateService>;

    messageServiceMock = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;

    studiesServiceMock = {
      deleteAllStudies: jest.fn()
    } as unknown as jest.Mocked<StudiesService>;

    storageServiceMock = {
      resetDatabase: jest.fn()
    } as unknown as jest.Mocked<StorageService>;

    confirmationServiceMock = {
      confirm: jest.fn(),
      close: jest.fn(),
      onAccept: new Subject<void>(),
      onReject: new Subject<void>(),
      requireConfirmation$: {
        subscribe: jest.fn().mockReturnValue(new Subject<void>())
      }
    } as unknown as jest.Mocked<ConfirmationService>;

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true)
    } as unknown as jest.Mocked<OnlineService>;

    await TestBed.configureTestingModule({
      imports: [
        AdminComponent,
        ToastModule,
        CardModule,
        TableModule,
        ButtonModule,
        FormsModule,
        CommonModule,
        ButtonComponent
      ],
      providers: [
        { provide: UpdateService, useValue: updateServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: StudiesService, useValue: studiesServiceMock },
        { provide: StorageService, useValue: storageServiceMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: OnlineService, useValue: onlineServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.updateAvailable).toBe(false);
      expect(component.newVersion).toBe('');
    });

    it('should have correct dependencies injected', () => {
      expect(component.updateService).toBe(updateServiceMock);
      expect(component['messageService']).toBe(messageServiceMock);
      expect(component['studyService']).toBe(studiesServiceMock);
      expect(component['storageService']).toBe(storageServiceMock);
      expect(component['confirmationService']).toBe(confirmationServiceMock);
    });
  });

  describe('deleteAllStudies', () => {
    it('should show confirmation dialog when called', () => {
      component.deleteAllStudies();

      expect(confirmationServiceMock.confirm).toHaveBeenCalledWith({
        message: expect.any(String), // $localize returns a string
        accept: expect.any(Function)
      });
    });

    it('should delete all studies when confirmed', () => {
      component.deleteAllStudies();

      // Get the accept callback from the confirmation call
      const confirmCall = confirmationServiceMock.confirm.mock.calls[0][0];
      const acceptCallback = confirmCall.accept as () => void;

      // Execute the accept callback
      acceptCallback();

      expect(studiesServiceMock.deleteAllStudies).toHaveBeenCalled();
      expect(messageServiceMock.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String)
      });
    });

    it('should not delete studies when confirmation is cancelled', () => {
      component.deleteAllStudies();

      // Don't call the accept callback

      expect(studiesServiceMock.deleteAllStudies).not.toHaveBeenCalled();
      expect(messageServiceMock.add).not.toHaveBeenCalled();
    });
  });

  describe('resetDatabase', () => {
    it('should show confirmation dialog when called', () => {
      component.resetDatabase();

      expect(confirmationServiceMock.confirm).toHaveBeenCalledWith({
        message: expect.any(String),
        accept: expect.any(Function)
      });
    });

    it('should reset database when confirmed', () => {
      component.resetDatabase();

      // Get the accept callback from the confirmation call
      const confirmCall = confirmationServiceMock.confirm.mock.calls[0][0];
      const acceptCallback = confirmCall.accept as () => void;

      // Execute the accept callback
      acceptCallback();

      expect(storageServiceMock.resetDatabase).toHaveBeenCalled();
      expect(messageServiceMock.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String)
      });
    });

    it('should not reset database when confirmation is cancelled', () => {
      component.resetDatabase();

      // Don't call the accept callback

      expect(storageServiceMock.resetDatabase).not.toHaveBeenCalled();
      expect(messageServiceMock.add).not.toHaveBeenCalled();
    });
  });

  describe('resetApp', () => {
    beforeEach(() => {
      // Mock the caches API
      Object.defineProperty(window, 'caches', {
        value: {
          delete: jest.fn().mockResolvedValue(undefined)
        },
        writable: true
      });

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          href: ''
        },
        writable: true
      });

      // Mock navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistrations: jest.fn().mockResolvedValue([
            {
              unregister: jest.fn().mockResolvedValue(true)
            }
          ])
        },
        writable: true
      });
    });

    it('should show confirmation dialog when called', () => {
      component.resetApp();

      expect(confirmationServiceMock.confirm).toHaveBeenCalledWith({
        message: expect.any(String),
        accept: expect.any(Function)
      });
    });

    it('should delete cache and reload when confirmed', async () => {
      component.resetApp();

      // Get the accept callback from the confirmation call
      const confirmCall = confirmationServiceMock.confirm.mock.calls[0][0];
      const acceptCallback = confirmCall.accept as () => Promise<void>;

      // Execute the accept callback
      await acceptCallback();

      expect(window.caches.delete).toHaveBeenCalledWith('app-assets');
      expect(messageServiceMock.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String)
      });

      // Wait for the setTimeout to execute
      await new Promise((resolve) => setTimeout(resolve, 2100));

      expect(window.location.href).toBe('/');
    });

    it('should not delete cache when confirmation is cancelled', () => {
      component.resetApp();

      // Don't call the accept callback

      expect(window.caches.delete).not.toHaveBeenCalled();
      expect(messageServiceMock.add).not.toHaveBeenCalled();
      expect(window.location.href).toBe('');
    });
  });
});
