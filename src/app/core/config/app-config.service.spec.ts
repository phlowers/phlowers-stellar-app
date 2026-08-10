import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppConfigService } from './app-config.service';
import { LoggerService } from '@services/logger/logger.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let httpMock: HttpTestingController;
  let mockLoggerService: { warn: vi.Mock };

  beforeEach(() => {
    mockLoggerService = { warn: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoggerService, useValue: mockLoggerService }
      ]
    });

    service = TestBed.inject(AppConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return the configured default language', async () => {
    const promise = service.loadDefaultLang();

    httpMock.expectOne('assets/config/app-config.json').flush({ defaultLang: 'fr' });

    await expect(promise).resolves.toBe('fr');
  });

  it('should fall back to "fr" when the config file request fails', async () => {
    const promise = service.loadDefaultLang();

    httpMock.expectOne('assets/config/app-config.json').flush('Not Found', { status: 404, statusText: 'Not Found' });

    await expect(promise).resolves.toBe('fr');
    expect(mockLoggerService.warn).toHaveBeenCalled();
  });

  it('should fall back to "fr" when defaultLang is missing from the response', async () => {
    const promise = service.loadDefaultLang();

    httpMock.expectOne('assets/config/app-config.json').flush({});

    await expect(promise).resolves.toBe('fr');
  });

  it('should fall back to "fr" when the request hangs beyond the timeout', async () => {
    vi.useFakeTimers();
    try {
      const promise = service.loadDefaultLang();

      // Request stays pending: only the internal timeout can resolve the promise.
      httpMock.expectOne('assets/config/app-config.json');
      await vi.advanceTimersByTimeAsync(3000);

      await expect(promise).resolves.toBe('fr');
      expect(mockLoggerService.warn).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
