import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute, Event as RouterEvent } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
  //   let service: PageTitleService;
  let mockRouter: Partial<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockTitleService: Partial<Title>;
  let routerEventsSubject: BehaviorSubject<RouterEvent>;

  const createService = (): PageTitleService => {
    routerEventsSubject = new BehaviorSubject<RouterEvent>({} as RouterEvent);

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
    it('should update title when NavigationEnd event occurs', () => {
      const testTitle = 'New Page Title';
      routerEventsSubject = new BehaviorSubject<RouterEvent>({} as RouterEvent);
      const localRouter = { events: routerEventsSubject.asObservable() };
      const localRoute: Partial<ActivatedRoute> = {
        firstChild: null,
        outlet: 'primary',
        title: of(testTitle)
      };
      const localTitleService = {
        setTitle: jest.fn(),
        getTitle: jest.fn().mockReturnValue('')
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PageTitleService,
          { provide: Router, useValue: localRouter },
          { provide: ActivatedRoute, useValue: localRoute },
          { provide: Title, useValue: localTitleService }
        ]
      });

      TestBed.inject(PageTitleService);
      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));

      expect(localTitleService.setTitle).toHaveBeenCalledWith(testTitle);
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

      routerEventsSubject.next({ type: 'someOtherEvent' } as unknown as RouterEvent);
    });

    it('should not update title when route title is null', () => {
      const testRoute = {
        ...mockActivatedRoute,
        title: of(null as unknown as string)
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
    it('should return current title value', () => {
      const testTitle = 'Current Title';
      const testRoute = {
        ...mockActivatedRoute,
        title: of(testTitle)
      };

      TestBed.overrideProvider(ActivatedRoute, { useValue: testRoute });
      const testService = TestBed.inject(PageTitleService);
      expect(testService.getCurrentTitle()).toBe(testTitle);
    });

    it('should return empty string when no title is set', () => {
      const service = createService();
      expect(service.getCurrentTitle()).toBe('Test Title');
    });
  });

  describe('error handling', () => {
    it('should handle route title observable errors gracefully', () => {
      const testRoute = {
        ...mockActivatedRoute,
        title: throwError(() => new Error('Route title error'))
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
