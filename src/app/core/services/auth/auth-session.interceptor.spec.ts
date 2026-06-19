import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResyncService } from '@services/auth/auth-resync.service';
import { AuthService } from '@services/auth/auth.service';
import { authSessionInterceptor } from '@services/auth/auth-session.interceptor';

describe('authSessionInterceptor', () => {
  let httpClient: HttpClient;
  let httpController: HttpTestingController;
  let authServiceMock: { markServerMismatchFromStatus: ReturnType<typeof vi.fn> };
  let authResyncServiceMock: { triggerImmediateRedirect: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      markServerMismatchFromStatus: vi.fn()
    };
    authResyncServiceMock = {
      triggerImmediateRedirect: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authSessionInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthResyncService, useValue: authResyncServiceMock }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should mark server mismatch for same-origin 401 response', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    const request = httpController.expectOne('/api/protected');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.markServerMismatchFromStatus).toHaveBeenCalledWith(401);
    expect(authResyncServiceMock.triggerImmediateRedirect).toHaveBeenCalledTimes(1);
  });

  it('should mark server mismatch for same-origin 403 response', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    const request = httpController.expectOne('/api/protected');
    request.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(authServiceMock.markServerMismatchFromStatus).toHaveBeenCalledWith(403);
    expect(authResyncServiceMock.triggerImmediateRedirect).toHaveBeenCalledTimes(1);
  });

  it('should ignore non-tracked status codes', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    const request = httpController.expectOne('/api/protected');
    request.flush({}, { status: 500, statusText: 'Server Error' });

    expect(authServiceMock.markServerMismatchFromStatus).not.toHaveBeenCalled();
    expect(authResyncServiceMock.triggerImmediateRedirect).not.toHaveBeenCalled();
  });

  it('should ignore same-origin 501 responses', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    const request = httpController.expectOne('/api/protected');
    request.flush({}, { status: 501, statusText: 'Not Implemented' });

    expect(authServiceMock.markServerMismatchFromStatus).not.toHaveBeenCalled();
    expect(authResyncServiceMock.triggerImmediateRedirect).not.toHaveBeenCalled();
  });

  it('should ignore cross-origin responses', () => {
    httpClient
      .get('https://api.github.com/repos/phlowers/mechaphlowers/releases')
      .subscribe({ error: () => undefined });

    const request = httpController.expectOne('https://api.github.com/repos/phlowers/mechaphlowers/releases');
    request.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(authServiceMock.markServerMismatchFromStatus).not.toHaveBeenCalled();
    expect(authResyncServiceMock.triggerImmediateRedirect).not.toHaveBeenCalled();
  });

  it('should ignore network errors with status 0', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    const request = httpController.expectOne('/api/protected');
    request.error(new ProgressEvent('error'));

    expect(authServiceMock.markServerMismatchFromStatus).not.toHaveBeenCalled();
    expect(authResyncServiceMock.triggerImmediateRedirect).not.toHaveBeenCalled();
  });
});
