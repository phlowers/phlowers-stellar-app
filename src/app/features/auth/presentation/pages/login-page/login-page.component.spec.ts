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

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let authServiceMock: AuthServiceMock;
  let routerMock: { navigate: vi.Mock };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  /**
   * Build the component with the given resolved auth mode.
   * Default: mode resolved + fallback (email form rendered).
   */
  async function setupFixture(opts: { oidcEnabled: boolean; modeResolved?: boolean } = {
    oidcEnabled: false,
    modeResolved: true
  }): Promise<void> {
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
        expect(getByTestId('email-input')?.getAttribute('aria-describedby')).toBe(
          'login-email-error'
        );
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
    });
  });

  describe('Resolving mode — initial probe pending', () => {
    beforeEach(async () => {
      await setupFixture({ oidcEnabled: false, modeResolved: false });
    });

    it('should render the resolving status', () => {
      expect(getByTestId('login-resolving')).toBeTruthy();
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
      redirectSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(LoginPageComponent.prototype as any, 'redirectToOidcLogin')
        .mockImplementation(() => undefined);
      await setupFixture({ oidcEnabled: true, modeResolved: true });
    });

    it('should call redirectToOidcLogin once when oidcEnabled is true', () => {
      expect(redirectSpy).toHaveBeenCalledTimes(1);
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

  describe('Late mode flip — fallback → OIDC after probe', () => {
    let redirectSpy: vi.SpyInstance;

    beforeEach(async () => {
      redirectSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(LoginPageComponent.prototype as any, 'redirectToOidcLogin')
        .mockImplementation(() => undefined);
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
