import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HomeComponent } from './home.component';
import { AppUpdateService } from '@services/app-update/app-update.service';
import { AppUpdateState } from '@services/app-update/app-update.interfaces';
import { SwInstallRefusedMessage } from '@services/app-update/sw-messages.interfaces';
import { OnlineService } from '@services/online/online.service';
import { StudiesService } from '@services/studies/studies.service';
import { Study } from '@shared/domain';
import { BehaviorSubject } from 'rxjs';
import { CardStudyComponent } from '@shared/components/atoms/card-study/card-study.component';
import { CardInfoComponent } from '@shared/components/atoms/card-info/card-info.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { provideRouter } from '@angular/router';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let appUpdateState: ReturnType<typeof signal<AppUpdateState>>;
  let lastRefusal: ReturnType<typeof signal<SwInstallRefusedMessage | null>>;
  let onlineServiceMock: vi.Mocked<OnlineService>;
  let studiesServiceMock: vi.Mocked<StudiesService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

  const mockStudies: Study[] = [
    {
      uuid: '1',
      title: 'Test Study 1',
      author_email: 'test1@example.com',
      created_at_offline: new Date('2024-01-01').toISOString(),
      updated_at_offline: new Date('2024-01-02').toISOString(),
      shareable: false,
      saved: true,
      sections: []
    },
    {
      uuid: '2',
      title: 'Test Study 2',
      author_email: 'test2@example.com',
      created_at_offline: new Date('2024-01-03').toISOString(),
      updated_at_offline: new Date('2024-01-04').toISOString(),
      shareable: true,
      saved: false,
      sections: []
    }
  ];

  beforeEach(async () => {
    appUpdateState = signal<AppUpdateState>('ready-offline');
    lastRefusal = signal<SwInstallRefusedMessage | null>(null);

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true)
    } as unknown as vi.Mocked<OnlineService>;

    studiesServiceMock = {
      ready: new BehaviorSubject<boolean>(false),
      getLatestStudies: vi.fn().mockResolvedValue(mockStudies)
    } as unknown as vi.Mocked<StudiesService>;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.create-a-new-study': 'Create a new study',
              'home.go-to-studies': 'Go to my studies',
              'common.my-last-studies-label': 'My last studies',
              'home.news-link-text': 'View all news',
              'home.news-text':
                'Welcome to Celeste! We are glad to present this new tool made with you. Please contact us to share your ideas and feedbacks to help us upgrade this application!',
              'common.news-label': 'News',
              'home.no-recent-studies': 'No recent studies',
              'home.offline-card.title': 'Application status',
              'home.offline-card.connection-online': 'Online.',
              'home.offline-card.connection-offline': 'No connection.',
              'home.offline-card.status-ready': 'Offline mode ready.',
              'home.offline-card.status-preparing': 'Preparing offline mode.',
              'home.offline-card.status-waiting-network': 'Network too slow: offline mode setup on hold.',
              'home.offline-card.status-storage-insufficient': 'Not enough storage: offline mode impossible.',
              'home.offline-card.status-not-prepared': 'Offline mode unavailable.',
              'home.offline-card.update-postponed-network': 'Update postponed: network too slow.',
              'home.offline-card.update-blocked-storage': 'Update blocked: not enough storage.',
              'home.update-available': 'Update available',
              'home.update-link-explicit-text': 'Learn more about latest updates',
              'home.update-link-text': 'Learn more',
              'home.update-new-available': 'A new application update is available!',
              'home.update-text': 'View latest updates.',
              'home.update-title': 'Changelogs',
              'shared.app-update-service.update-waiting-detail':
                'It will be applied the next time the application starts.'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        HomeComponent,
        CardStudyComponent,
        CardInfoComponent,
        ButtonComponent,
        IconComponent
      ],
      providers: [
        provideRouter([]),
        { provide: AppUpdateService, useValue: { state: appUpdateState, lastRefusal } },
        { provide: OnlineService, useValue: onlineServiceMock },
        { provide: StudiesService, useValue: studiesServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should initialize with default values', () => {
      expect(component.latestStudies()).toEqual([]);
      expect(component.updateStatus()).toBe('unknown');
    });

    it('should initialize homeText with correct default values', () => {
      const homeText = component.homeText();
      expect(homeText.newsTitle).toBe('News');
      expect(homeText.newsText).toContain('Welcome to Celeste');
      expect(homeText.updateTitle).toBe('Changelogs');
      expect(homeText.offlineTitle).toBe('Application status');
    });
  });

  describe('Constructor Behavior', () => {
    it('should set update status to warning when a downloaded version is waiting', () => {
      appUpdateState.set('update-waiting');

      const newFixture = TestBed.createComponent(HomeComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.updateStatus()).toBe('warning');
    });

    it('should not change update status when no update is waiting', () => {
      appUpdateState.set('ready-offline');

      expect(component.updateStatus()).toBe('unknown');
    });

    it('should show the next-start message in the news card while a version waits, then the usual text', () => {
      appUpdateState.set('update-waiting');
      fixture.detectChanges();
      expect(component.homeText().newsText).toBe('It will be applied the next time the application starts.');

      appUpdateState.set('ready-offline');
      fixture.detectChanges();
      expect(component.homeText().newsText).toContain('Welcome to Celeste');
    });
  });

  describe('Offline card', () => {
    const refusal = (reason: SwInstallRefusedMessage['reason']): SwInstallRefusedMessage => ({
      type: 'SW_INSTALL_REFUSED',
      reason,
      downlinkMbps: null,
      requiredBytes: null,
      freeBytes: null
    });

    it.each<[boolean, AppUpdateState, string, string]>([
      [true, 'ready-offline', 'success', 'Online. Offline mode ready.'],
      [true, 'update-waiting', 'success', 'Online. Offline mode ready.'],
      [false, 'ready-offline', 'offline', 'No connection. Offline mode ready.'],
      [true, 'installing', 'warning', 'Online. Preparing offline mode.'],
      [true, 'deferred-network', 'warning', 'Online. Network too slow: offline mode setup on hold.'],
      [true, 'storage-insufficient', 'error', 'Online. Not enough storage: offline mode impossible.'],
      [true, 'not-installed', 'unknown', 'Online. Offline mode unavailable.'],
      [false, 'unsupported', 'error', 'No connection. Offline mode unavailable.']
    ])('online=%s state=%s gives status %s and text "%s"', (online, state, status, text) => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(online);
      appUpdateState.set(state);
      fixture.detectChanges();

      expect(component.offlineStatus()).toBe(status);
      expect(component.homeText().offlineText).toBe(text);
    });

    it('should warn about a postponed update while staying ready offline', () => {
      lastRefusal.set(refusal('downlink-below-threshold'));
      fixture.detectChanges();

      expect(component.offlineStatus()).toBe('warning');
      expect(component.homeText().offlineText).toBe('Online. Offline mode ready. Update postponed: network too slow.');
    });

    it('should explain a storage refusal while staying ready offline', () => {
      lastRefusal.set(refusal('storage-insufficient'));
      fixture.detectChanges();

      expect(component.offlineStatus()).toBe('warning');
      expect(component.homeText().offlineText).toBe('Online. Offline mode ready. Update blocked: not enough storage.');
    });

    it('should ignore the update refusal while the offline mode is not ready', () => {
      appUpdateState.set('installing');
      lastRefusal.set(refusal('save-data'));
      fixture.detectChanges();

      expect(component.homeText().offlineText).toBe('Online. Preparing offline mode.');
    });

    it('should follow connectivity changes', () => {
      fixture.detectChanges();
      expect(component.offlineStatus()).toBe('success');

      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);
      fixture.detectChanges();
      expect(component.offlineStatus()).toBe('offline');

      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();
      expect(component.offlineStatus()).toBe('success');
    });

    it('should render the card title and text', () => {
      fixture.detectChanges();

      const card = getByTestId('offline-card');
      expect(card?.textContent).toContain('Application status');
      expect(card?.textContent).toContain('Online. Offline mode ready.');
    });
  });

  describe('Studies Loading', () => {
    it('should load latest studies when studies service is ready', async () => {
      (studiesServiceMock.ready as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();

      // Wait for async operation
      await fixture.whenStable();

      expect(studiesServiceMock.getLatestStudies).toHaveBeenCalled();
      expect(component.latestStudies()).toEqual(
        mockStudies.map((study) => ({
          ...study,
          updated_at_offline: expect.any(String)
        }))
      );
    });

    it('should not load studies when studies service is not ready', () => {
      (studiesServiceMock.ready as BehaviorSubject<boolean>).next(false);
      fixture.detectChanges();

      expect(studiesServiceMock.getLatestStudies).not.toHaveBeenCalled();
      expect(component.latestStudies()).toEqual([]);
    });
  });

  describe('Template Integration', () => {
    it('should display latest studies in template', () => {
      component.latestStudies.set(mockStudies);
      fixture.detectChanges();

      const studyElements = fixture.nativeElement.querySelectorAll('app-card-study');
      expect(studyElements.length).toBe(mockStudies.length);
    });

    it('should display correct offline status in template', () => {
      component.offlineStatus.set('success');
      fixture.detectChanges();

      const cardInfoElement = fixture.nativeElement.querySelector('app-card-info');
      expect(cardInfoElement).toBeTruthy();
    });

    it('should display update warning when update is available', () => {
      component.updateStatus.set('warning');
      fixture.detectChanges();

      const updateElements = fixture.nativeElement.querySelectorAll('app-card-info');
      expect(updateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle studies service returning empty array', async () => {
      studiesServiceMock.getLatestStudies.mockResolvedValue([]);

      (studiesServiceMock.ready as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.latestStudies()).toEqual([]);
    });
  });

  describe('UC: should display latest studies cards and navigate to studies page', () => {
    it('UC-H1: should display latest studies cards', () => {
      component.latestStudies.set(mockStudies);
      fixture.detectChanges();

      const list = getByTestId('latest-studies-list');
      expect(list).toBeTruthy();

      const cards = getAllByTestId('study-card');
      expect(cards.length).toBe(2);
    });
  });

  describe('UC: should display create study button linking to studies page', () => {
    it('UC-H2: should display create study button', () => {
      fixture.detectChanges();

      const btn = getByTestId('create-study-btn');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('A');
      expect(btn?.getAttribute('href')).toContain('/studies');
    });
  });
});
