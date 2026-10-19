import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@services/auth/auth.service';
import { LoggerService } from '@services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { User } from '@shared/domain';
import { APP_UPDATE_I18N, SERVICE_WORKER_URL, UPDATE_CHECK_INTERVAL_MS } from './app-update.constantes';
import { AppUpdateService } from './app-update.service';

vi.mock('@src/environments/environment', () => ({
  environment: { version: '1.9.2', gitHash: 'abc1234' }
}));

type WorkboxListener = (event: { isUpdate?: boolean; wasWaitingBeforeRegister?: boolean }) => void;

const workboxMock = vi.hoisted(() => {
  const state = {
    instances: [] as {
      url: string;
      listeners: Map<string, ((event: unknown) => void)[]>;
      register: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      emit: (type: string, event?: unknown) => void;
    }[],
    registration: null as unknown
  };
  const Workbox = vi.fn(function (this: (typeof state.instances)[number], url: string) {
    this.url = url;
    this.listeners = new Map();
    this.emit = (type, event = {}) => (this.listeners.get(type) ?? []).forEach((listener) => listener(event));
    this.register = vi.fn(async () => {
      const registration = state.registration as ServiceWorkerRegistration | undefined;
      if (registration?.waiting) {
        this.emit('waiting', { wasWaitingBeforeRegister: true });
      }
      return registration;
    });
    this.update = vi.fn(async () => undefined);
    (this as unknown as { addEventListener: unknown }).addEventListener = (type: string, listener: WorkboxListener) =>
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener as (event: unknown) => void]);
    state.instances.push(this);
  });
  return { state, Workbox };
});

vi.mock('workbox-window', () => ({ Workbox: workboxMock.Workbox }));

class FakeConnection extends EventTarget {
  constructor(public downlink: number | undefined) {
    super();
  }
}

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let currentUser: ReturnType<typeof signal<User | null>>;
  let logger: {
    log: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let notification: { info: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let container: EventTarget & {
    getRegistration: ReturnType<typeof vi.fn>;
    startMessages: ReturnType<typeof vi.fn>;
  };
  let connection: FakeConnection;
  let registration: EventTarget & { active: unknown; waiting: unknown; installing: unknown };
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const workbox = () => workboxMock.state.instances.at(-1)!;
  const flush = async (): Promise<void> => {
    for (let index = 0; index < 5; index++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  const postFromServiceWorker = (data: unknown): void => {
    container.dispatchEvent(new MessageEvent('message', { data }));
  };

  beforeEach(() => {
    workboxMock.state.instances.length = 0;
    workboxMock.Workbox.mockClear();
    registration = Object.assign(new EventTarget(), { active: null, waiting: null, installing: null });
    workboxMock.state.registration = registration;

    container = Object.assign(new EventTarget(), {
      getRegistration: vi.fn(async () => registration),
      startMessages: vi.fn()
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
    connection = new FakeConnection(8);
    Object.defineProperty(navigator, 'connection', { value: connection, configurable: true });
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: vi.fn(async () => ({ usage: 0, quota: 10 * 1024 * 1024 * 1024 })) },
      configurable: true
    });
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ git_hash: 'abc1234', version: '1.9.2', build_datetime_utc: '2026-10-12T08:00:00Z' })
        )
      );

    currentUser = signal<User | null>({ email: 'user@example.com' } as User);
    logger = { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    notification = { info: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: LoggerService, useValue: logger },
        { provide: NotificationService, useValue: notification },
        { provide: TranslocoService, useValue: { translate: (key: string) => `t:${key}` } }
      ]
    });
    service = TestBed.inject(AppUpdateService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    fetchSpy.mockRestore();
    vi.useRealTimers();
    delete (navigator as unknown as Record<string, unknown>)['serviceWorker'];
    delete (navigator as unknown as Record<string, unknown>)['connection'];
    delete (navigator as unknown as Record<string, unknown>)['storage'];
  });

  it('reports unsupported browsers without registering anything', async () => {
    delete (navigator as unknown as Record<string, unknown>)['serviceWorker'];

    await service.start();

    expect(service.state()).toBe('unsupported');
    expect(workboxMock.Workbox).not.toHaveBeenCalled();
  });

  it('registers /service-worker.js once, even when started twice', async () => {
    await service.start();
    await service.start();

    expect(workboxMock.Workbox).toHaveBeenCalledTimes(1);
    expect(workbox().url).toBe(SERVICE_WORKER_URL);
    expect(workbox().register).toHaveBeenCalledTimes(1);
    expect(container.startMessages).toHaveBeenCalled();
  });

  describe('states', () => {
    it('is ready offline when an active worker controls the app', async () => {
      registration.active = {};

      await service.start();

      expect(service.state()).toBe('ready-offline');
    });

    it('follows the Workbox lifecycle events', async () => {
      await service.start();
      expect(service.state()).toBe('not-installed');

      registration.dispatchEvent(new Event('updatefound'));
      expect(service.state()).toBe('installing');

      workbox().emit('installed', { isUpdate: false });
      expect(service.state()).toBe('ready-offline');

      workbox().emit('waiting', {});
      expect(service.state()).toBe('update-waiting');
    });

    it('marks the app ready offline when the first version activates', async () => {
      await service.start();

      workbox().emit('activated', { isUpdate: false });

      expect(service.state()).toBe('ready-offline');
    });

    it('returns to not-installed when the first installation becomes redundant', async () => {
      await service.start();
      registration.dispatchEvent(new Event('updatefound'));
      expect(service.state()).toBe('installing');

      workbox().emit('redundant', { isUpdate: false });

      expect(service.state()).toBe('not-installed');
    });

    it('stays ready offline when an update becomes redundant', async () => {
      registration.active = {};
      await service.start();

      workbox().emit('redundant', { isUpdate: true });
      expect(service.state()).toBe('ready-offline');

      service.state.set('installing');
      workbox().emit('redundant', { isUpdate: true });
      expect(service.state()).toBe('ready-offline');
    });

    it('keeps a refusal state when the refused installation becomes redundant', async () => {
      await service.start();
      postFromServiceWorker({
        type: 'SW_INSTALL_REFUSED',
        reason: 'downlink-below-threshold',
        downlinkMbps: 1,
        requiredBytes: null,
        freeBytes: null
      });
      expect(service.state()).toBe('deferred-network');

      workbox().emit('redundant', { isUpdate: false });

      expect(service.state()).toBe('deferred-network');
    });

    it('keeps update-waiting when an update is installed or activated elsewhere', async () => {
      registration.active = {};
      await service.start();
      workbox().emit('waiting', {});

      workbox().emit('installed', { isUpdate: true });
      workbox().emit('activated', { isUpdate: true });

      expect(service.state()).toBe('update-waiting');
    });
  });

  describe('update waiting notification', () => {
    it('notifies once per start, with the standard info toast', async () => {
      registration.active = {};
      await service.start();

      workbox().emit('waiting', {});
      workbox().emit('waiting', {});

      expect(notification.info).toHaveBeenCalledTimes(1);
      expect(notification.info).toHaveBeenCalledWith(
        `t:${APP_UPDATE_I18N.updateWaitingDetail}`,
        `t:${APP_UPDATE_I18N.updateWaitingSummary}`
      );
    });

    it('notifies at startup when a version was already waiting', async () => {
      registration.active = {};
      registration.waiting = {};

      await service.start();

      expect(service.state()).toBe('update-waiting');
      expect(notification.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('update checks', () => {
    it('checks at startup when the network rule allows it', async () => {
      registration.active = {};

      await service.start();
      await flush();

      expect(workbox().update).toHaveBeenCalledTimes(1);
    });

    it('never checks on a slow network, then checks once when the connection improves', async () => {
      connection.downlink = 1;
      registration.active = {};
      await service.start();
      await flush();
      expect(workbox().update).not.toHaveBeenCalled();

      connection.downlink = 8;
      connection.dispatchEvent(new Event('change'));
      await flush();

      expect(workbox().update).toHaveBeenCalledTimes(1);
    });

    it('checks despite a low downlink estimate when the active probe measures enough', async () => {
      connection.downlink = 1;
      registration.active = {};
      const stream = (): Response => {
        const queue = [new Uint8Array(1000), new Uint8Array(500_000)];
        const reader = {
          read: async () => (queue.length > 0 ? { done: false, value: queue.shift() } : { done: true }),
          cancel: async () => undefined
        };
        return { ok: true, body: { getReader: () => reader } } as unknown as Response;
      };
      fetchSpy.mockImplementation(async () => stream());
      const times = [0, 10, 20];
      const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => times.shift() ?? 20);

      await service.start();
      await flush();
      nowSpy.mockRestore();

      expect(fetchSpy).toHaveBeenCalledWith('/service-worker.js', expect.objectContaining({ cache: 'no-store' }));
      expect(workbox().update).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('measured 400.0 Mbps'));
    });

    it('checks when the browser comes back online', async () => {
      registration.active = {};
      await service.start();
      await flush();

      globalThis.dispatchEvent(new Event('online'));
      await flush();

      expect(workbox().update).toHaveBeenCalledTimes(2);
    });

    it('checks periodically', async () => {
      vi.useFakeTimers();
      registration.active = {};
      await service.start();
      await vi.advanceTimersByTimeAsync(0);
      const before = workbox().update.mock.calls.length;

      await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);

      expect(workbox().update.mock.calls.length).toBe(before + 1);
    });

    it('defers the check when the user data reserve is not free', async () => {
      registration.active = {};
      await service.start();
      vi.mocked(navigator.storage.estimate).mockResolvedValue({ usage: 0, quota: 1024 });

      expect(await service.checkForUpdate()).toEqual({ allowed: false, reason: 'storage-insufficient' });
    });

    it('logs a failed check without throwing', async () => {
      registration.active = {};
      await service.start();
      workbox().update.mockRejectedValueOnce(new Error('offline'));

      await expect(service.checkForUpdate()).resolves.toEqual({ allowed: true, reason: null });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('re-registers once when the browser dropped the registration after a refused install', async () => {
      registration.active = {};
      await service.start();
      await flush();
      const stale = workbox();
      const staleCalls = stale.update.mock.calls.length;
      container.getRegistration.mockResolvedValue(undefined);

      await Promise.all([service.checkForUpdate(), service.checkForUpdate()]);

      expect(workboxMock.Workbox).toHaveBeenCalledTimes(2);
      expect(workbox()).not.toBe(stale);
      expect(workbox().register).toHaveBeenCalledTimes(1);
      expect(stale.update.mock.calls.length).toBe(staleCalls);
    });

    it('allows a new re-registration once the previous one finished', async () => {
      registration.active = {};
      await service.start();
      await flush();
      container.getRegistration.mockResolvedValue(undefined);

      await service.checkForUpdate();
      await service.checkForUpdate();

      expect(workboxMock.Workbox).toHaveBeenCalledTimes(3);
    });

    it('logs a failed re-registration without throwing', async () => {
      registration.active = {};
      await service.start();
      await flush();
      container.getRegistration.mockResolvedValue(undefined);
      workboxMock.Workbox.mockImplementationOnce(function () {
        throw new Error('register failed');
      });

      await expect(service.checkForUpdate()).resolves.toEqual({ allowed: true, reason: null });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('stops listening when the application is destroyed', async () => {
      registration.active = {};
      await service.start();
      await flush();
      const calls = workbox().update.mock.calls.length;
      const instance = workbox();

      TestBed.resetTestingModule();
      connection.dispatchEvent(new Event('change'));
      globalThis.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(instance.update.mock.calls.length).toBe(calls);
    });
  });

  describe('first installation', () => {
    it('waits for an authenticated user before registering', async () => {
      container.getRegistration.mockResolvedValue(undefined);
      currentUser.set(null);

      const started = service.start();
      await flush();
      expect(workboxMock.Workbox).not.toHaveBeenCalled();

      currentUser.set({ email: 'user@example.com' } as User);
      await flush();
      await started;

      expect(workbox().register).toHaveBeenCalledTimes(1);
    });

    it('registers immediately when a registration already exists', async () => {
      currentUser.set(null);
      registration.active = {};

      await service.start();

      expect(workbox().register).toHaveBeenCalled();
    });

    it('logs a registration failure', async () => {
      container.getRegistration.mockRejectedValue(new Error('denied'));

      await service.start();

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('service worker messages', () => {
    it('forwards service worker logs to LoggerService with their level', async () => {
      await service.start();

      postFromServiceWorker({ type: 'SW_LOG', level: 'warn', message: 'Installation refused (save-data)' });

      expect(logger.warn).toHaveBeenCalledWith('[AppUpdate][sw] Installation refused (save-data)');
    });

    it('reports a refused first installation and notifies the storage problem once', async () => {
      await service.start();
      const message = {
        type: 'SW_INSTALL_REFUSED',
        reason: 'storage-insufficient',
        downlinkMbps: 8,
        requiredBytes: 2,
        freeBytes: 1
      };

      postFromServiceWorker(message);
      postFromServiceWorker(message);

      expect(service.state()).toBe('storage-insufficient');
      expect(service.lastRefusal()).toEqual(message);
      expect(notification.warning).toHaveBeenCalledTimes(1);
      expect(notification.warning).toHaveBeenCalledWith(
        `t:${APP_UPDATE_I18N.storageInsufficientDetail}`,
        `t:${APP_UPDATE_I18N.storageInsufficientSummary}`
      );
    });

    it('keeps a ready app ready when an update is deferred by the network', async () => {
      registration.active = {};
      await service.start();

      postFromServiceWorker({
        type: 'SW_INSTALL_REFUSED',
        reason: 'downlink-below-threshold',
        downlinkMbps: 1,
        requiredBytes: null,
        freeBytes: null
      });

      expect(service.state()).toBe('ready-offline');
      expect(service.lastRefusal()?.reason).toBe('downlink-below-threshold');
      expect(notification.warning).not.toHaveBeenCalled();
    });

    it('ignores unrelated messages', async () => {
      await service.start();

      postFromServiceWorker({ type: 'SOMETHING_ELSE' });

      expect(service.lastRefusal()).toBeNull();
    });
  });

  describe('running version', () => {
    it('reads the network and storage diagnostics', async () => {
      expect(await service.readDiagnostics()).toEqual({
        downlinkMbps: 8,
        thresholdMbps: 5,
        usageBytes: 0,
        quotaBytes: 10 * 1024 * 1024 * 1024
      });

      connection.downlink = undefined;
      delete (navigator as unknown as Record<string, unknown>)['storage'];
      expect(await service.readDiagnostics()).toEqual({
        downlinkMbps: null,
        thresholdMbps: 5,
        usageBytes: null,
        quotaBytes: null
      });
    });

    it('comes from the bundle, with the build date of the same build from /version.json', async () => {
      await service.start();
      await flush();

      expect(service.runningVersion()).toEqual({
        version: '1.9.2',
        gitHash: 'abc1234',
        buildDateUtc: '2026-10-12T08:00:00Z'
      });
      expect(fetchSpy).toHaveBeenCalledWith('/version.json', expect.objectContaining({ cache: 'no-store' }));
    });

    it('ignores the build date of another deployment', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ git_hash: 'fff9999', build_datetime_utc: '2026-10-13' }))
      );

      await service.start();
      await flush();

      expect(service.runningVersion().buildDateUtc).toBeNull();
    });

    it('keeps no build date when /version.json is unreachable', async () => {
      fetchSpy.mockRejectedValue(new TypeError('offline'));

      await service.start();
      await flush();

      expect(service.runningVersion().buildDateUtc).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('[AppUpdate] version.json unavailable', expect.any(TypeError));
    });
  });
});
