import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
  //   let service: PageTitleService;
  let mockRouter: Partial<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockTitleService: Partial<Title>;
  let routerEventsSubject: BehaviorSubject<any>;

  const createService = (): PageTitleService => {
    routerEventsSubject = new BehaviorSubject<any>(null);

    mockRouter = {
      events: routerEventsSubject.asObservable()
    };

    mockActivatedRoute = {
      firstChild: null,
      outlet: 'primary',
      title: of('Test Title')
    };

    mockTitleService = {
      setTitle: jest.fn(),
      getTitle: jest.fn().mockReturnValue('')
    };

    TestBed.configureTestingModule({
      providers: [
        PageTitleService,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Title, useValue: mockTitleService }
      ]
    });

    const service = TestBed.inject(PageTitleService);
    return service;
  };

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with title', () => {
      const service = createService();
      expect(service.getCurrentTitle()).toBe('Test Title');
    });

    it('should expose pageTitle$ observable', () => {
      const service = createService();
      expect(service.pageTitle$).toBeDefined();
      expect(typeof service.pageTitle$.subscribe).toBe('function');
    });
  });

  describe('router navigation events', () => {
    it('should update title when NavigationEnd event occurs', (done) => {
      const testTitle = 'New Page Title';
      const testRoute = {
        ...mockActivatedRoute,
        title: of(testTitle)
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      const testService = TestBed.inject(PageTitleService);

      testService.pageTitle$.subscribe((title) => {
        expect(title).toBe(testTitle);
        done();
      });

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    });

    it('should not update title for non-NavigationEnd events', () => {
      const testTitle = 'Should Not Update';
      const testRoute = {
        ...mockActivatedRoute,
        title: of(testTitle)
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      const testService = TestBed.inject(PageTitleService);

      testService.pageTitle$.subscribe(() => {
        // Should not be called for non-NavigationEnd events
        expect(mockTitleService.setTitle).not.toHaveBeenCalled();
      });

      routerEventsSubject.next({ type: 'someOtherEvent' });
    });

    it('should not update title when route title is null', () => {
      const testRoute = {
        ...mockActivatedRoute,
        title: of(null as any)
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      const testService = TestBed.inject(PageTitleService);

      testService.pageTitle$.subscribe(() => {
        expect(mockTitleService.setTitle).not.toHaveBeenCalled();
      });

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    });

    it('should not update title when route title is undefined', () => {
      const testRoute = {
        ...mockActivatedRoute,
        title: of(undefined)
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      const testService = TestBed.inject(PageTitleService);

      testService.pageTitle$.subscribe(() => {
        expect(mockTitleService.setTitle).not.toHaveBeenCalled();
      });

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    });
  });

  describe('outlet filtering', () => {
    it('should only process primary outlet routes', () => {
      const nonPrimaryRoute: Partial<ActivatedRoute> = {
        firstChild: null,
        outlet: 'secondary',
        title: of('Secondary Outlet Title')
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: nonPrimaryRoute });
      const testService = TestBed.inject(PageTitleService);

      testService.pageTitle$.subscribe(() => {
        // Should not be called for non-primary outlets
        expect(mockTitleService.setTitle).not.toHaveBeenCalled();
      });

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    });
  });

  describe('getCurrentTitle', () => {
    it('should return current title value', (done) => {
      const testTitle = 'Current Title';
      const testRoute = {
        ...mockActivatedRoute,
        title: of(testTitle)
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      const testService = TestBed.inject(PageTitleService);

      testService.pageTitle$.subscribe(() => {
        expect(testService.getCurrentTitle()).toBe(testTitle);
        done();
      });

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    });

    it('should return empty string when no title is set', () => {
      const service = createService();
      expect(service.getCurrentTitle()).toBe('Test Title');
    });
  });

  describe('error handling', () => {
    it('should handle route title observable errors gracefully', () => {
      const errorObservable = new BehaviorSubject<string>('Initial Title');
      errorObservable.error(new Error('Route title error'));

      const testRoute = {
        ...mockActivatedRoute,
        title: errorObservable.asObservable()
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      TestBed.inject(PageTitleService);

      // Should not throw error
      expect(() => {
        routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
      }).not.toThrow();
    });
  });
});
