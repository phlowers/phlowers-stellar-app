import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { UpdateService } from '@src/app/core/services/worker_update/worker_update.service';
import {
  OnlineService,
  ServerStatus
} from '@src/app/core/services/online/online.service';
import { BehaviorSubject } from 'rxjs';
import { CardInfoComponent } from '@ui/shared/components/atoms/card-info/card-info.component';
import { CardStudyComponent } from '@ui/shared/components/atoms/card-study/card-study.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ActivatedRoute } from '@angular/router';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockUpdateService: jest.Mocked<UpdateService>;
  let mockOnlineService: jest.Mocked<OnlineService>;
  let onlineSubject: BehaviorSubject<boolean>;
  let serverOnlineSubject: BehaviorSubject<ServerStatus>;

  beforeEach(async () => {
    onlineSubject = new BehaviorSubject<boolean>(true);
    serverOnlineSubject = new BehaviorSubject<ServerStatus>(
      ServerStatus.LOADING
    );

    mockUpdateService = {
      needUpdate: false
    } as jest.Mocked<UpdateService>;

    mockOnlineService = {
      online$: onlineSubject.asObservable(),
      serverOnline$: serverOnlineSubject.asObservable()
    } as jest.Mocked<OnlineService>;

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        CardInfoComponent,
        CardStudyComponent,
        ButtonComponent,
        IconComponent
      ],
      providers: [
        { provide: UpdateService, useValue: mockUpdateService },
        { provide: OnlineService, useValue: mockOnlineService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'test'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('constructor', () => {
    it('should set updateStatus to warning when update is needed', () => {
      const mockUpdateServiceWithUpdate = {
        needUpdate: true
      } as jest.Mocked<UpdateService>;

      const newComponent = new HomeComponent(
        mockUpdateServiceWithUpdate,
        mockOnlineService
      );

      expect(newComponent.updateStatus()).toBe('warning');
    });

    it('should keep updateStatus as unknown when no update is needed', () => {
      const mockUpdateServiceNoUpdate = {
        needUpdate: false
      } as jest.Mocked<UpdateService>;

      const newComponent = new HomeComponent(
        mockUpdateServiceNoUpdate,
        mockOnlineService
      );

      expect(newComponent.updateStatus()).toBe('unknown');
    });
  });

  describe('connectivity status', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set serverStatus to unknown when offline', () => {
      onlineSubject.next(false);
      serverOnlineSubject.next(ServerStatus.ONLINE);

      expect(component.serverStatus()).toBe('unknown');
    });

    it('should set serverStatus to warning when server is loading', () => {
      onlineSubject.next(true);
      serverOnlineSubject.next(ServerStatus.LOADING);

      expect(component.serverStatus()).toBe('warning');
    });

    it('should set serverStatus to error when server is offline', () => {
      onlineSubject.next(true);
      serverOnlineSubject.next(ServerStatus.OFFLINE);

      expect(component.serverStatus()).toBe('error');
    });

    it('should set serverStatus to success when server is online', () => {
      onlineSubject.next(true);
      serverOnlineSubject.next(ServerStatus.ONLINE);

      expect(component.serverStatus()).toBe('success');
    });
  });

  it('should update server text based on status', () => {
    fixture.detectChanges();

    // Test unknown status
    onlineSubject.next(false);
    expect(component.homeText().serverText).toContain('Cannot reach data');

    // Test warning status
    onlineSubject.next(true);
    serverOnlineSubject.next(ServerStatus.LOADING);
    expect(component.homeText().serverText).toContain('Trying to reach');

    // Test error status
    serverOnlineSubject.next(ServerStatus.OFFLINE);
    expect(component.homeText().serverText).toContain('error occured');

    // Test success status
    serverOnlineSubject.next(ServerStatus.ONLINE);
    expect(component.homeText().serverText).toContain('connexion success');
  });

  describe('mock data', () => {
    it('should have lastStudiesMock with 4 studies', () => {
      expect(component.lastStudiesMock().length).toBe(4);
    });

    it('should have studies with required properties', () => {
      const studies = component.lastStudiesMock();

      studies.forEach((study) => {
        expect(study.uuid).toBeDefined();
        expect(study.title).toBeDefined();
        expect(study.authorMail).toBeDefined();
        expect(study.modificationDate).toBeDefined();
      });
    });

    it('should have some studies with tagList and some without', () => {
      const studies = component.lastStudiesMock();
      const studiesWithTags = studies.filter(
        (study) => study.tagList && study.tagList.length > 0
      );
      const studiesWithoutTags = studies.filter((study) => !study.tagList);

      expect(studiesWithTags.length).toBeGreaterThan(0);
      expect(studiesWithoutTags.length).toBeGreaterThan(0);
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from subscriptions', () => {
      const unsubscribeSpy = jest.spyOn(
        component['subscriptions'],
        'unsubscribe'
      );

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
