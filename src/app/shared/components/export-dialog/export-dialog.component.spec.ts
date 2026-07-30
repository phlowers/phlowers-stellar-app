import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ExportDialogComponent } from './export-dialog.component';
import { StudiesService } from '@services/studies/studies.service';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;
  let mockStudiesService: Partial<StudiesService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockStudiesService = {
      exportDialogData: signal({ isOpen: true, uuid: 'test-uuid', title: 'Test Study' }),
      downloadStudy: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        ExportDialogComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [{ provide: StudiesService, useValue: mockStudiesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('HTML rendering', () => {
    it('should render the export dialog', () => {
      const el = getByTestId('export-dialog');
      expect(el).toBeTruthy();
    });

    it('should render the export form', () => {
      const el = getByTestId('export-form');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('FORM');
    });

    it('should render the filename input', () => {
      const el = getByTestId('export-filename-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render the export format select', () => {
      const el = getByTestId('export-format-select');
      expect(el).toBeTruthy();
    });

    it('should render the cancel button', () => {
      const el = getByTestId('export-cancel-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render the export submit button', () => {
      const el = getByTestId('export-submit-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });

  describe('form initialization', () => {
    it('should prefill filename from study title', () => {
      expect(component.form.value.filename).toBe('Test Study');
    });

    it('should remove .clst suffix when prefilling filename', async () => {
      const exportDialogData = signal({ isOpen: true, uuid: 'test-uuid', title: 'My Study.clst' });
      mockStudiesService = {
        exportDialogData,
        downloadStudy: vi.fn()
      };

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [
            TranslocoTestingModule.forRoot({
              langs: { en: {} },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
              preloadLangs: true
            }),
            ExportDialogComponent,
            ReactiveFormsModule,
            NoopAnimationsModule
          ],
          providers: [{ provide: StudiesService, useValue: mockStudiesService }]
        })
        .compileComponents();

      fixture = TestBed.createComponent(ExportDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.form.value.filename).toBe('My Study');
    });
  });

  describe('exportStudy', () => {
    it('should download study and close dialog when form is valid', () => {
      component.form.patchValue({ filename: 'export-name', exportFormat: 'clst' });

      component.exportStudy();

      expect(mockStudiesService.downloadStudy).toHaveBeenCalledWith('test-uuid', 'export-name');
      expect(mockStudiesService.exportDialogData?.()).toBeNull();
    });

    it('should not download when form is invalid', () => {
      component.form.patchValue({ filename: '', exportFormat: 'clst' });

      component.exportStudy();

      expect(mockStudiesService.downloadStudy).not.toHaveBeenCalled();
      expect(mockStudiesService.exportDialogData?.()).not.toBeNull();
    });

    it('should not download when dialog data has no uuid', () => {
      mockStudiesService.exportDialogData?.set({ isOpen: true, uuid: '', title: 'Test Study' });
      component.form.patchValue({ filename: 'export-name', exportFormat: 'clst' });

      component.exportStudy();

      expect(mockStudiesService.downloadStudy).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should close dialog without downloading', () => {
      component.cancel();

      expect(mockStudiesService.downloadStudy).not.toHaveBeenCalled();
      expect(mockStudiesService.exportDialogData?.()).toBeNull();
    });
  });
});
