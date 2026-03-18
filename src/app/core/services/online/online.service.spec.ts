import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { filter, firstValueFrom, take } from 'rxjs';
import { environment } from '@src/environments/environment';
import { OnlineService, ServerStatus } from '@services/online/online.service';

describe('OnlineService', () => {
  let service: OnlineService;
  let httpTestingController: HttpTestingController;
  let onlineState = true;

  beforeEach(() => {
    onlineState = false;
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      get: () => onlineState
    });

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), OnlineService]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    service = TestBed.inject(OnlineService);
    expect(service).toBeTruthy();
  });

  it('should set server status to ONLINE when health check succeeds', () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);

    const req = httpTestingController.expectOne(environment.apiUrl);
    expect(req.request.method).toBe('GET');

    req.flush({}, { status: 200, statusText: 'OK' });

    expect(service.serverOnline$.value).toBe(ServerStatus.ONLINE);
  });

  it('should set server status to OFFLINE when health check fails', () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);

    const req = httpTestingController.expectOne(environment.apiUrl);
    req.flush({ message: 'Server unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
  });

  it('should not trigger health check when browser starts offline', () => {
    onlineState = false;
    service = TestBed.inject(OnlineService);

    httpTestingController.expectNone(environment.apiUrl);
    expect(service.serverOnline$.value).toBe(ServerStatus.LOADING);
  });

  it('should trigger health check after online event', () => {
    onlineState = false;
    service = TestBed.inject(OnlineService);
    httpTestingController.expectNone(environment.apiUrl);

    onlineState = true;
    globalThis.dispatchEvent(new Event('online'));

    const req = httpTestingController.expectOne(environment.apiUrl);
    req.flush({}, { status: 200, statusText: 'OK' });

    expect(service.serverOnline$.value).toBe(ServerStatus.ONLINE);
  });

  it('online$ should emit browser connectivity changes', async () => {
    onlineState = false;
    service = TestBed.inject(OnlineService);

    const onlineEmission = firstValueFrom(
      service.online$.pipe(
        filter((value) => value),
        take(1)
      )
    );

    onlineState = true;
    globalThis.dispatchEvent(new Event('online'));

    await expect(onlineEmission).resolves.toBe(true);

    const req = httpTestingController.expectOne(environment.apiUrl);
    req.flush({}, { status: 200, statusText: 'OK' });
  });
});
