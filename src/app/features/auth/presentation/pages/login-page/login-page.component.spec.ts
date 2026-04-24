/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '@services/auth/auth.service';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let authServiceMock: { loginWithEmail: vi.Mock };
  let routerMock: { navigate: vi.Mock };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    authServiceMock = {
      loginWithEmail: vi.fn().mockResolvedValue({ email: 'test@example.com' })
    };

    routerMock = {
      navigate: vi.fn().mockResolvedValue(true)
    };

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
  });

  describe('HTML rendering - validation errors', () => {
    it('should not show email error initially', () => {
      expect(getByTestId('email-error')).toBeNull();
    });

    it('should show required error when email is touched and empty', () => {
      component.emailControl.markAsTouched();
      fixture.detectChanges();

      const error = getByTestId('email-error');
      expect(error).toBeTruthy();
    });

    it('should show invalid email error when email format is wrong', () => {
      component.emailControl.setValue('notanemail');
      component.emailControl.markAsTouched();
      fixture.detectChanges();

      const error = getByTestId('email-error');
      expect(error).toBeTruthy();
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

      const input = getByTestId('email-input');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should not set aria-invalid when email is valid', () => {
      component.emailControl.setValue('valid@example.com');
      component.emailControl.markAsTouched();
      fixture.detectChanges();

      const input = getByTestId('email-input');
      expect(input?.getAttribute('aria-invalid')).toBe('false');
    });

    it('should set aria-describedby when email has error', () => {
      component.emailControl.markAsTouched();
      fixture.detectChanges();

      const input = getByTestId('email-input');
      expect(input?.getAttribute('aria-describedby')).toBe('login-email-error');
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
      component.emailControl.setValue('user@example.com');
      // Verify trim() is applied by spying on the control value
      const trimSpy = vi.spyOn(String.prototype, 'trim');

      await component.onSubmit();

      expect(trimSpy).toHaveBeenCalled();
      expect(authServiceMock.loginWithEmail).toHaveBeenCalledWith('user@example.com');
      trimSpy.mockRestore();
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
