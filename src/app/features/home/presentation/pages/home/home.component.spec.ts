import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HomeComponent } from './home.component';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { OnlineService, ServerStatus } from '@services/online/online.service';
import { StudiesService } from '@services/studies/studies.service';
import { Study } from '@shared/domain';
import { BehaviorSubject } from 'rxjs';
import { CardStudyComponent } from '@shared/components/atoms/card-study/card-study.component';
import { CardInfoComponent } from '@shared/components/atoms/card-info/card-info.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { provideRouter } from '@angular/router';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let updateServiceMock: vi.Mocked<UpdateService>;
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
    updateServiceMock = {
      needUpdate: signal(false)
    } as vi.Mocked<UpdateService>;

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true),
      serverOnline$: new BehaviorSubject<ServerStatus>(ServerStatus.ONLINE)
    } as unknown as vi.Mocked<OnlineService>;

    studiesServiceMock = {
      ready: new BehaviorSubject<boolean>(false),
      getLatestStudies: vi.fn().mockResolvedValue(mockStudies)
    } as unknown as vi.Mocked<StudiesService>;

    await TestBed.configureTestingModule({
      imports: [HomeComponent, CardStudyComponent, CardInfoComponent, ButtonComponent, IconComponent],
      providers: [
        provideRouter([]),
        { provide: UpdateService, useValue: updateServiceMock },
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
      expect(homeText.serverTitle).toBe('Server state');
    });
  });

  describe('Constructor Behavior', () => {
    it('should set update status to warning when update is needed', () => {
      updateServiceMock.needUpdate.set(true);

      const newFixture = TestBed.createComponent(HomeComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.updateStatus()).toBe('warning');
    });

    it('should not change update status when no update is needed', () => {
      updateServiceMock.needUpdate.set(false);

      expect(component.updateStatus()).toBe('unknown');
    });
  });

  describe('Connectivity Status Logic', () => {
    it('should set server status to offline when offline', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);
      fixture.detectChanges();

      expect(component.serverStatus()).toBe('offline');
    });

    it('should set server status to success when online and server is online', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.ONLINE);
      fixture.detectChanges();

      expect(component.serverStatus()).toBe('success');
    });

    it('should set server status to warning when online and server is loading', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.LOADING);
      fixture.detectChanges();

      expect(component.serverStatus()).toBe('warning');
    });

    it('should set server status to offline when online and server is offline', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.OFFLINE);
      fixture.detectChanges();

      expect(component.serverStatus()).toBe('offline');
    });
  });

  describe('Server Text Updates', () => {
    it('should update server text for offline status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);
      fixture.detectChanges();

      expect(component.homeText().serverText).toContain('Application in offline mode');
    });

    it('should update server text for warning status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.LOADING);
      fixture.detectChanges();

      expect(component.homeText().serverText).toContain('Trying to reach the servers');
    });

    it('should update server text for offline status when server is offline', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.OFFLINE);
      fixture.detectChanges();

      expect(component.homeText().serverText).toContain('Application in offline mode');
    });

    it('should update server text for success status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.ONLINE);
      fixture.detectChanges();

      expect(component.homeText().serverText).toContain('Server connexion success');
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

    it('should display correct server status in template', () => {
      component.serverStatus.set('success');
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
    it('should handle multiple rapid status changes', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.ONLINE);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.OFFLINE);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(ServerStatus.LOADING);
      fixture.detectChanges();

      expect(component.serverStatus()).toBe('warning');
    });

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
