import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { NewsService } from '@features/news/infrastructure/services/news.service';

describe('NewsService', () => {
  let service: NewsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NewsService]
    });

    service = TestBed.inject(NewsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request news markdown from origin data path', async () => {
    const expectedContent = '# Latest news';
    const requestPromise = firstValueFrom(service.getNews());

    const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/news.md`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');

    req.flush(expectedContent);

    await expect(requestPromise).resolves.toBe(expectedContent);
  });

  it('should propagate HTTP errors from backend', async () => {
    const requestPromise = firstValueFrom(service.getNews());

    const req = httpTestingController.expectOne(`${globalThis.location.origin}/data/news.md`);
    req.flush('Not Found', {
      status: 404,
      statusText: 'Not Found'
    });

    await expect(requestPromise).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});
