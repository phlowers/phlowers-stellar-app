import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { filter, firstValueFrom, take } from 'rxjs';
import { environment } from '@src/environments/environment';
import { OnlineService, ServerStatus } from '@services/online/online.service';
import { CONNECTIVITY_CHECK_INTERVAL_MS } from '@services/online/online.constantes';
import { VERSION_FILE_TIMEOUT_MS, VERSION_FILE_URL } from '@services/app-update/app-update.constantes';
import { LoggerService } from '@services/logger/logger.service';

describe('OnlineService', () => {
  let service: OnlineService;
  let httpTestingController: HttpTestingController;
  let onlineState = true;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.useFakeTimers();
    onlineState = false;
    vi.spyOn(globalThis.navigator, 'onLine', 'get').mockImplementation(() => onlineState);
    fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnlineService,
        { provide: LoggerService, useValue: { info: vi.fn() } }
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpTestingController.verify();
    } finally {
      TestBed.resetTestingModule();
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it('should be created', () => {
    service = TestBed.inject(OnlineService);
    expect(service).toBeTruthy();
  });

  it('should set server status to ONLINE when health check succeeds', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    await vi.advanceTimersByTimeAsync(0);

    const req = httpTestingController.expectOne(environment.apiUrl);
    expect(req.request.method).toBe('GET');

    req.flush({}, { status: 200, statusText: 'OK' });

    expect(service.serverOnline$.value).toBe(ServerStatus.ONLINE);
  });

  it('should set server status to OFFLINE when health check fails', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    await vi.advanceTimersByTimeAsync(0);

    const req = httpTestingController.expectOne(environment.apiUrl);
    req.flush({ message: 'Server unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
  });

  it('should not trigger health check when browser starts offline', () => {
    onlineState = false;
    service = TestBed.inject(OnlineService);

    httpTestingController.expectNone(environment.apiUrl);
    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should trigger health check after online event', async () => {
    onlineState = false;
    service = TestBed.inject(OnlineService);
    httpTestingController.expectNone(environment.apiUrl);

    onlineState = true;
    globalThis.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);

    const req = httpTestingController.expectOne(environment.apiUrl);
    req.flush({}, { status: 200, statusText: 'OK' });

    expect(service.serverOnline$.value).toBe(ServerStatus.ONLINE);
  });

  it('online$ should emit verified connectivity changes', async () => {
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
    await vi.advanceTimersByTimeAsync(0);

    await expect(onlineEmission).resolves.toBe(true);

    const req = httpTestingController.expectOne(environment.apiUrl);
    req.flush({}, { status: 200, statusText: 'OK' });
  });

  it('should stay offline until a network response is received', async () => {
    onlineState = true;
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));

    await vi.advanceTimersByTimeAsync(0);

    expect(states).toEqual([false]);
    expect(fetchMock).toHaveBeenCalledWith(
      VERSION_FILE_URL,
      expect.objectContaining({ method: 'HEAD', cache: 'no-store', redirect: 'manual' })
    );
    httpTestingController.expectNone(environment.apiUrl);
  });

  it('should detect network loss and recovery even when navigator stays online', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));
    await vi.advanceTimersByTimeAsync(0);
    httpTestingController.expectOne(environment.apiUrl).flush({});

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(CONNECTIVITY_CHECK_INTERVAL_MS);

    expect(navigator.onLine).toBe(true);
    expect(states).toEqual([false, true, false]);
    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
    expect(TestBed.inject(LoggerService).info).toHaveBeenCalledWith('[Online] Network reachability check failed');

    await vi.advanceTimersByTimeAsync(CONNECTIVITY_CHECK_INTERVAL_MS);
    httpTestingController.expectOne(environment.apiUrl).flush({});
    expect(states).toEqual([false, true, false, true]);
  });

  it('should immediately honor offline events and stop network checks', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));
    await vi.advanceTimersByTimeAsync(0);
    httpTestingController.expectOne(environment.apiUrl).flush({});

    globalThis.dispatchEvent(new Event('offline'));
    await vi.advanceTimersByTimeAsync(CONNECTIVITY_CHECK_INTERVAL_MS);

    expect(states).toEqual([false, true, false]);
    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should cancel an in-flight network check on an offline event', async () => {
    onlineState = true;
    let completeCheck: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        completeCheck = resolve;
      })
    );
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));
    await vi.advanceTimersByTimeAsync(0);
    const requestSignal = fetchMock.mock.calls[0][1]?.signal;

    globalThis.dispatchEvent(new Event('offline'));
    expect(requestSignal?.aborted).toBe(true);
    completeCheck?.(new Response());
    await vi.advanceTimersByTimeAsync(0);

    expect(states).toEqual([false]);
    httpTestingController.expectNone(environment.apiUrl);
  });

  it('should cancel a pending API health check when going offline', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    await vi.advanceTimersByTimeAsync(0);
    const req = httpTestingController.expectOne(environment.apiUrl);

    globalThis.dispatchEvent(new Event('offline'));

    expect(req.cancelled).toBe(true);
    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
  });

  it('should time out and abort an unresponsive network check', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));
    await vi.advanceTimersByTimeAsync(0);
    httpTestingController.expectOne(environment.apiUrl).flush({});
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    await vi.advanceTimersByTimeAsync(CONNECTIVITY_CHECK_INTERVAL_MS);

    await vi.advanceTimersByTimeAsync(VERSION_FILE_TIMEOUT_MS - 1);
    expect(states).toEqual([false, true]);
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(true);
    expect(states).toEqual([false, true, false]);
    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
    httpTestingController.expectNone(environment.apiUrl);
  });

  it('should recheck connectivity when the window regains focus', async () => {
    onlineState = true;
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    service = TestBed.inject(OnlineService);
    await vi.advanceTimersByTimeAsync(0);

    globalThis.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    httpTestingController.expectOne(environment.apiUrl).flush({});
    expect(service.serverOnline$.value).toBe(ServerStatus.ONLINE);
  });

  it('should share network checks and avoid duplicate connectivity emissions', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));
    service.online$.subscribe();
    await vi.advanceTimersByTimeAsync(0);
    httpTestingController.expectOne(environment.apiUrl).flush({});

    await vi.advanceTimersByTimeAsync(CONNECTIVITY_CHECK_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(states).toEqual([false, true]);
    httpTestingController.expectNone(environment.apiUrl);
  });

  it.each([401, 403, 404, 503])('should distinguish HTTP %s from a network failure', async (status) => {
    onlineState = true;
    fetchMock.mockResolvedValue(new Response(null, { status }));
    service = TestBed.inject(OnlineService);
    const states: boolean[] = [];
    service.online$.subscribe((online) => states.push(online));
    await vi.advanceTimersByTimeAsync(0);
    httpTestingController.expectOne(environment.apiUrl).flush({}, { status: 503, statusText: 'Unavailable' });

    expect(states).toEqual([false, true]);
    expect(service.serverOnline$.value).toBe(ServerStatus.OFFLINE);
  });

  it('should release network checks when the service is destroyed', async () => {
    onlineState = true;
    service = TestBed.inject(OnlineService);
    await vi.advanceTimersByTimeAsync(0);
    httpTestingController.expectOne(environment.apiUrl).flush({});

    TestBed.resetTestingModule();
    globalThis.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(CONNECTIVITY_CHECK_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
