import { HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { oidcTokenInterceptor } from '@core/interceptors/oidc-token.interceptor';
import { vi } from 'vitest';

function forwardRequest(): {
  next: HttpHandlerFn;
  getRequest: () => HttpRequest<unknown> | null;
} {
  let forwardedRequest: HttpRequest<unknown> | null = null;

  return {
    next: (req: HttpRequest<unknown>) => {
      forwardedRequest = req;
      return of(new HttpResponse({ status: 200 })) as ReturnType<HttpHandlerFn>;
    },
    getRequest: () => forwardedRequest
  };
}

describe('OidcTokenInterceptor — Phase 2', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('token injection', () => {
    it('should add Bearer token to protected path requests when token is available', () => {
      const mockToken = 'test_oidc_token_12345';
      localStorage.setItem('oidc_token', mockToken);

      const request = new HttpRequest('GET', '/assets_list.json');
      const { next, getRequest } = forwardRequest();

      oidcTokenInterceptor(request, next);

      expect(getRequest()?.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should handle "Bearer " prefix in stored token', () => {
      const mockToken = 'test_oidc_token_with_prefix';
      localStorage.setItem('oidc_token', `Bearer ${mockToken}`);

      const request = new HttpRequest('GET', '/assets_list.json');
      const { next, getRequest } = forwardRequest();

      oidcTokenInterceptor(request, next);

      expect(getRequest()?.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should not add Authorization header when token is not available', () => {
      const request = new HttpRequest('GET', '/assets_list.json');
      const { next, getRequest } = forwardRequest();

      oidcTokenInterceptor(request, next);

      expect(getRequest()?.headers.has('Authorization')).toBe(false);
    });

    it('should not add token to non-protected paths', () => {
      const mockToken = 'test_oidc_token_12345';
      localStorage.setItem('oidc_token', mockToken);

      const request = new HttpRequest('GET', '/api/some-endpoint');
      const { next, getRequest } = forwardRequest();

      oidcTokenInterceptor(request, next);

      expect(getRequest()?.headers.has('Authorization')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle localStorage read errors gracefully', () => {
      // Spy on localStorage.getItem and make it throw
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const request = new HttpRequest('GET', '/assets_list.json');
      const { next, getRequest } = forwardRequest();

      oidcTokenInterceptor(request, next);

      expect(getRequest()?.headers.has('Authorization')).toBe(false);
      getItemSpy.mockRestore();
    });
  });

  describe('request cloning', () => {
    it('should not modify original request when adding token', () => {
      const mockToken = 'test_token';
      localStorage.setItem('oidc_token', mockToken);

      const originalUrl = '/assets_list.json';
      const request = new HttpRequest('GET', originalUrl);
      const { next, getRequest } = forwardRequest();

      oidcTokenInterceptor(request, next);

      expect(request.headers.has('Authorization')).toBe(false);
      expect(getRequest()?.url).toBe(originalUrl);
      expect(getRequest()?.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });
  });
});
