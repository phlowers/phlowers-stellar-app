import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopbarComponent } from './topbar.component';
import { PageTitleService } from '@ui/shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BehaviorSubject } from 'rxjs';

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let mockPageTitleService: jest.Mocked<PageTitleService>;
  let pageTitleSubject: BehaviorSubject<string>;

  beforeEach(async () => {
    pageTitleSubject = new BehaviorSubject<string>('');

    mockPageTitleService = {
      pageTitle$: pageTitleSubject.asObservable()
    } as jest.Mocked<PageTitleService>;

    await TestBed.configureTestingModule({
      imports: [TopbarComponent, IconComponent],
      providers: [{ provide: PageTitleService, useValue: mockPageTitleService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
    it('should allow updating workerReady signal', () => {
      component.workerReady.set(false);
      expect(component.workerReady()).toBe(false);

      component.workerReady.set(true);
      expect(component.workerReady()).toBe(true);
    });

    it('should have readonly workerError signal', () => {
      expect(component.workerError()).toBe(false);
      // workerError is readonly, so we can't test setting it
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
