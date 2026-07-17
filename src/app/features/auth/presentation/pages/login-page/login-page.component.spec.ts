/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { vi } from 'vitest';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { LoginPageComponent } from './login-page.component';
import { AuthService } from '@services/auth/auth.service';

interface AuthServiceMock {
  oidcEnabled: WritableSignal<boolean>;
  modeResolved: WritableSignal<boolean>;
  loginWithEmail: vi.Mock;
}

/**
 * Test-only view of `LoginPageComponent` exposing its `protected` methods so
 * they can be spied on without resorting to `any`.
 */
type LoginPageTestable = LoginPageComponent & {
  redirectToOidcLogin: () => void;
  reloadToHome: () => void;
};
const loginPageProto = LoginPageComponent.prototype as unknown as LoginPageTestable;

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let authServiceMock: AuthServiceMock;
  let routerMock: { navigate: vi.Mock };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: true
    });
  });

  afterEach(() => {
    // vi.spyOn() on the shared component prototype (redirectToOidcLogin, reloadToHome)
    // returns the SAME spy instance across tests if not restored, accumulating call
    // counts across describe blocks. Restore all spies after every test.
    vi.restoreAllMocks();
  });

  /**
   * Build the component with the given resolved auth mode.
   * Default: mode resolved + fallback (email form rendered).
   */
  async function setupFixture(
    opts: { oidcEnabled: boolean; modeResolved?: boolean } = {
      oidcEnabled: false,
      modeResolved: true
    }
  ): Promise<void> {
    authServiceMock = {
      oidcEnabled: signal(opts.oidcEnabled),
      modeResolved: signal(opts.modeResolved ?? true),
      loginWithEmail: vi.fn().mockResolvedValue({ email: 'test@example.com' })
    };

    routerMock = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('Fallback mode — email form rendered', () => {
    beforeEach(async () => {
      await setupFixture({ oidcEnabled: false });
    });

    describe('HTML rendering - structure', () => {
      it('should render the login title', () => {
        const title = getByTestId('login-title');
        expect(title).toBeTruthy();
        expect(title?.tagName).toBe('H1');
      });

      it('should not render the offline waiting status', () => {
        expect(getByTestId('login-offline-waiting')).toBeNull();
      });

      it('should render the subtitle', () => {
        const subtitle = getByTestId('login-subtitle');
        expect(subtitle).toBeTruthy();
        expect(subtitle?.tagName).toBe('P');
      });

      it('should render the login form', () => {
        const form = getByTestId('login-form');
        expect(form).toBeTruthy();
        expect(form?.tagName).toBe('FORM');
      });

      it('should render the email input', () => {
        const input = getByTestId('email-input');
        expect(input).toBeTruthy();
        expect(input?.tagName).toBe('INPUT');
        expect(input?.getAttribute('type')).toBe('email');
      });

      it('should render the submit button', () => {
        const btn = getByTestId('submit-btn');
        expect(btn).toBeTruthy();
        expect(btn?.tagName).toBe('BUTTON');
      });

      it('should not render the resolving status', () => {
        expect(getByTestId('login-resolving')).toBeNull();
      });

      it('should not render the GAIA redirecting status', () => {
        expect(getByTestId('login-redirecting')).toBeNull();
      });
    });

    describe('HTML rendering - validation errors', () => {
      it('should not show email error initially', () => {
        expect(getByTestId('email-error')).toBeNull();
      });

      it('should show required error when email is touched and empty', () => {
        component.emailControl.markAsTouched();
        fixture.detectChanges();
        expect(getByTestId('email-error')).toBeTruthy();
      });

      it('should show invalid email error when email format is wrong', () => {
        component.emailControl.setValue('notanemail');
        component.emailControl.markAsTouched();
        fixture.detectChanges();
        expect(getByTestId('email-error')).toBeTruthy();
      });

      it('should not show error when email is valid', () => {
        component.emailControl.setValue('valid@example.com');
        component.emailControl.markAsTouched();
        fixture.detectChanges();
        expect(getByTestId('email-error')).toBeNull();
      });
    });

    describe('HTML rendering - button states', () => {
      it('should not disable submit button initially', () => {
        const btn = getByTestId('submit-btn') as HTMLButtonElement;
        expect(btn.disabled).toBe(false);
      });
    });

    describe('HTML rendering - accessibility', () => {
      it('should set aria-invalid on email input when invalid and touched', () => {
        component.emailControl.markAsTouched();
        fixture.detectChanges();
        expect(getByTestId('email-input')?.getAttribute('aria-invalid')).toBe('true');
      });

      it('should not set aria-invalid when email is valid', () => {
        component.emailControl.setValue('valid@example.com');
        component.emailControl.markAsTouched();
        fixture.detectChanges();
        expect(getByTestId('email-input')?.getAttribute('aria-invalid')).toBe('false');
      });

      it('should set aria-describedby when email has error', () => {
        component.emailControl.markAsTouched();
        fixture.detectChanges();
        expect(getByTestId('email-input')?.getAttribute('aria-describedby')).toBe('login-email-error');
      });

      it('should have a label associated with the email input', () => {
        const label = fixture.nativeElement.querySelector('label[for="login-email"]');
        expect(label).toBeTruthy();
      });
    });

    describe('form submission', () => {
      it('should not call loginWithEmail when form is invalid', async () => {
        await component.onSubmit();
        expect(authServiceMock.loginWithEmail).not.toHaveBeenCalled();
      });

      it('should call loginWithEmail and navigate on valid submit', async () => {
        component.emailControl.setValue('user@example.com');
        await component.onSubmit();
        expect(authServiceMock.loginWithEmail).toHaveBeenCalledWith('user@example.com');
        expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
      });

      it('should trim the email before submitting', async () => {
        component.emailControl.setValue('  user@example.com  ');
        await component.onSubmit();
        expect(authServiceMock.loginWithEmail).toHaveBeenCalledWith('user@example.com');
      });

      it('should set submitError on login failure', async () => {
        authServiceMock.loginWithEmail.mockRejectedValue(new Error('DB error'));
        component.emailControl.setValue('user@example.com');
        await component.onSubmit();
        expect(component.submitError()).toBeTruthy();
      });

      it('should render error message on login failure', async () => {
        authServiceMock.loginWithEmail.mockRejectedValue(new Error('DB error'));
        component.emailControl.setValue('user@example.com');
        await component.onSubmit();
        fixture.detectChanges();
        expect(getByTestId('login-error')).toBeTruthy();
      });

      it('should set isSubmitting back to false after success', async () => {
        component.emailControl.setValue('user@example.com');
        await component.onSubmit();
        expect(component.isSubmitting()).toBe(false);
      });

      it('should set isSubmitting back to false after failure', async () => {
        authServiceMock.loginWithEmail.mockRejectedValue(new Error('fail'));
        component.emailControl.setValue('user@example.com');
        await component.onSubmit();
        expect(component.isSubmitting()).toBe(false);
      });

      it('should NOT show "Login failed" when navigation fails after a successful login', async () => {
        // Reproduces the bug: loginWithEmail succeeds, but router.navigate
        // rejects (e.g. lazy-chunk load error). The user IS authenticated,
        // so we must not display the login-error banner.
        const reloadSpy = vi.spyOn(loginPageProto, 'reloadToHome').mockImplementation(() => undefined);
        routerMock.navigate.mockRejectedValue(new Error('chunk load failed'));
        component.emailControl.setValue('user@example.com');

        await component.onSubmit();
        fixture.detectChanges();

        expect(authServiceMock.loginWithEmail).toHaveBeenCalledWith('user@example.com');
        expect(component.submitError()).toBeNull();
        expect(getByTestId('login-error')).toBeNull();
        expect(reloadSpy).toHaveBeenCalledTimes(1);
        expect(component.isSubmitting()).toBe(false);
      });

      it('should NOT attempt navigation when loginWithEmail fails', async () => {
        // Regression guard: a failed auth must short-circuit before the
        // router is touched, otherwise a chunk-load error could mask the
        // real auth failure.
        authServiceMock.loginWithEmail.mockRejectedValue(new Error('DB error'));
        component.emailControl.setValue('user@example.com');

        await component.onSubmit();

        expect(routerMock.navigate).not.toHaveBeenCalled();
      });

      it('should NOT call reloadToHome when both login and navigation succeed', async () => {
        const reloadSpy = vi.spyOn(loginPageProto, 'reloadToHome').mockImplementation(() => undefined);
        component.emailControl.setValue('user@example.com');

        await component.onSubmit();

        expect(reloadSpy).not.toHaveBeenCalled();
        expect(component.submitError()).toBeNull();
      });

      it('should clear a previous submitError on a new successful submit', async () => {
        // First submit fails — error is shown.
        authServiceMock.loginWithEmail.mockRejectedValueOnce(new Error('boom'));
        component.emailControl.setValue('user@example.com');
        await component.onSubmit();
        expect(component.submitError()).toBeTruthy();

        // Retry succeeds — banner must clear.
        await component.onSubmit();
        expect(component.submitError()).toBeNull();
      });
    });
  });

  describe('Resolving mode — initial probe pending', () => {
    beforeEach(async () => {
      await setupFixture({ oidcEnabled: false, modeResolved: false });
    });

    it('should render the resolving status', () => {
      expect(getByTestId('login-resolving')).toBeTruthy();
    });

    it('should not render the offline waiting status while mode is unknown', () => {
      expect(getByTestId('login-offline-waiting')).toBeNull();
    });

    it('should not render the email form while mode is unknown', () => {
      expect(getByTestId('login-form')).toBeNull();
    });

    it('should not render the GAIA redirecting status while mode is unknown', () => {
      expect(getByTestId('login-redirecting')).toBeNull();
    });

    it('should reject onSubmit until the mode is resolved', async () => {
      component.emailControl.setValue('user@example.com');
      await component.onSubmit();
      expect(authServiceMock.loginWithEmail).not.toHaveBeenCalled();
    });
  });

  describe('OIDC mode — GAIA redirect', () => {
    let redirectSpy: vi.SpyInstance;

    beforeEach(async () => {
      redirectSpy = vi.spyOn(loginPageProto, 'redirectToOidcLogin').mockImplementation(() => undefined);
      await setupFixture({ oidcEnabled: true, modeResolved: true });
    });

    it('should call redirectToOidcLogin once when oidcEnabled is true', () => {
      expect(redirectSpy).toHaveBeenCalledTimes(1);
    });

    it('should not render the offline waiting status', () => {
      expect(getByTestId('login-offline-waiting')).toBeNull();
    });

    it('should render the GAIA redirecting status', () => {
      expect(getByTestId('login-redirecting')).toBeTruthy();
    });

    it('should not render the email form', () => {
      expect(getByTestId('login-form')).toBeNull();
    });

    it('should refuse onSubmit even if invoked programmatically', async () => {
      component.emailControl.setValue('user@example.com');
      await component.onSubmit();
      expect(authServiceMock.loginWithEmail).not.toHaveBeenCalled();
    });
  });

  describe('OIDC mode while offline', () => {
    let redirectSpy: vi.SpyInstance;

    beforeEach(async () => {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: false
      });
      redirectSpy = vi.spyOn(loginPageProto, 'redirectToOidcLogin').mockImplementation(() => undefined);
      await setupFixture({ oidcEnabled: true, modeResolved: true });
    });

    it('should not trigger redirect while offline', () => {
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    it('should render offline waiting status', () => {
      expect(getByTestId('login-offline-waiting')).toBeTruthy();
    });

    it('should not render GAIA redirecting status while offline', () => {
      expect(getByTestId('login-redirecting')).toBeNull();
    });

    it('should keep the email fallback hidden', () => {
      expect(getByTestId('login-form')).toBeNull();
    });
  });

  describe('Late mode flip — fallback → OIDC after probe', () => {
    let redirectSpy: vi.SpyInstance;

    beforeEach(async () => {
      redirectSpy = vi.spyOn(loginPageProto, 'redirectToOidcLogin').mockImplementation(() => undefined);
      await setupFixture({ oidcEnabled: false, modeResolved: false });
    });

    it('should fire the redirect once the resolved mode flips to OIDC', () => {
      expect(redirectSpy).not.toHaveBeenCalled();
      authServiceMock.modeResolved.set(true);
      authServiceMock.oidcEnabled.set(true);
      fixture.detectChanges();
      expect(redirectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
