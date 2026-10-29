/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AdminComponent } from './admin';
import { AppUpdateService } from '@services/app-update/app-update.service';
import { AppUpdateState } from '@services/app-update/app-update.interfaces';
import { SwInstallRefusedMessage } from '@services/app-update/sw-messages.interfaces';
import { NotificationService } from '@services/notification/notification.service';
import { MessageService } from 'primeng/api';
import { StudiesService } from '@services/studies/studies.service';
import { StorageService } from '@services/storage/storage.service';
import { ConfirmationService } from 'primeng/api';
import { BehaviorSubject, Subject } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { OnlineService } from '@services/online/online.service';
import { WINDOW } from '@core/tokens/window.token';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let appUpdateMock: {
    state: ReturnType<typeof signal<AppUpdateState>>;
    lastRefusal: ReturnType<typeof signal<SwInstallRefusedMessage | null>>;
    runningVersion: ReturnType<typeof signal<{ version: string; gitHash: string; buildDateUtc: string | null }>>;
    checkForUpdate: ReturnType<typeof vi.fn>;
    readDiagnostics: ReturnType<typeof vi.fn>;
  };
  let notificationMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let messageServiceMock: vi.Mocked<MessageService>;
  let studiesServiceMock: vi.Mocked<StudiesService>;
  let storageServiceMock: vi.Mocked<StorageService>;
  let confirmationServiceMock: vi.Mocked<ConfirmationService>;
  let onlineServiceMock: vi.Mocked<OnlineService>;
  let locationAssignMock: ReturnType<typeof vi.fn>;
  let windowMock: Partial<Window>;

  const MB = 1024 * 1024;
  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    appUpdateMock = {
      state: signal<AppUpdateState>('ready-offline'),
      lastRefusal: signal<SwInstallRefusedMessage | null>(null),
      runningVersion: signal({ version: '1.0.0', gitHash: 'abc1234', buildDateUtc: '2024-01-01T00:00:00Z' }),
      checkForUpdate: vi.fn().mockResolvedValue({ allowed: true, reason: null }),
      readDiagnostics: vi
        .fn()
        .mockResolvedValue({ downlinkMbps: 8, thresholdMbps: 5, usageBytes: 10 * MB, quotaBytes: 100 * MB })
    };
    notificationMock = { info: vi.fn(), error: vi.fn() };

    messageServiceMock = {
      add: vi.fn()
    } as unknown as vi.Mocked<MessageService>;

    studiesServiceMock = {
      deleteAllStudies: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StudiesService>;

    storageServiceMock = {
      resetDatabase: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StorageService>;

    confirmationServiceMock = {
      confirm: vi.fn(),
      close: vi.fn(),
      onAccept: new Subject<void>(),
      onReject: new Subject<void>(),
      requireConfirmation$: {
        subscribe: vi.fn().mockReturnValue(new Subject<void>())
      }
    } as unknown as vi.Mocked<ConfirmationService>;

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true)
    } as unknown as vi.Mocked<OnlineService>;

    locationAssignMock = vi.fn();
    windowMock = { location: { assign: locationAssignMock } as unknown as Location };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        AdminComponent,
        ToastModule,
        CardComponent,
        TableModule,
        ButtonModule,
        FormsModule,
        CommonModule,
        ButtonComponent
      ],
      providers: [
        { provide: AppUpdateService, useValue: appUpdateMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: StudiesService, useValue: studiesServiceMock },
        { provide: StorageService, useValue: storageServiceMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: OnlineService, useValue: onlineServiceMock },
        { provide: WINDOW, useValue: windowMock }
      ]
    })
      .overrideComponent(AdminComponent, {
        set: {
          providers: [{ provide: ConfirmationService, useValue: confirmationServiceMock }, DatePipe]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not check for updates on creation', () => {
      expect(appUpdateMock.checkForUpdate).not.toHaveBeenCalled();
    });

    it('should have correct dependencies injected', () => {
      expect(component.appUpdateService).toBe(appUpdateMock);
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
        message: expect.any(String),
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
      vi.useFakeTimers();

      // Mock the caches API
      Object.defineProperty(globalThis, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined)
        },
        writable: true
      });

      // Mock navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistrations: vi.fn().mockResolvedValue([
            {
              unregister: vi.fn().mockResolvedValue(true)
            }
          ])
        },
        writable: true
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show confirmation dialog when called', () => {
      component.resetApp();

      expect(confirmationServiceMock.confirm).toHaveBeenCalledWith({
        message: expect.any(String),
        accept: expect.any(Function)
      });
    });

    it('should delete the app caches (Workbox precache, catalogs, previous system) and reload when confirmed', async () => {
      // Setup caches.keys() to return a mix of app and other caches.
      const cacheNames = [
        'workbox-precache-v2-https://stellar.test/',
        'stellar-catalogs-v1',
        'app-assets',
        'app-assets-control',
        'app-assets-v-abc123',
        'app-assets-v-def456',
        'app-assets-candidate-xyz789',
        'other-cache-1',
        'other-cache-2'
      ];
      (globalThis.caches.keys as vi.Mock).mockResolvedValue(cacheNames);

      component.resetApp();

      // Get the accept callback from the confirmation call
      const confirmCall = confirmationServiceMock.confirm.mock.calls[0][0];
      const acceptCallback = confirmCall.accept as () => Promise<void>;

      // Execute the accept callback
      await acceptCallback();

      // Verify caches.keys() was called.
      expect(globalThis.caches.keys).toHaveBeenCalled();

      // Verify that only app-related caches are deleted.
      expect(globalThis.caches.delete).toHaveBeenCalledWith('workbox-precache-v2-https://stellar.test/');
      expect(globalThis.caches.delete).toHaveBeenCalledWith('stellar-catalogs-v1');
      expect(globalThis.caches.delete).toHaveBeenCalledWith('app-assets');
      expect(globalThis.caches.delete).toHaveBeenCalledWith('app-assets-control');
      expect(globalThis.caches.delete).toHaveBeenCalledWith('app-assets-v-abc123');
      expect(globalThis.caches.delete).toHaveBeenCalledWith('app-assets-v-def456');
      expect(globalThis.caches.delete).toHaveBeenCalledWith('app-assets-candidate-xyz789');

      // Verify that other caches are not deleted.
      expect(globalThis.caches.delete).not.toHaveBeenCalledWith('other-cache-1');
      expect(globalThis.caches.delete).not.toHaveBeenCalledWith('other-cache-2');

      // Verify success message and redirect.
      expect(messageServiceMock.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String)
      });

      expect(vi.getTimerCount()).toBe(1);

      // Advance the timer and verify the redirect fires
      vi.advanceTimersByTime(2000);
      expect(locationAssignMock).toHaveBeenCalledWith('/');
    });

    it('should not delete any cache when confirmation is cancelled', () => {
      component.resetApp();

      // Don't call the accept callback

      expect(globalThis.caches.keys).not.toHaveBeenCalled();
      expect(globalThis.caches.delete).not.toHaveBeenCalled();
      expect(messageServiceMock.add).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('application version card', () => {
    it('never renders an apply/force update button', async () => {
      appUpdateMock.state.set('update-waiting');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(getByTestId('force-update-btn')).toBeNull();
      expect(getByTestId('admin-pending-version')?.textContent).toContain(
        'shared.app-update-service.update-waiting-summary'
      );
    });

    it('shows the running version, the offline status and no pending version', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('abc1234');
      expect(getByTestId('admin-offline-status')?.textContent).toContain('common.ready');
      expect(getByTestId('admin-pending-version')?.textContent).toContain('admin.no-pending-version');
      expect(getByTestId('admin-last-refusal')).toBeNull();
    });

    it('shows the measured downlink against the threshold, and the storage usage and quota', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.diagnostics()).toEqual({
        downlinkMbps: 8,
        thresholdMbps: 5,
        usageBytes: 10 * MB,
        quotaBytes: 100 * MB
      });
      expect(component.downlinkText()).toBe('admin.downlink-value');
      expect(component.storageText()).toBe('admin.storage-value');
    });

    it('reports unavailable measurements', async () => {
      appUpdateMock.readDiagnostics.mockResolvedValue({
        downlinkMbps: null,
        thresholdMbps: 5,
        usageBytes: null,
        quotaBytes: null
      });
      const newFixture = TestBed.createComponent(AdminComponent);
      newFixture.detectChanges();
      await newFixture.whenStable();

      expect(newFixture.componentInstance.downlinkText()).toBe('admin.not-available');
      expect(newFixture.componentInstance.storageText()).toBe('admin.not-available');
    });

    it('shows why the last update was postponed', async () => {
      appUpdateMock.lastRefusal.set({
        type: 'SW_INSTALL_REFUSED',
        reason: 'downlink-below-threshold',
        downlinkMbps: 1,
        requiredBytes: null,
        freeBytes: null
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(getByTestId('admin-last-refusal')?.textContent).toContain('common.network-too-slow-label');
    });

    it('the check button asks the service for an update check and reports the outcome', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      getByTestId('check-app-version-btn')!.click();
      await fixture.whenStable();

      expect(appUpdateMock.checkForUpdate).toHaveBeenCalledTimes(1);
      expect(notificationMock.info).toHaveBeenCalledWith('shared.app-update-service.check-started');
      expect(appUpdateMock.readDiagnostics).toHaveBeenCalledTimes(2);
      expect(component.checking()).toBe(false);
    });

    it.each([
      ['deferred-network', 'shared.app-update-service.update-deferred-network'],
      ['storage-insufficient', 'shared.app-update-service.storage-insufficient-detail']
    ])('reports a check deferred by the %s rule', async (reason, key) => {
      appUpdateMock.checkForUpdate.mockResolvedValue({ allowed: false, reason });

      await component.checkForUpdates();

      expect(notificationMock.info).toHaveBeenCalledWith(key);
    });
  });

  describe('formatBuildDate', () => {
    it('should return null when the value is missing', () => {
      expect(component.formatBuildDate(undefined)).toBeNull();
    });

    it('should format a valid ISO date string', () => {
      expect(component.formatBuildDate('2024-01-01T10:30:00Z')).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    });

    it('should return the raw value when it cannot be parsed as a date (e.g. an unsubstituted {BUILD_TIME} placeholder)', () => {
      expect(component.formatBuildDate('{BUILD_TIME}')).toBe('{BUILD_TIME}');
    });
  });
});
