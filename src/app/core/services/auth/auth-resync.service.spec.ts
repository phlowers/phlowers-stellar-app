import { TestBed } from '@angular/core/testing';
import {
  AUTH_RESYNC_LAST_REDIRECT_AT_STORAGE_KEY,
  AUTH_RESYNC_REDIRECT_COOLDOWN_MS
} from '@services/auth/auth-resync.constantes';
import { AuthResyncService } from '@services/auth/auth-resync.service';

describe('AuthResyncService', () => {
  let service: AuthResyncService;
  let nowSpy: vi.SpyInstance;
  let pathSpy: vi.SpyInstance;

  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: true
    });
    globalThis.sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthResyncService]
    });

    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    service = TestBed.inject(AuthResyncService);
    pathSpy = vi.spyOn(service, 'getCurrentPathname').mockReturnValue('/');
  });

  afterEach(() => {
    nowSpy.mockRestore();
    pathSpy.mockRestore();
  });

  it('should trigger redirect when online and outside suppressed paths', () => {
    const redirectSpy = vi.spyOn(service, 'navigateToOidcLogin').mockImplementation(() => undefined);

    const result = service.triggerImmediateRedirect();

    expect(result).toBe(true);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });

  it('should not redirect when offline', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: false
    });
    const redirectSpy = vi.spyOn(service, 'navigateToOidcLogin').mockImplementation(() => undefined);

    const result = service.triggerImmediateRedirect();

    expect(result).toBe(false);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('should not redirect on suppressed /auth paths', () => {
    pathSpy.mockReturnValue('/auth/login');
    const redirectSpy = vi.spyOn(service, 'navigateToOidcLogin').mockImplementation(() => undefined);

    const result = service.triggerImmediateRedirect();

    expect(result).toBe(false);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('should not redirect on /login path', () => {
    pathSpy.mockReturnValue('/login');
    const redirectSpy = vi.spyOn(service, 'navigateToOidcLogin').mockImplementation(() => undefined);

    const result = service.triggerImmediateRedirect();

    expect(result).toBe(false);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('should enforce cooldown from sessionStorage', () => {
    globalThis.sessionStorage.setItem(
      AUTH_RESYNC_LAST_REDIRECT_AT_STORAGE_KEY,
      String(1_700_000_000_000 - AUTH_RESYNC_REDIRECT_COOLDOWN_MS + 100)
    );
    const redirectSpy = vi.spyOn(service, 'navigateToOidcLogin').mockImplementation(() => undefined);

    const result = service.triggerImmediateRedirect();

    expect(result).toBe(false);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('should block repeated redirects in same runtime', () => {
    const redirectSpy = vi.spyOn(service, 'navigateToOidcLogin').mockImplementation(() => undefined);

    const first = service.triggerImmediateRedirect();
    const second = service.triggerImmediateRedirect();

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });
});
