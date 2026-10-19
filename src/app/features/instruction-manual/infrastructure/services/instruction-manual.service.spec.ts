import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InstructionManualService } from './instruction-manual.service';
import { MANUAL_PDF_FILE_NAME } from './instruction-manual.constantes';

describe('InstructionManualService', () => {
  let service: InstructionManualService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InstructionManualService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should build the PDF url from the language', () => {
    expect(service.getPdfUrl('fr')).toBe(`/docs/fr/${MANUAL_PDF_FILE_NAME}`);
  });

  it('should read size and update date from the response headers', () => {
    let result;
    service.getPdfInfo('/docs/en/manual.pdf').subscribe((info) => (result = info));

    const request = httpMock.expectOne('/docs/en/manual.pdf');
    expect(request.request.method).toBe('HEAD');
    request.flush(null, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': '2097152',
        'Last-Modified': 'Wed, 14 Oct 2026 10:00:00 GMT'
      }
    });

    expect(result).toEqual({ sizeBytes: 2097152, lastModified: new Date('Wed, 14 Oct 2026 10:00:00 GMT') });
  });

  it('should report unknown values when the server answers with something else than a PDF', () => {
    let result;
    service.getPdfInfo('/docs/en/manual.pdf').subscribe((info) => (result = info));

    httpMock.expectOne('/docs/en/manual.pdf').flush(null, { headers: { 'Content-Type': 'text/html' } });

    expect(result).toEqual({ sizeBytes: null, lastModified: null });
  });

  it('should report unknown values when the request fails', () => {
    let result;
    service.getPdfInfo('/docs/en/manual.pdf').subscribe((info) => (result = info));

    httpMock.expectOne('/docs/en/manual.pdf').flush(null, { status: 404, statusText: 'Not Found' });

    expect(result).toEqual({ sizeBytes: null, lastModified: null });
  });
});
