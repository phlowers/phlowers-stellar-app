import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { InstructionManualComponent } from './instruction-manual.component';
import { InstructionManualService } from '@features/instruction-manual/infrastructure/services/instruction-manual.service';
import { MANUAL_PDF_FILE_NAME } from '@features/instruction-manual/infrastructure/services/instruction-manual.constantes';
import { ManualPdfInfo } from '@features/instruction-manual/infrastructure/services/instruction-manual.model';

describe('InstructionManualComponent', () => {
  let fixture: ComponentFixture<InstructionManualComponent>;
  let serviceMock: { getPdfUrl: ReturnType<typeof vi.fn>; getPdfInfo: ReturnType<typeof vi.fn> };

  const render = async (info: ManualPdfInfo): Promise<HTMLElement> => {
    serviceMock.getPdfInfo.mockReturnValue(of(info));
    fixture = TestBed.createComponent(InstructionManualComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement;
  };

  beforeEach(async () => {
    serviceMock = {
      getPdfUrl: vi.fn((lang: string) => `/docs/${lang}/${MANUAL_PDF_FILE_NAME}`),
      getPdfInfo: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'instruction-manual.intro-title': 'Welcome',
              'instruction-manual.pdf-title': 'Download the PDF manual'
            },
            fr: { 'instruction-manual.intro-title': 'Bienvenue' }
          },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
          preloadLangs: true
        }),
        InstructionManualComponent
      ],
      providers: [{ provide: InstructionManualService, useValue: serviceMock }]
    }).compileComponents();
  });

  it('should render the three cards', async () => {
    const element = await render({ sizeBytes: null, lastModified: null });

    expect(element.querySelectorAll('app-card')).toHaveLength(3);
    expect(element.querySelector('h1')?.textContent).toContain('Welcome');
  });

  it('should link the download button to the PDF of the active language', async () => {
    const element = await render({ sizeBytes: null, lastModified: null });
    const button = element.querySelector<HTMLAnchorElement>('[data-testid="pdf-download-btn"]');

    expect(button?.getAttribute('href')).toBe(`/docs/en/${MANUAL_PDF_FILE_NAME}`);
    expect(button?.getAttribute('download')).toBe(MANUAL_PDF_FILE_NAME);
  });

  it('should display the file name, size and update date of the PDF', async () => {
    const element = await render({ sizeBytes: 2.5 * 1024 * 1024, lastModified: new Date(2026, 9, 14) });

    expect(element.querySelector('[data-testid="pdf-file-name"]')?.textContent).toBe(MANUAL_PDF_FILE_NAME);
    expect(element.querySelector('[data-testid="pdf-size"]')?.textContent).toMatch(/2[.,]5/);
    expect(element.querySelector('[data-testid="pdf-update-date"]')?.textContent).toBe('14/10/2026');
  });

  it('should display a dash when size and date are unknown', async () => {
    const element = await render({ sizeBytes: null, lastModified: null });

    expect(element.querySelector('[data-testid="pdf-size"]')?.textContent).toBe('—');
    expect(element.querySelector('[data-testid="pdf-update-date"]')?.textContent).toBe('—');
  });

  it('should open the online manual in a new tab', async () => {
    const element = await render({ sizeBytes: null, lastModified: null });
    const button = element.querySelector<HTMLAnchorElement>('[data-testid="online-manual-btn"]');

    expect(button?.getAttribute('href')).toBe('/docs/index.html');
    expect(button?.getAttribute('target')).toBe('_blank');
  });
});
