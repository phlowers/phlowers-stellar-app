import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '@src/environments/environment';
import { ChangelogService } from '@features/changelog/infrastructure/services/changelog.service';
import { ChangelogItem } from '@features/changelog/infrastructure/services/types';

describe('ChangelogService', () => {
  let service: ChangelogService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ChangelogService]
    });

    service = TestBed.inject(ChangelogService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request changelog items from configured environment URL', async () => {
    const expectedItems: ChangelogItem[] = [
      {
        version: '1.2.3',
        date: '2026-03-17',
        title: 'New release',
        details: ['Fix regression in import flow']
      }
    ];

    const requestPromise = firstValueFrom(service.getChangelogs());

    const req = httpTestingController.expectOne(environment.changelogUrl);
    expect(req.request.method).toBe('GET');

    req.flush(expectedItems);

    await expect(requestPromise).resolves.toEqual(expectedItems);
  });

  it('should propagate HTTP errors from changelog endpoint', async () => {
    const requestPromise = firstValueFrom(service.getChangelogs());

    const req = httpTestingController.expectOne(environment.changelogUrl);
    req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Server Error' });

    await expect(requestPromise).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});
