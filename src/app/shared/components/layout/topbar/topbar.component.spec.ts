import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopbarComponent } from './topbar.component';
import { PageTitleService } from '@shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
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

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    pageTitleSubject = new BehaviorSubject<string>('');
    currentUserSignal = signal<{ email: string } | null>(null);
    readySubject = new BehaviorSubject<boolean>(true);
    errorSubject = new BehaviorSubject<boolean>(false);

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
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TopbarComponent,
        IconComponent
      ],
      providers: [
        { provide: PageTitleService, useValue: mockPageTitleService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService }
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
});
