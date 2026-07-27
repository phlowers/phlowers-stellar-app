import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsComponent } from './news.component';
import { NewsService } from '@features/news/infrastructure/services/news.service';
import { OnlineService } from '@services/online/online.service';
import { BehaviorSubject, of } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient } from '@angular/common/http';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('News component', () => {
  let component: NewsComponent;
  let fixture: ComponentFixture<NewsComponent>;
  let newsServiceMock: vi.Mocked<NewsService>;
  let onlineServiceMock: vi.Mocked<OnlineService>;

  beforeEach(async () => {
    newsServiceMock = {
      getNews: vi.fn().mockReturnValue(of('# Test News'))
    } as unknown as vi.Mocked<NewsService>;

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true)
    } as unknown as vi.Mocked<OnlineService>;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),NewsComponent],
      providers: [
        provideHttpClient(),
        provideMarkdown(),
        { provide: NewsService, useValue: newsServiceMock },
        { provide: OnlineService, useValue: onlineServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load news when online', async () => {
    await fixture.whenStable();

    expect(newsServiceMock.getNews).toHaveBeenCalled();
    expect(component.news()).toBe('# Test News');
    expect(component.isLoading()).toBe(false);
  });

  it('should not load news when offline', () => {
    (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);

    fixture = TestBed.createComponent(NewsComponent);
    component = fixture.componentInstance;

    expect(newsServiceMock.getNews).toHaveBeenCalledTimes(1); // only from the first component
    expect(component.isOnline()).toBe(false);
    expect(component.isLoading()).toBe(false);
  });

  it('should set isOnline signal based on online status', () => {
    expect(component.isOnline()).toBe(true);
  });
});
