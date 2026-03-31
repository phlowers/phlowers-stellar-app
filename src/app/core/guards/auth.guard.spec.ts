import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '@services/auth/auth.service';
import { StorageService } from '@services/storage/storage.service';
import { UserService } from '@services/user/user.service';
import { WINDOW } from '@core/tokens/window.token';
import { BehaviorSubject } from 'rxjs';
import { environment } from '@src/environments/environment';

describe('authGuard', () => {
  let mockAuthService: { isAuthenticated: ReturnType<typeof vi.fn>; currentUser: ReturnType<typeof vi.fn> };
  let mockWindow: { location: { href: string } };

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      currentUser: vi.fn().mockReturnValue({ email: 'dev@stellar.local' })
    };

    mockWindow = { location: { href: '/' } };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: WINDOW, useValue: mockWindow },
        { provide: StorageService, useValue: { ready$: new BehaviorSubject(true) } },
        { provide: UserService, useValue: { user$: new BehaviorSubject(null) } }
      ]
    });
  });

  it('should allow navigation when authenticated', () => {
    TestBed.runInInjectionContext(() => {
      const result = authGuard({} as Parameters<typeof authGuard>[0], {} as Parameters<typeof authGuard>[1]);
      expect(result).toBe(true);
    });
  });

  it('should return false when not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => {
      const result = authGuard({} as Parameters<typeof authGuard>[0], {} as Parameters<typeof authGuard>[1]);
      expect(result).toBe(false);
    });
  });

  it('should redirect to oidcLoginUrl when not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => {
      authGuard({} as Parameters<typeof authGuard>[0], {} as Parameters<typeof authGuard>[1]);
      expect(mockWindow.location.href).toBe(environment.oidcLoginUrl);
    });
  });
});
