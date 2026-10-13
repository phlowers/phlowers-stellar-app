import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopbarComponent } from './topbar.component';
import { PageTitleService } from '@shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { AppUpdateService } from '@services/app-update/app-update.service';
import { AppUpdateState } from '@services/app-update/app-update.interfaces';
import { SwInstallRefusedMessage } from '@services/app-update/sw-messages.interfaces';
import { signal } from '@angular/core';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let mockPageTitleService: vi.Mocked<PageTitleService>;
  let mockAuthService: Partial<AuthService>;
  let mockWorkerPythonService: vi.Mocked<WorkerPythonService>;
  let pageTitleSubject: BehaviorSubject<string>;
  let currentUserSignal: ReturnType<typeof signal<{ email: string } | null>>;
  let readySubject: BehaviorSubject<boolean>;
  let errorSubject: BehaviorSubject<boolean>;
  let updateState: ReturnType<typeof signal<AppUpdateState>>;
  let lastRefusal: ReturnType<typeof signal<SwInstallRefusedMessage | null>>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    pageTitleSubject = new BehaviorSubject<string>('');
    currentUserSignal = signal<{ email: string } | null>(null);
    readySubject = new BehaviorSubject<boolean>(true);
    errorSubject = new BehaviorSubject<boolean>(false);
    updateState = signal<AppUpdateState>('not-installed');
    lastRefusal = signal<SwInstallRefusedMessage | null>(null);

    mockPageTitleService = {
      pageTitle$: pageTitleSubject.asObservable()
    } as vi.Mocked<PageTitleService>;

    mockAuthService = {
      currentUser: currentUserSignal as AuthService['currentUser']
    };

    mockWorkerPythonService = {
      ready$: readySubject.asObservable(),
      pyodideLoadError$: errorSubject
    } as unknown as vi.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'shared.app-update-service.offline-status.ready': 'Ready offline',
              'shared.app-update-service.offline-status.preparing': 'Preparing offline mode',
              'shared.app-update-service.offline-status.waiting-network': 'Waiting for a fast enough network',
              'shared.app-update-service.offline-status.storage-insufficient': 'Not enough storage',
              'shared.app-update-service.offline-status.not-prepared': 'Offline mode unavailable',
              'shared.app-update-service.update-deferred-network': 'Update postponed: network too slow',
              'shared.app-update-service.storage-insufficient-detail': 'Free up space'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TopbarComponent,
        IconComponent
      ],
      providers: [
        { provide: PageTitleService, useValue: mockPageTitleService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: AppUpdateService, useValue: { state: updateState, lastRefusal } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should have default signal values', () => {
      expect(component.currentPageTitle()).toBe('');
      expect(component.workerReady()).toBe(true);
      expect(component.workerError()).toBe(false);
    });
  });

  describe('page title subscription', () => {
    it('should update currentPageTitle when pageTitle$ emits', () => {
      fixture.detectChanges();

      const testTitle = 'Test Page Title';
      pageTitleSubject.next(testTitle);

      expect(component.currentPageTitle()).toBe(testTitle);
    });

    it('should handle multiple page title updates', () => {
      fixture.detectChanges();

      pageTitleSubject.next('First Title');
      expect(component.currentPageTitle()).toBe('First Title');

      pageTitleSubject.next('Second Title');
      expect(component.currentPageTitle()).toBe('Second Title');
    });

    it('should handle empty page title', () => {
      fixture.detectChanges();

      pageTitleSubject.next('');
      expect(component.currentPageTitle()).toBe('');
    });
  });

  describe('worker status signals', () => {
    it('should reflect workerReady from service', () => {
      expect(component.workerReady()).toBe(true);

      readySubject.next(false);
      expect(component.workerReady()).toBe(false);
    });

    it('should reflect workerError from service', () => {
      expect(component.workerError()).toBe(false);

      errorSubject.next(true);
      expect(component.workerError()).toBe(true);
    });
  });

  describe('UC: should render topbar with user info', () => {
    it('UC-TOPBAR1: should render topbar with user info', () => {
      fixture.detectChanges();

      currentUserSignal.set({ email: 'user@example.com' });
      fixture.detectChanges();

      const userInfo = getByTestId('user-info');
      expect(userInfo).toBeTruthy();
      expect(userInfo?.textContent).toContain('user@example.com');
    });

    it('should display "No user" when user is null', () => {
      currentUserSignal.set(null);
      fixture.detectChanges();

      const userInfo = getByTestId('user-info');
      expect(userInfo).toBeTruthy();
      expect(userInfo?.textContent).toContain('No user');
    });
  });

  describe('offline status indicator', () => {
    it.each<[AppUpdateState, string, string, string]>([
      ['ready-offline', 'ready', 'Ready offline', 'cloud_done'],
      ['update-waiting', 'ready', 'Ready offline', 'cloud_done'],
      ['installing', 'preparing', 'Preparing offline mode', 'cloud_sync'],
      ['deferred-network', 'waiting-network', 'Waiting for a fast enough network', 'network_check'],
      ['storage-insufficient', 'storage-insufficient', 'Not enough storage', 'sd_card_alert'],
      ['not-installed', 'not-prepared', 'Offline mode unavailable', 'cloud_off'],
      ['unsupported', 'not-prepared', 'Offline mode unavailable', 'cloud_off']
    ])('state %s renders the %s status', (state, kind, label, icon) => {
      updateState.set(state);
      fixture.detectChanges();

      const indicator = getByTestId('offline-status-indicator')!;
      expect(indicator.dataset['status']).toBe(kind);
      expect(indicator.textContent).toContain(label);
      expect(component.offlineIcon()).toBe(icon);
      expect(indicator.tagName).toBe('OUTPUT');
      expect(indicator.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses the warning tone while not ready, the success tone once ready', () => {
      updateState.set('installing');
      fixture.detectChanges();
      expect(getByTestId('offline-status-indicator')!.classList).toContain('offline-status--warning');

      updateState.set('ready-offline');
      fixture.detectChanges();
      const indicator = getByTestId('offline-status-indicator')!;
      expect(indicator.classList).toContain('offline-status--ready');
      expect(indicator.classList).not.toContain('offline-status--warning');
    });

    it('explains a postponed update in a tooltip while staying ready', () => {
      updateState.set('ready-offline');
      fixture.detectChanges();
      expect(getByTestId('offline-status-indicator')!.getAttribute('title')).toBeNull();

      lastRefusal.set({
        type: 'SW_INSTALL_REFUSED',
        reason: 'downlink-below-threshold',
        downlinkMbps: 1,
        requiredBytes: null,
        freeBytes: null
      });
      fixture.detectChanges();
      expect(getByTestId('offline-status-indicator')!.getAttribute('title')).toBe('Update postponed: network too slow');

      lastRefusal.set({ ...lastRefusal()!, reason: 'storage-insufficient' });
      fixture.detectChanges();
      expect(getByTestId('offline-status-indicator')!.getAttribute('title')).toBe('Free up space');
    });
  });
});
