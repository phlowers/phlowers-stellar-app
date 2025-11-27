import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { UpdateService } from '@src/app/core/services/worker_update/worker_update.service';
import {
  OnlineService,
  ServerStatus
} from '@src/app/core/services/online/online.service';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { StudyModel } from '@src/app/core/data/models/study.model';
import { BehaviorSubject } from 'rxjs';
import { CardStudyComponent } from '@ui/shared/components/atoms/card-study/card-study.component';
import { CardInfoComponent } from '@src/app/ui/shared/components/atoms/card-info/card-info.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let updateServiceMock: jest.Mocked<UpdateService>;
  let onlineServiceMock: jest.Mocked<OnlineService>;
  let studiesServiceMock: jest.Mocked<StudiesService>;

  const mockStudies: StudyModel[] = [
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
      needUpdate$: new BehaviorSubject<boolean>(false)
    } as jest.Mocked<UpdateService>;

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true),
      serverOnline$: new BehaviorSubject<ServerStatus>(ServerStatus.ONLINE)
    } as unknown as jest.Mocked<OnlineService>;

    studiesServiceMock = {
      ready: new BehaviorSubject<boolean>(false),
      getLatestStudies: jest.fn().mockResolvedValue(mockStudies)
    } as unknown as jest.Mocked<StudiesService>;

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        CardStudyComponent,
        CardInfoComponent,
        ButtonComponent,
        IconComponent,
        RouterTestingModule
      ],
      providers: [
        { provide: UpdateService, useValue: updateServiceMock },
        { provide: OnlineService, useValue: onlineServiceMock },
        { provide: StudiesService, useValue: studiesServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
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
      expect(component.latestStudies()).toEqual([]);
      expect(component.updateStatus()).toBe('unknown');
      expect(component.serverStatus()).toBe('unknown');
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
      updateServiceMock.needUpdate$.next(true);

      const newFixture = TestBed.createComponent(HomeComponent);
      const newComponent = newFixture.componentInstance;

      expect(newComponent.updateStatus()).toBe('warning');
    });

    it('should not change update status when no update is needed', () => {
      updateServiceMock.needUpdate$.next(false);

      expect(component.updateStatus()).toBe('unknown');
    });
  });

  describe('ngOnInit', () => {
    it('should subscribe to online and server status changes', () => {
      const onlineSpy = jest.spyOn(onlineServiceMock.online$, 'subscribe');
      const serverSpy = jest.spyOn(
        onlineServiceMock.serverOnline$,
        'subscribe'
      );

      component.ngOnInit();

      expect(onlineSpy).toHaveBeenCalled();
      expect(serverSpy).toHaveBeenCalled();
    });

    it('should subscribe to studies service ready state', () => {
      const readySpy = jest.spyOn(studiesServiceMock.ready, 'subscribe');

      component.ngOnInit();

      expect(readySpy).toHaveBeenCalled();
    });
  });

  describe('Connectivity Status Logic', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set server status to unknown when offline', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);

      expect(component.serverStatus()).toBe('unknown');
    });

    it('should set server status to success when online and server is online', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.ONLINE
      );

      expect(component.serverStatus()).toBe('success');
    });

    it('should set server status to warning when online and server is loading', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.LOADING
      );

      expect(component.serverStatus()).toBe('warning');
    });

    it('should set server status to error when online and server is offline', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.OFFLINE
      );

      expect(component.serverStatus()).toBe('error');
    });
  });

  describe('Server Text Updates', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update server text for unknown status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);

      expect(component.homeText().serverText).toContain('Cannot reach data');
    });

    it('should update server text for warning status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.LOADING
      );

      expect(component.homeText().serverText).toContain(
        'Trying to reach the servers'
      );
    });

    it('should update server text for error status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.OFFLINE
      );

      expect(component.homeText().serverText).toContain('An error occured');
    });

    it('should update server text for success status', () => {
      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.ONLINE
      );

      expect(component.homeText().serverText).toContain(
        'Server connexion success'
      );
    });
  });

  describe('Studies Loading', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should load latest studies when studies service is ready', async () => {
      (studiesServiceMock.ready as BehaviorSubject<boolean>).next(true);

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

      expect(studiesServiceMock.getLatestStudies).not.toHaveBeenCalled();
      expect(component.latestStudies()).toEqual([]);
    });
  });

  describe('Text Update Methods', () => {
    it('should update specific text fields correctly', () => {
      const originalText = component.homeText().newsTitle;

      // Access private method through component instance
      (component as any).updateText('newsTitle', 'Updated Title');

      expect(component.homeText().newsTitle).toBe('Updated Title');
      expect(component.homeText().newsTitle).not.toBe(originalText);
    });

    it('should preserve other text fields when updating one', () => {
      const originalNewsText = component.homeText().newsText;
      const originalUpdateTitle = component.homeText().updateTitle;

      (component as any).updateText('serverTitle', 'New Server Title');

      expect(component.homeText().newsText).toBe(originalNewsText);
      expect(component.homeText().updateTitle).toBe(originalUpdateTitle);
      expect(component.homeText().serverTitle).toBe('New Server Title');
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      const unsubscribeSpy = jest.spyOn(
        component['subscriptions'],
        'unsubscribe'
      );

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    it('should display latest studies in template', () => {
      component.latestStudies.set(mockStudies);
      fixture.detectChanges();

      const studyElements =
        fixture.nativeElement.querySelectorAll('app-card-study');
      expect(studyElements.length).toBe(mockStudies.length);
    });

    it('should display correct server status in template', () => {
      component.serverStatus.set('success');
      fixture.detectChanges();

      const cardInfoElement =
        fixture.nativeElement.querySelector('app-card-info');
      expect(cardInfoElement).toBeTruthy();
    });

    it('should display update warning when update is available', () => {
      component.updateStatus.set('warning');
      fixture.detectChanges();

      const updateElements =
        fixture.nativeElement.querySelectorAll('app-card-info');
      expect(updateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid status changes', () => {
      component.ngOnInit();

      (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(true);
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.ONLINE
      );
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.OFFLINE
      );
      (onlineServiceMock.serverOnline$ as BehaviorSubject<ServerStatus>).next(
        ServerStatus.LOADING
      );

      expect(component.serverStatus()).toBe('warning');
    });

    it('should handle studies service returning empty array', async () => {
      studiesServiceMock.getLatestStudies.mockResolvedValue([]);
      component.ngOnInit();

      (studiesServiceMock.ready as BehaviorSubject<boolean>).next(true);
      await fixture.whenStable();

      expect(component.latestStudies()).toEqual([]);
    });
  });
});
