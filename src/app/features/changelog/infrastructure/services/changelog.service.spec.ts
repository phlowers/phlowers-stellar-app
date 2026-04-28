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
    const expectedItems = [
      {
        url: 'https://api.github.com/repos/test/releases/1',
        assets_url: '',
        upload_url: '',
        html_url: '',
        id: 1,
        author: {
          login: 'test-user',
          id: 1,
          node_id: '',
          avatar_url: '',
          gravatar_id: '',
          url: '',
          html_url: '',
          followers_url: '',
          following_url: '',
          gists_url: '',
          starred_url: '',
          subscriptions_url: '',
          organizations_url: '',
          repos_url: '',
          events_url: '',
          received_events_url: '',
          type: 'User',
          site_admin: false,
          user_view_type: ''
        },
        node_id: '',
        tag_name: 'v1.2.3',
        target_commitish: 'main',
        name: 'New release',
        draft: false,
        immutable: false,
        prerelease: false,
        created_at: '2026-03-17T00:00:00Z',
        updated_at: '2026-03-17T00:00:00Z',
        published_at: '2026-03-17T00:00:00Z',
        assets: [],
        tarball_url: '',
        zipball_url: '',
        body: 'Fix regression in import flow',
        mentions_count: 0
      } as ChangelogItem
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
